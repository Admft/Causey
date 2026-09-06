import { useRouter } from "expo-router";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { formatDateRange } from "./api";
import { openExternalUrl, safeRegUrl } from "./open-url";
import { colors } from "./theme";
import { Meta } from "./ui";

export type EntrantRowData = {
  competition_id: string;
  profile_id: string;
  status: string;
  registration_status?: string | null;
  needs_organizer_registration: boolean;
  competition: {
    slug: string;
    name: string;
    city: string | null;
    state: string | null;
    start_date: string;
    end_date: string | null;
    reg_url: string | null;
  } | null;
};

function rsvpMeta(row: EntrantRowData): string {
  if (row.status === "going") return " · Going";
  if (row.status === "not_going") return " · Can't go";
  if (row.status === "pending_invite") return " · Waiting for them to answer";
  return "";
}

function registrationMeta(row: EntrantRowData): string {
  if (row.registration_status === "registered") {
    return " · organizer registration marked complete";
  }
  return "";
}

/**
 * One tournament decision. Parents see this per child on Family; a student sees
 * the same row for their own account, so the two tabs never drift apart.
 */
export function EntrantRow({
  row,
  busy,
  onGoing,
  onNotGoing,
  onRegistered,
  onClear,
}: {
  row: EntrantRowData;
  busy: boolean;
  onGoing: () => void;
  onNotGoing: () => void;
  onRegistered: () => void;
  onClear?: () => void;
}) {
  const router = useRouter();
  const event = row.competition;
  if (!event) return null;
  const regUrl = event.reg_url ? safeRegUrl(event.reg_url) : null;
  const answered = row.status === "going" || row.status === "not_going";
  const needsRsvp = row.status === "invited";
  const pendingInvite = row.status === "pending_invite";

  return (
    <View style={styles.event}>
      <Pressable
        onPress={() =>
          router.push(`/event/${encodeURIComponent(event.slug)}`)
        }
        accessibilityRole="link"
        accessibilityLabel={`Open ${event.name}`}
        style={styles.nameHit}
      >
        <Text style={styles.eventName}>{event.name}</Text>
        <Meta>
          {formatDateRange(event.start_date, event.end_date)}
          {event.city ? ` · ${event.city}, ${event.state ?? ""}`.trimEnd() : ""}
          {rsvpMeta(row)}
          {registrationMeta(row)}
        </Meta>
      </Pressable>
      {pendingInvite ? (
        <Meta>
          They accept on Plan. After they mark Going, confirm organizer
          registration here.
        </Meta>
      ) : null}
      {needsRsvp || answered || pendingInvite ? (
        <View style={styles.row}>
          <Pressable
            onPress={onGoing}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={`Mark going to ${event.name}`}
            accessibilityState={{ disabled: busy, selected: row.status === "going" }}
            style={[
              row.status === "going" ? styles.secondary : styles.primary,
              busy && styles.inactive,
            ]}
          >
            <Text
              style={
                row.status === "going" ? styles.secondaryText : styles.primaryText
              }
            >
              Going
            </Text>
          </Pressable>
          <Pressable
            onPress={onNotGoing}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={`Mark not going to ${event.name}`}
            accessibilityState={{
              disabled: busy,
              selected: row.status === "not_going",
            }}
            style={[styles.secondary, busy && styles.inactive]}
          >
            <Text style={styles.secondaryText}>Can&apos;t go</Text>
          </Pressable>
          {answered && onClear ? (
            <Pressable
              onPress={onClear}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={`Clear RSVP for ${event.name}`}
              accessibilityState={{ disabled: busy }}
              style={[styles.linkHit, busy && styles.inactive]}
            >
              <Text style={styles.link}>Clear answer</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      {row.needs_organizer_registration && regUrl ? (
        <View style={styles.row}>
          <Pressable
            onPress={() => {
              void openExternalUrl(regUrl).then((message) => {
                if (message) Alert.alert("Could not open link", message);
              });
            }}
            accessibilityRole="button"
            accessibilityLabel={`Open organizer registration for ${event.name}`}
            style={styles.linkHit}
          >
            <Text style={styles.link}>Open organizer registration</Text>
          </Pressable>
          <Pressable
            onPress={onRegistered}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={`Mark ${event.name} registration complete`}
            accessibilityState={{ disabled: busy }}
            style={[styles.linkHit, busy && styles.inactive]}
          >
            <Text style={styles.link}>Mark complete</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  event: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  nameHit: { minHeight: 44, justifyContent: "center" },
  eventName: { fontSize: 16, fontWeight: "700", color: colors.foreground },
  row: { flexDirection: "row", gap: 12, marginTop: 10, flexWrap: "wrap" },
  primary: {
    minHeight: 44,
    justifyContent: "center",
    backgroundColor: colors.brandRed,
    borderRadius: 10,
    paddingHorizontal: 18,
  },
  primaryText: { color: "#ffffff", fontWeight: "700" },
  secondary: {
    minHeight: 44,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    paddingHorizontal: 18,
  },
  secondaryText: { color: colors.foreground, fontWeight: "700" },
  linkHit: { minHeight: 44, justifyContent: "center" },
  link: { color: colors.brandRed, fontWeight: "700" },
  inactive: { opacity: 0.45 },
});
