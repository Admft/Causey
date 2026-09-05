import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import {
  DISCOVERY_CATEGORIES,
  type DiscoveryCategoryId,
} from "./categories";
import { CATEGORY_MARKS } from "./category-marks";
import { colors } from "./theme";

const TOP = DISCOVERY_CATEGORIES.filter(
  (category) => category.id !== "arts" && category.id !== "writing"
);
const BOTTOM = DISCOVERY_CATEGORIES.filter(
  (category) => category.id === "arts" || category.id === "writing"
);

function Tile({
  id,
  label,
  selected,
  onPress,
}: {
  id: DiscoveryCategoryId;
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.tile,
        selected && styles.tileSelected,
        pressed && styles.pressed,
      ]}
    >
      <Image
        source={CATEGORY_MARKS[id]}
        style={styles.mark}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
      <Text
        style={[styles.label, selected && styles.labelSelected]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** 3+2 image tiles — same layout as the website homepage type picker. */
export function CategoryTileGrid({
  value,
  onChange,
}: {
  value: DiscoveryCategoryId;
  onChange: (next: DiscoveryCategoryId) => void;
}) {
  return (
    <View style={styles.group} accessibilityRole="radiogroup">
      <Text style={styles.legend}>Competition type</Text>
      <View style={styles.row}>
        {TOP.map((category) => (
          <Tile
            key={category.id}
            id={category.id}
            label={category.shortLabel}
            selected={value === category.id}
            onPress={() => onChange(category.id)}
          />
        ))}
      </View>
      <View style={[styles.row, styles.bottomRow]}>
        {BOTTOM.map((category) => (
          <Tile
            key={category.id}
            id={category.id}
            label={category.shortLabel}
            selected={value === category.id}
            onPress={() => onChange(category.id)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { marginTop: 16 },
  legend: { fontSize: 13, fontWeight: "600", color: colors.mutedStrong },
  row: { marginTop: 8, flexDirection: "row", gap: 8 },
  bottomRow: { justifyContent: "center", paddingHorizontal: 28 },
  tile: {
    flex: 1,
    minHeight: 88,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  tileSelected: {
    borderColor: "rgba(194, 59, 50, 0.45)",
    backgroundColor: colors.accentSoft,
  },
  pressed: { opacity: 0.75 },
  mark: { width: 48, height: 48 },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.foreground,
    textAlign: "center",
  },
  labelSelected: { color: colors.brandRed },
});
