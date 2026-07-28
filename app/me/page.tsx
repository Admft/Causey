import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { HouseholdRequestActions } from "@/components/HouseholdRequestActions";
import { ProfileEditor } from "@/components/ProfileEditor";
import { getCurrentProfile, getSessionUser } from "@/lib/auth/session";
import { getParentLinks } from "@/lib/data/portal";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatDateRange } from "@/lib/format";

export const metadata: Metadata = {
  title: "Your account",
  description: "Your Causey profile, saved tournaments, and ratings.",
};

export default async function MePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const profile = await getCurrentProfile();
  if (!profile) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
        <h1 className="font-display text-display-lg font-bold text-foreground">
          Profile not ready
        </h1>
        <p className="mt-3 text-sm text-muted">
          Your login works, but the profiles table is missing or the signup
          trigger didn&rsquo;t run. Apply{" "}
          <code className="text-foreground">supabase/migrations/0009_accounts.sql</code>{" "}
          in the Supabase SQL editor, then sign out and back in.
        </p>
      </div>
    );
  }

  const supabase = await createServerSupabaseClient();
  const { data: savedRows } = await supabase
    .from("saved_competitions")
    .select("competition_id, created_at, competitions(id, slug, name, city, state, start_date, end_date)")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false });

  const { data: ratingRows } = await supabase
    .from("competition_ratings")
    .select("score, competitions(id, slug, name)")
    .eq("user_id", profile.id)
    .order("updated_at", { ascending: false });

  const parentLinks =
    profile.role === "student" ? await getParentLinks(profile.id) : [];

  const roleLabel =
    profile.role === "coach"
      ? "Coach / Organizer"
      : profile.role === "parent"
        ? "Parent"
        : "Student";

  return (
    <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
      <p className="text-sm font-semibold text-brand-red">Account</p>
      <h1 className="mt-2 font-display text-display-lg font-bold tracking-tight text-foreground">
        {profile.display_name || "Your profile"}
      </h1>
      <p className="mt-2 text-sm text-muted">
        {user.email} · {roleLabel}
      </p>

      {parentLinks.length ? (
        <section className="section-rule mt-10 pt-8">
          <h2 className="text-sm font-semibold text-foreground">Family</h2>
          <ul className="mt-4 flex flex-col gap-2">
            {parentLinks.map((link) => (
              <li
                key={link.parent_profile_id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface px-4 py-3"
              >
                <div>
                  <span className="text-sm font-semibold text-foreground">
                    {link.parent_name}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted">
                    {link.status === "pending"
                      ? "wants to link as your parent — they’ll see your clubs and can RSVP for you"
                      : "linked as your parent"}
                  </span>
                </div>
                <HouseholdRequestActions
                  parentProfileId={link.parent_profile_id}
                  linked={link.status === "active"}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="section-rule mt-10 pt-8">
        <h2 className="text-sm font-semibold text-foreground">Profile</h2>
        <div className="mt-4">
          <ProfileEditor profile={profile} />
        </div>
      </section>

      <section className="section-rule mt-10 pt-8">
        <h2 className="text-sm font-semibold text-foreground">Saved tournaments</h2>
        {!savedRows?.length ? (
          <p className="mt-3 text-sm text-muted">
            None yet. Open an event and tap{" "}
            <span className="font-medium text-foreground">Save to profile</span>.{" "}
            <Link href="/chess" className="font-semibold text-brand-red hover:underline">
              Search tournaments
            </Link>
          </p>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {savedRows.map((row) => {
              const c = row.competitions as unknown as {
                slug: string;
                name: string;
                city: string;
                state: string;
                start_date: string;
                end_date: string | null;
              } | null;
              if (!c) return null;
              return (
                <li key={row.competition_id}>
                  <Link
                    href={`/event/${c.slug}`}
                    className="block rounded-xl border border-line bg-surface px-4 py-3 transition-colors hover:border-brand-red/30"
                  >
                    <span className="font-semibold text-foreground">{c.name}</span>
                    <span className="mt-1 block text-xs text-muted">
                      {formatDateRange(c.start_date, c.end_date)} · {c.city}, {c.state}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="section-rule mt-10 pt-8">
        <h2 className="text-sm font-semibold text-foreground">Your difficulty ratings</h2>
        {!ratingRows?.length ? (
          <p className="mt-3 text-sm text-muted">
            Rate how hard an event feels (1–10) from its event page.
          </p>
        ) : (
          <ul className="mt-4 flex flex-col gap-2">
            {ratingRows.map((row) => {
              const c = row.competitions as unknown as {
                slug: string;
                name: string;
              } | null;
              if (!c) return null;
              return (
                <li key={c.slug} className="flex items-baseline justify-between gap-3 text-sm">
                  <Link href={`/event/${c.slug}`} className="font-medium text-foreground hover:text-brand-red">
                    {c.name}
                  </Link>
                  <span className="shrink-0 font-semibold text-muted-strong">{row.score}/10</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
