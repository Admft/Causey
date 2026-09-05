import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { RefreshControl } from "react-native";
import { causeyFetch } from "../../src/api";
import { useAuth } from "../../src/auth";
import { formatSavedAt, readCache, writeCache } from "../../src/cache";
import { EntrantRow, type EntrantRowData } from "../../src/EntrantRow";
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

const CACHE_KEY = "plan";

type PlanPayload = {
  needs_action: EntrantRowData[];
  upcoming: EntrantRowData[];
};

export default function PlanScreen() {
  return (
    <RoleHomeGuard home="/plan">
      <PlanDesk />
    </RoleHomeGuard>
  );
}

function PlanDesk() {
  const { session } = useAuth();
  const [data, setData] = useState<PlanPayload | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [stale, setStale] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    readCache<PlanPayload>(CACHE_KEY)
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
      const fresh = (await causeyFetch("/api/mobile/plan", {
        token: session.access_token,
      })) as PlanPayload;
      setData(fresh);
      setSavedAt(Date.now());
      setStale(false);
      setError(null);
      await writeCache(CACHE_KEY, fresh);
    } catch (err) {
      setStale(true);
      setError(
        err instanceof Error ? err.message : "Could not load your tournaments."
      );
    } finally {
      setRefreshing(false);
    }
  }, [session?.access_token]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  async function rsvp(row: EntrantRowData, status: "going" | "not_going") {
    if (!session?.access_token || !row.competition) return;
    setBusy(true);
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
      setBusy(false);
    }
  }

  async function markRegistered(row: EntrantRowData) {
    if (!session?.access_token) return;
    setBusy(true);
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
      setBusy(false);
    }
  }

  if (!hydrated || (!data && refreshing)) return <Spinner />;

  const needsAction = data?.needs_action ?? [];
  const upcoming = data?.upcoming ?? [];

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
      <Kicker>My tournaments</Kicker>
      <Title>
        {needsAction.length ? "Waiting on you" : "Your upcoming tournaments"}
      </Title>
      {savedAt && stale ? (
        <Meta>{formatSavedAt(savedAt)} · pull down to refresh</Meta>
      ) : null}
      {error ? <ErrorText>{error}</ErrorText> : null}

      {data && !upcoming.length ? (
        <Lede>
          Nothing on your calendar yet. Use the Search tab to find a chess
          tournament, or wait for a coach invitation.
        </Lede>
      ) : null}

      {needsAction.length ? (
        <Card>
          {needsAction.map((row) => (
            <EntrantRow
              key={`${row.competition_id}-action`}
              row={row}
              busy={busy}
              onGoing={() => rsvp(row, "going")}
              onNotGoing={() => rsvp(row, "not_going")}
              onRegistered={() => markRegistered(row)}
            />
          ))}
        </Card>
      ) : null}

      {upcoming.length ? (
        <Card>
          <Meta>
            {upcoming.length} upcoming tournament
            {upcoming.length === 1 ? "" : "s"}
          </Meta>
          {upcoming.map((row) => (
            <EntrantRow
              key={`${row.competition_id}-upcoming`}
              row={row}
              busy={busy}
              onGoing={() => rsvp(row, "going")}
              onNotGoing={() => rsvp(row, "not_going")}
              onRegistered={() => markRegistered(row)}
            />
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}
