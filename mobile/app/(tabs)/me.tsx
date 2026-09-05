import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";
import { useAuth } from "../../src/auth";
import { DeleteAccountSection } from "../../src/DeleteAccountSection";
import { colors, siteUrl } from "../../src/theme";
import {
  Kicker,
  Lede,
  LinkButton,
  Meta,
  PrimaryButton,
  Screen,
  SecondaryButton,
  Title,
} from "../../src/ui";

const ROLE_LABEL: Record<string, string> = {
  parent: "Parent account",
  coach: "Coach account",
  student: "Student account",
};

function TrustLinks() {
  return (
    <View style={styles.links}>
      <LinkButton
        label="Privacy and student data"
        onPress={() => Linking.openURL(`${siteUrl}/privacy`)}
      />
      <LinkButton
        label="Terms of use"
        onPress={() => Linking.openURL(`${siteUrl}/terms`)}
      />
      <LinkButton
        label="Support"
        onPress={() => Linking.openURL(`${siteUrl}/support`)}
      />
    </View>
  );
}

export default function MeScreen() {
  const { ready, session, profile, signOut } = useAuth();
  const router = useRouter();

  if (ready && !session) {
    return (
      <Screen>
        <Kicker>Account</Kicker>
        <Title>You&apos;re browsing as a guest</Title>
        <Lede>
          Tournament search works without an account. Sign in to answer RSVPs
          for your students, open a roster, or take attendance.
        </Lede>
        <PrimaryButton
          label="Sign in"
          onPress={() => router.push("/login")}
        />
        <SecondaryButton
          label="Create a parent or coach account"
          onPress={() => router.push("/signup")}
        />
        <TrustLinks />
      </Screen>
    );
  }

  return (
    <Screen>
      <Kicker>Account</Kicker>
      <Title>{profile?.display_name ?? "Signed in"}</Title>
      {profile?.email ? <Meta>{profile.email}</Meta> : null}
      <Meta>{ROLE_LABEL[profile?.role ?? ""] ?? "Signed in"}</Meta>

      <TrustLinks />
      <LinkButton
        label="Export my data on the website"
        onPress={() => Linking.openURL(`${siteUrl}/account#data`)}
      />

      <SecondaryButton label="Sign out" onPress={() => void signOut()} />
      <DeleteAccountSection />
    </Screen>
  );
}

const styles = StyleSheet.create({
  links: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
});
