import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    exclude: ["node_modules", "dist", "e2e", "tests/e2e/**"],
    // CI-friendly: single pass, no watch.
    reporters: process.env.CI ? ["default"] : ["default"],
    coverage: {
      reporter: ["text", "html"],
      include: ["src/**", "server/**"],
      exclude: ["**/*.test.*", "**/*.spec.*", "server/scripts/**", "scratch/**"],
    },
  },
});
