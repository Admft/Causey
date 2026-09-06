import { Pressable, StyleSheet, Text, View } from "react-native";
import type { DiscoveryCategoryId } from "./categories";
import {
  EMPTY_ADVANCED,
  FEE_OPTIONS,
  GRADE_OPTIONS,
  RATING_OPTIONS,
  STATE_OPTIONS,
  TIMING_OPTIONS,
  advancedCount,
  childFacets,
  facetCatalog,
  primaryFacets,
  sourceOptions,
  type AdvancedFilters,
} from "./search-filters";
import { colors } from "./theme";
import {
  ChipRow,
  Field,
  LinkButton,
  SelectField,
} from "./ui";

export function AdvancedSearch({
  filters,
  onChange,
  category,
  clubGoingLabel,
}: {
  filters: AdvancedFilters;
  onChange: (next: AdvancedFilters) => void;
  category: DiscoveryCategoryId;
  clubGoingLabel: string | null;
}) {
  const openCount = advancedCount(filters);
  const facets = facetCatalog(category);
  const primaries = primaryFacets(category);
  const selectedPrimary =
    primaries.find((facet) => facet.value === filters.facet)?.value ??
    primaries.find((facet) =>
      childFacets(category, facet.value).some(
        (child) => child.value === filters.facet
      )
    )?.value ??
    "";
  const children = selectedPrimary
    ? childFacets(category, selectedPrimary)
    : [];

  return (
    <View style={styles.panel}>
      <ChipRow
        label="When"
        options={TIMING_OPTIONS}
        value={filters.timing}
        onChange={(timing) => onChange({ ...filters, timing })}
      />

      {category === "chess" ? (
        <Pressable
          onPress={() => onChange({ ...filters, featured: !filters.featured })}
          accessibilityRole="button"
          accessibilityState={{ selected: filters.featured }}
          accessibilityLabel="Featured only"
          style={[styles.toggle, filters.featured && styles.toggleOn]}
        >
          <Text
            style={[styles.toggleLabel, filters.featured && styles.toggleLabelOn]}
          >
            Featured only
          </Text>
        </Pressable>
      ) : null}

      {clubGoingLabel ? (
        <Pressable
          onPress={() =>
            onChange({ ...filters, clubGoing: !filters.clubGoing })
          }
          accessibilityRole="button"
          accessibilityState={{ selected: filters.clubGoing }}
          accessibilityLabel={clubGoingLabel}
          style={[styles.toggle, filters.clubGoing && styles.toggleOn]}
        >
          <Text
            style={[
              styles.toggleLabel,
              filters.clubGoing && styles.toggleLabelOn,
            ]}
          >
            {clubGoingLabel}
          </Text>
        </Pressable>
      ) : null}

      {facets && primaries.length ? (
        <>
          <ChipRow
            label={facets.label}
            options={[
              { value: "", label: "All" },
              ...primaries.map((facet) => ({
                value: facet.value,
                label: facet.label,
              })),
            ]}
            value={selectedPrimary}
            onChange={(next) => onChange({ ...filters, facet: next })}
          />
          {children.length ? (
            <ChipRow
              label="Type of math"
              options={[
                { value: selectedPrimary, label: "All math types" },
                ...children.map((facet) => ({
                  value: facet.value,
                  label: facet.label,
                })),
              ]}
              value={filters.facet}
              onChange={(next) => onChange({ ...filters, facet: next })}
            />
          ) : null}
        </>
      ) : null}

      <SelectField
        label="Listing source"
        value={filters.source}
        options={sourceOptions(category)}
        onChange={(source) => onChange({ ...filters, source })}
      />

      <View style={styles.pair}>
        <View style={styles.half}>
          <SelectField
            label="Grade"
            value={filters.gradeBand}
            options={GRADE_OPTIONS}
            onChange={(gradeBand) => onChange({ ...filters, gradeBand })}
          />
        </View>
        {category === "chess" ? (
          <View style={styles.half}>
            <SelectField
              label="Rating"
              value={filters.ratingBand}
              options={RATING_OPTIONS}
              onChange={(ratingBand) => onChange({ ...filters, ratingBand })}
            />
          </View>
        ) : (
          <View style={styles.half}>
            <SelectField
              label="Entry fee"
              value={filters.maxFeeDollars}
              options={FEE_OPTIONS}
              onChange={(maxFeeDollars) =>
                onChange({ ...filters, maxFeeDollars })
              }
            />
          </View>
        )}
      </View>

      {category === "chess" ? (
        <SelectField
          label="Entry fee"
          value={filters.maxFeeDollars}
          options={FEE_OPTIONS}
          onChange={(maxFeeDollars) => onChange({ ...filters, maxFeeDollars })}
        />
      ) : null}

      <SelectField
        label="State"
        value={filters.state}
        options={STATE_OPTIONS}
        onChange={(state) => onChange({ ...filters, state })}
      />

      <View style={styles.pair}>
        <View style={styles.half}>
          <Field
            label="From date"
            hint="YYYY-MM-DD"
            value={filters.dateFrom}
            onChangeText={(dateFrom) => onChange({ ...filters, dateFrom })}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Optional"
          />
        </View>
        <View style={styles.half}>
          <Field
            label="To date"
            hint="YYYY-MM-DD"
            value={filters.dateTo}
            onChangeText={(dateTo) => onChange({ ...filters, dateTo })}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Optional"
          />
        </View>
      </View>

      {openCount ? (
        <LinkButton
          label="Clear filters"
          onPress={() => onChange({ ...EMPTY_ADVANCED })}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  pair: { flexDirection: "row", gap: 12 },
  half: { flex: 1, minWidth: 0 },
  toggle: {
    marginTop: 16,
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.fieldBorder,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    justifyContent: "center",
  },
  toggleOn: {
    borderColor: "rgba(194, 59, 50, 0.45)",
    backgroundColor: colors.accentSoft,
  },
  toggleLabel: { fontSize: 14, fontWeight: "700", color: colors.foreground },
  toggleLabelOn: { color: colors.brandRed },
});
