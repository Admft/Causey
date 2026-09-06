import { useEffect, useRef } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
} from "react-native";
import { CHESS_NATIONALS } from "./chess-nationals";
import { colors } from "./theme";

/** Same slow pass + rest as the website `.partner-promo-face` sheen. */
function PinSheen() {
  const shift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let active = true;
    let loop: Animated.CompositeAnimation | null = null;

    void AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (!active || reduce) return;
      loop = Animated.loop(
        Animated.sequence([
          Animated.delay(900),
          Animated.timing(shift, {
            toValue: 1,
            duration: 1150,
            easing: Easing.bezier(0.22, 1, 0.36, 1),
            useNativeDriver: true,
          }),
          Animated.delay(4450),
          Animated.timing(shift, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
    });

    return () => {
      active = false;
      loop?.stop();
      shift.stopAnimation();
    };
  }, [shift]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.sheen,
        {
          opacity: shift.interpolate({
            inputRange: [0, 0.08, 1],
            outputRange: [0.85, 0.85, 0],
          }),
          transform: [
            {
              translateX: shift.interpolate({
                inputRange: [0, 1],
                outputRange: [-90, 360],
              }),
            },
            { skewX: "-18deg" },
          ],
        },
      ]}
    />
  );
}

/** Compact red pin above chess results. Whole card opens the Pathways tool. */
export function ChessNationalsPin({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${CHESS_NATIONALS.headline}. ${CHESS_NATIONALS.honesty} ${CHESS_NATIONALS.ctaLabel}`}
      style={({ pressed }) => [styles.pin, pressed && styles.pressed]}
    >
      <Text style={styles.headline}>{CHESS_NATIONALS.headline}</Text>
      <Text style={styles.honesty}>{CHESS_NATIONALS.honesty}</Text>
      <Text style={styles.cta}>
        {CHESS_NATIONALS.ctaLabel}
        <Text> →</Text>
      </Text>
      <PinSheen />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pin: {
    marginTop: 16,
    overflow: "hidden",
    backgroundColor: colors.brandRed,
    borderRadius: 16,
    padding: 14,
  },
  sheen: {
    position: "absolute",
    top: 0,
    bottom: 0,
    zIndex: 2,
    width: 72,
    backgroundColor: "rgba(255, 255, 255, 0.32)",
  },
  pressed: { opacity: 0.92 },
  headline: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  honesty: {
    marginTop: 8,
    color: "rgba(255, 255, 255, 0.92)",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
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
