import * as Linking from "expo-linking";
import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import { Image, KeyboardAvoidingView, Platform, StyleSheet } from "react-native";
import { useAuth } from "../src/auth";
import { siteUrl } from "../src/theme";
import {
  ErrorText,
  Field,
  Lede,
  LinkButton,
  PrimaryButton,
  Screen,
  Title,
} from "../src/ui";

export default function LoginScreen() {
  const { session, access, signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (session && access?.allowed === false) return <Redirect href="/blocked" />;
  // "/" resolves the role's own home once the profile lands.
  if (session && access?.allowed) return <Redirect href="/" />;

  async function onSubmit() {
    setBusy(true);
    setError(null);
    const message = await signIn(email, password);
    setBusy(false);
    if (message) setError(message);
    else router.replace("/");
  }

  const canSubmit = Boolean(email.trim() && password);

  return (
    <KeyboardAvoidingView
      style={styles.fill}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Screen>
        <Image
          source={require("../assets/splash-icon.png")}
          style={styles.mark}
          accessibilityIgnoresInvertColors
          accessible={false}
        />
        <Title>Causey</Title>
        <Lede>
          See which student needs an RSVP, search tournaments, and keep track of
          registrations you finish on an organizer&apos;s site.
        </Lede>
        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          keyboardType="email-address"
          textContentType="username"
          returnKeyType="next"
        />
        <Field
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={() => {
            if (canSubmit && !busy) void onSubmit();
          }}
        />
        {error ? <ErrorText>{error}</ErrorText> : null}
        <PrimaryButton
          label="Sign in"
          onPress={onSubmit}
          busy={busy}
          disabled={!canSubmit}
        />
        <LinkButton
          label="Create a parent or coach account"
          onPress={() => router.push("/signup")}
        />
        <LinkButton
          label="Create a student account (13+) on the website"
          onPress={() => Linking.openURL(`${siteUrl}/signup?role=student`)}
        />
        <LinkButton
          label="Forgot password?"
          onPress={() => router.push("/forgot-password")}
        />
        <LinkButton
          label="Browse tournaments without an account"
          onPress={() => router.replace("/search")}
        />
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  mark: { width: 56, height: 56, marginBottom: 12 },
});
