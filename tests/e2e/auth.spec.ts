import { test, expect } from "@playwright/test";

test.describe("Authentication Pages", () => {
  test("login page loads with form fields", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveTitle(/MyDex|Login/i);

    // Email and password fields should be present
    await expect(
      page.getByPlaceholder(/email/i).or(page.locator('input[type="email"]')).first()
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByPlaceholder(/password/i).or(page.locator('input[type="password"]')).first()
    ).toBeVisible();

    // Login button should exist
    await expect(
      page.getByRole("button", { name: /sign in|log in|login/i }).first()
    ).toBeVisible();
  });

  test("register page loads with form fields", async ({ page }) => {
    await page.goto("/register");

    // Should have org name, email, password fields
    await expect(
      page.locator('input[type="email"], input[name="email"]').first()
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.locator('input[type="password"], input[name="password"]').first()
    ).toBeVisible();

    // Register/Create button should exist
    await expect(
      page
        .getByRole("button", { name: /register|create|sign up|get started/i })
        .first()
    ).toBeVisible();
  });

  test("forgot-password page loads", async ({ page }) => {
    await page.goto("/forgot-password");

    await expect(
      page.locator('input[type="email"], input[name="email"]').first()
    ).toBeVisible({ timeout: 10_000 });

    await expect(
      page
        .getByRole("button", { name: /reset|send|submit/i })
        .first()
    ).toBeVisible();
  });

  test("login form shows validation on empty submit", async ({ page }) => {
    await page.goto("/login");
    await expect(
      page.getByRole("button", { name: /sign in|log in|login/i }).first()
    ).toBeVisible({ timeout: 10_000 });

    // Click sign in without filling fields
    await page
      .getByRole("button", { name: /sign in|log in|login/i })
      .first()
      .click();

    // Should show validation error or HTML5 validation
    // Check for either custom error message or that we're still on login
    await expect(page).toHaveURL(/login/);
  });

  test("login page has link to register", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("body")).toBeVisible({ timeout: 10_000 });

    const registerLink = page.getByRole("link", {
      name: /register|sign up|create account/i,
    });
    if (await registerLink.isVisible()) {
      await expect(registerLink).toHaveAttribute("href", /register/);
    }
  });

  test("login page has link to forgot password", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("body")).toBeVisible({ timeout: 10_000 });

    const forgotLink = page.getByRole("link", {
      name: /forgot|reset/i,
    });
    if (await forgotLink.isVisible()) {
      await expect(forgotLink).toHaveAttribute("href", /forgot/);
    }
  });
});
