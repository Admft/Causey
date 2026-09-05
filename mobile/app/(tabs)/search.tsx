import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { causeyFetch, formatDateRange, formatFeeCents } from "../../src/api";
import { useAuth } from "../../src/auth";
import { colors } from "../../src/theme";
import {
  ErrorText,
  Field,
  Kicker,
  Lede,
  Meta,
  PrimaryButton,
  Screen,
  Title,
} from "../../src/ui";

type SearchHit = {
  slug: string;
  name: string;
  city: string | null;
  state: string | null;
  start_date: string;
  end_date: string | null;
  entry_fee_cents: number | null;
};

export default function SearchScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const [zip, setZip] = useState(profile?.zip ?? "");
  const [results, setResults] = useState<SearchHit[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pulling, setPulling] = useState(false);
  const [searchedZip, setSearchedZip] = useState<string | null>(null);

  const search = useCallback(async (rawZip: string) => {
    const trimmed = rawZip.trim();
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        category: "chess",
        timing: "upcoming",
        sort: "soonest",
        limit: "20",
      });
      if (trimmed) params.set("zip", trimmed);
      const data = (await causeyFetch(`/api/competitions?${params}`)) as {
        results: SearchHit[];
      };
      setResults(data.results ?? []);
      setSearchedZip(trimmed || null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not run that search."
      );
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Open with the soonest upcoming chess instead of an empty form.
  useEffect(() => {
    void search(profile?.zip ?? "");
  }, [search, profile?.zip]);

  return (
    <Screen
      refreshControl={
        <RefreshControl
          refreshing={pulling}
          onRefresh={async () => {
            setPulling(true);
            await search(zip);
            setPulling(false);
          }}
          tintColor={colors.brandRed}
        />
      }
    >
      <Kicker>Chess</Kicker>
      <Title>Find a tournament</Title>
      <Lede>
        Coverage is incomplete. Confirm dates and fees on the organizer&apos;s
        site before you travel.
      </Lede>
      <Field
        label="Zip"
        hint="Leave blank to see the soonest tournaments anywhere."
        value={zip}
        onChangeText={setZip}
        keyboardType="number-pad"
        maxLength={5}
        placeholder="Optional"
        returnKeyType="search"
        onSubmitEditing={() => void search(zip)}
      />
      <PrimaryButton
        label="Search tournaments"
        onPress={() => void search(zip)}
        busy={loading}
      />

      {error ? <ErrorText>{error}</ErrorText> : null}

      {loading && !results.length ? (
        <ActivityIndicator color={colors.brandRed} style={styles.spinner} />
      ) : null}

      {!loading && !error && !results.length ? (
        <Lede>
          {searchedZip
            ? `No upcoming chess tournaments near ${searchedZip} yet. Try a nearby zip, or clear it to search everywhere.`
            : "No upcoming chess tournaments are listed right now."}
        </Lede>
      ) : null}

      {results.length ? (
        <Meta>
          {results.length} upcoming tournament
          {results.length === 1 ? "" : "s"}
          {searchedZip ? ` near ${searchedZip}` : ""}
        </Meta>
      ) : null}

      {results.map((row) => (
        <Pressable
          key={row.slug}
          onPress={() => router.push(`/event/${row.slug}`)}
          accessibilityRole="button"
          accessibilityLabel={`Open ${row.name}`}
          style={({ pressed }) => [styles.card, pressed && styles.pressed]}
        >
          <Text style={styles.eventName}>{row.name}</Text>
          <View>
            <Meta>
              {formatDateRange(row.start_date, row.end_date)}
              {row.city ? ` · ${row.city}, ${row.state ?? ""}`.trimEnd() : ""}
            </Meta>
            <Meta>{formatFeeCents(row.entry_fee_cents)}</Meta>
          </View>
        </Pressable>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  spinner: { marginTop: 24 },
  card: {
    marginTop: 12,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
  },
  pressed: { opacity: 0.75 },
  eventName: { fontSize: 16, fontWeight: "700", color: colors.foreground },
});
