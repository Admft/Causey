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
import { AdvancedSearch } from "../../src/AdvancedSearch";
import {
  causeyFetch,
  dateChipParts,
  formatDateRange,
  formatFeeCents,
} from "../../src/api";
import { useAuth } from "../../src/auth";
import { CategoryTileGrid } from "../../src/CategoryTileGrid";
import { ChessNationalsPin } from "../../src/ChessNationalsPin";
import {
  discoveryCategory,
  type DiscoveryCategoryId,
} from "../../src/categories";
import { PathwayExplorer } from "../../src/PathwayExplorer";
import {
  DEFAULT_RADIUS,
  EMPTY_ADVANCED,
  RADIUS_OPTIONS,
  SORT_OPTIONS,
  advancedCount,
  filtersForCategory,
  orgGoingFilterLabel,
  type AdvancedFilters,
  type SearchSort,
} from "../../src/search-filters";
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
  SelectField,
  Title,
} from "../../src/ui";

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

const CHESS_TOOLS: { value: ChessTool; label: string }[] = [
  { value: "tournaments", label: "Tournaments" },
  { value: "pathways", label: "Pathways" },
];

const CARD_GAP = 12;
const CARD_WIDTH =
  (Dimensions.get("window").width - 40 - CARD_GAP) / 2;

