import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, ".") } },
  test: {
    include: ["lib/**/*.test.ts", "db/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["lib/calc/**/*.ts", "lib/cpm/**/*.ts", "lib/sozluk/{autolink,normalize,schema}.ts", "lib/commands.ts", "lib/quips.ts"],
      exclude: ["**/*.test.ts", "lib/cpm/queries.ts"],
      thresholds: { lines: 100, functions: 100, branches: 100, statements: 100 },
    },
  },
});
