import { test, expect } from "@playwright/test";

test.describe("API Health Checks", () => {
  // ── Public endpoints should return expected statuses ───────────────

  test("GET /api/health returns 200", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty("status");
  });

  // ── Auth endpoints handle errors gracefully ───────────────────────

  test("POST /api/v1/auth/forgot-password returns non-500 with empty body", async ({
    request,
  }) => {
    const response = await request.post("/api/v1/auth/forgot-password", {
      data: { email: "nonexistent@example.com" },
    });
    expect(response.status()).toBeLessThan(500);
  });

  // ── Protected endpoints don't leak data without auth ──────────────
  // The middleware redirects unauthenticated requests to /login,
  // so Playwright follows the redirect and lands on the login page (200).
  // We verify: no sensitive data is returned, response ends on /login.

  const protectedEndpoints = [
    "/api/v1/employees",
    "/api/v1/agents/devices",
    "/api/v1/time-entries",
    "/api/v1/attendance",
    "/api/v1/projects",
    "/api/v1/reports/scheduled",
    "/api/v1/settings",
  ];

  for (const endpoint of protectedEndpoints) {
    test(`GET ${endpoint} blocks unauthenticated access`, async ({
      request,
    }) => {
      const response = await request.get(endpoint);
      const status = response.status();
      const url = response.url();

      // Either returns 401/403 JSON, or middleware redirected to login
      if (status === 401 || status === 403) {
        // Direct auth rejection — ideal
        const body = await response.json();
        expect(body).toHaveProperty("error");
      } else {
        // Middleware redirected to login page
        expect(url).toContain("/login");
      }
    });
  }

  // ── Cron endpoints reject without CRON_SECRET ─────────────────────

  test("cron endpoints don't execute without auth", async ({ request }) => {
    const cronEndpoints = [
      "/api/v1/reports/cron",
      "/api/v1/mdm/sync/cron",
      "/api/v1/activity/aggregate",
    ];

    for (const endpoint of cronEndpoints) {
      const response = await request.get(endpoint);
      const status = response.status();
      // Should not return 200 with actual data execution
      // Either 401/403 (auth check) or redirect to login or 405 (method not allowed)
      if (status === 200) {
        const url = response.url();
        expect(url).toContain("/login");
      }
    }
  });

  // ── Agent auth endpoint accessible but rejects bad tokens ─────────

  test("POST /api/v1/agents/auth rejects invalid token", async ({
    request,
  }) => {
    const response = await request.post("/api/v1/agents/auth", {
      data: { installToken: "invalid-token-12345" },
    });
    // Should be 400/401/404, not 500
    expect(response.status()).toBeLessThan(500);
  });

  // ── Contact form endpoint ─────────────────────────────────────────

  test("POST /api/v1/contact handles missing fields", async ({ request }) => {
    const response = await request.post("/api/v1/contact", {
      data: { name: "Test" },
    });
    // Should not crash (< 500)
    expect(response.status()).toBeLessThan(500);
  });

  // ── Security alerts endpoint ──────────────────────────────────────

  test("GET /api/v1/security/alerts blocks unauthenticated", async ({
    request,
  }) => {
    const response = await request.get("/api/v1/security/alerts");
    const status = response.status();
    if (status === 401 || status === 403) {
      const body = await response.json();
      expect(body).toHaveProperty("error");
    } else {
      expect(response.url()).toContain("/login");
    }
  });
});
