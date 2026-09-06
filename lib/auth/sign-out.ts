import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

/**
 * Family laptops and school library machines get handed to the next person.
 * A soft router.push leaves the signed-in pages this tab already rendered
 * reachable through back/forward, so sign-out replaces the document instead
 * of navigating inside it. The reload is the part that matters: it drops every
 * client cache and every component still holding the last account's data.
 *
 * If revoking the session server-side fails, fall back to clearing it locally
 * and leave anyway. Someone who clicked sign out must never be left looking
 * at their own account.
 */
export async function signOutAndLeave(destination = "/"): Promise<void> {
  const supabase = createBrowserSupabaseClient();
  try {
    const { error } = await supabase.auth.signOut();
    if (error) await supabase.auth.signOut({ scope: "local" });
  } catch {
    await supabase.auth.signOut({ scope: "local" }).catch(() => {});
  } finally {
    window.location.assign(destination);
  }
}
