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
        label="Report a problem"
        onPress={() => Linking.openURL(`${siteUrl}/support`)}
      />
      <LinkButton
        label="Privacy and student data"
        onPress={() => Linking.openURL(`${siteUrl}/privacy`)}
      />
      <LinkButton
        label="Terms of use"
        onPress={() => Linking.openURL(`${siteUrl}/terms`)}
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
          Tournament search works without an account. Sign in to answer RSVPs,
          open My tournaments, or take attendance. Students 13 or older create
          their account on the website, then sign in here.
        </Lede>
        <PrimaryButton
          label="Sign in"
          onPress={() => router.push("/login")}
        />
        <SecondaryButton
          label="Create a parent or coach account"
          onPress={() => router.push("/signup")}
        />
        <LinkButton
          label="Create a student account (13+) on the website"
          onPress={() => Linking.openURL(`${siteUrl}/signup?role=student`)}
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

      <LinkButton
        label="Alerts"
        onPress={() => router.push("/alerts")}
      />
      <LinkButton
        label="Your organizations"
        onPress={() => router.push("/orgs")}
      />
      <LinkButton
        label="Enter a join code"
        onPress={() => router.push("/join")}
      />
      <LinkButton
        label="Saved listings"
        onPress={() => router.push("/saved")}
      />

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
