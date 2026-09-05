import Ionicons from "@expo/vector-icons/Ionicons";
import { Redirect, Tabs } from "expo-router";
import type { ComponentProps } from "react";
import type { ColorValue } from "react-native";
import { useAuth } from "../../src/auth";
import { homeRouteForRole } from "../../src/roles";
import { colors } from "../../src/theme";
import { Spinner } from "../../src/ui";

type IconName = ComponentProps<typeof Ionicons>["name"];

function tabIcon(active: IconName, inactive: IconName) {
  return ({
    focused,
    color,
    size,
  }: {
    focused: boolean;
    color: ColorValue;
    size: number;
  }) => (
    <Ionicons
      name={focused ? active : inactive}
      size={size}
      color={color as string}
    />
  );
}

export default function TabsLayout() {
  const { ready, session, access, profile } = useAuth();

  if (!ready) return <Spinner />;
  if (session && access && access.allowed === false) {
    return <Redirect href="/blocked" />;
  }

  // Tournament search is public on the website, so it is public here too: a
  // visitor can browse without an account and sign in from the Me tab.
  // One home per role, and none of them for a visitor.
  const signedIn = Boolean(session);
  const home = signedIn ? homeRouteForRole(profile?.role) : null;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brandRed,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.line,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="family"
        options={{
          title: "Family",
          href: home === "/family" ? undefined : null,
          tabBarIcon: tabIcon("people", "people-outline"),
        }}
      />
      <Tabs.Screen
        name="plan"
        options={{
          title: "My tournaments",
          href: home === "/plan" ? undefined : null,
          tabBarIcon: tabIcon("calendar", "calendar-outline"),
        }}
      />
      <Tabs.Screen
        name="team"
        options={{
          title: "My team",
          href: home === "/team" ? undefined : null,
          tabBarIcon: tabIcon("clipboard", "clipboard-outline"),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Search",
          tabBarIcon: tabIcon("search", "search-outline"),
        }}
      />
      <Tabs.Screen
        name="me"
        options={{
          title: "Me",
          tabBarIcon: tabIcon("person-circle", "person-circle-outline"),
        }}
      />
    </Tabs>
  );
}
