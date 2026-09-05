import { Pressable, StyleSheet, Text } from "react-native";
import { CHESS_NATIONALS } from "./chess-nationals";
import { colors } from "./theme";

/** Red pin above chess results. Whole card opens the Pathways tool. */
export function ChessNationalsPin({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${CHESS_NATIONALS.headline}. ${CHESS_NATIONALS.ctaLabel}`}
      style={({ pressed }) => [styles.pin, pressed && styles.pressed]}
    >
      <Text style={styles.eyebrow}>{CHESS_NATIONALS.eyebrow}</Text>
      <Text style={styles.headline}>{CHESS_NATIONALS.headline}</Text>
      <Text style={styles.dek}>{CHESS_NATIONALS.dek}</Text>
      <Text style={styles.honesty}>{CHESS_NATIONALS.honesty}</Text>
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
    padding: 16,
  },
  pressed: { opacity: 0.92 },
  eyebrow: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  headline: {
    marginTop: 6,
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  dek: {
    marginTop: 6,
    color: "#ffffff",
    fontSize: 15,
    lineHeight: 21,
  },
  honesty: {
    marginTop: 8,
    color: "#ffffff",
    fontSize: 12,
    lineHeight: 16,
    opacity: 0.92,
  },
  cta: {
    marginTop: 12,
    alignSelf: "flex-start",
    color: colors.brandRed,
    backgroundColor: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    overflow: "hidden",
  },
});
