import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  globalIgnores([
    ".next/**",
    "build/**",
    "coverage/**",
    "data/cache/**",
    "data/staging/**",
    "ingestion/fixtures/**",
    "supabase/.temp/**",
    "Upcoming Tournaments _ US Chess.org_files/**",
    "WebsiteHTMLs/**",
    "next-env.d.ts",
  ]),
]);
