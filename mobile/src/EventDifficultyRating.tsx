import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { causeyFetch } from "./api";
import { useAuth } from "./auth";
import { colors } from "./theme";
import { Card, ErrorText, LinkButton, Meta } from "./ui";

export function EventDifficultyRating({
  competitionId,
  initialScore,
}: {
  competitionId: string;
  initialScore: number | null;
}) {
  const router = useRouter();
  const { session } = useAuth();
  const [score, setScore] = useState<number | null>(initialScore);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setScore(initialScore);
  }, [initialScore]);

  useEffect(() => {
    const token = session?.access_token;
    if (!token || !competitionId) return;
    let cancelled = false;
    causeyFetch(
      `/api/mobile/event-attendance?competitionId=${encodeURIComponent(competitionId)}`,
      { token }
    )
      .then((payload) => {
        if (cancelled) return;
        const score =
          payload && typeof payload === "object"
            ? (payload as { my_score?: unknown }).my_score
            : null;
        if (typeof score === "number") setScore(score);
        else if (score === null) setScore(null);
      })
      .catch(() => {
        /* keep initialScore */
      });
    return () => {
      cancelled = true;
    };
  }, [competitionId, session?.access_token]);

  if (!session) {
    return (
      <Card>
        <Text style={styles.heading} accessibilityRole="header">
          Difficulty (1 easy – 10 hard)
        </Text>
        <LinkButton
          label="Sign in to rate how hard this event feels"
          onPress={() => router.push("/login")}
        />
      </Card>
    );
  }

  async function rate(next: number | null) {
    if (!session?.access_token || pending) return;
    const previous = score;
    setPending(true);
    setError(null);
    setScore(next);
    try {
      const data = (await causeyFetch("/api/mobile/rating", {
        token: session.access_token,
        method: "POST",
        body: { competitionId, score: next },
      })) as { score: number | null };
      setScore(data.score);
    } catch (err) {
      setScore(previous);
      setError(
        err instanceof Error ? err.message : "Could not save that rating."
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <Text style={styles.heading} accessibilityRole="header">
        Difficulty (1 easy – 10 hard)
      </Text>
      <View
        style={styles.grid}
        accessibilityRole="radiogroup"
        accessibilityLabel="Difficulty from 1 easy to 10 hard"
      >
        <View style={styles.row}>
          {[1, 2, 3, 4, 5].map((n) => (
            <ScoreCell
              key={n}
              n={n}
              chosen={score === n}
              pending={pending}
              onPress={() => void rate(score === n ? null : n)}
            />
          ))}
        </View>
        <View style={styles.row}>
          {[6, 7, 8, 9, 10].map((n) => (
            <ScoreCell
              key={n}
              n={n}
              chosen={score === n}
              pending={pending}
              onPress={() => void rate(score === n ? null : n)}
            />
          ))}
        </View>
      </View>
      {score != null ? (
        <Meta>Tap the same number to remove your rating.</Meta>
      ) : null}
      {error ? <ErrorText>{error}</ErrorText> : null}
    </Card>
  );
}

function ScoreCell({
  n,
  chosen,
  pending,
  onPress,
}: {
  n: number;
  chosen: boolean;
  pending: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={pending}
      accessibilityRole="radio"
      accessibilityState={{ selected: chosen, disabled: pending }}
      accessibilityLabel={`Difficulty ${n}`}
      style={[styles.cell, chosen && styles.cellChosen]}
    >
      <Text style={[styles.cellLabel, chosen && styles.cellLabelChosen]}>
        {n}
      </Text>
    </Pressable>
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
  grid: {
    marginTop: 10,
    gap: 8,
  },
  row: {
    flexDirection: "row",
    gap: 8,
  },
  cell: {
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  cellChosen: {
    borderColor: colors.brandRed,
    backgroundColor: colors.accentSoft,
  },
  cellLabel: { fontSize: 15, fontWeight: "700", color: colors.foreground },
  cellLabelChosen: { color: colors.brandRed },
});
