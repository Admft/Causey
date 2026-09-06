import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { useAuth } from "./auth";
import { openExternalUrl } from "./open-url";
import { colors, siteUrl } from "./theme";
import {
  ErrorText,
  Field,
  LinkButton,
  Meta,
  PrimaryButton,
  SecondaryButton,
} from "./ui";

/**
 * Guideline 5.1.1(v) requires account deletion to be reachable inside the app,
 * so this renders on the Me tab and on the blocked under-13 screen.
 */
export function DeleteAccountSection() {
  const router = useRouter();
  const { profile, deleteAccount } = useAuth();
  const [open, setOpen] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accountEmail = profile?.email ?? "";
  const matches =
    Boolean(accountEmail) &&
    confirmEmail.trim().toLowerCase() === accountEmail.trim().toLowerCase();

  function confirm() {
    Alert.alert(
      "Delete this account?",
      "Your profile, RSVPs, and saved tournaments are removed. This cannot be undone.",
      [
        { text: "Keep account", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => void run() },
      ]
    );
  }

  async function run() {
    setBusy(true);
    setError(null);
    const message = await deleteAccount(confirmEmail);
    setBusy(false);
    if (message) {
      setError(message);
      return;
    }
    router.replace("/login");
  }

  if (!open) {
    return (
      <View style={styles.block}>
        <SecondaryButton
          label="Delete account"
          onPress={() => setOpen(true)}
        />
      </View>
    );
  }

  return (
    <View style={styles.block}>
      <View style={styles.panel}>
        <Meta>
          Deleting removes your profile, RSVPs, and saved tournaments for good.
          If you own an organization, transfer ownership first.
        </Meta>
        <Field
          label={`Type ${accountEmail || "your email"} to confirm`}
          value={confirmEmail}
          onChangeText={setConfirmEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
        />
        {error ? <ErrorText>{error}</ErrorText> : null}
        {error?.includes("Contact Causey") ? (
          <LinkButton
            label="Report a problem"
            onPress={() => void openExternalUrl(`${siteUrl}/support`)}
          />
        ) : null}
        <PrimaryButton
          label="Delete my account"
          onPress={confirm}
          busy={busy}
          disabled={!matches}
          destructive
        />
        <SecondaryButton
          label="Keep my account"
          onPress={() => {
            setOpen(false);
            setConfirmEmail("");
            setError(null);
          }}
          disabled={busy}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { marginTop: 24 },
  panel: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
  },
});
