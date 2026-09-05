import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  causeyFetch,
  dateChipParts,
  formatDateRange,
  formatFeeCents,
} from "../../src/api";
import { useAuth } from "../../src/auth";
import { CategoryTileGrid } from "../../src/CategoryTileGrid";
import { CATEGORY_MARKS } from "../../src/category-marks";
import { ChessNationalsPin } from "../../src/ChessNationalsPin";
import {
  discoveryCategory,
  type DiscoveryCategoryId,
} from "../../src/categories";
import { PathwayExplorer } from "../../src/PathwayExplorer";
import { colors } from "../../src/theme";
import {
  ChipRow,
  ErrorText,
  Field,
  Kicker,
  Lede,
  Meta,
  PrimaryButton,
  Screen,
  Title,
} from "../../src/ui";

type Timing = "upcoming" | "all";
type Sort = "soonest" | "popular";
type ChessTool = "tournaments" | "pathways";

type SearchHit = {
  slug: string;
  name: string;
  category: string;
  city: string | null;
  state: string | null;
  start_date: string;
  end_date: string | null;
  entry_fee_cents: number | null;
  image_url?: string | null;
};

const TIMING_OPTIONS: { value: Timing; label: string }[] = [
  { value: "upcoming", label: "Upcoming" },
  { value: "all", label: "All dates" },
];

const SORT_OPTIONS: { value: Sort; label: string }[] = [
  { value: "soonest", label: "Soonest" },
  { value: "popular", label: "Popular" },
];

const CHESS_TOOLS: { value: ChessTool; label: string }[] = [
  { value: "tournaments", label: "Tournaments" },
  { value: "pathways", label: "Pathways" },
];

const CARD_GAP = 12;
const CARD_WIDTH =
  (Dimensions.get("window").width - 40 - CARD_GAP) / 2;

function emptyCopy(
  type: DiscoveryCategoryId,
  timing: Timing,
  searchedZip: string | null
): string {
  const copy = discoveryCategory(type);
  const template = timing === "upcoming" ? copy.emptyUpcoming : copy.emptyAll;
  const near = searchedZip ? ` near ${searchedZip}` : "";
  return template.replace("{near}", near);
}

