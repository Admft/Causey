import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { causeyFetch, formatDateRange } from "../../src/api";
import { useAuth } from "../../src/auth";
import { feedback } from "../../src/haptics";
import { colors } from "../../src/theme";
import {
  Card,
  ErrorText,
  Kicker,
  Lede,
  LinkButton,
  Meta,
  PrimaryButton,
  Screen,
  Spinner,
  Title,
} from "../../src/ui";

type Entrant = {
  profile_id: string;
  display_name: string;
  status: string;
  section_name: string | null;
  origin_org_name: string | null;
};

type AttendancePayload = {
  competition: {
    id: string;
    slug: string;
    name: string;
    start_date: string;
    end_date: string | null;
    city: string | null;
    state: string | null;
  };
  entrants: Entrant[];
};

export default function AttendanceScreen() {
  const { competitionId } = useLocalSearchParams<{ competitionId: string }>();
  const { session } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<AttendancePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyProfile, setBusyProfile] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!competitionId || !session?.access_token) return;
    setError(null);
    try {
      const fresh = (await causeyFetch(
        `/api/mobile/attendance?competitionId=${competitionId}`,
        { token: session.access_token }
      )) as AttendancePayload;
      setData(fresh);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load attendance."
      );
    }
  }, [competitionId, session?.access_token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function mark(
    entrant: Entrant,
    status: "attended" | "did_not_attend"
  ) {
    if (!competitionId || !session?.access_token) return;
    setBusyProfile(entrant.profile_id);
    // Optimistic: a coach in a gym needs the tap to register instantly.
    setData((current) =>
      current
        ? {
            ...current,
            entrants: current.entrants.map((row) =>
              row.profile_id === entrant.profile_id ? { ...row, status } : row
            ),
          }
        : current
    );
    try {
      await causeyFetch("/api/mobile/attendance", {
        token: session.access_token,
        method: "POST",
        body: { competitionId, profileId: entrant.profile_id, status },
      });
      feedback("success");
    } catch (err) {
      feedback("error");
      setError(
        err instanceof Error ? err.message : "Could not save attendance."
      );
      await load();
    } finally {
      setBusyProfile(null);
    }
  }

  if (error && !data) {
    return (
      <Screen header>
        <Kicker>Attendance</Kicker>
        <Title>We could not open attendance</Title>
        <ErrorText>{error}</ErrorText>
        <PrimaryButton label="Try again" onPress={() => void load()} />
      </Screen>
    );
  }

  if (!data) return <Spinner />;

  const { competition, entrants } = data;
  const marked = entrants.filter(
    (row) => row.status === "attended" || row.status === "did_not_attend"
  ).length;

  return (
    <Screen header>
      <Kicker>Attendance</Kicker>
      <Title>{competition.name}</Title>
      <Meta>
        {formatDateRange(competition.start_date, competition.end_date)}
        {competition.city
          ? ` · ${competition.city}, ${competition.state ?? ""}`.trimEnd()
          : ""}
      </Meta>
      {error ? <ErrorText>{error}</ErrorText> : null}

      {!entrants.length ? (
        <Lede>
          Nobody is on this event yet. Invite your roster on the website, then
          check them in here on the day.
        </Lede>
      ) : (
        <>
          <Meta>
            {marked} of {entrants.length} marked
          </Meta>
          <Card>
            {entrants.map((entrant) => (
              <View key={entrant.profile_id} style={styles.row}>
                <Text style={styles.name}>{entrant.display_name}</Text>
                {entrant.section_name || entrant.origin_org_name ? (
                  <Meta>
                    {[entrant.origin_org_name, entrant.section_name]
                      .filter(Boolean)
                      .join(" · ")}
                  </Meta>
                ) : null}
                <View style={styles.buttons}>
                  <Pressable
                    onPress={() => mark(entrant, "attended")}
                    disabled={busyProfile === entrant.profile_id}
                    accessibilityRole="button"
                    accessibilityLabel={`Mark ${entrant.display_name} attended`}
                    accessibilityState={{
                      selected: entrant.status === "attended",
                    }}
                    style={[
                      styles.choice,
                      entrant.status === "attended" && styles.choiceOn,
                    ]}
                  >
                    <Text
                      style={[
                        styles.choiceText,
                        entrant.status === "attended" && styles.choiceTextOn,
                      ]}
                    >
                      Here
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => mark(entrant, "did_not_attend")}
                    disabled={busyProfile === entrant.profile_id}
                    accessibilityRole="button"
                    accessibilityLabel={`Mark ${entrant.display_name} did not attend`}
                    accessibilityState={{
                      selected: entrant.status === "did_not_attend",
                    }}
                    style={[
                      styles.choice,
                      entrant.status === "did_not_attend" && styles.choiceOff,
                    ]}
                  >
                    <Text
                      style={[
                        styles.choiceText,
                        entrant.status === "did_not_attend" &&
                          styles.choiceTextOff,
                      ]}
                    >
                      No show
                    </Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </Card>
          <LinkButton
            label="Record results"
            onPress={() => router.push(`/results/${competitionId}`)}
          />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  name: { fontSize: 16, fontWeight: "700", color: colors.foreground },
  buttons: { flexDirection: "row", gap: 12, marginTop: 10 },
  choice: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.fieldBorder,
    backgroundColor: colors.surface,
  },
  choiceOn: {
    borderColor: colors.brandRed,
    backgroundColor: colors.brandRed,
  },
  choiceOff: {
    borderColor: colors.mutedStrong,
    backgroundColor: colors.mutedStrong,
  },
  choiceText: { fontWeight: "700", color: colors.foreground },
  choiceTextOn: { color: "#ffffff" },
  choiceTextOff: { color: "#ffffff" },
});
