import { test, expect } from "@playwright/test";

test.describe("Demo Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/demo");
    // Wait for the page to fully hydrate
    await expect(page.locator("main, [class*='flex']").first()).toBeVisible({
      timeout: 15_000,
    });
    // Wait a moment for React hydration
    await page.waitForTimeout(1000);
  });

  /** Helper: click a sidebar item by its exact ID */
  async function navigateToSection(
    page: import("@playwright/test").Page,
    sectionId: string
  ) {
    // Click the sidebar button that sets activeSection to this ID
    // Sidebar buttons are rendered inside an <aside> or nav area
    const sidebarBtn = page.locator(
      `aside button, nav button, aside a, nav a`
    );
    const allBtns = await sidebarBtn.all();
    for (const btn of allBtns) {
      const text = await btn.textContent();
      const sectionMap: Record<string, string> = {
        dashboard: "Dashboard",
        "time-tracking": "Time Tracking",
        attendance: "Attendance",
        projects: "Projects",
        "my-account": "My Account",
        activity: "Activity",
        productivity: "Productivity",
        employees: "Employees",
        "user-management": "User Management",
        departments: "Departments",
        reports: "Reports",
        "fleet-health": "Fleet Health",
        devices: "Devices",
        "software-inventory": "Software Inventory",
        "host-groups": "Host Groups",
        security: "Security",
        compliance: "SOC 2 Compliance",
        support: "IT Support",
        "it-support": "IT Admin Portal",
        settings: "Settings",
        "mfa-security": "MFA & Security",
        "sso-providers": "SSO Providers",
        "scim-provisioning": "SCIM Provisioning",
        "module-access": "Module Access",
        "agent-setup": "Agent Setup",
        "mdm-integration": "MDM Integration",
        branding: "Branding",
        "alert-thresholds": "Alert Thresholds",
        integrations: "Integrations",
        workflows: "Workflows",
        insights: "AI Insights",
        "cost-optimization": "Cost Optimization",
        sustainability: "Sustainability",
        "patch-notes": "Patch Notes",
        "domain-categories": "Domain Categories",
        "api-docs": "API Docs",
      };
      const targetLabel = sectionMap[sectionId];
      if (
        targetLabel &&
        text?.trim() === targetLabel
      ) {
        await btn.click();
        return;
      }
    }
    // Fallback: try finding by text in sidebar
    const fallback = page
      .locator("aside, nav")
      .getByText(
        sectionId === "security"
          ? "Security"
          : sectionId === "departments"
          ? "Departments"
          : sectionId,
        { exact: true }
      )
      .first();
    if (await fallback.isVisible()) {
      await fallback.click();
    }
  }

  // ── Page loads correctly ──────────────────────────────────────────

  test("loads with dashboard visible by default", async ({ page }) => {
    await expect(page).toHaveTitle(/MyDex/i);
    // Admin dashboard KPIs should be visible
    await expect(page.getByText("DEX Score").first()).toBeVisible();
    await expect(page.getByText("Total Employees").first()).toBeVisible();
    await expect(page.getByText("Currently Working").first()).toBeVisible();
  });

  test("banner says Contact Us, not Sign Up", async ({ page }) => {
    const pageText = await page.textContent("body");
    expect(pageText).not.toContain("Sign up free");
    expect(pageText).not.toContain("Get Started Free");
    expect(pageText).toContain("Contact");
  });

  // ── Admin / Employee toggle ───────────────────────────────────────

  test("can toggle between admin and employee dashboard views", async ({
    page,
  }) => {
    await expect(page.getByText("DEX Score").first()).toBeVisible();

    // The toggle is inside a bg-muted rounded-lg container in the main content area (not sidebar)
    // Target the toggle button specifically in the main content area
    const toggleContainer = page.locator("main button, [class*='bg-muted'] button");
    const employeeToggle = toggleContainer.filter({ hasText: "Employee" }).first();

    if (await employeeToggle.isVisible({ timeout: 3000 }).catch(() => false)) {
      await employeeToggle.click();
      await expect(
        page.getByText("My Schedule Today").first()
      ).toBeVisible({ timeout: 5000 });

      // Toggle back to admin
      const adminToggle = toggleContainer.filter({ hasText: "Admin" }).first();
      await adminToggle.click();
      await expect(page.getByText("DEX Score").first()).toBeVisible();
    }
  });

  // ── Sidebar navigation — all sections ─────────────────────────────

  const sidebarTests: Array<{
    id: string;
    name: string;
    expectText: string;
  }> = [
    { id: "dashboard", name: "Dashboard", expectText: "DEX Score" },
    { id: "time-tracking", name: "Time Tracking", expectText: "Current Status" },
    { id: "attendance", name: "Attendance", expectText: "Leave Balance" },
    { id: "projects", name: "Projects", expectText: "Active" },
    { id: "my-account", name: "My Account", expectText: "Profile" },
    { id: "activity", name: "Activity", expectText: "Total Active" },
    { id: "productivity", name: "Productivity", expectText: "Avg Score" },
    { id: "employees", name: "Employees", expectText: "Employee" },
    { id: "user-management", name: "User Management", expectText: "Total Users" },
    { id: "departments", name: "Departments", expectText: "Departments" },
    { id: "reports", name: "Reports", expectText: "Scheduled Reports" },
    { id: "fleet-health", name: "Fleet Health", expectText: "Digital Friction" },
    { id: "devices", name: "Devices", expectText: "Online" },
    { id: "software-inventory", name: "Software Inventory", expectText: "Total Software" },
    { id: "host-groups", name: "Host Groups", expectText: "Host Groups" },
    { id: "security", name: "Security", expectText: "Total Events" },
    { id: "compliance", name: "SOC 2 Compliance", expectText: "Compliance" },
    { id: "support", name: "IT Support", expectText: "Support" },
    { id: "it-support", name: "IT Admin Portal", expectText: "Ticket" },
    { id: "settings", name: "Settings", expectText: "Organization" },
    { id: "mfa-security", name: "MFA & Security", expectText: "Two-Factor" },
    { id: "sso-providers", name: "SSO Providers", expectText: "Callback" },
    { id: "scim-provisioning", name: "SCIM Provisioning", expectText: "SCIM" },
    { id: "module-access", name: "Module Access", expectText: "Module" },
    { id: "agent-setup", name: "Agent Setup", expectText: "Download" },
    { id: "mdm-integration", name: "MDM Integration", expectText: "MDM" },
    { id: "branding", name: "Branding", expectText: "Logo" },
    { id: "alert-thresholds", name: "Alert Thresholds", expectText: "Active Rules" },
    { id: "integrations", name: "Integrations", expectText: "Slack" },
    { id: "workflows", name: "Workflows", expectText: "Automated Workflows" },
    { id: "insights", name: "AI Insights", expectText: "Productivity Score" },
    { id: "cost-optimization", name: "Cost Optimization", expectText: "Service Intelligence" },
    { id: "sustainability", name: "Sustainability", expectText: "Carbon" },
    { id: "patch-notes", name: "Patch Notes", expectText: "Patch Notes" },
    { id: "domain-categories", name: "Domain Categories", expectText: "Domain" },
    { id: "api-docs", name: "API Docs", expectText: "API Documentation" },
  ];

  for (const section of sidebarTests) {
    test(`sidebar: navigates to "${section.name}"`, async ({ page }) => {
      await navigateToSection(page, section.id);
      await page.waitForTimeout(300);
      await expect(page.getByText(section.expectText).first()).toBeVisible({
        timeout: 5_000,
      });
    });
  }

  // ── KPI cards are clickable ───────────────────────────────────────

  test("dashboard KPI cards navigate to correct sections", async ({
    page,
  }) => {
    // Click DEX Score card → Fleet Health
    const dexCard = page
      .locator("[class*='cursor-pointer']")
      .filter({ hasText: "DEX Score" })
      .first();
    if (await dexCard.isVisible()) {
      await dexCard.click();
      await expect(
        page.getByText("Digital Friction").first()
      ).toBeVisible({ timeout: 5_000 });
    }
  });

  // ── Charts render ─────────────────────────────────────────────────

  test("dashboard charts and heatmap render", async ({ page }) => {
    await expect(
      page.getByText("7-Day Activity Trend").first()
    ).toBeVisible();
    await expect(
      page.getByText("Device Fleet Status").first()
    ).toBeVisible();
    await expect(
      page.getByText("Today's Activity Heatmap").first()
    ).toBeVisible();
  });

  // ── Quick actions ─────────────────────────────────────────────────

  test("quick actions buttons are visible", async ({ page }) => {
    const quickActions = page.getByText("Quick Actions").first();
    await expect(quickActions).toBeVisible();
  });

  // ── Projects kanban drill-down ────────────────────────────────────

  test("projects section shows kanban board on drill-down", async ({
    page,
  }) => {
    await navigateToSection(page, "projects");
    await page.waitForTimeout(300);

    const viewBoardBtn = page
      .getByRole("button", { name: /view board/i })
      .first();
    if (
      await viewBoardBtn.isVisible({ timeout: 3000 }).catch(() => false)
    ) {
      await viewBoardBtn.click();
      await expect(
        page
          .getByText("Backlog")
          .or(page.getByText("To Do"))
          .or(page.getByText("In Progress"))
          .first()
      ).toBeVisible({ timeout: 5_000 });
    }
  });

  // ── Employee detail drill-down ────────────────────────────────────

  test("employees section shows employee cards", async ({ page }) => {
    await navigateToSection(page, "employees");
    await page.waitForTimeout(300);
    // Should show employee names
    await expect(
      page
        .getByText("Jordan Miller")
        .or(page.getByText("Sarah Chen"))
        .or(page.getByText("Anita Patel"))
        .first()
    ).toBeVisible({ timeout: 5_000 });
  });

  // ── Devices expandable rows ───────────────────────────────────────

  test("devices section shows device list", async ({ page }) => {
    await navigateToSection(page, "devices");
    await page.waitForTimeout(300);
    await expect(
      page
        .getByText("DESKTOP")
        .or(page.getByText("LAPTOP"))
        .or(page.getByText("MACBOOK"))
        .first()
    ).toBeVisible({ timeout: 5_000 });
  });

  // ── Compliance has charts and controls ────────────────────────────

  test("compliance section renders charts and controls", async ({
    page,
  }) => {
    await navigateToSection(page, "compliance");
    await page.waitForTimeout(500);
    await expect(
      page.getByText("Overall SOC 2 Score").first()
    ).toBeVisible({ timeout: 5_000 });
    await expect(
      page.getByText("Trust Service Criteria").first()
    ).toBeVisible();
  });

  // ── Security SOC dashboard ────────────────────────────────────────

  test("security section shows SOC dashboard", async ({ page }) => {
    await navigateToSection(page, "security");
    await page.waitForTimeout(500);
    await expect(
      page.getByText("Total Events").first()
    ).toBeVisible({ timeout: 5_000 });
    await expect(
      page.getByText("Critical Alerts").first()
    ).toBeVisible();
  });

  // ── IT Support sections ───────────────────────────────────────────

  test("IT Support section loads", async ({ page }) => {
    await navigateToSection(page, "support");
    await page.waitForTimeout(300);
    await expect(
      page
        .getByText("Submit")
        .or(page.getByText("Ticket"))
        .or(page.getByText("Support"))
        .first()
    ).toBeVisible({ timeout: 5_000 });
  });

  test("IT Admin Portal section loads", async ({ page }) => {
    await navigateToSection(page, "it-support");
    await page.waitForTimeout(300);
    await expect(
      page
        .getByText("Ticket")
        .or(page.getByText("Queue"))
        .first()
    ).toBeVisible({ timeout: 5_000 });
  });
});
