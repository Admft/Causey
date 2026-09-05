import { useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet } from "react-native";
import { causeyFetch } from "../src/api";
import { useAuth } from "../src/auth";
import {
  Card,
  ErrorText,
  Field,
  Kicker,
  Lede,
  Meta,
  PrimaryButton,
  Screen,
  Title,
} from "../src/ui";

type OrgPreview = {
  id: string;
  name: string;
  type: string;
  state: string | null;
};

type PreviewPayload = {
  org: OrgPreview;
  code: string;
};

const KIND_LABEL: Record<string, string> = {
  school: "School",
  club: "Club",
  team: "Team",
  district: "District",
};

function kindLabel(type: string): string {
  return KIND_LABEL[type] ?? "Club";
}

function kindNoun(type: string): string {
  if (type === "school") return "school";
  if (type === "team") return "team";
  if (type === "district") return "district";
  return "club";
}

export default function JoinScreen() {
  const router = useRouter();
  const { session, refreshMe } = useAuth();
  const [code, setCode] = useState("");
  const [preview, setPreview] = useState<PreviewPayload | null>(null);
  const [joined, setJoined] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onChangeCode(next: string) {
    setCode(next);
    setPreview(null);
    setJoined(false);
    setError(null);
  }

  async function onPreview() {
    setBusy(true);
    setError(null);
    setPreview(null);
    setJoined(false);
    try {
      const data = (await causeyFetch(
        `/api/mobile/join?code=${encodeURIComponent(code.trim())}`
      )) as PreviewPayload;
      setPreview(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "We could not check that team code."
      );
    } finally {
      setBusy(false);
    }
  }

  async function onJoin() {
    const token = session?.access_token;
    if (!token || !preview) return;
    setBusy(true);
    setError(null);
    try {
      await causeyFetch("/api/mobile/join", {
        token,
        method: "POST",
        body: { code: preview.code },
      });
      setJoined(true);
      try {
        await refreshMe();
      } catch {
        // Roster write already succeeded.
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not join that roster."
      );
    } finally {
      setBusy(false);
    }
  }

  const org = preview?.org;
  const kind = org ? kindLabel(org.type) : null;
  const noun = org ? kindNoun(org.type) : "club";
  const place = org
    ? [kind, org.state].filter(Boolean).join(" · ")
    : null;

  return (
    <KeyboardAvoidingView
      style={styles.fill}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Screen header>
        <Kicker>Join</Kicker>
        <Title>
          {joined && org
            ? `You are on the ${org.name} roster`
            : org
              ? org.name
              : "Join with a coach code"}
        </Title>
        <Lede>
          {joined && org
            ? `Your coach can see your display name and invite you to tournaments from this ${noun}.`
            : org
              ? `Joining puts you on this ${noun} roster. Your coach sees your display name and age band, and can invite you to tournaments.`
              : "Type the eight-character code your coach shared. You will see the club, school, or team before you join the roster."}
        </Lede>

        <Field
          label="Join code"
          hint="Eight characters, like 2P85-8DZ6"
          value={code}
          onChangeText={onChangeCode}
          autoCapitalize="characters"
          autoCorrect={false}
          autoComplete="off"
          spellCheck={false}
          maxLength={9}
          returnKeyType="go"
          onSubmitEditing={() => {
            if (code.trim() && !busy) void onPreview();
          }}
        />

        {error ? <ErrorText>{error}</ErrorText> : null}

        {org ? (
          <Card>
            <Meta>
              Join code {preview.code}
              {place ? ` · ${place}` : ""}
            </Meta>
          </Card>
        ) : null}

        {!org ? (
          <PrimaryButton
            label="Check this code"
            onPress={() => void onPreview()}
            busy={busy}
            disabled={!code.trim()}
          />
        ) : joined ? null : session ? (
          <PrimaryButton
            label={`Join ${org.name}`}
            onPress={() => void onJoin()}
            busy={busy}
          />
        ) : (
          <>
            <Lede>
              Sign in to join this {noun} roster. Causey only adds you after you
              are signed in.
            </Lede>
            <PrimaryButton
              label="Sign in"
              onPress={() => router.push("/login")}
            />
          </>
        )}
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
