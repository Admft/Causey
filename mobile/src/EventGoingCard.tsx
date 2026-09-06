import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  AppState,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { causeyFetch } from "./api";
import { useAuth } from "./auth";
import { feedback } from "./haptics";
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
};

function asAttendance(payload: unknown): AttendancePayload | null {
  if (!payload || typeof payload !== "object") return null;
  const row = payload as Record<string, unknown>;
  if (!Array.isArray(row.rsvp) || !Array.isArray(row.registration)) return null;
  return {
    ended: row.ended === true,
    rsvp: row.rsvp as EventRsvpPerson[],
    registration: row.registration as EventRegistrationPerson[],
  };
}

function registrationHost(regUrl: string): string {
  try {
    return new URL(regUrl).hostname.replace(/^www\./, "");
  } catch {
    return "the organizer’s site";
  }
}

function safeRegUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.toString();
  } catch {
    return null;
  }
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
  const [awaitingReturn, setAwaitingReturn] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openedLocal, setOpenedLocal] = useState<string[]>([]);

  const load = useCallback(async () => {
    if (!session?.access_token) {
      setAttendance(null);
      return;
    }
    try {
      const payload = await causeyFetch(
        `/api/mobile/event-attendance?competitionId=${encodeURIComponent(competitionId)}`,
        { token: session.access_token }
      );
      const next = asAttendance(payload);
      if (next) setAttendance(next);
    } catch {
      /* Keep the last successful payload; this card is extra to the listing. */
    }
  }, [competitionId, session?.access_token]);

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
    if (!session?.access_token || person.status === status) return;
    setBusyKey(`${person.profileId}:rsvp`);
    setError(null);
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
      feedback("success");
      await load();
    } catch (err) {
      feedback("error");
      setError(
        err instanceof Error ? err.message : "Could not save that RSVP."
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
    setBusyKey(`${person.profileId}:reg`);
    setError(null);
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
      if (status === "opened") {
        setOpenedLocal((current) =>
          current.includes(person.profileId)
            ? current
            : [...current, person.profileId]
        );
      }
      feedback("success");
      await load();
    } catch (err) {
      if (status !== "opened") {
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
    try {
      await Linking.openURL(destination);
      setAwaitingReturn(true);
    } catch {
      setError("Could not open the organizer’s registration site.");
    }
  }

  const ended = attendance?.ended === true;
  const rsvpPeople = attendance?.rsvp ?? [];
  const registrationPeople = attendance?.registration ?? [];
  const host = regUrl ? registrationHost(regUrl) : null;
  const showRsvp = Boolean(session) && rsvpPeople.length > 0 && !ended;
  const showRegistration = Boolean(regUrl) && !ended;

  if (!session && !regUrl) return null;

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

  if (!showRsvp && !showRegistration) return null;

  return (
    <Card>
      {showRsvp ? (
        <>
          <Text style={styles.heading} accessibilityRole="header">
            {rsvpPeople.length === 1 && rsvpPeople[0]?.label === "You"
              ? "Are you going?"
              : rsvpPeople.length === 1
                ? `Is ${rsvpPeople[0]?.label} going?`
                : "Who is going?"}
          </Text>
          <Meta>
            Going on Causey is for Family and Plan. It is not entry on the
            organizer’s site.
          </Meta>
          {rsvpPeople.map((person) => (
            <View key={person.profileId} style={styles.block}>
              {rsvpPeople.length > 1 || person.label !== "You" ? (
                <Text style={styles.person}>{person.label}</Text>
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
            </View>
          ))}
        </>
      ) : null}

      {showRegistration && host ? (
        <View style={showRsvp ? styles.regBlock : undefined}>
          <Text style={styles.heading} accessibilityRole="header">
            {awaitingReturn ||
            registrationPeople.some((row) => row.status === "opened") ||
            openedLocal.length
              ? "Did you finish organizer registration?"
              : registrationPeople.every((row) => row.status === "registered") &&
                  registrationPeople.length > 0
                ? "Organizer registration is marked complete"
                : "Register on the organizer’s site"}
          </Text>
          <Meta>
            Entry and payment happen on {host}, not on Causey. Open that site,
            then confirm here so Plan stays accurate.
          </Meta>
          {(registrationPeople.length
            ? registrationPeople
            : rsvpPeople.some((person) => person.label !== "You")
              ? []
              : [
                  {
                    profileId: session.user.id,
                    label: "You",
                    status: null as EventRegistrationPerson["status"],
                  },
                ]
          ).map((person) => {
            const status =
              person.status ??
              (openedLocal.includes(person.profileId) ? "opened" : null);
            const busy = busyKey === `${person.profileId}:reg`;
            return (
              <View key={person.profileId} style={styles.block}>
                {registrationPeople.length > 1 || person.label !== "You" ? (
                  <Text style={styles.person}>{person.label}</Text>
                ) : null}
                {status === "registered" ? (
                  <>
                    <Meta>
                      Marked complete{person.label !== "You" ? ` for ${person.label}` : ""}.
                      The organizer stays the source of truth for entry.
                    </Meta>
                    <LinkButton
                      label={`Open ${host} again`}
                      onPress={() => void openOrganizerSite(person)}
                    />
                    <LinkButton
                      label="Registration is still needed"
                      onPress={() =>
                        void setRegistration(person, "not_registered")
                      }
                    />
                  </>
                ) : status === "opened" || awaitingReturn ? (
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
          {registrationPeople.length === 0 &&
          rsvpPeople.some((person) => person.label !== "You") ? (
            <View style={styles.block}>
              <PrimaryButton
                label="Open organizer registration"
                onPress={() => void openOrganizerSite()}
              />
              <Meta>
                Mark who is going, then confirm registration is complete after
                you finish on {host}.
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
