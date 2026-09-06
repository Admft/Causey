import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { causeyFetch, CauseyApiError } from "./api";
import { useAuth } from "./auth";
import { feedback } from "./haptics";
import { openExternalUrl } from "./open-url";
import { colors, siteUrl } from "./theme";
import {
  Card,
  ErrorText,
  LinkButton,
  Meta,
  PrimaryButton,
} from "./ui";

type OrgType = "club" | "team" | "school";

type CoachOrg = {
  org: {
    id: string;
    slug: string;
    name: string;
    type: OrgType;
  };
  attending: boolean;
};

const TYPE_LABEL: Record<OrgType, string> = {
  club: "Club",
  team: "Team",
  school: "School",
};

/** Same gate as the website aside: only coaches with a club, team, or school roster. */
function isRosterCoach(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") return false;
  const raw = (payload as { orgs?: unknown }).orgs;
  if (!Array.isArray(raw)) return false;
  return raw.some((row) => {
    if (!row || typeof row !== "object") return false;
    const item = row as { isCoach?: unknown; has_roster?: unknown };
    return item.isCoach === true && item.has_roster === true;
  });
}

function asOrgs(payload: unknown): CoachOrg[] {
  if (!payload || typeof payload !== "object") return [];
  const raw = (payload as { orgs?: unknown }).orgs;
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const attending = (row as { attending?: unknown }).attending === true;
    const org = (row as { org?: unknown }).org;
    if (!org || typeof org !== "object") return [];
    const { id, slug, name, type } = org as Record<string, unknown>;
    if (
      typeof id !== "string" ||
      typeof slug !== "string" ||
      typeof name !== "string" ||
      (type !== "club" && type !== "team" && type !== "school")
    ) {
      return [];
    }
    return [{ org: { id, slug, name, type }, attending }];
  });
}

/**
 * Coach travel control on a public listing: mark a club, team, or school as
 * going, then invite students. Group/individual invites stay on the website
 * manage page — the phone's job is the same first tap as the website aside.
 */