function emptyCopy(
  type: DiscoveryCategoryId,
  timing: AdvancedFilters["timing"],
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
  const { profile, session } = useAuth();
  const router = useRouter();
  const [zip, setZip] = useState(profile?.zip ?? "");
  const [radius, setRadius] = useState(DEFAULT_RADIUS);
  const [query, setQuery] = useState("");
  const [zipError, setZipError] = useState<string | null>(null);
  const [category, setCategory] = useState<DiscoveryCategoryId>("chess");
  const [tool, setTool] = useState<ChessTool>("tournaments");
  const [sort, setSort] = useState<SearchSort>("soonest");
  const [filters, setFilters] = useState<AdvancedFilters>(EMPTY_ADVANCED);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [clubGoingLabel, setClubGoingLabel] = useState<string | null>(null);
  const [results, setResults] = useState<SearchHit[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pulling, setPulling] = useState(false);
  const [searchedZip, setSearchedZip] = useState<string | null>(null);

  const search = useCallback(
    async (
      rawZip: string,
      nextRadius: string,
      nextCategory: DiscoveryCategoryId,
      nextSort: SearchSort,
      nextQuery: string,
      nextFilters: AdvancedFilters,
      token?: string | null
    ) => {
      const trimmed = rawZip.trim();
      const name = nextQuery.trim();
      if (trimmed && !/^\d{5}$/.test(trimmed)) {
        setZipError("Enter a 5-digit zip code, like 75201.");
        return;
      }
      setZipError(null);
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          category: nextCategory,
          timing: nextFilters.timing,
          sort: nextSort,
          limit: "20",
        });
        if (trimmed) {
          params.set("zip", trimmed);
          params.set("radius_miles", nextRadius);
        }
        if (name) params.set("q", name);
        if (nextFilters.state) params.set("state", nextFilters.state);
        if (nextFilters.source) params.set("source", nextFilters.source);
        if (nextFilters.featured && nextCategory === "chess") {
          params.set("featured", "1");
        }
        if (nextFilters.clubGoing) params.set("club_going", "1");
        if (nextFilters.gradeBand) {
          params.set("grade_band", nextFilters.gradeBand);
        }
        if (nextFilters.ratingBand && nextCategory === "chess") {
          params.set("rating_band", nextFilters.ratingBand);
        }
        if (nextFilters.facet) params.set("facet", nextFilters.facet);
        if (nextFilters.maxFeeDollars) {
          params.set(
            "max_fee_cents",
            String(Number(nextFilters.maxFeeDollars) * 100)
          );
        }
        if (/^\d{4}-\d{2}-\d{2}$/.test(nextFilters.dateFrom)) {
          params.set("date_from", nextFilters.dateFrom);
        }
        if (/^\d{4}-\d{2}-\d{2}$/.test(nextFilters.dateTo)) {
          params.set("date_to", nextFilters.dateTo);
        }
        const data = (await causeyFetch(`/api/competitions?${params}`, {
          token,
        })) as {
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
    const token = session?.access_token;
    if (!token) {
      setClubGoingLabel(null);
      setFilters((current) =>
        current.clubGoing ? { ...current, clubGoing: false } : current
      );
      return;
    }
    let cancelled = false;
    causeyFetch("/api/mobile/orgs", { token })
      .then((body) => {
        if (cancelled) return;
        const orgs = (body as { orgs?: { type?: string }[] }).orgs ?? [];
        const types = orgs
          .map((org) => org.type)
          .filter((type): type is string => Boolean(type));
        setClubGoingLabel(types.length ? orgGoingFilterLabel(types) : null);
      })
      .catch(() => {
        if (!cancelled) setClubGoingLabel(null);
      });
    return () => {
      cancelled = true;
    };
  }, [session?.access_token]);

  useEffect(() => {
    if (tool === "pathways") return;
    const nextZip = zip || profile?.zip || "";
    if (profile?.zip && !zip) setZip(profile.zip);
    void search(
      nextZip,
      radius,
      category,
      sort,
      query,
      filters,
      session?.access_token
    );
    // Name, zip, and distance wait for Search. Type, sort, advanced filters,
    // and a loaded profile zip re-run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, profile?.zip, category, sort, filters, tool, session?.access_token]);

  function onChangeCategory(next: DiscoveryCategoryId) {
    setCategory(next);
    setFilters((current) => filtersForCategory(current, next));
    if (next !== "chess") setTool("tournaments");
  }

  const selected = discoveryCategory(category);
  const noun = filters.timing === "upcoming" ? "upcoming " : "";
  const chess = category === "chess";
  const showTournaments = tool === "tournaments" || !chess;
  const applied = advancedCount(filters);
  const showDistance = zip.trim().length > 0;

  function runSimpleSearch() {
    void search(
      zip,
      radius,
      category,
      sort,
      query,
      filters,
      session?.access_token
    );
  }

  return (
    <Screen
      refreshControl={
        <RefreshControl
          refreshing={pulling}
          onRefresh={async () => {
            setPulling(true);
            if (showTournaments) {
              await search(
                zip,
                radius,
                category,
                sort,
                query,
                filters,
                session?.access_token
              );
            }
            setPulling(false);
          }}
          tintColor={colors.brandRed}
        />
      }
    >
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
          <Field
            label="Tournament name"
            hint="Optional. Matches part of the listing name."
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={runSimpleSearch}
          />
          <View style={styles.placeRow}>
            <View style={styles.placeZip}>
              <Field
                label="Zip"
                hint="Leave blank to search listings anywhere."
                value={zip}
                onChangeText={(next) => {
                  setZip(next);
                  if (zipError) setZipError(null);
                }}
                keyboardType="number-pad"
                maxLength={5}
                placeholder="Optional"
                returnKeyType="search"
                onSubmitEditing={runSimpleSearch}
              />
              {zipError ? <ErrorText>{zipError}</ErrorText> : null}
            </View>
            {showDistance ? (
              <View style={styles.placeRadius}>
                <SelectField
                  label="Distance"
                  value={radius}
                  options={RADIUS_OPTIONS.map((miles) => ({
                    value: miles,
                    label: `within ${miles} mi`,
                  }))}
                  onChange={setRadius}
                />
              </View>
            ) : null}
          </View>
          <PrimaryButton
            label="Search"
            onPress={runSimpleSearch}
            busy={loading}
          />

          <Pressable
            onPress={() => setAdvancedOpen((open) => !open)}
            accessibilityRole="button"
            accessibilityState={{ expanded: advancedOpen }}
            accessibilityLabel={
              applied
                ? `Advanced search, ${applied} applied`
                : "Advanced search"
            }
            style={({ pressed }) => [
              styles.advancedToggle,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.advancedLabel}>
              Advanced search
              {applied ? ` · ${applied} applied` : ""}
            </Text>
            <Text style={styles.advancedCaret} accessibilityElementsHidden>
              {advancedOpen ? "▴" : "▾"}
            </Text>
          </Pressable>
          {advancedOpen ? (
            <AdvancedSearch
              filters={filters}
              onChange={setFilters}
              category={category}
              clubGoingLabel={clubGoingLabel}
            />
          ) : null}

          {chess ? (
            <ChessNationalsPin onPress={() => setTool("pathways")} />
          ) : null}

          {error ? <ErrorText>{error}</ErrorText> : null}

          {loading && !results.length ? (
            <ActivityIndicator color={colors.brandRed} style={styles.spinner} />
          ) : null}

          {!loading && !error && !results.length ? (
            <Lede>{emptyCopy(category, filters.timing, searchedZip)}</Lede>
          ) : null}

          {results.length ? (
            <Meta>
              {results.length} {noun}listing
              {results.length === 1 ? "" : "s"}
              {searchedZip ? ` near ${searchedZip}` : ""}
            </Meta>
          ) : null}

          <ChipRow
            label="Sort"
            options={SORT_OPTIONS}
            value={sort}
            onChange={setSort}
          />

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
  spinner: { marginTop: 24 },
  placeRow: { flexDirection: "row", gap: 12 },
  placeZip: { flex: 1, minWidth: 0 },
  placeRadius: { width: 148 },
  advancedToggle: {
    marginTop: 16,
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  advancedLabel: { fontSize: 14, fontWeight: "700", color: colors.foreground },
  advancedCaret: { fontSize: 14, color: colors.muted },
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
