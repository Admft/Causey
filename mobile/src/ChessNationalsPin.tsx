import { Pressable, StyleSheet, Text } from "react-native";
import { CHESS_NATIONALS } from "./chess-nationals";
import { colors } from "./theme";

/** Compact red pin above chess results. Whole card opens the Pathways tool. */
export function ChessNationalsPin({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${CHESS_NATIONALS.headline}. ${CHESS_NATIONALS.ctaLabel}`}
      style={({ pressed }) => [styles.pin, pressed && styles.pressed]}
    >
      <Text style={styles.headline}>{CHESS_NATIONALS.headline}</Text>
      <Text style={styles.cta}>
        {CHESS_NATIONALS.ctaLabel}
        <Text> →</Text>
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pin: {
    marginTop: 16,
    backgroundColor: colors.brandRed,
    borderRadius: 16,
    padding: 14,
  },
  pressed: { opacity: 0.92 },
  headline: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  cta: {
    marginTop: 10,
    alignSelf: "flex-end",
    color: colors.brandRed,
    backgroundColor: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    overflow: "hidden",
  },
});
