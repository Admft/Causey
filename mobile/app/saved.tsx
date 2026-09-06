import { Redirect, Stack, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, RefreshControl, StyleSheet, Text } from "react-native";
import { causeyFetch, formatDateRange } from "../src/api";
import { useAuth } from "../src/auth";
import { categoryLabel } from "../src/categories";
import { colors } from "../src/theme";
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
} from "../src/ui";

type SavedListing = {
  competition_id: string;
  slug: string;
  name: string;
  category: string;
  city: string | null;
  state: string | null;
  start_date: string;
  end_date: string | null;
};

export default function SavedScreen() {
  const router = useRouter();
  const { session, access } = useAuth();
  const userId = session?.user.id ?? null;
  const [saved, setSaved] = useState<SavedListing[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Bookmarks belong to one account. This screen also serves guests, so it
  // cannot sit behind RequireSession and has to drop the list itself.
  useEffect(() => {
    setSaved(null);
    setError(null);
  }, [userId]);

  const load = useCallback(async () => {
    if (!session?.access_token) return;
    setRefreshing(true);
    try {
      const data = (await causeyFetch("/api/mobile/saved", {
        token: session.access_token,
      })) as { saved: SavedListing[] };
      setSaved(data.saved ?? []);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load saved listings."
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

  if (session && access && access.allowed === false) {
    return <Redirect href="/blocked" />;
  }

  return (
    <>
      <Stack.Screen options={{ title: "Saved listings" }} />
      <SavedBody
        session={session}
        saved={saved}
        error={error}
        refreshing={refreshing}
        onRefresh={load}
        onSignIn={() => router.push("/login")}
        onOpen={(slug) => router.push(`/event/${slug}`)}
      />
    </>
  );
}

function SavedBody({
  session,
  saved,
  error,
  refreshing,
  onRefresh,
  onSignIn,
  onOpen,
}: {
  session: { access_token: string } | null;
  saved: SavedListing[] | null;
  error: string | null;
  refreshing: boolean;
  onRefresh: () => Promise<void>;
  onSignIn: () => void;
  onOpen: (slug: string) => void;
}) {
  if (!session) {
    return (
      <Screen header>
        <Kicker>Saved</Kicker>
        <Title>Saved listings</Title>
        <Lede>
          Saved listings are bookmarks for this account. Open a tournament and
          save it.
        </Lede>
        <LinkButton label="Sign in" onPress={onSignIn} />
      </Screen>
    );
  }

  if (saved === null && !error) return <Spinner />;

  const rows = saved ?? [];

  return (
    <Screen
      header
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void onRefresh()}
          tintColor={colors.brandRed}
        />
      }
    >
      <Kicker>Saved</Kicker>
      <Title>Saved listings</Title>
      {error ? <ErrorText>{error}</ErrorText> : null}
      {error ? (
        <PrimaryButton label="Try again" onPress={() => void onRefresh()} />
      ) : null}
      {!error && !rows.length ? (
        <Lede>
          Saved listings are bookmarks for this account. Open a tournament and
          save it.
        </Lede>
      ) : null}
      {rows.map((row) => {
        const place = [row.city, row.state].filter(Boolean).join(", ");
        return (
          <Card key={row.competition_id}>
            <Pressable
              onPress={() => onOpen(row.slug)}
              accessibilityRole="button"
              accessibilityLabel={`Open ${row.name}`}
            >
              <Kicker>{categoryLabel(row.category)}</Kicker>
              <Text style={styles.eventName}>{row.name}</Text>
              <Meta>
                {formatDateRange(row.start_date, row.end_date)}
                {place ? ` · ${place}` : ""}
              </Meta>
            </Pressable>
          </Card>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  eventName: { fontSize: 16, fontWeight: "700", color: colors.foreground },
});
