import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { causeyFetch } from "./api";
import { CHESS_NATIONALS } from "./chess-nationals";
import { EventPathways } from "./EventPathways";
import { defaultPathwaySource } from "./pathway-source";
import { colors } from "./theme";
import { ErrorText, Kicker, Lede, Meta } from "./ui";

type SeriesOpt = { id: string; name: string; level: string };
type CompOpt = { id: string; name: string; state: string | null };
type Options = { series: SeriesOpt[]; competitions: CompOpt[] };
type Walk = { startLabel: string; placement: number; nodes: unknown[] };

const PLACEMENT = [
  { value: 1, label: "1st place" },
  { value: 3, label: "Top 3" },
  { value: 99, label: "Participated" },
] as const;

function emptyWalkCopy(placement: number): string {
  if (placement === 99) {
    return "Playing without placing doesn't feed any qualification rule we track — invitational seats key on results. Select 1st place or top 3 to see what a strong finish opens up.";
  }
  if (placement > 1) {
    return "That placement doesn't qualify for anything in our current rules — some chains need an outright win. Try 1st place to compare.";
  }
  return "No qualification rules lead out of this event in our current data. Most tournaments are open entry; the chains start at regionals and state championships.";
}

function walkHeading(walk: Walk): string {
  if (walk.placement === 99) return `If you play in the ${walk.startLabel}`;
  if (walk.placement === 1) return `If you win the ${walk.startLabel}`;
  return `If you finish top ${walk.placement} at the ${walk.startLabel}`;
}

function OptionRow({
  label,
  selected,
  onPress,
}: {
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
      style={[styles.option, selected && styles.optionSelected]}
    >
      <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function PathwayExplorer() {
  const [options, setOptions] = useState<Options | null>(null);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [source, setSource] = useState("");
  const [placement, setPlacement] = useState(1);
  const [walk, setWalk] = useState<Walk | null>(null);
  const [walkState, setWalkState] = useState<"idle" | "loading" | "error">(
    "idle"
  );

  useEffect(() => {
    let cancelled = false;
    causeyFetch("/api/pathways")
      .then((body) => {
        if (cancelled) return;
        const next = body as Options;
        setOptions(next);
        const initial = defaultPathwaySource(next);
        if (initial) {
          setSource(initial);
          setWalkState("loading");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setOptionsError(
            "Couldn't load the event list. Pull to refresh and try again."
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!source) return;
    const controller = new AbortController();
    causeyFetch(
      `/api/pathways?source=${encodeURIComponent(source)}&placement=${placement}`,
      { signal: controller.signal }
    )
      .then((body) => {
        setWalk(body as Walk);
        setWalkState("idle");
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        if (err instanceof Error && err.name === "AbortError") return;
        setWalkState("error");
      });
    return () => controller.abort();
  }, [source, placement]);

  return (
    <View style={styles.wrap}>
      <Kicker>Illustrative lookup</Kicker>
      <Text style={styles.title}>{CHESS_NATIONALS.headline}</Text>
      <Lede>
        {CHESS_NATIONALS.dek} This is not an official US Chess ruling.
      </Lede>
      <Meta>
        Rules shown are seeded scaffolding pending verification. Confirm every
        invitation with the published announcement before you plan travel or
        fees.
      </Meta>

      <Text style={styles.label}>Event or championship series</Text>
      {optionsError ? <ErrorText>{optionsError}</ErrorText> : null}
      {!options && !optionsError ? (
        <ActivityIndicator color={colors.brandRed} style={styles.spinner} />
      ) : null}
      {options?.series.length ? (
        <View style={styles.list} accessibilityRole="radiogroup">
          {options.series.map((series) => {
            const value = `series:${series.id}`;
            return (
              <OptionRow
                key={series.id}
                label={series.name}
                selected={source === value}
                onPress={() => {
                  setSource(value);
                  setWalkState("loading");
                }}
              />
            );
          })}
        </View>
      ) : null}
      {options?.competitions.length ? (
        <>
          <Text style={styles.subLabel}>Events with a pathway</Text>
          <View style={styles.list} accessibilityRole="radiogroup">
            {options.competitions.map((competition) => {
              const value = `competition:${competition.id}`;
              const place = competition.state
                ? `${competition.name} (${competition.state})`
                : competition.name;
              return (
                <OptionRow
                  key={competition.id}
                  label={place}
                  selected={source === value}
                  onPress={() => {
                    setSource(value);
                    setWalkState("loading");
                  }}
                />
              );
            })}
          </View>
        </>
      ) : null}
      {options &&
      options.series.length === 0 &&
      options.competitions.length === 0 ? (
        <Meta>
          No events with qualification pathways in the current data yet.
        </Meta>
      ) : null}

      <Text style={styles.label}>Your result</Text>
      <View style={styles.placement} accessibilityRole="radiogroup">
        {PLACEMENT.map((choice) => {
          const selected = placement === choice.value;
          return (
            <Pressable
              key={choice.value}
              onPress={() => {
                setPlacement(choice.value);
                if (source) setWalkState("loading");
              }}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={choice.label}
              style={[
                styles.placeChip,
                selected && styles.placeChipSelected,
              ]}
            >
              <Text
                style={[
                  styles.placeLabel,
                  selected && styles.placeLabelSelected,
                ]}
              >
                {choice.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {walkState === "loading" ? (
        <ActivityIndicator color={colors.brandRed} style={styles.spinner} />
      ) : null}
      {walkState === "error" ? (
        <ErrorText>
          Couldn't compute that pathway. Pick the event again.
        </ErrorText>
      ) : null}
      {walkState === "idle" && walk ? (
        <View style={styles.result}>
          <Text style={styles.walkTitle}>{walkHeading(walk)}</Text>
          {walk.nodes.length > 0 ? (
            <EventPathways unlocks={walk.nodes} pathwayStatus="known" />
          ) : (
            <Lede>{emptyWalkCopy(walk.placement)}</Lede>
          )}
        </View>
      ) : null}

      <Meta>
        Nothing you enter here is saved — this is an illustrative lookup, not a
        profile or official qualification check.
      </Meta>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 8 },
  title: {
    marginTop: 4,
    fontSize: 28,
    fontWeight: "800",
    color: colors.foreground,
    letterSpacing: -0.5,
  },
  label: {
    marginTop: 16,
    fontSize: 13,
    fontWeight: "600",
    color: colors.mutedStrong,
  },
  subLabel: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: "600",
    color: colors.mutedStrong,
  },
  spinner: { marginTop: 16 },
  list: { marginTop: 8, gap: 8 },
  option: {
    borderWidth: 1,
    borderColor: colors.fieldBorder,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  optionSelected: {
    borderColor: colors.brandRed,
    backgroundColor: colors.accentSoft,
  },
  optionLabel: { fontSize: 15, fontWeight: "700", color: colors.foreground },
  optionLabelSelected: { color: colors.brandRed },
  placement: { marginTop: 8, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  placeChip: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.fieldBorder,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    justifyContent: "center",
  },
  placeChipSelected: {
    borderColor: colors.brandRed,
    backgroundColor: colors.brandRed,
  },
  placeLabel: { fontSize: 14, fontWeight: "700", color: colors.foreground },
  placeLabelSelected: { color: "#ffffff" },
  result: { marginTop: 8 },
  walkTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: "800",
    color: colors.foreground,
  },
});
