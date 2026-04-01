import { test, expect } from "@playwright/test";

test.describe("Navigation & Middleware", () => {
  // ── Public pages load without auth ────────────────────────────────

  test("homepage loads without auth", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible({ timeout: 10_000 });
    // Should NOT redirect to login
    expect(page.url()).not.toContain("/login");
  });

  test("demo page loads without auth", async ({ page }) => {
    await page.goto("/demo");
    await expect(page.locator("body")).toBeVisible({ timeout: 10_000 });
    expect(page.url()).not.toContain("/login");
  });

  test("contact page loads without auth", async ({ page }) => {
    await page.goto("/contact");
    await expect(page.locator("body")).toBeVisible({ timeout: 10_000 });
    expect(page.url()).not.toContain("/login");
  });

  test("onboarding page loads without auth", async ({ page }) => {
    await page.goto("/onboarding");
    await expect(page.locator("body")).toBeVisible({ timeout: 10_000 });
    expect(page.url()).not.toContain("/login");
  });

  test("licensing page loads without auth", async ({ page }) => {
    await page.goto("/licensing");
    await expect(page.locator("body")).toBeVisible({ timeout: 10_000 });
    expect(page.url()).not.toContain("/login");
  });

  // ── Protected pages redirect to login ─────────────────────────────

  test("dashboard redirects to login without auth", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForURL(/login/, { timeout: 10_000 });
    expect(page.url()).toContain("/login");
  });

  test("employees page redirects to login", async ({ page }) => {
    await page.goto("/employees");
    await page.waitForURL(/login/, { timeout: 10_000 });
    expect(page.url()).toContain("/login");
  });

  test("devices page redirects to login", async ({ page }) => {
    await page.goto("/devices");
    await page.waitForURL(/login/, { timeout: 10_000 });
    expect(page.url()).toContain("/login");
  });

  test("settings page redirects to login", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForURL(/login/, { timeout: 10_000 });
    expect(page.url()).toContain("/login");
  });

  test("security page redirects to login", async ({ page }) => {
    await page.goto("/security");
    await page.waitForURL(/login/, { timeout: 10_000 });
    expect(page.url()).toContain("/login");
  });

  test("time-tracking page redirects to login", async ({ page }) => {
    await page.goto("/time-tracking");
    await page.waitForURL(/login/, { timeout: 10_000 });
    expect(page.url()).toContain("/login");
  });

  // ── Redirect preserves callback URL ───────────────────────────────

  test("login redirect includes callbackUrl for dashboard", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await page.waitForURL(/login/, { timeout: 10_000 });
    expect(page.url()).toContain("callbackUrl");
    expect(page.url()).toContain("dashboard");
  });

  test("login redirect includes callbackUrl for settings", async ({
    page,
  }) => {
    await page.goto("/settings/security");
    await page.waitForURL(/login/, { timeout: 10_000 });
    expect(page.url()).toContain("callbackUrl");
  });

  // ── Static assets and special paths ───────────────────────────────

  test("favicon is accessible", async ({ page }) => {
    const response = await page.goto("/favicon.ico");
    // Should return 200 or 304
    expect([200, 304]).toContain(response?.status() ?? 0);
  });

  // ── Security headers ──────────────────────────────────────────────

  test("public page includes security headers", async ({ page }) => {
    const response = await page.goto("/");
    const headers = response?.headers() ?? {};

    // Check for key security headers
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-frame-options"]).toBeTruthy();
    expect(headers["referrer-policy"]).toBeTruthy();
  });

  test("protected page redirect includes security headers", async ({
    page,
  }) => {
    const response = await page.goto("/dashboard");
    const headers = response?.headers() ?? {};
    expect(headers["x-content-type-options"]).toBe("nosniff");
  });
});
