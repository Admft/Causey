import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { RefreshControl, StyleSheet, Text } from "react-native";
import { causeyFetch } from "../src/api";
import { useAuth } from "../src/auth";
import { RequireSession } from "../src/RequireSession";
import { colors } from "../src/theme";
import {
  Card,
  ErrorText,
  Lede,
  LinkButton,
  Meta,
  PrimaryButton,
  Screen,
  Spinner,
  Title,
} from "../src/ui";

type MobileOrg = {
  id: string;
  name: string;
  slug: string;
  type: string;
  role: string | null;
  isCoach: boolean;
  has_roster: boolean;
};

type OrgsPayload = { orgs: MobileOrg[] };

function organizationTypeLabel(type: string): string {
  if (type === "team") return "Team";
  if (type === "school") return "School";
  if (type === "district") return "District";
  return "Club";
}

function membershipRoleLabel(role: string | null, isCoach: boolean): string {
  switch (role) {
    case "student":
      return "Student";
    case "assistant_coach":
      return "Assistant coach";
    case "coach":
      return "Coach";
    case "admin":
      return "Administrator";
    case "school_admin":
      return "School administrator";
    case "district_admin":
      return "District administrator";
    default:
      return isCoach ? "Coach" : "Member";
  }
}

export default function OrgsScreen() {
  return (
    <RequireSession>
      <Stack.Screen options={{ title: "Organizations" }} />
      <OrgsBody />
    </RequireSession>
  );
}

function OrgsBody() {
  const { session } = useAuth();
  if (!session) return null;
  return <OrgsDesk token={session.access_token} />;
}

function OrgsDesk({ token }: { token: string }) {
  const router = useRouter();
  const [orgs, setOrgs] = useState<MobileOrg[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const fresh = (await causeyFetch("/api/mobile/orgs", {
        token,
      })) as OrgsPayload;
      setOrgs(fresh.orgs);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load your organizations."
      );
    } finally {
      setRefreshing(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  if (error && !orgs) {
    return (
      <Screen header>
        <Title>Your organizations</Title>
        <ErrorText>{error}</ErrorText>
        <PrimaryButton label="Try again" onPress={() => void load()} />
      </Screen>
    );
  }

  if (!orgs) return <Spinner />;

  return (
    <Screen
      header
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={load}
          tintColor={colors.brandRed}
        />
      }
    >
      <Title>Your organizations</Title>
      {error ? <ErrorText>{error}</ErrorText> : null}

      {!orgs.length ? (
        <>
          <Lede>
            You are not on a roster yet. Ask a coach for a join code.
          </Lede>
          <LinkButton
            label="Enter a join code"
            onPress={() => router.push("/join")}
          />
        </>
      ) : null}

      {orgs.map((org) => (
        <Card key={org.id}>
          <Text style={styles.name}>{org.name}</Text>
          <Meta>
            {organizationTypeLabel(org.type)} ·{" "}
            {membershipRoleLabel(org.role, org.isCoach)}
          </Meta>
          {org.has_roster && org.isCoach ? (
            <LinkButton
              label="Open roster"
              onPress={() => router.push(`/roster/${org.id}`)}
            />
          ) : null}
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  name: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.foreground,
  },
});