export function BringRosterCard({
  competitionId,
  eventSlug,
}: {
  competitionId: string;
  eventSlug: string;
}) {
  const { session } = useAuth();
  const [orgs, setOrgs] = useState<CoachOrg[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [websiteOnly, setWebsiteOnly] = useState(false);
  const [pendingOrgId, setPendingOrgId] = useState<string | null>(null);
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");

  const load = useCallback(async () => {
    if (!session?.access_token || !competitionId) {
      setOrgs([]);
      setWebsiteOnly(false);
      setLoaded(true);
      return;
    }
    try {
      const memberships = await causeyFetch("/api/mobile/orgs", {
        token: session.access_token,
      });
      if (!isRosterCoach(memberships)) {
        setOrgs([]);
        setWebsiteOnly(false);
        setError(null);
        return;
      }
      try {
        const payload = await causeyFetch(
          `/api/mobile/org-attendance?competitionId=${encodeURIComponent(competitionId)}`,
          { token: session.access_token }
        );
        const next = asOrgs(payload);
        setOrgs(next);
        setWebsiteOnly(false);
        setError(null);
        setSelectedOrgId((current) => {
          const available = next.filter((row) => !row.attending);
          if (available.some((row) => row.org.id === current)) return current;
          return available[0]?.org.id ?? "";
        });
      } catch {
        // Parents never reach here. A coach on a server without this write
        // path should get the website event page, not a missing-route error.
        setOrgs([]);
        setWebsiteOnly(true);
        setError(null);
      }
    } catch {
      setOrgs([]);
      setWebsiteOnly(false);
      setError(null);
    } finally {
      setLoaded(true);
    }
  }, [competitionId, session?.access_token]);

  useEffect(() => {
    setLoaded(false);
    setOrgs([]);
    setError(null);
    setWebsiteOnly(false);
    void load();
  }, [load]);

  async function toggle(entry: CoachOrg) {
    if (!session?.access_token || pendingOrgId) return;
    setPendingOrgId(entry.org.id);
    setError(null);
    try {
      await causeyFetch("/api/mobile/org-attendance", {
        token: session.access_token,
        method: "POST",
        body: {
          competitionId,
          orgId: entry.org.id,
          attending: !entry.attending,
        },
      });
      feedback("success");
      await load();
    } catch (err) {
      feedback("error");
      if (err instanceof CauseyApiError && err.status === 404) {
        setOrgs([]);
        setWebsiteOnly(true);
        setError(null);
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "Could not update this event. Check your connection and try again."
        );
      }
    } finally {
      setPendingOrgId(null);
    }
  }

  if (!session) return null;
  if (!loaded) return null;
  if (websiteOnly) {
    return (
      <Card>
        <Text style={styles.heading} accessibilityRole="header">
          Bring your roster
        </Text>
        <Meta>
          Add this event to a club, team, or school calendar on the website,
          then invite its students to RSVP. Causey does not mark students going
          until they answer that invite — Family is where a parent responds.
        </Meta>
        <PrimaryButton
          label="Open event on the website"
          onPress={() => {
            void openExternalUrl(`${siteUrl}/event/${eventSlug}`);
          }}
        />
        <LinkButton label="Try again on this phone" onPress={() => void load()} />
      </Card>
    );
  }
  if (!orgs.length && !error) return null;

  const attendingOrgs = orgs.filter((row) => row.attending);
  const availableOrgs = orgs.filter((row) => !row.attending);
  const selected =
    availableOrgs.find((row) => row.org.id === selectedOrgId) ??
    availableOrgs[0];

  return (
    <Card>
      <Text style={styles.heading} accessibilityRole="header">
        Bring your roster
      </Text>
      <Meta>
        Add this event to a club, team, or school calendar, then invite its
        students to RSVP. Students and parents answer on Family — this does not
        mark them going.
      </Meta>

      {attendingOrgs.length ? (
        <View style={styles.block}>
          <Text style={styles.kicker}>Going</Text>
          {attendingOrgs.map((entry, index) => (
            <View
              key={entry.org.id}
              style={[styles.row, index === 0 && styles.rowFirst]}
            >
              <View style={styles.names}>
                <Text style={styles.orgName}>{entry.org.name}</Text>
                <Text style={styles.type}>
                  {TYPE_LABEL[entry.org.type]} calendar
                </Text>
              </View>
              <LinkButton
                label={
                  pendingOrgId === entry.org.id ? "Removing…" : "Remove"
                }
                onPress={() => void toggle(entry)}
              />
            </View>
          ))}
          <LinkButton
            label={
              attendingOrgs.length === 1
                ? "Invite roster on the website"
                : "Invite rosters on the website"
            }
            onPress={() => {
              void openExternalUrl(`${siteUrl}/event/${eventSlug}/manage`);
            }}
          />
        </View>
      ) : null}

      {selected ? (
        <View style={attendingOrgs.length ? styles.nextBlock : styles.block}>
          {availableOrgs.length > 1 ? (
            <>
              <Text style={styles.kicker}>Choose a roster</Text>
              {availableOrgs.map((entry) => {
                const active = entry.org.id === selected.org.id;
                return (
                  <Pressable
                    key={entry.org.id}
                    onPress={() => setSelectedOrgId(entry.org.id)}
                    disabled={pendingOrgId !== null}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={`${entry.org.name}, ${TYPE_LABEL[entry.org.type]}`}
                    style={[styles.choice, active && styles.choiceActive]}
                  >
                    <Text
                      style={[
                        styles.choiceLabel,
                        active && styles.choiceLabelActive,
                      ]}
                    >
                      {entry.org.name} · {TYPE_LABEL[entry.org.type]}
                    </Text>
                  </Pressable>
                );
              })}
            </>
          ) : (
            <>
              <Text style={styles.orgName}>{selected.org.name}</Text>
              <Text style={styles.type}>
                {TYPE_LABEL[selected.org.type]} roster
              </Text>
            </>
          )}
          <PrimaryButton
            label={
              pendingOrgId === selected.org.id
                ? "Marking as going…"
                : `Mark ${TYPE_LABEL[selected.org.type].toLowerCase()} as going`
            }
            onPress={() => void toggle(selected)}
            busy={pendingOrgId === selected.org.id}
            disabled={pendingOrgId !== null}
          />
        </View>
      ) : null}

      {error ? <ErrorText>{error}</ErrorText> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  heading: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.foreground,
  },
  block: { marginTop: 12 },
  nextBlock: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  kicker: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: colors.muted,
    marginBottom: 6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  rowFirst: { borderTopWidth: 0 },
  names: { flex: 1 },
  orgName: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.foreground,
  },
  type: {
    marginTop: 2,
    fontSize: 13,
    color: colors.muted,
  },
  choice: {
    minHeight: 44,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    paddingHorizontal: 14,
    marginBottom: 8,
    backgroundColor: colors.surface,
  },
  choiceActive: {
    borderColor: colors.brandRed,
    backgroundColor: colors.accentSoft,
  },
  choiceLabel: { fontWeight: "700", color: colors.foreground },
  choiceLabelActive: { color: colors.brandRed },
});
