import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for the lab-screenshot-manager core workflow.
 *
 * Boots the production build via `npm start` (Express serves /dist on PORT=10000).
 * The `webServer.url` is the /api/health endpoint defined in server/server.cjs.
 */
export default defineConfig({
  testDir: "e2e",
  // Single end-to-end flow; keep it serial so webServer state is deterministic.
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never", outputFolder: "playwright-report" }]]
    : "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:10000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm start",
    url: "http://localhost:10000/api/health",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      NODE_ENV: "production",
      PORT: "10000",
    },
    stdout: "pipe",
    stderr: "pipe",
  },
});
