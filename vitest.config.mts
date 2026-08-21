import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Next keeps tsconfig `jsx` as "preserve", which the test transformer will
  // not execute on its own — JSX reaches the parser untransformed and fails.
  // Today this matters only for the PDF document; PR 6 brings the whole React
  // frontend under test.
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["lib/**/*.test.ts", "lib/**/*.test.tsx"],
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          include: ["test/integration/**/*.test.ts"],
          setupFiles: ["./test/integration/setup.ts"],
          // One shared database, so files must not run concurrently.
          fileParallelism: false,
          hookTimeout: 60_000,
        },
      },
    ],
  },
});
