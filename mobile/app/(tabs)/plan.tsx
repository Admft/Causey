import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
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
import {
  createRequestGate,
  isAbortError,
} from "../../src/request-gate";
import {
  deskChangeRow,
  onDeskChanged,
} from "../../src/desk-sync";
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

type PlanRecommendation = {
  id: string;
  from_name: string;
  note: string | null;
  competition: EntrantRowData["competition"];
};

type PlanPayload = {
  needs_action: EntrantRowData[];
  upcoming: EntrantRowData[];
  recommendations: PlanRecommendation[];
};

function applyPlanTap(
  current: PlanPayload | null,
  row: EntrantRowData,
  decision: EntrantTap
): PlanPayload | null {
  if (!current) return current;
  const upcoming = mapEntrantDecision(current.upcoming, row, decision);
  return {
    upcoming,
    needs_action: actionEntrants(upcoming),
    recommendations: current.recommendations,
  };
}

export default function PlanScreen() {
  return (
    <RoleHomeGuard home="/plan">
      <PlanDesk />
    </RoleHomeGuard>
  );
}

function PlanDesk() {
  const router = useRouter();
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const [data, setData] = useState<PlanPayload | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [stale, setStale] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [busy, setBusy] = useState(false);
  const loadGate = useRef(createRequestGate()).current;

  // Scoped to this account, and cleared first, so a shared phone never shows
  // the previous student's tournaments to the next one.
  useEffect(() => {
    let cancelled = false;
    setData(null);
    setSavedAt(null);
    setHydrated(false);
    if (!userId) {
      setHydrated(true);
      return;
    }
    readCache<PlanPayload>(CACHE_KEY, userId)
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
    const request = loadGate.start();
    setRefreshing(true);
    try {
      const fresh = (await causeyFetch("/api/mobile/plan", {
        token: session.access_token,
        signal: request.signal,
      })) as PlanPayload;
      if (!loadGate.isCurrent(request)) return;
      setData(fresh);
      setSavedAt(Date.now());
      setStale(false);
      setError(null);
      await writeCache(CACHE_KEY, userId, fresh);
    } catch (err) {
      if (isAbortError(err) || !loadGate.isCurrent(request)) return;
      setStale(true);
      setError(
        err instanceof Error ? err.message : "Could not load your tournaments."
      );
    } finally {
      if (loadGate.isCurrent(request)) setRefreshing(false);
    }
  }, [loadGate, session?.access_token, userId]);

  useEffect(() => {
    return onDeskChanged((change) => {
      // A parent answering for their student on an event screen must not add
      // that student's tournament to the parent's own Plan.
      if (change && change.profile_id === userId) {
        setData((current) =>
          applyPlanTap(current, deskChangeRow(change), change.decision)
        );
      }
      void load();
    });
  }, [load, userId]);

  useFocusEffect(
    useCallback(() => {
      void load();
      return () => loadGate.abort();
    }, [load, loadGate])
  );

  async function rsvp(row: EntrantRowData, status: "going" | "not_going") {
    if (!session?.access_token || !row.competition) return;
    if (row.status === status) return;
    loadGate.abort();
    const previous = data;
    setBusy(true);
    setData((current) => applyPlanTap(current, row, status));
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
      setBusy(false);
    }
  }

  async function clearAnswer(row: EntrantRowData) {
    if (!session?.access_token || !row.competition) return;
    if (row.status !== "going" && row.status !== "not_going") return;
    loadGate.abort();
    const previous = data;
    setBusy(true);
    setData((current) => applyPlanTap(current, row, "clear"));
    try {
      await causeyFetch("/api/mobile/rsvp", {
        token: session.access_token,
        method: "POST",
        body: {
          competitionId: row.competition_id,
          profileId: row.profile_id,
          status: "clear",
          eventSlug: row.competition.slug,
        },
      });
      feedback("success");
      await load();
    } catch (err) {
      setData(previous);
      feedback("error");
      setError(
        err instanceof Error ? err.message : "Could not clear that RSVP."
      );
    } finally {
      setBusy(false);
    }
  }

  async function dismissRecommendation(id: string) {
    if (!session?.access_token) return;
    loadGate.abort();
    const previous = data;
    setBusy(true);
    setData((current) =>
      current
        ? {
            ...current,
            recommendations: current.recommendations.filter(
              (row) => row.id !== id
            ),
          }
        : current
    );
    try {
      await causeyFetch("/api/mobile/recommendations", {
        token: session.access_token,
        method: "POST",
        body: { action: "dismiss", id },
      });
      feedback("success");
      await load();
    } catch (err) {
      setData(previous);
      feedback("error");
      setError(
        err instanceof Error ? err.message : "Could not dismiss that."
      );
    } finally {
      setBusy(false);
    }
  }

  async function markRegistered(row: EntrantRowData) {
    if (!session?.access_token) return;
    loadGate.abort();
    const previous = data;
    setBusy(true);
    setData((current) => applyPlanTap(current, row, "registered"));
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
      setBusy(false);
    }
  }

  if (!hydrated || (!data && refreshing)) return <Spinner />;

  const needsAction = data?.needs_action ?? [];
  const upcoming = data?.upcoming ?? [];
  const recommendations = data?.recommendations ?? [];

  return (
    <Screen
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            if (busy) return;
            void load();
          }}
          tintColor={colors.brandRed}
        />
      }
    >
      <Kicker>My tournaments</Kicker>
      <Title>
        {needsAction.length || recommendations.length
          ? "Waiting on you"
          : "Your upcoming tournaments"}
      </Title>
      {savedAt && stale ? (
        <Meta>{formatSavedAt(savedAt)} · pull down to refresh</Meta>
      ) : null}
      {error ? <ErrorText>{error}</ErrorText> : null}

      {data && !upcoming.length && !recommendations.length ? (
        <Lede>
          Nothing on your calendar yet. Use the Search tab to find a tournament,
          or wait for a parent or coach invitation.
        </Lede>
      ) : null}

      {recommendations.length ? (
        <Card>
          <Meta>Recommended to you — open the event to say Going</Meta>
          {recommendations.map((rec) => {
            const event = rec.competition;
            if (!event) return null;
            return (
              <View key={rec.id} style={styles.rec}>
                <Pressable
                  onPress={() =>
                    router.push(`/event/${encodeURIComponent(event.slug)}`)
                  }
                  accessibilityRole="link"
                  accessibilityLabel={`Open ${event.name}`}
                  style={styles.nameHit}
                >
                  <Text style={styles.eventName}>{event.name}</Text>
                  <Meta>
                    from {rec.from_name}
                    {rec.note ? ` — “${rec.note}”` : ""}
                  </Meta>
                </Pressable>
                <Pressable
                  onPress={() => void dismissRecommendation(rec.id)}
                  disabled={busy}
                  accessibilityRole="button"
                  accessibilityLabel={`Dismiss ${event.name}`}
                  style={styles.nameHit}
                >
                  <Text style={styles.dismiss}>Dismiss</Text>
                </Pressable>
              </View>
            );
          })}
        </Card>
      ) : null}

      {needsAction.length ? (
        <Card>
          {needsAction.map((row) => (
            <EntrantRow
              key={`action:${row.profile_id}:${row.competition_id}`}
              row={row}
              busy={busy}
              onGoing={() => rsvp(row, "going")}
              onNotGoing={() => rsvp(row, "not_going")}
              onRegistered={() => markRegistered(row)}
              onClear={() => void clearAnswer(row)}
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
              key={`upcoming:${row.profile_id}:${row.competition_id}`}
              row={row}
              busy={busy}
              onGoing={() => rsvp(row, "going")}
              onNotGoing={() => rsvp(row, "not_going")}
              onRegistered={() => markRegistered(row)}
              onClear={() => void clearAnswer(row)}
            />
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  rec: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  nameHit: { minHeight: 44, justifyContent: "center" },
  eventName: { fontSize: 16, fontWeight: "700", color: colors.foreground },
  dismiss: { color: colors.brandRed, fontWeight: "700" },
});
