import { useEffect, useState } from "react";
import { StyleSheet, Text } from "react-native";
import { causeyFetch } from "./api";
import { useAuth } from "./auth";
import { colors } from "./theme";
import { Card } from "./ui";

type ClubGoingGroup = { org_name: string; names: string[] };

function asGroups(payload: unknown): ClubGoingGroup[] {
  if (!payload || typeof payload !== "object") return [];
  const raw = (payload as { groups?: unknown }).groups;
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const org_name = (row as { org_name?: unknown }).org_name;
    const names = (row as { names?: unknown }).names;
    if (typeof org_name !== "string" || !Array.isArray(names)) return [];
    const labeled = names.filter((name): name is string => typeof name === "string");
    if (!labeled.length) return [];
    return [{ org_name, names: labeled }];
  });
}

/**
 * Signed-in teammates who marked going, grouped like the website event page.
 * Unsigned visitors get nothing — search stays public without a sign-in nag.
 */
export function ClubGoingCard({ competitionId }: { competitionId: string }) {
  const { session } = useAuth();
  const [groups, setGroups] = useState<ClubGoingGroup[]>([]);

  useEffect(() => {
    const token = session?.access_token;
    if (!token || !competitionId) {
      setGroups([]);
      return;
    }

    let cancelled = false;
    causeyFetch(
      `/api/mobile/club-going?competitionId=${encodeURIComponent(competitionId)}`,
      { token }
    )
      .then((payload) => {
        if (!cancelled) setGroups(asGroups(payload));
      })
      .catch(() => {
        if (!cancelled) setGroups([]);
      });

    return () => {
      cancelled = true;
    };
  }, [competitionId, session?.access_token]);

  if (!session) return null;
  if (!groups.length) return null;

  return (
    <Card>
      <Text style={styles.heading} accessibilityRole="header">
        Going from your club or school
      </Text>
      {groups.map((group) => (
        <Text key={group.org_name} style={styles.group}>
          <Text style={styles.orgName}>{group.org_name}: </Text>
          {group.names.join(", ")}
        </Text>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  heading: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.2,
    color: colors.mutedStrong,
    textTransform: "uppercase",
  },
  group: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    color: colors.mutedStrong,
  },
  orgName: { fontWeight: "700", color: colors.foreground },
});
