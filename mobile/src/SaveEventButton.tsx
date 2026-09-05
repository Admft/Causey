import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { causeyFetch } from "./api";
import { useAuth } from "./auth";
import { ErrorText, LinkButton, SecondaryButton } from "./ui";

export function SaveEventButton({
  competitionId,
  initiallySaved,
}: {
  competitionId: string;
  initiallySaved: boolean;
}) {
  const router = useRouter();
  const { session } = useAuth();
  const [saved, setSaved] = useState(initiallySaved);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSaved(initiallySaved);
  }, [initiallySaved]);

  useEffect(() => {
    const token = session?.access_token;
    if (!token || !competitionId) return;
    let cancelled = false;
    causeyFetch("/api/mobile/saved", { token })
      .then((payload) => {
        const rows = (payload as { saved?: { competition_id: string }[] })
          .saved;
        if (cancelled || !Array.isArray(rows)) return;
        setSaved(rows.some((row) => row.competition_id === competitionId));
      })
      .catch(() => {
        /* keep initiallySaved */
      });
    return () => {
      cancelled = true;
    };
  }, [competitionId, session?.access_token]);

  if (!session) {
    return (
      <LinkButton
        label="Sign in to save this listing"
        onPress={() => router.push("/login")}
      />
    );
  }

  async function toggle() {
    if (!session?.access_token) return;
    setPending(true);
    setError(null);
    try {
      const data = (await causeyFetch("/api/mobile/saved", {
        token: session.access_token,
        method: "POST",
        body: { competitionId },
      })) as { saved: boolean };
      setSaved(data.saved);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not update that bookmark."
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <SecondaryButton
        label={saved ? "Saved — tap to remove" : "Save listing"}
        onPress={() => void toggle()}
        disabled={pending}
      />
      {error ? <ErrorText>{error}</ErrorText> : null}
    </>
  );
}
