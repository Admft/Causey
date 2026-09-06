import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AppState,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { causeyFetch } from "./api";
import { useAuth } from "./auth";
import {
  resolveRegistrationStatus,
  resolveRsvpStatus,
  type RegistrationMark,
  type RsvpMark,
} from "./event-registration-state";
import { feedback } from "./haptics";
import { openExternalUrl, safeRegUrl } from "./open-url";
import {
  createRequestGate,
  isAbortError,
} from "./request-gate";
import { notifyDeskChanged } from "./desk-sync";
import { colors } from "./theme";
import {
  Card,
  ErrorText,
  LinkButton,
  Meta,
  PrimaryButton,
  SecondaryButton,
} from "./ui";

export type RsvpUiStatus =
  | "invited"
  | "going"
  | "not_going"
  | "attended"
  | "did_not_attend"
  | "unanswered";

export type EventRsvpPerson = {
  profileId: string;
  label: string;
  status: RsvpUiStatus;
};

export type EventRegistrationPerson = {
  profileId: string;
  label: string;
  status: "opened" | "registered" | "not_registered" | null;
};

type AttendancePayload = {
  ended: boolean;
  rsvp: EventRsvpPerson[];
  registration: EventRegistrationPerson[];
  sent_recommendation_ids: string[];
};

function asAttendance(payload: unknown): AttendancePayload | null {
  if (!payload || typeof payload !== "object") return null;
  const row = payload as Record<string, unknown>;
  if (!Array.isArray(row.rsvp) || !Array.isArray(row.registration)) return null;
  return {
    ended: row.ended === true,
    rsvp: row.rsvp as EventRsvpPerson[],
    registration: row.registration as EventRegistrationPerson[],
    sent_recommendation_ids: Array.isArray(row.sent_recommendation_ids)
      ? (row.sent_recommendation_ids as string[])
      : [],
  };
}

function registrationHost(regUrl: string): string {
  try {
    return new URL(regUrl).hostname.replace(/^www\./, "");
  } catch {
    return "the organizer’s site";
  }
}

function rsvpHeading(people: EventRsvpPerson[]): string {
  const invited = people.some((person) => person.status === "invited");
  const unansweredChild = people.some(
    (person) => person.status === "unanswered" && person.label !== "You"
  );
  const allDeclined =
    people.length > 0 && people.every((person) => person.status === "not_going");
  const onlyYou = people.length === 1 && people[0]?.label === "You";
  const onlyOne = people.length === 1;
  if (invited) {
    return onlyYou ? "Your coach needs an RSVP" : "An RSVP needs your response";
  }
  if (unansweredChild) {
    if (onlyOne) return `Invite ${people[0]?.label}?`;
    return "Invite who should look at this?";
  }
  if (allDeclined) {
    if (onlyYou) return "You're not going";
    if (onlyOne) return `${people[0]?.label} is not going`;
    return "No one from this account is going";
  }
  if (onlyYou) return "Are you going?";
  if (onlyOne) return `Is ${people[0]?.label} going?`;
  return "Who is going?";
}

function rsvpLede(people: EventRsvpPerson[], hasOrganizerLink: boolean): string {
  if (people.some((person) => person.status === "invited")) {
    return hasOrganizerLink
      ? "Answer so your club or school knows who is coming, then finish organizer registration if the event requires it. This is the same job as Family."
      : "Answer so your club or school knows who is coming. Entry is through that invite, not open registration.";
  }
  if (people.some((person) => person.status === "unanswered" && person.label !== "You")) {
    return "Invite them so they can accept on Plan. After they mark Going, Family asks you to confirm organizer registration. You can also answer for them here.";
  }
  return "Going on Causey is for Family and Plan. It is not entry on the organizer’s site. A club invite is not required on a public listing.";
}

