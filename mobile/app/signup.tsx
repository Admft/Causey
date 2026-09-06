import { useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet } from "react-native";
import { useAuth, type MobileSignupRole } from "../src/auth";
import { openExternalUrl } from "../src/open-url";
import { siteUrl } from "../src/theme";
import {
  Card,
  ChoiceRow,
  ErrorText,
  Field,
  Kicker,
  Lede,
  LinkButton,
  Meta,
  PrimaryButton,
  Screen,
  Title,
} from "../src/ui";

const ROLES: { value: MobileSignupRole; label: string; description: string }[] =
  [
    {
      value: "parent",
      label: "Parent or guardian",
      description: "Track RSVPs and registrations for your students.",
    },
    {
      value: "coach",
      label: "Coach",
      description: "Manage a club or school team roster.",
    },
  ];

export default function SignupScreen() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [role, setRole] = useState<MobileSignupRole>("parent");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [zip, setZip] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmSent, setConfirmSent] = useState(false);

  const canSubmit = Boolean(
    displayName.trim() && email.trim() && password.length >= 8
  );

  async function onSubmit() {
    setBusy(true);
    setError(null);
    const result = await signUp({ role, displayName, email, password, zip });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (result.needsEmailConfirmation) {
      setConfirmSent(true);
      return;
    }
    router.replace("/");
  }

  if (confirmSent) {
    return (
      <Screen header>
        <Kicker>Almost there</Kicker>
        <Title>Confirm your email</Title>
        <Lede>
          We sent a confirmation link to {email.trim()}. Open it, then come back
          and sign in.
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
        <Kicker>Create account</Kicker>
        <Title>Join Causey</Title>
        <Lede>
          Parents and coaches create an account here. Students 13 or older
          create a student account on the website — that form asks for a date of
          birth, which this app never collects. Under 13, a parent uses this app.
        </Lede>
        <ChoiceRow
          label="I am a"
          options={ROLES}
          value={role}
          onChange={setRole}
        />
        <Field
          label="Name"
          value={displayName}
          onChangeText={setDisplayName}
          autoCapitalize="words"
          autoComplete="name"
          textContentType="name"
        />
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
        <Field
          label="Password"
          hint="At least 8 characters."
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
        />
        <Field
          label="Zip (optional)"
          hint="Used to sort tournament search by distance."
          value={zip}
          onChangeText={setZip}
          keyboardType="number-pad"
          maxLength={5}
          autoComplete="postal-code"
          textContentType="postalCode"
        />
        {error ? <ErrorText>{error}</ErrorText> : null}
        <PrimaryButton
          label="Create account"
          onPress={onSubmit}
          busy={busy}
          disabled={!canSubmit}
        />
        <LinkButton
          label="Create a student account (13+) on the website"
          onPress={() => void openExternalUrl(`${siteUrl}/signup?role=student`)}
        />
        <Card>
          <Meta>
            Causey never asks for a birth date on a phone. We store your name,
            email, account type, and zip so we can show the right students and
            tournaments. You can delete the account from the Me tab at any time.
          </Meta>
          <Meta>
            Creating an account means you accept the terms of use and the
            privacy notice.
          </Meta>
          <LinkButton
            label="Read the privacy notice"
            onPress={() => void openExternalUrl(`${siteUrl}/privacy`)}
          />
          <LinkButton
            label="Read the terms of use"
            onPress={() => void openExternalUrl(`${siteUrl}/terms`)}
          />
        </Card>
        <LinkButton
          label="Already have an account? Sign in"
          onPress={() => router.replace("/login")}
        />
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
