import * as Linking from "expo-linking";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { causeyFetch, formatDateRange } from "../../src/api";
import { useAuth } from "../../src/auth";
import { formatSavedAt, readCache, writeCache } from "../../src/cache";
import { feedback } from "../../src/haptics";
import { colors } from "../../src/theme";
import {
  Card,
  ErrorText,
  Kicker,
  Lede,
  Meta,
  Screen,
  Spinner,
  Title,
} from "../../src/ui";

const CACHE_KEY = "family";

type FamilyEntrant = {
  competition_id: string;
  profile_id: string;
  status: string;
  needs_organizer_registration: boolean;
  competition: {
    slug: string;
    name: string;
    city: string | null;
    state: string | null;
    start_date: string;
    end_date: string | null;
    reg_url: string | null;
  } | null;
};

type FamilyChild = {
  profile_id: string;
  display_name: string;
  orgs: { name: string; type: string }[];
  needs_action: FamilyEntrant[];
  upcoming: FamilyEntrant[];
};

type FamilyPayload = {
  children: FamilyChild[];
  pending_link_count: number;
};

export default function FamilyScreen() {
  const { session, profile } = useAuth();
  const [data, setData] = useState<FamilyPayload | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [stale, setStale] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  // Show the last good payload immediately, then reconcile with the network.
  useEffect(() => {
    let cancelled = false;
    readCache<FamilyPayload>(CACHE_KEY)
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
      const fresh = (await causeyFetch("/api/mobile/family", {
        token: session.access_token,
      })) as FamilyPayload;
      setData(fresh);
      setSavedAt(Date.now());
      setStale(false);
      setError(null);
      await writeCache(CACHE_KEY, fresh);
    } catch (err) {
      setStale(true);
      setError(err instanceof Error ? err.message : "Could not load Family.");
    } finally {
      setRefreshing(false);
    }
  }, [session?.access_token]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  async function rsvp(row: FamilyEntrant, status: "going" | "not_going") {
    if (!session?.access_token || !row.competition) return;
    setBusyKey(`${row.competition_id}:${status}`);
    try {
      await causeyFetch("/api/mobile/rsvp", {
        token: session.access_token,
        method: "POST",
        body: {
          competitionId: row.competition_id,
          profileId: row.profile_id,
          status,
          eventSlug: row.competition.slug,
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

  async function markRegistered(row: FamilyEntrant) {
    if (!session?.access_token || !row.competition) return;
    setBusyKey(`${row.competition_id}:registered`);
    try {
      await causeyFetch("/api/mobile/registration", {
        token: session.access_token,
        method: "POST",
        body: {
          competitionId: row.competition_id,
          profileId: row.profile_id,
          status: "registered",
        },
      });
      feedback("success");
      await load();
    } catch (err) {
      feedback("error");
      setError(
        err instanceof Error ? err.message : "Could not save registration."
      );
    } finally {
      setBusyKey(null);
    }
  }

  if (!hydrated || (!data && refreshing)) return <Spinner />;

  const children = data?.children ?? [];
  const pending = data?.pending_link_count ?? 0;
  const isParent = profile?.role === "parent";

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
      <Kicker>Family</Kicker>
      <Title>{isParent ? "Who needs an answer" : "Your linked students"}</Title>
      {savedAt && stale ? (
        <Meta>{formatSavedAt(savedAt)} · pull down to refresh</Meta>
      ) : null}
      {error ? <ErrorText>{error}</ErrorText> : null}
      {pending > 0 ? (
        <Meta>
          {pending} link request{pending === 1 ? "" : "s"} is waiting on the
          website.
        </Meta>
      ) : null}

      {data && !children.length ? (
        <Lede>
          {isParent
            ? "Link a student on the Causey website, then their invitations and registrations show up here."
            : "Family actions are for parent accounts. Use the Search tab to find chess tournaments."}
        </Lede>
      ) : null}

      {children.map((child) => (
        <Card key={child.profile_id}>
          <Text style={styles.childName}>{child.display_name}</Text>
          {child.orgs.length ? (
            <Meta>{child.orgs.map((org) => org.name).join(" · ")}</Meta>
          ) : null}
          {child.needs_action.map((row) => (
            <ActionRow
              key={`${row.competition_id}-action`}
              row={row}
              busy={Boolean(busyKey)}
              onGoing={() => rsvp(row, "going")}
              onNotGoing={() => rsvp(row, "not_going")}
              onRegistered={() => markRegistered(row)}
            />
          ))}
          {!child.needs_action.length ? (
            <Meta>
              {child.upcoming.length
                ? `Nothing waiting. ${child.upcoming.length} upcoming tournament${
                    child.upcoming.length === 1 ? "" : "s"
                  }.`
                : "Nothing waiting right now."}
            </Meta>
          ) : null}
        </Card>
      ))}
    </Screen>
  );
}

function ActionRow({
  row,
  busy,
  onGoing,
  onNotGoing,
  onRegistered,
}: {
  row: FamilyEntrant;
  busy: boolean;
  onGoing: () => void;
  onNotGoing: () => void;
  onRegistered: () => void;
}) {
  const event = row.competition;
  if (!event) return null;
  const regUrl = event.reg_url;

  return (
    <View style={styles.event}>
      <Text style={styles.eventName}>{event.name}</Text>
      <Meta>
        {formatDateRange(event.start_date, event.end_date)}
        {event.city ? ` · ${event.city}, ${event.state ?? ""}`.trimEnd() : ""}
      </Meta>
      {row.status === "invited" ? (
        <View style={styles.row}>
          <Pressable
            onPress={onGoing}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={`Mark going to ${event.name}`}
            accessibilityState={{ disabled: busy }}
            style={[styles.primary, busy && styles.inactive]}
          >
            <Text style={styles.primaryText}>Going</Text>
          </Pressable>
          <Pressable
            onPress={onNotGoing}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={`Mark not going to ${event.name}`}
            accessibilityState={{ disabled: busy }}
            style={[styles.secondary, busy && styles.inactive]}
          >
            <Text style={styles.secondaryText}>Can&apos;t go</Text>
          </Pressable>
        </View>
      ) : null}
      {row.needs_organizer_registration && regUrl ? (
        <View style={styles.row}>
          <Pressable
            onPress={() => Linking.openURL(regUrl)}
            accessibilityRole="button"
            accessibilityLabel={`Open organizer registration for ${event.name}`}
            style={styles.linkHit}
          >
            <Text style={styles.link}>Open organizer registration</Text>
          </Pressable>
          <Pressable
            onPress={onRegistered}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={`Mark ${event.name} registration complete`}
            accessibilityState={{ disabled: busy }}
            style={[styles.linkHit, busy && styles.inactive]}
          >
            <Text style={styles.link}>Mark registered</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  childName: { fontSize: 18, fontWeight: "700", color: colors.foreground },
  event: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  eventName: { fontSize: 16, fontWeight: "700", color: colors.foreground },
  row: { flexDirection: "row", gap: 12, marginTop: 10, flexWrap: "wrap" },
  primary: {
    minHeight: 44,
    justifyContent: "center",
    backgroundColor: colors.brandRed,
    borderRadius: 10,
    paddingHorizontal: 18,
  },
  primaryText: { color: "#ffffff", fontWeight: "700" },
  secondary: {
    minHeight: 44,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    paddingHorizontal: 18,
  },
  secondaryText: { color: colors.foreground, fontWeight: "700" },
  linkHit: { minHeight: 44, justifyContent: "center" },
  link: { color: colors.brandRed, fontWeight: "700" },
  inactive: { opacity: 0.45 },
});
