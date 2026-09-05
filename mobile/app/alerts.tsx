import { Redirect, Stack, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, RefreshControl, StyleSheet, Text } from "react-native";
import { causeyFetch } from "../src/api";
import {
  formatAlertTime,
  inAppEventPath,
  isWebsiteOnlyHref,
} from "../src/alerts";
import { useAuth } from "../src/auth";
import { feedback } from "../src/haptics";
import { colors } from "../src/theme";
import {
  ErrorText,
  Lede,
  Meta,
  PrimaryButton,
  Screen,
  Spinner,
  Title,
} from "../src/ui";

type AlertRow = {
  id: string;
  kind: string;
  title: string;
  body: string;
  href: string | null;
  read_at: string | null;
  created_at: string;
};

type AlertsPayload = {
  notifications: AlertRow[];
  unread_count: number;
};

export default function AlertsScreen() {
  const { ready, session, access } = useAuth();

  if (!ready) return <Spinner />;
  if (!session) return <Redirect href="/login" />;
  if (access && !access.allowed) return <Redirect href="/blocked" />;
  if (!access) return <Spinner />;

  return (
    <>
      <Stack.Screen options={{ title: "Alerts" }} />
      <AlertsInbox />
    </>
  );
}

function AlertsInbox() {
  const { session } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<AlertsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session?.access_token) return;
    setRefreshing(true);
    try {
      const fresh = (await causeyFetch("/api/mobile/alerts", {
        token: session.access_token,
      })) as AlertsPayload;
      setData(fresh);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load alerts.");
    } finally {
      setRefreshing(false);
    }
  }, [session?.access_token]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  async function markRead(id: string) {
    if (!session?.access_token) return;
    await causeyFetch("/api/mobile/alerts", {
      token: session.access_token,
      method: "POST",
      body: { id },
    });
  }

  async function onRowPress(row: AlertRow) {
    if (!session?.access_token || busyId) return;
    setBusyId(row.id);
    try {
      if (!row.read_at) {
        await markRead(row.id);
        setData((current) =>
          current
            ? {
                notifications: current.notifications.map((item) =>
                  item.id === row.id
                    ? { ...item, read_at: new Date().toISOString() }
                    : item
                ),
                unread_count: Math.max(0, current.unread_count - 1),
              }
            : current
        );
      }
      const eventPath = inAppEventPath(row.href);
      if (eventPath) router.push(eventPath);
    } catch (err) {
      feedback("error");
      setError(
        err instanceof Error ? err.message : "Could not update that alert."
      );
    } finally {
      setBusyId(null);
    }
  }

  async function markAllRead() {
    if (!session?.access_token || !data?.unread_count) return;
    setBusyId("all");
    try {
      await causeyFetch("/api/mobile/alerts", {
        token: session.access_token,
        method: "POST",
        body: { all: true },
      });
      feedback("success");
      await load();
    } catch (err) {
      feedback("error");
      setError(
        err instanceof Error ? err.message : "Could not mark alerts read."
      );
    } finally {
      setBusyId(null);
    }
  }

  if (!data && refreshing) return <Spinner />;

  const rows = data?.notifications ?? [];
  const unreadCount = data?.unread_count ?? 0;

  return (
    <Screen
      header
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void load()}
          tintColor={colors.brandRed}
        />
      }
    >
      <Title>Alerts</Title>
      {unreadCount ? (
        <Meta>
          {unreadCount} unread
        </Meta>
      ) : null}
      {error ? <ErrorText>{error}</ErrorText> : null}
      {!rows.length && !error ? (
        <Lede>
          No alerts yet. Invitations and results show up here.
        </Lede>
      ) : (
        rows.map((row) => {
          const unread = !row.read_at;
          return (
            <Pressable
              key={row.id}
              onPress={() => void onRowPress(row)}
              disabled={busyId !== null}
              accessibilityRole="button"
              accessibilityLabel={
                unread ? `Unread: ${row.title}` : row.title
              }
              accessibilityState={{ disabled: busyId !== null }}
              style={({ pressed }) => [
                styles.row,
                pressed && styles.pressed,
              ]}
            >
              <Text style={unread ? styles.unreadTitle : styles.readTitle}>
                {row.title}
              </Text>
              <Text style={styles.body}>{row.body}</Text>
              <Meta>{formatAlertTime(row.created_at)}</Meta>
              {isWebsiteOnlyHref(row.href) ? (
                <Meta>Open on the website</Meta>
              ) : null}
            </Pressable>
          );
        })
      )}
      {rows.length ? (
        <PrimaryButton
          label="Mark all read"
          onPress={() => void markAllRead()}
          busy={busyId === "all"}
          disabled={!unreadCount || busyId !== null}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    marginTop: 16,
    minHeight: 44,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  pressed: { opacity: 0.6 },
  unreadTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.foreground,
  },
  readTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: colors.mutedStrong,
  },
  body: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
  },
});
