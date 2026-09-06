import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  // String form skips nearest-tsconfig lookup. Object form still walks
  // mobile/tsconfig.json → expo/tsconfig.base, which CI does not install.
  esbuild: {
    tsconfigRaw: JSON.stringify({
      compilerOptions: {
        target: "ES2020",
        jsx: "react-jsx",
        isolatedModules: true,
      },
    }),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      "server-only": path.resolve(__dirname, "tests/server-only-stub.ts"),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
});
