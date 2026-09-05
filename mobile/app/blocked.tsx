import * as Linking from "expo-linking";
import { Redirect } from "expo-router";
import { useAuth } from "../src/auth";
import { DeleteAccountSection } from "../src/DeleteAccountSection";
import { siteUrl } from "../src/theme";
import {
  Kicker,
  Lede,
  LinkButton,
  Screen,
  SecondaryButton,
  Title,
} from "../src/ui";

export default function BlockedScreen() {
  const { access, session, signOut } = useAuth();
  if (!session) return <Redirect href="/login" />;
  if (!access || access.allowed) return <Redirect href="/family" />;

  return (
    <Screen header>
      <Kicker>Causey</Kicker>
      <Title>This app is for ages 13 and up</Title>
      <Lede>{access.message}</Lede>
      <LinkButton
        label="Open Causey on the web"
        onPress={() => Linking.openURL(`${siteUrl}/family`)}
      />
      <SecondaryButton label="Sign out" onPress={() => void signOut()} />
      <DeleteAccountSection />
    </Screen>
  );
}
