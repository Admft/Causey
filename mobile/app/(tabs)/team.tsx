import * as Linking from "expo-linking";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { causeyFetch, formatDateRange } from "../../src/api";
import { useAuth } from "../../src/auth";
import { formatSavedAt, readCache, writeCache } from "../../src/cache";
import { RoleHomeGuard } from "../../src/RoleHomeGuard";
import { colors, siteUrl } from "../../src/theme";
import {
  Card,
  ErrorText,
  Kicker,
  Lede,
  LinkButton,
  Meta,
  Screen,
  Spinner,
  Title,
} from "../../src/ui";

const CACHE_KEY = "team";

type TeamOrg = {
  id: string;
  name: string;
  slug: string;
  type: string;
  has_roster: boolean;
};

type TeamEvent = {
  competition_id: string;
  slug: string;
  name: string;
  city: string | null;
  state: string | null;
  start_date: string;
  end_date: string | null;
  relation: "hosted" | "travel";
  org_name: string;
};

type TeamPayload = {
  orgs: TeamOrg[];
  events: TeamEvent[];
  past_events?: TeamEvent[];
};

export default function TeamScreen() {
  return (
    <RoleHomeGuard home="/team">
      <TeamDesk />
    </RoleHomeGuard>
  );
}

function TeamDesk() {
  const { session } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<TeamPayload | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [stale, setStale] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    readCache<TeamPayload>(CACHE_KEY)
      .then((cached) => {
        if (cancelled || !cached) return;
        setData(cached.value);
        setSavedAt(cached.savedAt);
        setStale(true);
      })
      .finally(() => {
        if (!cancelled) setHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const load = useCallback(async () => {
    if (!session?.access_token) return;
    setRefreshing(true);
    try {
      const fresh = (await causeyFetch("/api/mobile/team", {
        token: session.access_token,
      })) as TeamPayload;
      setData(fresh);
      setSavedAt(Date.now());
      setStale(false);
      setError(null);
      await writeCache(CACHE_KEY, fresh);
    } catch (err) {
      setStale(true);
      setError(err instanceof Error ? err.message : "Could not load your team.");
    } finally {
      setRefreshing(false);
    }
  }, [session?.access_token]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  if (!hydrated || (!data && refreshing)) return <Spinner />;

  const orgs = data?.orgs ?? [];
  const events = data?.events ?? [];
  const pastEvents = data?.past_events ?? [];
  const rosterOrgs = orgs.filter((org) => org.has_roster);

  return (
    <Screen
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={load}
          tintColor={colors.brandRed}
        />
      }
    >
      <Kicker>My team</Kicker>
      <Title>{events.length ? "Next up" : "Your organizations"}</Title>
      {savedAt && stale ? (
        <Meta>{formatSavedAt(savedAt)} · pull down to refresh</Meta>
      ) : null}
      {error ? <ErrorText>{error}</ErrorText> : null}

      {data && !orgs.length ? (
        <Lede>
          You do not staff a club, team, or school yet. Create one on the Causey
          website, or ask an administrator to invite you.
        </Lede>
      ) : null}

      {events.length ? (
        <Card>
          {events.map((event) => (
            <TeamEventRow
              key={event.competition_id}
              event={event}
              onAttendance={() =>
                router.push(`/attendance/${event.competition_id}`)
              }
              onResults={() =>
                router.push(`/results/${event.competition_id}`)
              }
            />
          ))}
        </Card>
      ) : null}

      {pastEvents.length ? (
        <Card>
          <Text style={styles.sectionHeading}>Recent events</Text>
          {pastEvents.map((event) => (
            <TeamEventRow
              key={event.competition_id}
              event={event}
              onAttendance={() =>
                router.push(`/attendance/${event.competition_id}`)
              }
              onResults={() =>
                router.push(`/results/${event.competition_id}`)
              }
            />
          ))}
        </Card>
      ) : null}

      {data && orgs.length && !events.length && !pastEvents.length ? (
        <Lede>
          No upcoming tournaments for your organizations. Publish one or mark a
          public tournament as going on the website, then attendance shows up
          here.
        </Lede>
      ) : null}

      {rosterOrgs.length ? (
        <Card>
          <Text style={styles.sectionHeading}>Rosters</Text>
          {rosterOrgs.map((org) => (
            <Pressable
              key={org.id}
              onPress={() => router.push(`/roster/${org.id}`)}
              accessibilityRole="button"
              accessibilityLabel={`Open the ${org.name} roster`}
              style={({ pressed }) => [
                styles.orgRow,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.orgName}>{org.name}</Text>
              <Text style={styles.eventCta}>View roster</Text>
            </Pressable>
          ))}
        </Card>
      ) : null}

      {orgs.some((org) => !org.has_roster) ? (
        <Card>
          <Text style={styles.sectionHeading}>District office</Text>
          <Meta>
            District offices coordinate through connected schools and do not
            hold a student roster. Aggregate reporting is on the website.
          </Meta>
        </Card>
      ) : null}

      {orgs.length ? (
        <View style={styles.deskWork}>
          <Meta>
            Desk work (CSV, settings, reports) stays on the website.
          </Meta>
          <LinkButton
            label="Open my organizations on the web"
            onPress={() => Linking.openURL(`${siteUrl}/orgs`)}
          />
        </View>
      ) : null}
    </Screen>
  );
}

function TeamEventRow({
  event,
  onAttendance,
  onResults,
}: {
  event: TeamEvent;
  onAttendance: () => void;
  onResults: () => void;
}) {
  return (
    <View style={styles.eventRow}>
      <Text style={styles.eventName}>{event.name}</Text>
      <Meta>
        {formatDateRange(event.start_date, event.end_date)}
        {event.city
          ? ` · ${event.city}, ${event.state ?? ""}`.trimEnd()
          : ""}
      </Meta>
      <Meta>
        {event.relation === "hosted"
          ? `Hosted by ${event.org_name}`
          : `${event.org_name} is going`}
      </Meta>
      <Pressable
        onPress={onAttendance}
        accessibilityRole="button"
        accessibilityLabel={`Take attendance for ${event.name}`}
        style={({ pressed }) => [styles.eventCtaHit, pressed && styles.pressed]}
      >
        <Text style={styles.eventCta}>Take attendance</Text>
      </Pressable>
      <Pressable
        onPress={onResults}
        accessibilityRole="button"
        accessibilityLabel={`Record results for ${event.name}`}
        style={({ pressed }) => [styles.eventCtaHit, pressed && styles.pressed]}
      >
        <Text style={styles.eventCta}>Record results</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  eventRow: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  eventName: { fontSize: 16, fontWeight: "700", color: colors.foreground },
  eventCta: {
    color: colors.brandRed,
    fontWeight: "700",
    fontSize: 15,
  },
  eventCtaHit: {
    marginTop: 8,
    minHeight: 44,
    justifyContent: "center",
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.foreground,
    marginBottom: 4,
  },
  orgRow: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  orgName: { fontSize: 16, fontWeight: "700", color: colors.foreground },
  deskWork: { marginTop: 24 },
  pressed: { opacity: 0.6 },
});
