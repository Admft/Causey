import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migrationsDirectory = resolve(process.cwd(), "supabase/migrations");

describe("migration history hygiene", () => {
  it("keeps non-migrations out of the live migration directory", () => {
    const sqlFiles = readdirSync(migrationsDirectory).filter((file) =>
      file.endsWith(".sql")
    );
    expect(sqlFiles).not.toContain("PENDING_SCRAPE.sql");
    expect(
      sqlFiles.every((file) =>
        /^\d{4}_[a-z0-9][a-z0-9_]*\.sql$/.test(file)
      )
    ).toBe(true);
  });

  it("rejects new duplicate prefixes without renaming applied history", () => {
    const result = spawnSync(
      process.execPath,
      [resolve(process.cwd(), "scripts/validate-migrations.mjs")],
      { encoding: "utf8" }
    );
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain(
      "Migration filenames are reproducible."
    );
    expect(result.stderr).toContain(
      "0015: preserved applied-history duplicate"
    );
    expect(result.stderr).toContain(
      "0016: preserved applied-history duplicate"
    );
  });
});
