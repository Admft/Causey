import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(__dirname, "..");
const read = (relativePath: string) =>
  readFileSync(join(root, relativePath), "utf8");

const migration = read("supabase/migrations/0075_guardian_link_consent.sql");

/** Body of a `create or replace function` block, by name. */
function functionBody(sql: string, name: string): string {
  const start = sql.indexOf(`create or replace function public.${name}(`);
  expect(start, `${name} should exist`).toBeGreaterThan(-1);
  const bodyStart = sql.indexOf("as $$", start);
  const bodyEnd = sql.indexOf("$$;", bodyStart);
  expect(bodyEnd).toBeGreaterThan(bodyStart);
  return sql.slice(bodyStart, bodyEnd);
}

describe("0075 records who opened a family link", () => {
  it("adds requested_by and backfills legacy rows to the parent", () => {
    expect(migration).toContain(
      "add column if not exists requested_by uuid"
    );
    // request_child_link was the only writer before this migration, so the
    // student stays the consenting side on every existing row.
    expect(migration).toContain("set requested_by = parent_profile_id");
    expect(migration).toContain("where requested_by is null");
  });

  it("stamps the initiator from the session instead of the payload", () => {
    const guard = functionBody(migration, "guard_household_link_request");
    expect(guard).toContain("new.requested_by := auth.uid()");
    expect(guard).toContain("household_link_requester_not_a_participant");
    expect(guard).toContain("household_link_must_start_pending");
    expect(migration).toContain(
      "before insert on public.household_links"
    );
  });
});

describe("0075 keeps consent with the participant who did not ask", () => {
  it("blocks self-activation in the update policy", () => {
    const policy = migration.slice(
      migration.indexOf('create policy "household_update_participants"'),
      migration.indexOf('drop policy if exists "profiles_select_household"')
    );
    expect(policy).toContain("status = 'active'");
    expect(policy).toContain("requested_by is distinct from auth.uid()");
    // Either side may still end a link.
    expect(policy).toContain("and status = 'revoked'");
  });

  it("blocks self-activation in the response RPC as well", () => {
    const respond = functionBody(migration, "respond_to_household_link");
    expect(respond).toContain("household_link_requester_cannot_accept");
    expect(respond).toContain("target.requested_by is not distinct from actor");
    // An unattributed row must fail closed rather than let either side accept.
    expect(respond).toContain("target.requested_by is null");
    expect(respond).toContain("household_link_not_pending");
    expect(respond).toContain("for update");
  });

  it("still lets either participant end an active link", () => {
    const respond = functionBody(migration, "respond_to_household_link");
    const declineBranch = respond.slice(respond.indexOf("else"));
    expect(declineBranch).toContain("new_status := 'revoked'");
    expect(declineBranch).not.toContain("household_link_not_pending");
  });
});

describe("0075 does not let a parent probe for student accounts", () => {
  it("keeps both request RPCs blind and delayed", () => {
    for (const name of ["request_child_link", "request_guardian_link"]) {
      const body = functionBody(migration, name);
      expect(body, name).toContain("perform pg_sleep(0.15)");
      // A miss returns exactly like a hit.
      expect(body, name).toContain("return;");
      expect(migration).toContain(
        `create or replace function public.${name}(`
      );
    }
    expect(migration).toContain("returns void");
  });

  it("reveals a pending student only when the student asked first", () => {
    const policy = migration.slice(
      migration.indexOf('create policy "profiles_select_household"'),
      migration.indexOf("create or replace function public.notify_household_link")
    );
    // Child -> parent visibility is unchanged for pending and active.
    expect(policy).toContain("h.child_profile_id = auth.uid()");
    expect(policy).toContain("h.status in ('pending', 'active')");
    // Parent -> child visibility requires an active link or a student-opened
    // request, so a parent's own guess never confirms an account.
    expect(policy).toContain(
      "(h.status = 'pending' and h.requested_by = h.child_profile_id)"
    );
  });

  it("hides parent-opened requests from the parent's inbox query", () => {
    const portal = read("lib/data/portal.ts");
    const fn = portal.slice(
      portal.indexOf("export async function getIncomingChildLinkRequests")
    );
    expect(fn).toContain(
      '(row.requested_by as string | null) === row.child_profile_id'
    );
  });

  it("requires a role on each side", () => {
    expect(functionBody(migration, "request_child_link")).toContain(
      "p.role = 'parent'"
    );
    expect(functionBody(migration, "request_guardian_link")).toContain(
      "p.role = 'student'"
    );
  });
});

describe("0075 makes requests and acceptances audible", () => {
  it("writes household alerts without widening the notification gate", () => {
    const notify = functionBody(migration, "notify_household_link");
    expect(notify).toContain("insert into public.notifications");
    expect(notify).toContain("'household_link'");
    // 'account' is always-on, so a consent alert cannot be silenced by prefs.
    expect(notify).toContain("'account'");
    // One live alert per direction: repeating a request refreshes it.
    expect(notify).toContain("delete from public.notifications");
    // The shared authorizer is referenced only in prose, never redefined.
    expect(migration).not.toContain(
      "function public.create_in_app_notification("
    );
  });

  it("notifies the student on a parent request", () => {
    const body = functionBody(migration, "request_child_link");
    expect(body).toContain("perform public.notify_household_link(");
    expect(body).toContain("'/me#family'");
    expect(body).toContain("asked to link as your parent");
    // No ping when nothing is actually pending.
    expect(body).toContain("and h.status = 'pending'");
  });

  it("notifies the parent on a student request", () => {
    const body = functionBody(migration, "request_guardian_link");
    expect(body).toContain("perform public.notify_household_link(");
    expect(body).toContain("'/family#requests'");
    expect(body).toContain("and h.status = 'pending'");
  });

  it("notifies whoever asked, once the other side accepts", () => {
    const respond = functionBody(migration, "respond_to_household_link");
    expect(respond).toContain("if new_status = 'active' then");
    expect(respond).toContain("target.requested_by,");
    expect(respond).toContain("accepted your family link");
    // Routed to the initiator's own surface.
    expect(respond).toContain("then '/family'");
    expect(respond).toContain("else '/me#family'");
  });

  it("does not notify on a decline", () => {
    const respond = functionBody(migration, "respond_to_household_link");
    const notifyIndex = respond.indexOf("perform public.notify_household_link");
    const activeGuardIndex = respond.indexOf("if new_status = 'active' then");
    expect(activeGuardIndex).toBeGreaterThan(-1);
    expect(notifyIndex).toBeGreaterThan(activeGuardIndex);
  });
});

