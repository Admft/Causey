import { StyleSheet, Text, View } from "react-native";
import { formatFeeCents } from "./api";
import {
  sectionConstraint,
  type EventSection,
} from "./section-constraint";
import { colors } from "./theme";
import { Card, Meta } from "./ui";

export type { EventSection };

export function EventSections({
  sections,
  isChess,
}: {
  sections: EventSection[];
  isChess: boolean;
}) {
  if (!sections.length) return null;
  return (
    <Card>
      <Text style={styles.heading} accessibilityRole="header">
        {isChess ? "Sections & who can enter" : "Divisions & who can enter"}
      </Text>
      {sections.map((section) => (
        <View key={section.id} style={styles.row}>
          <Text style={styles.name}>{section.name}</Text>
          <Meta>{sectionConstraint(section)}</Meta>
          {section.entry_fee_cents !== null ? (
            <Meta>
              {formatFeeCents(section.entry_fee_cents)} for this section
            </Meta>
          ) : null}
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  heading: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.2,
    color: colors.mutedStrong,
    textTransform: "uppercase",
  },
  row: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  name: { fontSize: 16, fontWeight: "700", color: colors.foreground },
});
