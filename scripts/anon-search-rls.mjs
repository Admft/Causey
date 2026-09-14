import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Unsigned directory search, event pages, and pathways plan every SELECT
 * policy on competitions/sections. Postgres checks EXECUTE on helpers named
 * in those policies even when the visitor only wants published rows.
 * Staff helpers must not appear on PUBLIC/anon SELECT policies.
 */

const STAFF_HELPER_CALL =
  /\b(is_org_coach|is_org_staff|is_org_admin|is_district_admin|can_operate_org_competitions|can_view_competition|can_manage_competition|is_platform_admin|can_administer_org)\s*\(/i;

const SELECT_POLICY =
  /create\s+policy\s+"([^"]+)"\s+on\s+public\.(competitions|sections)\s+for\s+select\b([\s\S]*?);/gi;

const DROP_POLICY =
  /drop\s+policy\s+(?:if\s+exists\s+)?"([^"]+)"\s+on\s+public\.(competitions|sections)/gi;

const REQUIRED_UNPUBLISHED = [
  ["competitions", "competitions_select_unpublished_manager"],
  ["sections", "sections_select_unpublished_manager"],
];

export function stripSqlComments(sql) {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/--[^\n]*/g, "");
}

export function selectPolicyRoles(rest) {
  const match = rest.match(/^\s*(?:to\s+([^]+?)\s+)?using\b/i);
  if (!match) return [];
  if (!match[1]) return ["public"];
  return match[1]
    .split(",")
    .map((role) => role.trim().toLowerCase())
    .filter(Boolean);
}

export function effectiveCompetitionSelectPolicies(migrations) {
  const byKey = new Map();
  for (const migration of migrations) {
    const sql = stripSqlComments(migration.sql);
    const statements = [
      ...sql.matchAll(DROP_POLICY),
      ...sql.matchAll(SELECT_POLICY),
    ]
      .map((match) => ({
        index: match.index ?? 0,
        kind: match[0].toLowerCase().startsWith("drop") ? "drop" : "create",
        name: match[1],
        table: match[2],
        rest: match[3],
      }))
      .sort((left, right) => left.index - right.index);

    for (const statement of statements) {
      const key = `${statement.table}::${statement.name}`;
      if (statement.kind === "drop") {
        byKey.delete(key);
        continue;
      }
      byKey.set(key, {
        file: migration.file,
        table: statement.table,
        name: statement.name,
        rest: statement.rest,
        roles: selectPolicyRoles(statement.rest),
      });
    }
  }
  return [...byKey.values()];
}

export function collectAnonSearchRlsViolations(migrations) {
  const policies = effectiveCompetitionSelectPolicies(migrations);
  const violations = [];
  const byKey = new Map(
    policies.map((policy) => [`${policy.table}::${policy.name}`, policy])
  );

  for (const [table, name] of REQUIRED_UNPUBLISHED) {
    const policy = byKey.get(`${table}::${name}`);
    if (!policy) {
      violations.push(
        `missing SELECT policy ${name} on ${table}; unsigned search needs it scoped to authenticated`
      );
      continue;
    }
    if (
      policy.roles.includes("public") ||
      policy.roles.includes("anon")
    ) {
      violations.push(
        `${policy.file}: ${name} on ${table} still applies to ${policy.roles.join(", ")}`
      );
    }
  }

  for (const policy of policies) {
    if (!STAFF_HELPER_CALL.test(policy.rest)) continue;
    const exposed = policy.roles.filter(
      (role) => role === "public" || role === "anon"
    );
    if (!exposed.length) continue;
    violations.push(
      `${policy.file}: ${policy.name} on ${policy.table} names a staff helper for ${exposed.join(", ")}`
    );
  }

  return violations;
}

export function loadMigrationSql(migrationsDirectory) {
  return readdirSync(migrationsDirectory)
    .filter((file) => /^\d{4}_.+\.sql$/.test(file))
    .sort((left, right) => {
      const versionDifference =
        Number(left.slice(0, 4)) - Number(right.slice(0, 4));
      return versionDifference || left.localeCompare(right);
    })
    .map((file) => ({
      file,
      sql: readFileSync(resolve(migrationsDirectory, file), "utf8"),
    }));
}
