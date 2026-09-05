import * as Linking from "expo-linking";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Alert, Share, StyleSheet, Text, View } from "react-native";
import { causeyFetch, formatDateRange, formatFeeCents } from "../../src/api";
import { addTournamentToCalendar } from "../../src/calendar";
import { categoryLabel } from "../../src/categories";
import { ClubGoingCard } from "../../src/ClubGoingCard";
import { EventPathways } from "../../src/EventPathways";
import { feedback } from "../../src/haptics";
import { SaveEventButton } from "../../src/SaveEventButton";
import { siteUrl } from "../../src/theme";
import {
  Card,
  ErrorText,
  Kicker,
  Meta,
  PrimaryButton,
  Screen,
  SecondaryButton,
  Spinner,
  Title,
} from "../../src/ui";

type Competition = {
  id: string;
  slug: string;
  name: string;
  category: string;
  organizer_name: string | null;
  venue_name: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  start_date: string;
  end_date: string | null;
  reg_deadline: string | null;
  reg_url: string | null;
  entry_fee_cents: number | null;
  rated: boolean;
  pathway_status?: string | null;
  pathway_summary?: string | null;
};

function placeLine(event: Competition): string {
  const where = [event.city, event.state].filter(Boolean).join(", ");
  return [event.venue_name, where].filter(Boolean).join(" · ");
}

function calendarLocation(event: Competition): string | null {
  const parts = [
    event.venue_name,
    event.address,
    [event.city, event.state].filter(Boolean).join(", "),
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

export default function EventScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [event, setEvent] = useState<Competition | null>(null);
  const [unlocks, setUnlocks] = useState<unknown[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [addingToCalendar, setAddingToCalendar] = useState(false);

  const load = useCallback(async () => {
    if (!slug) return;
    setError(null);
    try {
      const data = (await causeyFetch(`/api/competitions/${slug}`)) as {
        competition: Competition;
        unlocks?: unknown[];
      };
      setEvent(data.competition);
      setUnlocks(Array.isArray(data.unlocks) ? data.unlocks : []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not load this tournament."
      );
    }
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onAddToCalendar() {
    if (!event) return;
    setAddingToCalendar(true);
    const outcome = await addTournamentToCalendar({
      title: event.name,
      startDate: event.start_date,
      endDate: event.end_date,
      location: calendarLocation(event),
      notes: `${siteUrl}/event/${event.slug}`,
    });
    setAddingToCalendar(false);
    if (!outcome.message) return;
    feedback(outcome.ok ? "success" : "warning");
    Alert.alert(
      outcome.ok ? "Calendar" : "Calendar unavailable",
      outcome.message
    );
  }

  async function onShare() {
    if (!event) return;
    const url = `${siteUrl}/event/${event.slug}`;
    await Share.share({
      title: event.name,
      message: `${event.name} — ${formatDateRange(
        event.start_date,
        event.end_date
      )}\n${url}`,
      url,
    });
  }

  if (error) {
    return (
      <Screen header>
        <Kicker>Tournament</Kicker>
        <Title>We could not load this listing</Title>
        <ErrorText>{error}</ErrorText>
        <PrimaryButton label="Try again" onPress={() => void load()} />
      </Screen>
    );
  }

  if (!event) return <Spinner />;

  const place = placeLine(event);

  return (
    <Screen header>
      <Kicker>{categoryLabel(event.category)}</Kicker>
      <Title>{event.name}</Title>
      <Meta>{formatDateRange(event.start_date, event.end_date)}</Meta>
      {place ? <Meta>{place}</Meta> : null}
      <Meta>{formatFeeCents(event.entry_fee_cents)}</Meta>
      {event.organizer_name ? (
        <Meta>Organized by {event.organizer_name}</Meta>
      ) : null}
      {event.reg_deadline ? (
        <Meta>
          Registration closes {formatDateRange(event.reg_deadline, null)}
        </Meta>
      ) : null}
      {event.rated && event.category === "chess" ? (
        <Meta>US Chess rated</Meta>
      ) : null}

      <PrimaryButton
        label="Add to calendar"
        onPress={onAddToCalendar}
        busy={addingToCalendar}
      />
      <SecondaryButton label="Share tournament" onPress={onShare} />
      <SaveEventButton competitionId={event.id} initiallySaved={false} />
      {event.reg_url ? (
        <SecondaryButton
          label="Open organizer registration"
          onPress={() => Linking.openURL(event.reg_url as string)}
        />
      ) : null}

      <ClubGoingCard competitionId={event.id} />
      <EventPathways
        unlocks={unlocks}
        pathwayStatus={event.pathway_status}
        pathwaySummary={event.pathway_summary}
      />

      <Card>
        <View>
          <Text style={styles.noteHeading}>Before you travel</Text>
          <Meta>
            Causey&apos;s {categoryLabel(event.category)} coverage is incomplete
            and listings can change. Confirm dates, sections, and fees with the
            organizer.
            {event.reg_url
              ? " Registration is completed on the organizer's site, not in Causey."
              : ""}
          </Meta>
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  noteHeading: { fontSize: 15, fontWeight: "700", color: "#14181c" },
});
