import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { RefreshControl, StyleSheet, Text } from "react-native";
import { causeyFetch } from "../../src/api";
import { useAuth } from "../../src/auth";
import { formatSavedAt, readCache, writeCache } from "../../src/cache";
import { EntrantRow, type EntrantRowData } from "../../src/EntrantRow";
import {
  actionEntrants,
  mapEntrantDecision,
  type EntrantTap,
} from "../../src/entrant-decision";
import { feedback } from "../../src/haptics";
import { RoleHomeGuard } from "../../src/RoleHomeGuard";
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

type FamilyEntrant = EntrantRowData;

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

function applyFamilyTap(
  current: FamilyPayload | null,
  row: FamilyEntrant,
  decision: EntrantTap
): FamilyPayload | null {
  if (!current) return current;
  return {
    ...current,
    children: current.children.map((child) => {
      const upcoming = mapEntrantDecision(child.upcoming, row, decision);
      return {
        ...child,
        upcoming,
        needs_action: actionEntrants(upcoming),
      };
    }),
  };
}

export default function FamilyScreen() {
  return (
    <RoleHomeGuard home="/family">
      <FamilyDesk />
    </RoleHomeGuard>
  );
}

function FamilyDesk() {
  const { session, profile } = useAuth();
  const userId = session?.user.id ?? null;
  const [data, setData] = useState<FamilyPayload | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [stale, setStale] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  // Show this account's last good payload, then reconcile with the network.
  // Dropping `data` first is what stops one account's children from flashing
  // into the next account's screen on a shared phone.
  useEffect(() => {
    let cancelled = false;
    setData(null);
    setSavedAt(null);
    setHydrated(false);
    if (!userId) {
      setHydrated(true);
      return;
    }
    readCache<FamilyPayload>(CACHE_KEY, userId)
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
  }, [userId]);

  const load = useCallback(async () => {
    if (!session?.access_token || !userId) return;
    setRefreshing(true);
    try {
      const fresh = (await causeyFetch("/api/mobile/family", {
        token: session.access_token,
      })) as FamilyPayload;
      setData(fresh);
      setSavedAt(Date.now());
      setStale(false);
      setError(null);
      await writeCache(CACHE_KEY, userId, fresh);
    } catch (err) {
      setStale(true);
      setError(err instanceof Error ? err.message : "Could not load Family.");
    } finally {
      setRefreshing(false);
    }
  }, [session?.access_token, userId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  async function rsvp(row: FamilyEntrant, status: "going" | "not_going") {
    if (!session?.access_token || !row.competition) return;
    const previous = data;
    setBusyKey(`${row.competition_id}:${status}`);
    setData((current) => applyFamilyTap(current, row, status));
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
      setData(previous);
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
    const previous = data;
    setBusyKey(`${row.competition_id}:registered`);
    setData((current) => applyFamilyTap(current, row, "registered"));
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
      setData(previous);
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
            : "Family actions are for parent accounts. Use the Search tab to find tournaments."}
        </Lede>
      ) : null}

      {children.map((child) => (
        <Card key={child.profile_id}>
          <Text style={styles.childName}>{child.display_name}</Text>
          {child.orgs.length ? (
            <Meta>{child.orgs.map((org) => org.name).join(" · ")}</Meta>
          ) : null}
          {child.needs_action.map((row) => (
            <EntrantRow
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

const styles = StyleSheet.create({
  childName: { fontSize: 18, fontWeight: "700", color: colors.foreground },
});
