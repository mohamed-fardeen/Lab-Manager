import { test, expect, type Page } from "@playwright/test";

/**
 * Core workflow E2E: login → create subject → create experiment → upload file → generate AI record.
 *
 * The Supabase, Cloudinary, and Groq services backing this app are not available in CI
 * unless the operator configures E2E_TEST_USER_EMAIL and E2E_TEST_USER_PASSWORD. The
 * full flow test skips itself when those secrets are absent so CI is not blocked on
 * missing credentials. The smoke test below always runs.
 */

const E2E_EMAIL = process.env.E2E_TEST_USER_EMAIL;
const E2E_PASSWORD = process.env.E2E_TEST_USER_PASSWORD;
const E2E_READY = Boolean(E2E_EMAIL && E2E_PASSWORD);

test.describe("smoke", () => {
  test("backend /api/health responds OK", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
  });

  test("landing page renders and exposes the sign-in affordance", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Lab/i);
    // The landing page has a sign-in trigger in the nav.
    const signIn = page.getByRole("button", { name: /sign in/i }).first();
    await expect(signIn).toBeVisible();
  });
});

test.describe("core workflow", () => {
  test.beforeAll(() => {
    if (!E2E_READY) {
      console.warn(
        "[e2e] E2E_TEST_USER_EMAIL and/or E2E_TEST_USER_PASSWORD not set — skipping core workflow.",
      );
    }
  });

  test("login → subject → experiment → upload → AI record", async ({ page }) => {
    test.skip(!E2E_READY, "E2E credentials not configured");

    // 1. Login.
    await page.goto("/");
    await page.getByRole("button", { name: /sign in/i }).first().click();
    await page.getByLabel(/email/i).fill(E2E_EMAIL!);
    await page.getByLabel(/password/i).fill(E2E_PASSWORD!);
    await page.getByRole("button", { name: /sign in|log in|submit/i }).last().click();

    // Wait for the authenticated shell to mount.
    await page.waitForURL((url) => !url.pathname.startsWith("/login") && url.pathname !== "/", {
      timeout: 30_000,
    });

    // 2. Create subject.
    await openCreateDialog(page, /new subject|create subject|add subject/i);
    await page.getByLabel(/subject (name|title)/i).fill(`E2E Subject ${Date.now()}`);
    await submitDialog(page);

    // 3. Create experiment under the new subject.
    await openCreateDialog(page, /new experiment|create experiment|add experiment/i);
    await page.getByLabel(/experiment (name|title)/i).fill(`E2E Experiment ${Date.now()}`);
    await submitDialog(page);

    // 4. Upload a file into the experiment folder.
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles({
      name: "e2e-sample.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("E2E upload — sample lab note.\n"),
    });
    await expect(page.getByText(/e2e-sample\.txt/i)).toBeVisible({ timeout: 15_000 });

    // 5. Generate an AI record for the experiment.
    const aiButton = page
      .getByRole("button", { name: /generate.*(ai|record)|ai.*record/i })
      .first();
    await aiButton.click();
    // AI generation can take a while; allow generous time.
    await expect(page.getByText(/record.*(created|generated|saved)/i)).toBeVisible({
      timeout: 60_000,
    });
  });
});

async function openCreateDialog(page: Page, trigger: RegExp) {
  const button = page.getByRole("button", { name: trigger }).first();
  await button.click();
  // Most modal dialogs in this app use the [role=dialog] pattern from Radix.
  await page.getByRole("dialog").waitFor({ state: "visible", timeout: 10_000 });
}

async function submitDialog(page: Page) {
  await page
    .getByRole("button", { name: /save|create|submit|confirm/i })
    .last()
    .click();
  // Wait for the dialog to close before the next step.
  await page.getByRole("dialog").waitFor({ state: "hidden", timeout: 15_000 });
}
