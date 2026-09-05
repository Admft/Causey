import { useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet } from "react-native";
import { useAuth } from "../src/auth";
import {
  ErrorText,
  Field,
  Kicker,
  Lede,
  LinkButton,
  PrimaryButton,
  Screen,
  Title,
} from "../src/ui";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { sendPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function onSubmit() {
    setBusy(true);
    setError(null);
    const message = await sendPasswordReset(email);
    setBusy(false);
    if (message) setError(message);
    else setSent(true);
  }

  if (sent) {
    return (
      <Screen header>
        <Kicker>Password</Kicker>
        <Title>Check your email</Title>
        <Lede>
          If {email.trim()} has an account, a reset link is on its way. Open it
          to choose a new password, then sign in here.
        </Lede>
        <PrimaryButton
          label="Back to sign in"
          onPress={() => router.replace("/login")}
        />
      </Screen>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.fill}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Screen header>
        <Kicker>Password</Kicker>
        <Title>Reset your password</Title>
        <Lede>
          Enter the email on your Causey account and we will send a reset link.
        </Lede>
        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
        />
        {error ? <ErrorText>{error}</ErrorText> : null}
        <PrimaryButton
          label="Send reset link"
          onPress={onSubmit}
          busy={busy}
          disabled={!email.trim()}
        />
        <LinkButton
          label="Back to sign in"
          onPress={() => router.replace("/login")}
        />
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
