import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet } from "react-native";
import { useAuth } from "../src/auth";
import {
  MOBILE_CAPTCHA_ERROR,
  MobileCaptcha,
  type MobileCaptchaHandle,
} from "../src/MobileCaptcha";
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
  const captchaRef = useRef<MobileCaptchaHandle | null>(null);

  async function onSubmit() {
    setBusy(true);
    setError(null);
    try {
      const captchaToken = await captchaRef.current?.verify();
      const message = await sendPasswordReset(email, captchaToken);
      if (message) setError(message);
      else setSent(true);
    } catch {
      setError(MOBILE_CAPTCHA_ERROR);
    } finally {
      setBusy(false);
    }
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
      <MobileCaptcha ref={captchaRef} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
