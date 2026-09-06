import { useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type TextInputProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "./theme";

/** Apple HIG minimum comfortable tap target. */
const TAP_TARGET = 44;

/**
 * `header` means a navigation header is already drawn above this screen, so the
 * top inset is spoken for and adding it again would double-pad the title.
 */
export function Screen({
  children,
  header = false,
  refreshControl,
}: {
  children: ReactNode;
  header?: boolean;
  refreshControl?: React.ComponentProps<typeof ScrollView>["refreshControl"];
}) {
  return (
    <SafeAreaView
      style={styles.safe}
      edges={header ? ["left", "right"] : ["top", "left", "right"]}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={refreshControl}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function Kicker({ children }: { children: ReactNode }) {
  return <Text style={styles.kicker}>{children}</Text>;
}

export function Title({ children }: { children: ReactNode }) {
  return (
    <Text style={styles.title} accessibilityRole="header">
      {children}
    </Text>
  );
}

export function Lede({ children }: { children: ReactNode }) {
  return <Text style={styles.lede}>{children}</Text>;
}

export function Meta({ children }: { children: ReactNode }) {
  return <Text style={styles.meta}>{children}</Text>;
}

export function ErrorText({ children }: { children: ReactNode }) {
  return (
    <Text style={styles.error} accessibilityLiveRegion="polite" role="alert">
      {children}
    </Text>
  );
}

export function Card({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

export function Field({
  label,
  hint,
  value,
  onChangeText,
  ...rest
}: {
  label: string;
  hint?: string;
  value: string;
  onChangeText: (next: string) => void;
  keyboardType?: KeyboardTypeOptions;
} & TextInputProps) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        style={styles.field}
        placeholderTextColor={colors.muted}
        accessibilityLabel={label}
        {...rest}
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

/** Closed row that expands into the option list — no native picker module. */
export function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly { value: string; label: string }[];
  onChange: (next: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected =
    options.find((option) => option.value === value) ?? options[0];
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        onPress={() => setOpen((next) => !next)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${label}: ${selected?.label ?? ""}`}
        style={({ pressed }) => [styles.field, pressed && styles.pressed]}
      >
        <Text style={styles.selectValue}>{selected?.label}</Text>
      </Pressable>
      {open ? (
        <View style={styles.selectMenu} accessibilityRole="radiogroup">
          {options.map((option) => {
            const chosen = option.value === value;
            return (
              <Pressable
                key={option.value || "any"}
                onPress={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                accessibilityRole="radio"
                accessibilityState={{ selected: chosen }}
                accessibilityLabel={option.label}
                style={[styles.selectOption, chosen && styles.choiceSelected]}
              >
                <Text
                  style={[
                    styles.selectOptionLabel,
                    chosen && styles.choiceLabelSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  busy = false,
  disabled = false,
  destructive = false,
}: {
  label: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
  destructive?: boolean;
}) {
  const inactive = disabled || busy;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive, busy }}
      style={({ pressed }) => [
        styles.primary,
        destructive && styles.destructive,
        inactive && styles.inactive,
        pressed && !inactive && styles.pressed,
      ]}
    >
      {busy ? (
        <ActivityIndicator color="#ffffff" />
      ) : (
        <Text style={styles.primaryText}>{label}</Text>
      )}
    </Pressable>
  );
}

export function SecondaryButton({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.secondary,
        disabled && styles.inactive,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Text style={styles.secondaryText}>{label}</Text>
    </Pressable>
  );
}

export function LinkButton({
  label,
  onPress,
  align = "left",
}: {
  label: string;
  onPress: () => void;
  align?: "left" | "center";
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.linkHit,
        align === "center" && styles.linkCenter,
        pressed && styles.pressed,
      ]}
    >
      <Text style={styles.link}>{label}</Text>
    </Pressable>
  );
}

export function ChipRow<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <View style={styles.fieldGroup} accessibilityRole="radiogroup">
      <Text style={styles.label}>{label}</Text>
      <View style={styles.chipRow}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              onPress={() => onChange(option.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={option.label}
              style={[styles.chip, selected && styles.choiceSelected]}
            >
              <Text
                style={[
                  styles.chipLabel,
                  selected && styles.choiceLabelSelected,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function ChoiceRow<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string; description?: string }[];
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.choiceRow}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              onPress={() => onChange(option.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={option.label}
              style={[styles.choice, selected && styles.choiceSelected]}
            >
              <Text
                style={[
                  styles.choiceLabel,
                  selected && styles.choiceLabelSelected,
                ]}
              >
                {option.label}
              </Text>
              {option.description ? (
                <Text
                  style={[
                    styles.choiceHint,
                    selected && styles.choiceHintSelected,
                  ]}
                >
                  {option.description}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function Centered({ children }: { children: ReactNode }) {
  return <View style={styles.centered}>{children}</View>;
}

export function Spinner() {
  return (
    <Centered>
      <ActivityIndicator color={colors.brandRed} />
    </Centered>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 48 },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
    padding: 24,
  },
  kicker: {
    color: colors.brandRed,
    fontWeight: "700",
    fontSize: 13,
    letterSpacing: 0.2,
  },
  title: {
    marginTop: 4,
    fontSize: 28,
    fontWeight: "800",
    color: colors.foreground,
    letterSpacing: -0.5,
  },
  lede: {
    marginTop: 8,
    fontSize: 16,
    lineHeight: 22,
    color: colors.muted,
  },
  meta: { marginTop: 4, color: colors.muted, fontSize: 14, lineHeight: 20 },
  error: { marginTop: 12, color: colors.error, fontSize: 14, lineHeight: 20 },
  card: {
    marginTop: 16,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
  },
  fieldGroup: { marginTop: 16 },
  label: { fontSize: 13, fontWeight: "600", color: colors.mutedStrong },
  hint: { marginTop: 4, fontSize: 12, color: colors.muted },
  field: {
    marginTop: 6,
    minHeight: TAP_TARGET,
    borderWidth: 1,
    borderColor: colors.fieldBorder,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.foreground,
  },
  primary: {
    marginTop: 20,
    minHeight: TAP_TARGET,
    backgroundColor: colors.brandRed,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  destructive: { backgroundColor: colors.error },
  inactive: { opacity: 0.45 },
  pressed: { opacity: 0.75 },
  primaryText: { color: "#ffffff", fontWeight: "700", fontSize: 16 },
  secondary: {
    marginTop: 12,
    minHeight: TAP_TARGET,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: { color: colors.foreground, fontWeight: "700", fontSize: 16 },
  linkHit: {
    marginTop: 16,
    minHeight: TAP_TARGET,
    justifyContent: "center",
  },
  linkCenter: { alignItems: "center" },
  link: { color: colors.brandRed, fontWeight: "700", fontSize: 15 },
  chipRow: {
    marginTop: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    minHeight: TAP_TARGET,
    borderWidth: 1,
    borderColor: colors.fieldBorder,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    justifyContent: "center",
  },
  chipLabel: { fontSize: 14, fontWeight: "700", color: colors.foreground },
  choiceRow: { marginTop: 8, gap: 10 },
  choice: {
    borderWidth: 1,
    borderColor: colors.fieldBorder,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
  },
  choiceSelected: {
    borderColor: colors.brandRed,
    backgroundColor: colors.accentSoft,
  },
  choiceLabel: { fontSize: 15, fontWeight: "700", color: colors.foreground },
  choiceLabelSelected: { color: colors.brandRed },
  choiceHint: { marginTop: 2, fontSize: 13, color: colors.muted },
  choiceHintSelected: { color: colors.mutedStrong },
  selectValue: { fontSize: 16, fontWeight: "500", color: colors.foreground },
  selectMenu: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    borderRadius: 12,
    overflow: "hidden",
  },
  selectOption: {
    minHeight: TAP_TARGET,
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  selectOptionLabel: { fontSize: 16, fontWeight: "500", color: colors.foreground },
});