export function EventGoingCard({
  competitionId,
  eventSlug,
  regUrl,
}: {
  competitionId: string;
  eventSlug: string;
  regUrl: string | null;
}) {
  const router = useRouter();
  const { session } = useAuth();
  const [attendance, setAttendance] = useState<AttendancePayload | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [awaitingReturn, setAwaitingReturn] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [openedLocal, setOpenedLocal] = useState<string[]>([]);
  const [localStatus, setLocalStatus] = useState<
    Record<string, RegistrationMark>
  >({});
  const [localRsvp, setLocalRsvp] = useState<Record<string, RsvpMark>>({});
  const [localInvited, setLocalInvited] = useState<string[]>([]);
  const loadGate = useRef(createRequestGate()).current;
  const userId = session?.user.id ?? null;

  const load = useCallback(async () => {
    if (!session?.access_token) {
      setAttendance(null);
      setLoadError(null);
      setLoaded(true);
      return;
    }
    const request = loadGate.start();
    try {
      const payload = await causeyFetch(
        `/api/mobile/event-attendance?competitionId=${encodeURIComponent(competitionId)}`,
        { token: session.access_token, signal: request.signal }
      );
      if (!loadGate.isCurrent(request)) return;
      const next = asAttendance(payload);
      if (next) {
        setAttendance(next);
        setLocalRsvp({});
        setLoadError(null);
      } else {
        setLoadError("Causey could not read who can mark going.");
      }
    } catch (err) {
      if (isAbortError(err) || !loadGate.isCurrent(request)) return;
      // A previous good payload still stands; a first failure needs to say so
      // rather than silently drop the whole card.
      setLoadError(
        err instanceof Error
          ? err.message
          : "Could not check who can mark going."
      );
    } finally {
      if (loadGate.isCurrent(request)) setLoaded(true);
    }
  }, [competitionId, loadGate, session?.access_token]);

  useEffect(() => {
    setLoaded(false);
    setAttendance(null);
    setLocalRsvp({});
    setLocalInvited([]);
    setLocalStatus({});
    setOpenedLocal([]);
    setError(null);
    setLoadError(null);
  }, [competitionId, userId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!awaitingReturn) return;
    const sub = AppState.addEventListener("change", (next) => {
      if (next !== "active") return;
      setAwaitingReturn(false);
      void load();
    });
    return () => sub.remove();
  }, [awaitingReturn, load]);

  async function rsvp(person: EventRsvpPerson, status: "going" | "not_going") {
    if (!session?.access_token) return;
    if (person.status === status) return;
    loadGate.abort();
    const previous = localRsvp[person.profileId] ?? person.status;
    setBusyKey(`${person.profileId}:rsvp`);
    setError(null);
    setLocalRsvp((current) => ({
      ...current,
      [person.profileId]: status,
    }));
    try {
      await causeyFetch("/api/mobile/rsvp", {
        token: session.access_token,
        method: "POST",
        body: {
          competitionId,
          profileId: person.profileId,
          status,
          eventSlug,
        },
      });
      notifyDeskChanged({
        competition_id: competitionId,
        profile_id: person.profileId,
        decision: status,
        competition: {
          slug: eventSlug,
          name: "",
          city: null,
          state: null,
          start_date: "",
          end_date: null,
          reg_url: regUrl,
        },
      });
      feedback("success");
      await load();
    } catch (err) {
      setLocalRsvp((current) => {
        const next = { ...current };
        if (previous === "going" || previous === "not_going") {
          next[person.profileId] = previous;
        } else {
          delete next[person.profileId];
        }
        return next;
      });
      feedback("error");
      setError(
        err instanceof Error ? err.message : "Could not save that RSVP."
      );
    } finally {
      setBusyKey(null);
    }
  }

  async function clearAnswer(person: EventRsvpPerson) {
    if (!session?.access_token) return;
    if (person.status !== "going" && person.status !== "not_going") return;
    loadGate.abort();
    const previous = localRsvp[person.profileId] ?? person.status;
    setBusyKey(`${person.profileId}:rsvp`);
    setError(null);
    setLocalRsvp((current) => ({
      ...current,
      [person.profileId]: "unanswered",
    }));
    try {
      await causeyFetch("/api/mobile/rsvp", {
        token: session.access_token,
        method: "POST",
        body: {
          competitionId,
          profileId: person.profileId,
          status: "clear",
          eventSlug,
        },
      });
      notifyDeskChanged({
        competition_id: competitionId,
        profile_id: person.profileId,
        decision: "clear",
        competition: {
          slug: eventSlug,
          name: "",
          city: null,
          state: null,
          start_date: "",
          end_date: null,
          reg_url: regUrl,
        },
      });
      feedback("success");
      await load();
    } catch (err) {
      setLocalRsvp((current) => {
        const next = { ...current };
        if (previous === "going" || previous === "not_going") {
          next[person.profileId] = previous;
        } else {
          delete next[person.profileId];
        }
        return next;
      });
      feedback("error");
      setError(
        err instanceof Error ? err.message : "Could not clear that RSVP."
      );
    } finally {
      setBusyKey(null);
    }
  }

  async function invite(person: EventRsvpPerson) {
    if (!session?.access_token) return;
    loadGate.abort();
    setBusyKey(`${person.profileId}:invite`);
    setError(null);
    try {
      await causeyFetch("/api/mobile/recommendations", {
        token: session.access_token,
        method: "POST",
        body: {
          competitionId,
          eventSlug,
          toProfileIds: [person.profileId],
        },
      });
      setLocalInvited((current) =>
        current.includes(person.profileId)
          ? current
          : [...current, person.profileId]
      );
      notifyDeskChanged();
      feedback("success");
      await load();
    } catch (err) {
      feedback("error");
      setError(
        err instanceof Error ? err.message : "Could not send that invite."
      );
    } finally {
      setBusyKey(null);
    }
  }

  async function leave(person: EventRegistrationPerson) {
    if (!session?.access_token) return;
    loadGate.abort();
    const previousReg = localStatus[person.profileId] ?? person.status;
    const rsvpPerson = (attendance?.rsvp ?? []).find(
      (row) => row.profileId === person.profileId
    );
    const previousRsvp = rsvpPerson
      ? (localRsvp[person.profileId] ?? rsvpPerson.status)
      : undefined;
    setBusyKey(`${person.profileId}:leave`);
    setError(null);
    setLocalStatus((current) => ({
      ...current,
      [person.profileId]: "not_registered",
    }));
    setLocalRsvp((current) => ({
      ...current,
      [person.profileId]: "not_going",
    }));
    try {
      await causeyFetch("/api/mobile/registration", {
        token: session.access_token,
        method: "POST",
        body: {
          competitionId,
          profileId: person.profileId,
          status: "not_registered",
        },
      });
      await causeyFetch("/api/mobile/rsvp", {
        token: session.access_token,
        method: "POST",
        body: {
          competitionId,
          profileId: person.profileId,
          status: "not_going",
          eventSlug,
        },
      });
      notifyDeskChanged({
        competition_id: competitionId,
        profile_id: person.profileId,
        decision: "not_going",
        competition: {
          slug: eventSlug,
          name: "",
          city: null,
          state: null,
          start_date: "",
          end_date: null,
          reg_url: regUrl,
        },
      });
      feedback("success");
      await load();
    } catch (err) {
      setLocalStatus((current) => {
        const next = { ...current };
        if (
          previousReg === "opened" ||
          previousReg === "registered" ||
          previousReg === "not_registered"
        ) {
          next[person.profileId] = previousReg;
        } else {
          delete next[person.profileId];
        }
        return next;
      });
      setLocalRsvp((current) => {
        const next = { ...current };
        if (previousRsvp === "going" || previousRsvp === "not_going") {
          next[person.profileId] = previousRsvp;
        } else {
          delete next[person.profileId];
        }
        return next;
      });
      feedback("error");
      setError(
        err instanceof Error
          ? err.message
          : "Could not update this event. Check your connection and try again."
      );
    } finally {
      setBusyKey(null);
    }
  }

  async function setRegistration(
    person: EventRegistrationPerson,
    status: "opened" | "registered" | "not_registered"
  ) {
    if (!session?.access_token) return;
    loadGate.abort();
    const previous = localStatus[person.profileId] ?? person.status;
    const wasConfirming =
      previous === "opened" ||
      openedLocal.includes(person.profileId) ||
      awaitingReturn;
    setBusyKey(`${person.profileId}:reg`);
    setError(null);
    setLocalStatus((current) => ({
      ...current,
      [person.profileId]: status,
    }));
    if (status === "opened") {
      setOpenedLocal((current) =>
        current.includes(person.profileId)
          ? current
          : [...current, person.profileId]
      );
    } else {
      setAwaitingReturn(false);
      setOpenedLocal((current) =>
        current.filter((id) => id !== person.profileId)
      );
    }
    try {
      await causeyFetch("/api/mobile/registration", {
        token: session.access_token,
        method: "POST",
        body: {
          competitionId,
          profileId: person.profileId,
          status,
        },
      });
      feedback("success");
      await load();
    } catch (err) {
      setLocalStatus((current) => {
        const next = { ...current };
        if (previous) next[person.profileId] = previous;
        else delete next[person.profileId];
        return next;
      });
      if (status !== "opened") {
        if (wasConfirming) {
          setOpenedLocal((current) =>
            current.includes(person.profileId)
              ? current
              : [...current, person.profileId]
          );
        }
        feedback("error");
        setError(
          err instanceof Error
            ? err.message
            : "Could not save registration."
        );
      }
    } finally {
      setBusyKey(null);
    }
  }

  async function openOrganizerSite(person?: EventRegistrationPerson) {
    const destination = regUrl ? safeRegUrl(regUrl) : null;
    if (!destination) {
      setError("This listing does not have a usable registration link.");
      return;
    }
    if (person) {
      setOpenedLocal((current) =>
        current.includes(person.profileId)
          ? current
          : [...current, person.profileId]
      );
    }
    if (person && session?.access_token) {
      void causeyFetch("/api/mobile/registration", {
        token: session.access_token,
        method: "POST",
        body: {
          competitionId,
          profileId: person.profileId,
          status: "opened",
        },
      }).catch(() => {
        /* Opening the organizer site still matters if the stamp fails. */
      });
    }
    const message = await openExternalUrl(destination);
    if (message) {
      setError("Could not open the organizer’s registration site.");
      return;
    }
    setAwaitingReturn(true);
  }

  const ended = attendance?.ended === true;
  const sentIds = new Set([
    ...(attendance?.sent_recommendation_ids ?? []),
    ...localInvited,
  ]);
  const serverRsvp = attendance?.rsvp ?? [];
  const rsvpPeople: EventRsvpPerson[] = serverRsvp.map((person) => ({
    ...person,
    status: resolveRsvpStatus({
      serverStatus: person.status,
      localStatus: localRsvp[person.profileId],
    }),
  }));
  const registrationPeople = attendance?.registration ?? [];
  const host = regUrl ? registrationHost(regUrl) : null;
  const showRsvp = Boolean(session) && rsvpPeople.length > 0 && !ended;
  const someoneGoing = rsvpPeople.some((person) => person.status === "going");
  const showRegistration =
    Boolean(regUrl) && !ended && (someoneGoing || rsvpPeople.length === 0);

  if (!session && !regUrl) return null;

  if (session && !loaded) {
    return (
      <Card>
        <Meta>Checking who can mark going…</Meta>
        {regUrl && host ? (
          <SecondaryButton
            label={`Open organizer registration on ${host}`}
            onPress={() => void openOrganizerSite()}
          />
        ) : null}
      </Card>
    );
  }

  if (!session) {
    return (
      <Card>
        <Text style={styles.heading} accessibilityRole="header">
          Are you going?
        </Text>
        <Meta>
          Going on Causey is for Family and Plan. Entry and payment still
          happen on the organizer’s site.
        </Meta>
        <LinkButton
          label="Sign in to mark going"
          onPress={() => router.push("/login")}
        />
        {regUrl && host ? (
          <SecondaryButton
            label={`Open organizer registration on ${host}`}
            onPress={() => void openOrganizerSite()}
          />
        ) : null}
        {awaitingReturn || openedLocal.length ? (
          <Meta>
            When you finish there, sign in so Causey can record that you
            registered and are going.
          </Meta>
        ) : null}
      </Card>
    );
  }

  if (!attendance && loadError) {
    return (
      <Card>
        <Text style={styles.heading} accessibilityRole="header">
          Marking going is not available right now
        </Text>
        <ErrorText>{loadError}</ErrorText>
        <PrimaryButton label="Try again" onPress={() => void load()} />
        {regUrl && host ? (
          <SecondaryButton
            label={`Open organizer registration on ${host}`}
            onPress={() => void openOrganizerSite()}
          />
        ) : null}
      </Card>
    );
  }

  if (!showRsvp && !showRegistration) return null;

  const peopleToAsk: EventRegistrationPerson[] = registrationPeople;
  const resolvedPeople = peopleToAsk.map((person) => ({
    ...person,
    status: resolveRegistrationStatus({
      serverStatus: person.status,
      localStatus: localStatus[person.profileId],
      openedLocally: openedLocal.includes(person.profileId),
    }),
  }));
  const allRegistered =
    resolvedPeople.length > 0 &&
    resolvedPeople.every((row) => row.status === "registered");
  const askingConfirm =
    !allRegistered &&
    (awaitingReturn || resolvedPeople.some((row) => row.status === "opened"));

  return (
    <Card>
      {showRsvp ? (
        <>
          <Text style={styles.heading} accessibilityRole="header">
            {rsvpHeading(rsvpPeople)}
          </Text>
          <Meta>{rsvpLede(rsvpPeople, Boolean(regUrl))}</Meta>
          {rsvpPeople.map((person) => {
            const canInvite =
              person.label !== "You" && person.status === "unanswered";
            const invitedThem = sentIds.has(person.profileId);
            const answered =
              person.status === "going" || person.status === "not_going";
            return (
            <View key={person.profileId} style={styles.block}>
              {rsvpPeople.length > 1 || person.label !== "You" ? (
                <Text style={styles.person}>{person.label}</Text>
              ) : null}
              {canInvite ? (
                invitedThem ? (
                  <Meta>
                    Waiting for {person.label} to answer on Plan. After they
                    mark Going, Family asks you to confirm organizer
                    registration.
                  </Meta>
                ) : (
                  <>
                    <PrimaryButton
                      label={`Invite ${person.label}`}
                      onPress={() => void invite(person)}
                      busy={busyKey === `${person.profileId}:invite`}
                      disabled={busyKey !== null}
                    />
                    <Meta>
                      They accept on Plan. Then you confirm organizer
                      registration on Family.
                    </Meta>
                  </>
                )
              ) : null}
              <View style={styles.row}>
                <ChoiceButton
                  label="Going"
                  active={person.status === "going"}
                  disabled={busyKey !== null}
                  onPress={() => void rsvp(person, "going")}
                />
                <ChoiceButton
                  label="Can't go"
                  active={person.status === "not_going"}
                  disabled={busyKey !== null}
                  onPress={() => void rsvp(person, "not_going")}
                />
              </View>
              {canInvite && !invitedThem ? (
                <Meta>Or answer for them if they are not on Causey.</Meta>
              ) : null}
              {answered ? (
                <LinkButton
                  label="Clear answer"
                  onPress={() => void clearAnswer(person)}
                />
              ) : null}
            </View>
            );
          })}
        </>
      ) : null}

      {showRegistration && host ? (
        <View style={showRsvp ? styles.regBlock : undefined}>
          <Text style={styles.heading} accessibilityRole="header">
            {askingConfirm
              ? "Did you finish organizer registration?"
              : allRegistered
                ? "Organizer registration is marked complete"
                : "Register on the organizer’s site"}
          </Text>
          <Meta>
            Entry and payment happen on {host}, not on Causey. Open that site,
            then confirm here so Plan stays accurate.
          </Meta>
          {resolvedPeople.map((person) => {
            const status = person.status;
            const busy =
              busyKey === `${person.profileId}:reg` ||
              busyKey === `${person.profileId}:leave`;
            const leaving = busyKey === `${person.profileId}:leave`;
            return (
              <View key={person.profileId} style={styles.block}>
                {registrationPeople.length > 1 || person.label !== "You" ? (
                  <Text style={styles.person}>{person.label}</Text>
                ) : null}
                {status === "registered" ? (
                  <>
                    <Meta>
                      Marked complete
                      {person.label !== "You" ? ` for ${person.label}` : ""}.
                      The organizer stays the source of truth for entry. Causey
                      cannot cancel organizer entry or issue a refund — open{" "}
                      {host} if you already paid and need to withdraw.
                    </Meta>
                    <SecondaryButton
                      label={
                        leaving
                          ? "Saving…"
                          : person.label !== "You"
                            ? `Can't go for ${person.label}`
                            : "Can't go"
                      }
                      onPress={() => void leave(person)}
                      disabled={busyKey !== null}
                    />
                    <LinkButton
                      label="Undo complete mark"
                      onPress={() =>
                        void setRegistration(person, "not_registered")
                      }
                    />
                    <LinkButton
                      label={`Open ${host} again`}
                      onPress={() => void openOrganizerSite(person)}
                    />
                    {error ? <ErrorText>{error}</ErrorText> : null}
                  </>
                ) : status === "opened" || (awaitingReturn && !allRegistered) ? (
                  <>
                    <Meta>
                      Causey cannot see the organizer’s checkout. Confirm after
                      registration and payment are finished
                      {person.label !== "You" ? ` for ${person.label}` : ""}.
                    </Meta>
                    <PrimaryButton
                      label="Yes, registration is complete"
                      onPress={() => void setRegistration(person, "registered")}
                      busy={busy}
                      disabled={busyKey !== null && !busy}
                    />
                    <SecondaryButton
                      label="Still need to register"
                      onPress={() =>
                        void setRegistration(person, "not_registered")
                      }
                      disabled={busyKey !== null}
                    />
                    <LinkButton
                      label="Open registration site again"
                      onPress={() => void openOrganizerSite(person)}
                    />
                    {error ? <ErrorText>{error}</ErrorText> : null}
                  </>
                ) : (
                  <>
                    <PrimaryButton
                      label={
                        person.label !== "You"
                          ? `Open organizer registration for ${person.label}`
                          : "Open organizer registration"
                      }
                      onPress={() => void openOrganizerSite(person)}
                      busy={busy}
                      disabled={busyKey !== null && !busy}
                    />
                    {status === "not_registered" ? (
                      <LinkButton
                        label="Already finished? Mark registration complete"
                        onPress={() =>
                          void setRegistration(person, "registered")
                        }
                      />
                    ) : null}
                  </>
                )}
              </View>
            );
          })}
          {registrationPeople.length === 0 ? (
            <View style={styles.block}>
              <PrimaryButton
                label="Open organizer registration"
                onPress={() => void openOrganizerSite()}
              />
              <Meta>
                {rsvpPeople.some((person) => person.label !== "You")
                  ? `Mark who is going, then confirm registration is complete after you finish on ${host}.`
                  : `Entry stays on ${host}. Confirm registration here after you finish there.`}
              </Meta>
            </View>
          ) : null}
        </View>
      ) : null}
      {error ? <ErrorText>{error}</ErrorText> : null}
    </Card>
  );
}

function ChoiceButton({
  label,
  active,
  disabled,
  onPress,
}: {
  label: string;
  active: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active, disabled }}
      style={[
        styles.choice,
        active && styles.choiceActive,
        disabled && styles.inactive,
      ]}
    >
      <Text style={[styles.choiceLabel, active && styles.choiceLabelActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  heading: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.foreground,
  },
  person: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: "700",
    color: colors.mutedStrong,
  },
  block: { marginTop: 10 },
  regBlock: {
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10 },
  choice: {
    minHeight: 44,
    minWidth: 96,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
  },
  choiceActive: {
    borderColor: colors.brandRed,
    backgroundColor: colors.accentSoft,
  },
  choiceLabel: { fontWeight: "700", color: colors.foreground },
  choiceLabelActive: { color: colors.brandRed },
  inactive: { opacity: 0.45 },
});