function ResultCard({
  row,
  onPress,
}: {
  row: SearchHit;
  onPress: () => void;
}) {
  const chip = dateChipParts(row.start_date);
  const where = row.city
    ? `${row.city}, ${row.state ?? ""}`.trimEnd()
    : null;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Open ${row.name}`}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      {row.image_url ? (
        <Image
          source={{ uri: row.image_url }}
          style={styles.cover}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.dateChip} accessibilityElementsHidden>
          <Text style={styles.chipMonth}>{chip.month}</Text>
          <Text style={styles.chipDay}>{chip.day}</Text>
        </View>
      )}
      <Text style={styles.eventName} numberOfLines={3}>
        {row.name}
      </Text>
      <Meta>
        {formatDateRange(row.start_date, row.end_date)}
        {where ? ` · ${where}` : ""}
      </Meta>
      <Meta>{formatFeeCents(row.entry_fee_cents)}</Meta>
    </Pressable>
  );
}

export default function SearchScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const [zip, setZip] = useState(profile?.zip ?? "");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<DiscoveryCategoryId>("chess");
  const [tool, setTool] = useState<ChessTool>("tournaments");
  const [timing, setTiming] = useState<Timing>("upcoming");
  const [sort, setSort] = useState<Sort>("soonest");
  const [results, setResults] = useState<SearchHit[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pulling, setPulling] = useState(false);
  const [searchedZip, setSearchedZip] = useState<string | null>(null);

  const search = useCallback(
    async (
      rawZip: string,
      nextCategory: DiscoveryCategoryId,
      nextTiming: Timing,
      nextSort: Sort,
      nextQuery: string
    ) => {
      const trimmed = rawZip.trim();
      const name = nextQuery.trim();
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          category: nextCategory,
          timing: nextTiming,
          sort: nextSort,
          limit: "20",
        });
        if (trimmed) params.set("zip", trimmed);
        if (name) params.set("q", name);
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
    },
    []
  );

  useEffect(() => {
    if (tool === "pathways") return;
    const nextZip = zip || profile?.zip || "";
    if (profile?.zip && !zip) setZip(profile.zip);
    void search(nextZip, category, timing, sort, query);
    // Zip and name wait for Search; type, timing, sort, and a loaded profile zip re-run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, profile?.zip, category, timing, sort, tool]);

  function onChangeCategory(next: DiscoveryCategoryId) {
    setCategory(next);
    if (next !== "chess") setTool("tournaments");
  }

  const selected = discoveryCategory(category);
  const noun = timing === "upcoming" ? "upcoming " : "";
  const chess = category === "chess";
  const showTournaments = tool === "tournaments" || !chess;

  return (
    <Screen
      refreshControl={
        <RefreshControl
          refreshing={pulling}
          onRefresh={async () => {
            setPulling(true);
            if (showTournaments) {
              await search(zip, category, timing, sort, query);
            }
            setPulling(false);
          }}
          tintColor={colors.brandRed}
        />
      }
    >
      <Image
        source={CATEGORY_MARKS[category]}
        style={styles.hero}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
      {showTournaments ? (
        <>
          <Kicker>{selected.label}</Kicker>
          <Title>{selected.heading}</Title>
          <Lede>{selected.description}</Lede>
        </>
      ) : null}

      <CategoryTileGrid value={category} onChange={onChangeCategory} />

      {chess ? (
        <ChipRow
          label="Chess tools"
          options={CHESS_TOOLS}
          value={tool}
          onChange={setTool}
        />
      ) : null}

      {chess && tool === "pathways" ? <PathwayExplorer /> : null}

      {showTournaments ? (
        <>
          {chess ? (
            <ChessNationalsPin onPress={() => setTool("pathways")} />
          ) : null}
          <ChipRow
            label="When"
            options={TIMING_OPTIONS}
            value={timing}
            onChange={setTiming}
          />
          <ChipRow
            label="Sort"
            options={SORT_OPTIONS}
            value={sort}
            onChange={setSort}
          />
          <Field
            label="Name"
            hint="Optional. Matches part of the listing name."
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={() =>
              void search(zip, category, timing, sort, query)
            }
          />
          <Field
            label="Zip"
            hint="Leave blank to search listings anywhere."
            value={zip}
            onChangeText={setZip}
            keyboardType="number-pad"
            maxLength={5}
            placeholder="Optional"
            returnKeyType="search"
            onSubmitEditing={() =>
              void search(zip, category, timing, sort, query)
            }
          />
          <PrimaryButton
            label="Search"
            onPress={() => void search(zip, category, timing, sort, query)}
            busy={loading}
          />

          {error ? <ErrorText>{error}</ErrorText> : null}

          {loading && !results.length ? (
            <ActivityIndicator color={colors.brandRed} style={styles.spinner} />
          ) : null}

          {!loading && !error && !results.length ? (
            <Lede>{emptyCopy(category, timing, searchedZip)}</Lede>
          ) : null}

          {results.length ? (
            <Meta>
              {results.length} {noun}listing
              {results.length === 1 ? "" : "s"}
              {searchedZip ? ` near ${searchedZip}` : ""}
            </Meta>
          ) : null}

          <View style={styles.grid}>
            {results.map((row) => (
              <ResultCard
                key={row.slug}
                row={row}
                onPress={() => router.push(`/event/${row.slug}`)}
              />
            ))}
          </View>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignSelf: "center",
    width: 96,
    height: 96,
    marginBottom: 8,
  },
  spinner: { marginTop: 24 },
  grid: {
    marginTop: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: CARD_GAP,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 12,
  },
  pressed: { opacity: 0.75 },
  cover: {
    width: "100%",
    aspectRatio: 4 / 3,
    borderRadius: 10,
    backgroundColor: colors.surfaceSoft,
    marginBottom: 8,
  },
  dateChip: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  chipMonth: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.6,
    color: colors.brandRed,
  },
  chipDay: {
    marginTop: 1,
    fontSize: 16,
    fontWeight: "800",
    color: colors.foreground,
  },
  eventName: { fontSize: 15, fontWeight: "700", color: colors.foreground },
});
