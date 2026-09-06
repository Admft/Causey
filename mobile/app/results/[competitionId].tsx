import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text } from "react-native";
import { causeyFetch, formatDateRange } from "../../src/api";
import { useAuth } from "../../src/auth";
import { feedback } from "../../src/haptics";
import { RequireSession } from "../../src/RequireSession";
import { colors } from "../../src/theme";
import {
  Card,
  ChipRow,
  ErrorText,
  Field,
  Kicker,
  Lede,
  Meta,
  PrimaryButton,
  Screen,
  Spinner,
  Title,
} from "../../src/ui";

type Entrant = {
  profile_id: string;
  display_name: string;
  status: string;
  section_id: string | null;
  placement: number | null;
  award_label: string | null;
};

type Section = { id: string; name: string };

type ResultsPayload = {
  competition: {
    id: string;
    slug: string;
    name: string;
    start_date: string;
    end_date: string | null;
    city: string | null;
    state: string | null;
  };
  sections: Section[];
  entrants: Entrant[];
};

type Draft = {
  sectionId: string;
  placement: string;
  awardLabel: string;
};

function draftsFromEntrants(entrants: Entrant[]): Record<string, Draft> {
  return Object.fromEntries(
    entrants.map((row) => [
      row.profile_id,
      {
        sectionId: row.section_id ?? "",
        placement:
          row.placement != null && row.placement >= 1
            ? String(row.placement)
            : "",
        awardLabel: row.award_label ?? "",
      },
    ])
  );
}

function placeSummary(placement: number | null): string {
  if (placement == null || placement < 1) return "No place recorded";
  return `Place ${placement}`;
}

function statusLabel(status: string): string {
  return status.replaceAll("_", " ");
}

export default function ResultsScreen() {
  return (
    <RequireSession>
      <ResultsBody />
    </RequireSession>
  );
}

function ResultsBody() {
  const { competitionId } = useLocalSearchParams<{ competitionId: string }>();
  const { session } = useAuth();
  const [data, setData] = useState<ResultsPayload | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [error, setError] = useState<string | null>(null);
  const [busyProfile, setBusyProfile] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!competitionId) {
      setError("That link is missing a tournament address.");
      return;
    }
    if (!session?.access_token) return;
    setError(null);
    try {
      const fresh = (await causeyFetch(
        `/api/mobile/results?competitionId=${encodeURIComponent(competitionId)}`,
        { token: session.access_token }
      )) as ResultsPayload;
      setData(fresh);
      setDrafts(draftsFromEntrants(fresh.entrants));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load results.");
    }
  }, [competitionId, session?.access_token]);

  useEffect(() => {
    void load();
  }, [load]);

  function patchDraft(profileId: string, patch: Partial<Draft>) {
    setDrafts((current) => ({
      ...current,
      [profileId]: { ...current[profileId], ...patch },
    }));
  }

  async function save(entrant: Entrant) {
    if (!competitionId || !session?.access_token || !data) return;
    const draft = drafts[entrant.profile_id];
    if (!draft) return;
    const placeText = draft.placement.trim();
    const parsedPlace = placeText ? Number(placeText) : null;
    if (
      placeText &&
      (!Number.isInteger(parsedPlace) ||
        parsedPlace == null ||
        parsedPlace < 1 ||
        parsedPlace > 999)
    ) {
      setError("Place must be a whole number from 1 to 999.");
      return;
    }
    const sectionId = draft.sectionId || null;
    const awardLabel = draft.awardLabel.trim() ? draft.awardLabel.trim() : null;
    setBusyProfile(entrant.profile_id);
    setError(null);
    try {
      await causeyFetch("/api/mobile/results", {
        token: session.access_token,
        method: "POST",
        body: {
          competitionId,
          profileId: entrant.profile_id,
          eventSlug: data.competition.slug,
          sectionId,
          placement: parsedPlace,
          awardLabel,
        },
      });
      setData((current) =>
        current
          ? {
              ...current,
              entrants: current.entrants.map((row) =>
                row.profile_id === entrant.profile_id
                  ? {
                      ...row,
                      section_id: sectionId,
                      placement: parsedPlace,
                      award_label: awardLabel,
                    }
                  : row
              ),
            }
          : current
      );
      feedback("success");
    } catch (err) {
      feedback("error");
      setError(err instanceof Error ? err.message : "Could not save that result.");
    } finally {
      setBusyProfile(null);
    }
  }

  if (error && !data) {
    return (
      <Screen header>
        <Kicker>Results</Kicker>
        <Title>We could not open results</Title>
        <ErrorText>{error}</ErrorText>
        <PrimaryButton label="Try again" onPress={() => void load()} />
      </Screen>
    );
  }

  if (!data) return <Spinner />;

  const { competition, sections, entrants } = data;
  const divisionOptions = [
    { value: "", label: "Not set" },
    ...sections.map((section) => ({ value: section.id, label: section.name })),
  ];

  return (
    <Screen header>
      <Kicker>Results</Kicker>
      <Title>{competition.name}</Title>
      <Meta>
        {formatDateRange(competition.start_date, competition.end_date)}
        {competition.city
          ? ` · ${competition.city}, ${competition.state ?? ""}`.trimEnd()
          : ""}
      </Meta>
      <Lede>
        Record division, place, and award after attendance. Leave place blank
        when nobody placed.
      </Lede>
      {error ? <ErrorText>{error}</ErrorText> : null}

      {!entrants.length ? (
        <Lede>
          Nobody is on this event yet. Invite your roster on the website, then
          record places here.
        </Lede>
      ) : (
        entrants.map((entrant) => {
          const draft = drafts[entrant.profile_id] ?? {
            sectionId: "",
            placement: "",
            awardLabel: "",
          };
          const award = entrant.award_label?.trim() ?? "";
          return (
            <Card key={entrant.profile_id}>
              <Text style={styles.name}>{entrant.display_name}</Text>
              <Meta>{statusLabel(entrant.status)}</Meta>
              <Meta>
                {placeSummary(entrant.placement)}
                {award ? ` · ${award}` : ""}
              </Meta>
              {sections.length ? (
                <ChipRow
                  label="Division"
                  options={divisionOptions}
                  value={draft.sectionId}
                  onChange={(next) =>
                    patchDraft(entrant.profile_id, { sectionId: next })
                  }
                />
              ) : null}
              <Field
                label="Place"
                hint="Whole number from 1. Leave blank if they did not place."
                value={draft.placement}
                onChangeText={(next) =>
                  patchDraft(entrant.profile_id, { placement: next })
                }
                keyboardType="number-pad"
                inputMode="numeric"
                maxLength={3}
                placeholder=""
              />
              <Field
                label="Award"
                value={draft.awardLabel}
                onChangeText={(next) =>
                  patchDraft(entrant.profile_id, { awardLabel: next })
                }
                maxLength={80}
                placeholder=""
              />
              <PrimaryButton
                label="Save result"
                busy={busyProfile === entrant.profile_id}
                onPress={() => void save(entrant)}
              />
            </Card>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  name: { fontSize: 16, fontWeight: "700", color: colors.foreground },
});
