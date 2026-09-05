import "react-native-gesture-handler";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "../src/auth";
import { colors } from "../src/theme";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerTintColor: colors.brandRed,
            headerShadowVisible: false,
            headerStyle: { backgroundColor: colors.background },
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="event/[slug]" options={{ title: "Tournament" }} />
          <Stack.Screen
            name="attendance/[competitionId]"
            options={{ title: "Attendance" }}
          />
          <Stack.Screen
            name="results/[competitionId]"
            options={{ title: "Results" }}
          />
          <Stack.Screen name="roster/[orgId]" options={{ title: "Roster" }} />
          <Stack.Screen name="saved" options={{ title: "Saved listings" }} />
          <Stack.Screen name="orgs" options={{ title: "Organizations" }} />
          <Stack.Screen name="join" options={{ title: "Join" }} />
          <Stack.Screen name="alerts" options={{ title: "Alerts" }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="signup" options={{ title: "Create account" }} />
          <Stack.Screen
            name="forgot-password"
            options={{ title: "Reset password" }}
          />
          <Stack.Screen name="blocked" options={{ title: "Causey" }} />
        </Stack>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
