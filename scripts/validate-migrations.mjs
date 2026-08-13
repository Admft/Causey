import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const LEGACY_DUPLICATE_PREFIXES = new Map([
  [
    "0015",
    [
      "0015_external_registration_tracking.sql",
      "0015_platform_admins.sql",
    ],
  ],
  [
    "0016",
    [
      "0016_escalation_lockdown.sql",
      "0016_search_interest_ranking.sql",
    ],
  ],
]);

export function validateMigrationDirectory(migrationsDirectory) {
  const files = readdirSync(migrationsDirectory)
    .filter((file) => file.endsWith(".sql"))
    .sort();
  const errors = [];
  const warnings = [];
  const byPrefix = new Map();

  for (const file of files) {
    const match = file.match(/^(\d{4})_[a-z0-9][a-z0-9_]*\.sql$/);
    if (!match) {
      errors.push(
        `${file}: live migrations must use a four-digit numeric prefix`
      );
      continue;
    }

    const prefix = match[1];
    const names = byPrefix.get(prefix) ?? [];
    names.push(file);
    byPrefix.set(prefix, names);
  }

  for (const [prefix, names] of byPrefix) {
    if (names.length < 2) continue;

    const actual = [...names].sort();
    const legacy = LEGACY_DUPLICATE_PREFIXES.get(prefix);
    if (
      legacy &&
      actual.length === legacy.length &&
      actual.every((name, index) => name === [...legacy].sort()[index])
    ) {
      warnings.push(
        `${prefix}: preserved applied-history duplicate (${actual.join(", ")})`
      );
      continue;
    }

    errors.push(`${prefix}: duplicate migration prefix (${actual.join(", ")})`);
  }

  for (const [prefix, legacy] of LEGACY_DUPLICATE_PREFIXES) {
    const actual = [...(byPrefix.get(prefix) ?? [])].sort();
    const expected = [...legacy].sort();
    if (
      actual.length !== expected.length ||
      actual.some((name, index) => name !== expected[index])
    ) {
      errors.push(
        `${prefix}: applied legacy filenames changed; reconcile live migration history before renaming`
      );
    }
  }

  return { errors, warnings };
}

function main() {
  const scriptDirectory = dirname(fileURLToPath(import.meta.url));
  const migrationsDirectory = resolve(
    scriptDirectory,
    "..",
    "supabase",
    "migrations"
  );
  const { errors, warnings } = validateMigrationDirectory(
    migrationsDirectory
  );

  for (const warning of warnings) {
    console.warn(`migration warning: ${warning}`);
  }
  if (errors.length) {
    for (const error of errors) {
      console.error(`migration error: ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("Migration filenames are reproducible.");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
