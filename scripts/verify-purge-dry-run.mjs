import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const purgeScript = path.join(repoRoot, "ingestion", "purge-stale.ts");
const source = await readFile(purgeScript, "utf8");

const flagIndex = source.indexOf('process.env.PURGE_DRY_RUN === "1"');
const guardIndex = source.indexOf("if (dryRun)");
const guardReturnIndex = source.indexOf("return;", guardIndex);
const destructiveIndexes = [...source.matchAll(/\.(?:delete|update)\s*\(/g)].map(
  (match) => match.index
);
const firstDestructiveIndex = Math.min(...destructiveIndexes);

const failures = [];
if (flagIndex < 0) {
  failures.push("PURGE_DRY_RUN=1 is no longer recognized");
}
if (guardIndex < 0 || guardReturnIndex < 0) {
  failures.push("the dry-run branch does not return before continuing");
}
if (
  destructiveIndexes.length === 0 ||
  guardIndex > firstDestructiveIndex ||
  guardReturnIndex > firstDestructiveIndex
) {
  failures.push("a database update/delete can occur before the dry-run return");
}
if (!source.includes("Dry run — no deletes.")) {
  failures.push("the dry-run result no longer clearly reports that nothing was deleted");
}

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(`Purge dry-run safety error: ${failure}.`);
  }
  process.exitCode = 1;
} else {
  console.log(
    "Verified purge dry-run exits before every database update or delete."
  );
}
