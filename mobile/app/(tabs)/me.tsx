import * as Linking from "expo-linking";
import { StyleSheet, View } from "react-native";
import { useAuth } from "../../src/auth";
import { DeleteAccountSection } from "../../src/DeleteAccountSection";
import { colors, siteUrl } from "../../src/theme";
import {
  Kicker,
  LinkButton,
  Meta,
  Screen,
  SecondaryButton,
  Title,
} from "../../src/ui";

const ROLE_LABEL: Record<string, string> = {
  parent: "Parent account",
  coach: "Coach account",
  student: "Student account",
  org_admin: "Organization admin",
  district_admin: "District admin",
};

export default function MeScreen() {
  const { profile, signOut } = useAuth();

  return (
    <Screen>
      <Kicker>Account</Kicker>
      <Title>{profile?.display_name ?? "Signed in"}</Title>
      {profile?.email ? <Meta>{profile.email}</Meta> : null}
      <Meta>{ROLE_LABEL[profile?.role ?? ""] ?? "Signed in"}</Meta>

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
        <LinkButton
          label="Export my data on the website"
          onPress={() => Linking.openURL(`${siteUrl}/account#data`)}
        />
      </View>

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
