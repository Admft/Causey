import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { causeyFetch } from "../../src/api";
import { useAuth } from "../../src/auth";
import { RequireSession } from "../../src/RequireSession";
import { colors } from "../../src/theme";
import {
  Card,
  ErrorText,
  Kicker,
  Lede,
  Meta,
  PrimaryButton,
  Screen,
  Spinner,
  Title,
} from "../../src/ui";

type Student = {
  profile_id: string;
  display_name: string;
  grade: number | null;
  member_status: string;
};

type RosterPayload = {
  org: { id: string; name: string; slug: string; type: string };
  students: Student[];
};

function gradeLabel(grade: number | null): string | null {
  if (grade === null) return null;
  if (grade === 0) return "Kindergarten";
  return `Grade ${grade}`;
}

export default function RosterScreen() {
  return (
    <RequireSession>
      <RosterBody />
    </RequireSession>
  );
}

function RosterBody() {
  const { orgId } = useLocalSearchParams<{ orgId: string }>();
  const { session } = useAuth();
  const [data, setData] = useState<RosterPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!orgId) {
      setError("That link is missing an organization address.");
      return;
    }
    if (!session?.access_token) return;
    setError(null);
    try {
      const fresh = (await causeyFetch(
        `/api/mobile/roster?orgId=${encodeURIComponent(orgId)}`,
        { token: session.access_token }
      )) as RosterPayload;
      setData(fresh);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the roster.");
    }
  }, [orgId, session?.access_token]);

  useEffect(() => {
    void load();
  }, [load]);

  if (error && !data) {
    return (
      <Screen header>
        <Kicker>Roster</Kicker>
        <Title>We could not open this roster</Title>
        <ErrorText>{error}</ErrorText>
        <PrimaryButton label="Try again" onPress={() => void load()} />
      </Screen>
    );
  }

  if (!data) return <Spinner />;

  const active = data.students.filter((row) => row.member_status === "active");
  const invited = data.students.filter((row) => row.member_status === "invited");

  return (
    <Screen header>
      <Kicker>Roster</Kicker>
      <Title>{data.org.name}</Title>
      <Meta>
        {active.length} student{active.length === 1 ? "" : "s"}
        {invited.length ? ` · ${invited.length} not joined yet` : ""}
      </Meta>
      {error ? <ErrorText>{error}</ErrorText> : null}

      {!data.students.length ? (
        <Lede>
          No students yet. Share the join link or invite students on the Causey
          website.
        </Lede>
      ) : null}

      {active.length ? (
        <Card>
          {active.map((student) => (
            <View key={student.profile_id} style={styles.row}>
              <Text style={styles.name}>{student.display_name}</Text>
              {gradeLabel(student.grade) ? (
                <Meta>{gradeLabel(student.grade)}</Meta>
              ) : null}
            </View>
          ))}
        </Card>
      ) : null}

      {invited.length ? (
        <Card>
          <Text style={styles.heading}>Invited, not joined yet</Text>
          {invited.map((student) => (
            <View key={student.profile_id} style={styles.row}>
              <Text style={styles.name}>{student.display_name}</Text>
            </View>
          ))}
        </Card>
      ) : null}

      <Meta>
        Adding students, groups, and join links are on the website.
      </Meta>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  name: { fontSize: 16, fontWeight: "700", color: colors.foreground },
  heading: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.foreground,
    marginBottom: 4,
  },
});
