import { test, expect } from "../fixtures";
import { openProject, openRailTab, openSettings } from "../helpers";

// Real AI conversations against a real provider. Opt in by setting
// E2E_AI_TOKEN (and optionally E2E_AI_PROVIDER, default "Z.AI") in e2e/.env.
// The key is saved through the actual Settings UI into the hermetic data
// dir's config - nothing touches your real ~/.openleaf.

const TOKEN = process.env.E2E_AI_TOKEN;
// Visible provider-card name in Settings -> AI (substring match).
const PROVIDER = process.env.E2E_AI_PROVIDER || "Z.AI";

test("connect an AI provider through the settings UI", async ({ tauriPage }) => {
  test.skip(!TOKEN, "set E2E_AI_TOKEN in e2e/.env to run");
  await openProject(tauriPage, "E2E Doc");
  await expect(tauriPage.locator(".cm-content")).toBeVisible({ timeout: 20_000 });

  await openSettings(tauriPage, "ai");
  await tauriPage.getByText(PROVIDER).click(); // expand the provider card
  await tauriPage.fill('input[placeholder="sk-…"]', TOKEN as string);
  await tauriPage.getByText("Save", { exact: true }).click();
  // Saving activates the provider; the confirmation message renders.
  await tauriPage.waitForFunction(
    `document.body.innerText.toLowerCase().includes('saved') || document.body.innerText.includes('active')`,
    10_000,
  );
  await tauriPage.click('[aria-label="Close settings"]');

  // The chat panel now offers the real input instead of the onboarding gate.
  await openRailTab(tauriPage, "Chat / AI Assistant");
  await expect(tauriPage.locator('textarea[placeholder*="Ask AI"]')).toBeVisible({
    timeout: 10_000,
  });
});

test("a real conversation round-trip", async ({ tauriPage }) => {
  test.skip(!TOKEN, "set E2E_AI_TOKEN in e2e/.env to run");
  test.setTimeout(180_000);
  await openProject(tauriPage, "E2E Doc");
  await expect(tauriPage.locator(".cm-content")).toBeVisible({ timeout: 20_000 });
  await openRailTab(tauriPage, "Chat / AI Assistant");

  const ta = 'textarea[placeholder*="Ask AI"]';
  await expect(tauriPage.locator(ta)).toBeVisible({ timeout: 10_000 });
  await tauriPage.fill(ta, "Reply with exactly the word PONG and nothing else. Do not use any tools.");
  await tauriPage.press(ta, "Enter");

  // The model streams back: PONG appears a second time (the first is our own
  // message bubble) and the input becomes available again when the run ends.
  await tauriPage.waitForFunction(
    `document.body.innerText.split('PONG').length >= 3`,
    120_000,
  );
  await tauriPage.waitForFunction(
    `!document.querySelector('[aria-label="Stop"]')`,
    30_000,
  );
});

test("the assistant can use a real project tool", async ({ tauriPage }) => {
  test.skip(!TOKEN, "set E2E_AI_TOKEN in e2e/.env to run");
  test.setTimeout(240_000);
  await openProject(tauriPage, "E2E Doc");
  await expect(tauriPage.locator(".cm-content")).toBeVisible({ timeout: 20_000 });
  await openRailTab(tauriPage, "Chat / AI Assistant");

  const ta = 'textarea[placeholder*="Ask AI"]';
  await expect(tauriPage.locator(ta)).toBeVisible({ timeout: 10_000 });
  await tauriPage.fill(
    ta,
    "Call the read_file tool on main.tex, then tell me the name of the first section. Do not modify anything.",
  );
  await tauriPage.press(ta, "Enter");

  // The read_file tool badge renders in the transcript, and the answer names
  // the real section from the real file.
  await tauriPage.waitForFunction(
    `document.body.innerText.includes('read_file')`,
    120_000,
  );
  await tauriPage.waitForFunction(
    `document.body.innerText.includes('Introduction') && !document.querySelector('[aria-label="Stop"]')`,
    120_000,
  );
});
