import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { causeyFetch, formatDateRange, formatFeeCents } from "../../src/api";
import { addTournamentToCalendar } from "../../src/calendar";
import { categoryLabel } from "../../src/categories";
import { ClubGoingCard } from "../../src/ClubGoingCard";
import { EventCover } from "../../src/EventCover";
import { EventDifficultyRating } from "../../src/EventDifficultyRating";
import { EventGoingCard } from "../../src/EventGoingCard";
import { EventPathways } from "../../src/EventPathways";
import { EventSections, type EventSection } from "../../src/EventSections";
import { feedback } from "../../src/haptics";
import { sharePlainText } from "../../src/open-url";
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

type RatingSummary = { avg_score: number; rating_count: number };

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
  zip: string | null;
  start_date: string;
  end_date: string | null;
  reg_deadline: string | null;
  reg_url: string | null;
  entry_fee_cents: number | null;
  rated: boolean;
  image_url?: string | null;
  sections?: EventSection[];
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
    [event.city, event.state, event.zip].filter(Boolean).join(", "),
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

/**
 * A 200 with no listing in it is still a failure. Without this the screen
 * would hold a spinner that never resolves and offer no way back.
 */
function asCompetition(value: unknown): Competition | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Partial<Competition>;
  if (typeof row.slug !== "string" || !row.slug) return null;
  if (typeof row.name !== "string" || !row.name) return null;
  return row as Competition;
}

function asRating(value: unknown): RatingSummary | null {
  if (!value || typeof value !== "object") return null;
  const row = value as { avg_score?: unknown; rating_count?: unknown };
  if (typeof row.avg_score !== "number" || typeof row.rating_count !== "number") {
    return null;
  }
  if (!row.rating_count) return null;
  return { avg_score: row.avg_score, rating_count: row.rating_count };
}

export default function EventScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [event, setEvent] = useState<Competition | null>(null);
  const [unlocks, setUnlocks] = useState<unknown[]>([]);
  const [rating, setRating] = useState<RatingSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addingToCalendar, setAddingToCalendar] = useState(false);

  const load = useCallback(async () => {
    if (!slug) {
      setError("That link is missing a tournament address.");
      return;
    }
    setError(null);
    try {
      const data = (await causeyFetch(`/api/competitions/${slug}`)) as {
        competition?: unknown;
        unlocks?: unknown[];
        rating?: unknown;
      };
      const competition = asCompetition(data?.competition);
      if (!competition) {
        setError("We could not find that tournament.");
        return;
      }
      setEvent(competition);
      setUnlocks(Array.isArray(data.unlocks) ? data.unlocks : []);
      setRating(asRating(data.rating));
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
      slug: event.slug,
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
    const message = await sharePlainText({
      title: event.name,
      message: `${event.name} — ${formatDateRange(
        event.start_date,
        event.end_date
      )}\n${url}`,
      url,
    });
    if (message) Alert.alert("Share", message);
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
  const isChess = event.category === "chess";
  const ratingLabel = event.rated ? "US Chess rated" : "Not rated";

  return (
    <Screen header>
      <Kicker>{categoryLabel(event.category)}</Kicker>
      <EventCover imageUrl={event.image_url} name={event.name} />
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
      {isChess ? <Meta>Rating · {ratingLabel}</Meta> : null}
      {rating ? (
        <Meta>
          Difficulty {rating.avg_score} / 10 ({rating.rating_count}{" "}
          {rating.rating_count === 1 ? "rating" : "ratings"})
        </Meta>
      ) : null}

      <EventGoingCard
        competitionId={event.id}
        eventSlug={event.slug}
        regUrl={event.reg_url}
      />

      <SecondaryButton
        label={addingToCalendar ? "Adding to calendar…" : "Add to calendar"}
        onPress={() => void onAddToCalendar()}
        disabled={addingToCalendar}
      />
      <SecondaryButton label="Share tournament" onPress={onShare} />
      <SaveEventButton competitionId={event.id} initiallySaved={false} />

      <ClubGoingCard competitionId={event.id} />
      <EventSections
        sections={Array.isArray(event.sections) ? event.sections : []}
        isChess={isChess}
      />
      <EventPathways
        unlocks={unlocks}
        pathwayStatus={event.pathway_status}
        pathwaySummary={event.pathway_summary}
      />
      <EventDifficultyRating competitionId={event.id} initialScore={null} />

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