describe("0075 repairs the rate-limit bucket allowlist", () => {
  it("allowlists every bucket the app already sends", () => {
    const consume = functionBody(migration, "consume_rate_limit");
    for (const bucket of [
      "search",
      "signup",
      "join_code",
      "claim",
      "csv_import",
      "comment",
      "geo",
      "household",
    ]) {
      expect(consume, bucket).toContain(`'${bucket}'`);
    }
  });

  it("keeps the TypeScript bucket list in sync with the allowlist", () => {
    const limiter = read("lib/rate-limit.ts");
    const consume = functionBody(migration, "consume_rate_limit");
    const declared = [
      ...limiter
        .slice(
          limiter.indexOf("export type RateLimitBucket"),
          limiter.indexOf("const LIMITS")
        )
        .matchAll(/"([a-z_]+)"/g),
    ].map((match) => match[1]);
    expect(declared.length).toBeGreaterThan(0);
    for (const bucket of declared) {
      expect(consume, bucket).toContain(`'${bucket}'`);
    }
  });
});

describe("guardian link actions", () => {
  const actions = read("lib/actions/household.ts");

  it("rate limits both request directions per account", () => {
    expect(
      [...actions.matchAll(/consumeRateLimit\(\s*"household"/g)].length
    ).toBe(2);
    expect(actions).toContain("hashedRequestActorKey(user.id)");
    expect(actions).toContain("RATE_LIMIT_MESSAGE");
  });

  it("returns the same message whether or not the email matched", () => {
    expect(actions).toContain("GENERIC_GUARDIAN_MESSAGE");
    expect(actions).toContain("If that email belongs to a parent account");
    // Success is unconditional after the RPC returns.
    const fn = actions.slice(
      actions.indexOf("export async function requestGuardianLink")
    );
    expect(fn).toContain("request_guardian_link");
    expect(fn).not.toContain("not found");
  });

  it("responds through the RPC so consent is enforced server-side", () => {
    const fn = actions.slice(
      actions.indexOf("export async function respondToLink"),
      actions.indexOf("export async function revokeLink")
    );
    expect(fn).toContain('supabase.rpc("respond_to_household_link"');
    expect(fn).not.toContain('.from("household_links")');
    expect(fn).toContain("requester_cannot_accept");
  });

  it("revalidates both sides after any change", () => {
    expect(actions).toContain('revalidatePath("/me")');
    expect(actions).toContain('revalidatePath("/family")');
    expect(actions).toContain('revalidatePath("/me/notifications")');
  });
});

describe("guardian link surfaces", () => {
  it("tells a student which requests are theirs to answer", () => {
    const page = read("app/me/page.tsx");
    // An outgoing request is not the student's task.
    expect(page).toContain(
      'link.status === "pending" && !link.awaiting_parent'
    );
    expect(page).toContain("waiting for them to accept");
    expect(page).toContain('"awaiting_them"');
    expect(page).toContain('"awaiting_me"');
  });

  it("lets a student ask a parent, and hands off a signup link", () => {
    const page = read("app/me/page.tsx");
    const form = read("components/GuardianLinkRequestForm.tsx");
    expect(page).toContain("GuardianLinkRequestForm");
    expect(form).toContain("requestGuardianLink");
    expect(form).toContain("/signup?role=parent");
    // Opening the link themselves would sign the student out.
    expect(form).toContain("you’ll be signed out of your own account");
    expect(form).toContain("Your school is not involved");
  });

  it("reaches the ask form even with no parent linked", () => {
    const page = read("app/me/page.tsx");
    expect(page).toContain("isStudent && !pendingParentLinks.length");
    expect(page).toContain("No parent is linked");
  });

  it("gives the parent an inbox for student-opened requests", () => {
    const page = read("app/family/page.tsx");
    expect(page).toContain("getIncomingChildLinkRequests");
    expect(page).toContain('id="requests"');
    expect(page).toContain("asked you to be their parent on Causey");
    expect(page).toContain('state="awaiting_me"');
    // Requests outrank the empty-state setup mission.
    expect(page.indexOf("if (incomingRequests.length) {")).toBeLessThan(
      page.indexOf("} else if (!children.length) {")
    );
  });

  it("only offers cancel on a request the viewer opened", () => {
    const component = read("components/HouseholdRequestActions.tsx");
    const outgoing = component.slice(
      component.indexOf('state === "awaiting_them"'),
      component.indexOf("<div className=\"flex items-center gap-2\">")
    );
    expect(outgoing).toContain("Cancel request");
    expect(outgoing).not.toContain("Accept");
    expect(component).toContain("Waiting for them");
    // Unlinking an active link still confirms first.
    expect(component).toContain("confirmingUnlink");
  });
});
