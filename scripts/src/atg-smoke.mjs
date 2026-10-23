import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

// Run against the managed workflows through the workspace reverse proxy.
const baseURL = "http://localhost:80";
const output = fileURLToPath(new URL("../../generated-artifacts/atg-tests/", import.meta.url));
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/repl/tools/bin/chromium",
  args: ["--no-sandbox"],
});
const context = await browser.newContext({
  baseURL,
  viewport: { width: 1280, height: 800 },
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));

try {
  await page.goto("/");
  await page.getByRole("heading", { name: /Your sales process/ }).waitFor();
  await page.screenshot({ path: `${output}/home.png` });
  await page.getByRole("link", { name: "FAQ", exact: true }).first().click();
  assert.equal(new URL(page.url()).hash, "#faq");
  const faq = page.getByRole("button", { name: "Do I need to be technical?" });
  await faq.click();
  assert.equal(await faq.getAttribute("aria-expanded"), "true");

  await page.getByRole("link", { name: "Get my free plan", exact: true }).first().click();
  await page.locator("#name").waitFor();
  await page.getByRole("button", { name: "Next →", exact: true }).click();
  await page.getByText("Name is required.", { exact: true }).waitFor();
  const email = `migration-${Date.now()}@example.com`;
  await page.locator("#name").fill("Migration Test");
  await page.locator("#email").fill(email);
  await page.locator("#role").fill("Business owner");
  await page.locator("#industry").fill("Consulting");
  await page.getByRole("button", { name: /^Sales Prospecting/ }).click();
  await page.getByRole("button", { name: "Next →", exact: true }).click();
  await page.getByRole("button", { name: "None yet", exact: true }).click();
  await page.getByRole("button", { name: "Email", exact: true }).click();
  await page.getByRole("button", { name: "← Back", exact: true }).click();
  assert.equal(await page.locator("#email").inputValue(), email);
  await page.getByRole("button", { name: "Next →", exact: true }).click();
  assert.equal(await page.getByRole("button", { name: "None yet", exact: true }).getAttribute("aria-pressed"), "true");
  await page.getByRole("button", { name: "Next →", exact: true }).click();
  await page.screenshot({ path: `${output}/preferences.png` });
  // Exercise the complete UI without creating live leads, sending email or
  // consuming the production-facing rate-limit budget on each validation run.
  // The real API + SQLite write path has a separate clean-filesystem test.
  const recommendation = {
    aiLevelSummary: "Migration Test, here is your starter AI plan.",
    workflows: [{ area: "sales", title: "Draft email follow-ups", description: "Review drafted follow-ups before sending." }],
    quickWin: "Try drafting one follow-up this week.",
    recommendedTier: "guided", tierRationale: "Build the first workflow together.",
    ctaText: "Book a free call to discuss your next step.", type: "fallback",
  };
  await page.route("**/api/intake", async (route) => {
    const body = route.request().postDataJSON();
    assert.equal(body.email, email);
    assert.deepEqual(body.areas, ["sales"]);
    assert.deepEqual(body.tools, ["none"]);
    assert.deepEqual(body.timeSinks, ["email"]);
    await route.fulfill({ json: { ok: true, response: recommendation } });
  });
  const submission = page.waitForResponse((res) => res.url().endsWith("/api/intake") && res.request().method() === "POST");
  await page.getByRole("button", { name: "Get my plan →", exact: true }).click();
  const response = await submission;
  assert.equal(response.status(), 200);
  const result = await response.json();
  assert.equal(result.ok, true);
  assert.ok(result.response.workflows.length > 0);
  await page.getByText(result.response.aiLevelSummary, { exact: true }).waitFor();
  await page.screenshot({ path: `${output}/recommendations.png`, fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Open menu", exact: true }).click();
  await page.getByRole("button", { name: "Close menu", exact: true }).waitFor();
  await page.getByRole("link", { name: "Get my plan", exact: true }).last().click();
  await page.locator("#name").waitFor();
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await page.screenshot({ path: `${output}/mobile-intake.png`, fullPage: true });

  for (const asset of [
    "/brand/logos/svg/optionA_lockup_notag.svg",
    "/brand/logos/ATG_icon_A_512_transparent.png",
    "/brand/ATG_Consulting_OnePager.pdf",
  ]) {
    const assetResponse = await context.request.get(asset);
    assert.equal(assetResponse.status(), 200, asset);
  }
  const accountResponse = await context.request.get("/api/account");
  assert.equal(accountResponse.status(), 401);
  await page.goto("/sign-in");
  await page.locator(".cl-signIn-root").waitFor();
  await page.getByText("Welcome back", { exact: true }).waitFor();
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await page.screenshot({ path: `${output}/mobile-sign-in.png`, fullPage: true });
  await page.goto("/sign-up");
  await page.locator(".cl-signUp-root").waitFor();
  await page.getByText("Create your account", { exact: true }).waitFor();
  await page.goto("/user-portal");
  await page.waitForURL("**/sign-in");
  await page.locator(".cl-signIn-root").waitFor();
  assert.equal(await page.getByRole("heading", { name: "Your account", exact: true }).count(), 0);
  assert.deepEqual(errors, []);
  console.log("PASS: desktop navigation, FAQ, form validation, three-step UI with stubbed API response, Back state, recommendations rendering, mobile menu/layout, original assets, branded sign-in/sign-up, account route protection, and no browser errors.");
} finally {
  await browser.close();
}
