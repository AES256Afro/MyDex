import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { NextResponse } from "next/server";
import type { Role } from "@/generated/prisma";

// POST - Seed initial patch notes (admin only, idempotent)
export async function POST() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(session.user.role as Role, "patch-notes:write")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const orgId = session.user.organizationId;
  const authorId = session.user.id;

  // Get existing versions so we only add new ones
  const existingNotes = await prisma.patchNote.findMany({
    where: { organizationId: orgId },
    select: { version: true },
  });
  const existingVersions = new Set(existingNotes.map(n => n.version).filter(Boolean));

  const allNotes = [
    {
      title: "MyDex Platform Launch",
      version: "v0.1.0",
      tags: ["feature", "infrastructure"],
      createdAt: new Date("2026-03-27T00:07:00-05:00"),
      content: `Initial release of the MyDex Digital Employee Experience platform.

**Core Platform**
- Multi-tenant SaaS with role-based access control (Super Admin, Admin, Manager, Employee)
- Authentication with credentials and OAuth support
- Dashboard shell with responsive sidebar navigation
- Registration flow with organization creation
- Employee directory and user management

**Time Tracking & Attendance**
- Clock in/out with real-time elapsed timer
- Timesheet views (daily/weekly)
- Attendance calendar and leave request management

**Activity Monitoring**
- App usage, website visits, and file activity tracking
- Hourly activity heatmaps
- Productivity scoring with configurable categories`,
    },
    {
      title: "Endpoint Agent & Device Management",
      version: "v0.2.0",
      tags: ["feature", "agent", "security"],
      createdAt: new Date("2026-03-27T05:00:00-05:00"),
      content: `Cross-platform endpoint agent and comprehensive device management.

**Endpoint Agent**
- Go-based agent for Windows and macOS
- JWT authentication with API key management
- Real-time device heartbeat and diagnostics
- Hardware inventory collection (CPU, RAM, GPU, disk, network)
- Security posture reporting: AV, firewall, Defender, pending updates, BSOD tracking

**Device Management**
- Host Groups for organizing devices with policy assignment
- Domain blocklists with public list import support
- Agent Setup & Deployment page with installation guides
- Software Inventory with version distribution charts
- CVE tracking with applicability assessment

**Security**
- MFA (TOTP) enrollment and login flow
- SSO provider management
- Rate limiting and security hardening
- DLP policy engine with templates (SSN, credit cards, API keys)`,
    },
    {
      title: "IT Support, Compliance & Project Management",
      version: "v0.3.0",
      tags: ["feature", "compliance", "ui"],
      createdAt: new Date("2026-03-27T14:00:00-05:00"),
      content: `Full IT support ticketing, SOC 2 compliance, and project management.

**IT Support**
- Two-way ticketing system with SLA tracking
- Self-service remediation portal (20+ scripts)
- Admin remediation console with live command execution
- Satisfaction ratings and IT staff performance metrics
- Device-targeted remediations with platform-aware scripts

**SOC 2 Compliance**
- Trust Service Criteria mapped to AICPA controls (CC6-CC9, A1, C1)
- Compliance health dashboard with scoring and trend charts
- Per-device compliance audit
- One-click remediation scripts for compliance gaps

**Project Management**
- Projects with Kanban board view
- Task management with subtasks, priorities, assignees
- Milestone progress tracking

**Fleet Health**
- Digital Friction scoring across the fleet
- Device health grid with per-device breakdown
- Extended agent telemetry collection`,
    },
    {
      title: "Ticketing Improvements & Homepage Redesign",
      version: "v0.3.1",
      tags: ["improvement", "ui", "bugfix"],
      createdAt: new Date("2026-03-28T10:00:00-05:00"),
      content: `Major ticketing system improvements and public-facing redesign.

**Ticket System**
- Open/Resolved/Closed section tabs with counts
- Ticket assignment to IT staff members
- Reporter and Support labels on messages
- Resolution flow: rate first, visible stars, required feedback
- Refresh console and resolve comment prompts
- User status controls and submitter/device info

**Homepage & Branding**
- Complete homepage redesign with feature showcase
- Custom branding per organization (logo, company name, alongside mode)
- Contact page with captcha protection
- Tiered licensing page with cost calculator

**Reports Overhaul**
- Enhanced report generation and scheduling
- Report history tracking

**MDM Integration Foundation**
- Schema for Microsoft Intune, Jamf Pro, and Kandji
- Auto-assignment framework for MDM-enrolled devices`,
    },
    {
      title: "DEX Scores, Analytics Dashboards & Dark Theme",
      version: "v0.4.0",
      tags: ["feature", "ui", "security", "improvement"],
      createdAt: new Date("2026-03-28T20:27:00-05:00"),
      content: `DEX scoring, professional analytics dashboards, monitoring policies, and dark theme.

**DEX Scoring & Fleet Health**
- Per-device DEX scores (0-100) computed from 9+ health signals
- Org-wide DEX dashboard on the main admin dashboard
- Proactive health alerts for reboot pending, BSODs, offline agents
- Alert threshold configuration with auto-remediation toggles

**Analytics Dashboards**
- Security Operations Center with 24h event trends, severity donut, event log
- IT Financial Analytics with budget forecasting and ROI tracking
- Software License Optimization with utilization tracking
- Hardware Lifecycle management with replacement forecasts
- Sustainability / Green IT: carbon emissions, energy, e-waste tracking

**Monitoring Policies**
- Monitoring modes: Always, Clocked-In Only, User-Controlled
- Device ownership classification: Business, Contractor, BYOD
- Agent-gated clock-in (no running agent = no clock-in)
- Full monitoring change log for audit and reporting

**Dark Theme**
- Light / Dark / System theme toggle
- Slate gray dark palette (not pure black)
- Theme toggle in topbar and My Account settings

**Employee Drill-Down**
- Click any employee for detailed metrics view
- KPIs, device info, activity timeline, 14-day trend, tickets, compliance`,
    },
    {
      title: "Branding, Patch Notes & Logo Upload",
      version: "v0.4.1",
      tags: ["feature", "ui", "improvement"],
      createdAt: new Date("2026-03-28T22:00:00-05:00"),
      content: `Organization branding customization and platform changelog system.

**Branding**
- Upload company logo (PNG/JPEG/SVG/WebP/GIF, max 512KB)
- Upload sidebar banner image with option to keep default
- Fetch favicon from any website URL
- Company name and brand color customization
- Display mode: replace MyDex or show alongside
- Live sidebar preview on settings page

**Patch Notes**
- Full changelog system with CRUD API
- Timeline UI grouped by month with expand/collapse
- 9 color-coded tags (feature, bugfix, security, improvement, etc.)
- Authorship tracking with edit/delete for admins
- Seed endpoint for initial platform history`,
    },
    {
      title: "Cost Optimization & Sustainability Dashboards",
      version: "v0.5.0",
      tags: ["feature", "infrastructure", "compliance"],
      createdAt: new Date("2026-03-29T02:00:00-05:00"),
      content: `Real, functional IT cost tracking and sustainability dashboards with full CRUD.

**Cost Optimization**
- Software license management: add, edit, delete licenses with seat tracking
- Auto-calculated utilization rates, waste identification, and potential savings
- IT budget tracking: actual spend, planned budget, and forecasts by category
- Budget vs actual visualization with category breakdown
- License table with per-seat cost, utilization bars, and waste calculations

**Sustainability & Green IT**
- Monthly energy reading input with kWh, cost, and source tracking
- Auto-calculated carbon emissions using EPA emission factors
- Energy consumption and carbon trend charts
- Sustainability goal setting with progress tracking
- Support for energy reduction, carbon reduction, sleep compliance, and green score goals
- Year-over-year filtering and month-over-month trend analysis

**Insights Category**
- New sidebar category grouping Cost Optimization, Sustainability, and Patch Notes
- TrendingUp and Leaf icons for quick visual identification`,
    },
    {
      title: "Timezone Fix & Activity Monitoring Improvements",
      version: "v0.5.1",
      tags: ["bugfix", "improvement"],
      createdAt: new Date("2026-03-29T04:00:00-05:00"),
      content: `Fixed timezone display and improved activity data collection.

**Timezone Fix**
- Time tracking clock in/out times now display in user's local timezone instead of UTC
- Fleet health device "last seen" timestamps converted to local time
- All server-rendered date/time values use client-side formatting component

**Activity Monitoring**
- Desktop agent now extracts domain info from browser window titles for WEBSITE_VISIT events
- Site Visit Timeline shows page titles when domain is unavailable
- Improved domain aggregation for agent-reported website visits
- Hourly Activity heatmap works with both app and website event data`,
    },
  ];

  // Filter to only notes not yet seeded
  const seedNotes = allNotes.filter(n => !existingVersions.has(n.version));

  if (seedNotes.length === 0) {
    return NextResponse.json({ message: "All patch notes already exist", count: existingNotes.length });
  }

  try {
    for (const note of seedNotes) {
      await prisma.patchNote.create({
        data: {
          organizationId: orgId,
          authorId,
          title: note.title,
          version: note.version,
          content: note.content,
          tags: note.tags,
          isPublished: true,
          createdAt: note.createdAt,
        },
      });
    }

    return NextResponse.json({ message: `Added ${seedNotes.length} new patch notes`, added: seedNotes.length, total: existingNotes.length + seedNotes.length }, { status: 201 });
  } catch (error) {
    console.error("Error seeding patch notes:", error);
    return NextResponse.json({ error: "Failed to seed patch notes" }, { status: 500 });
  }
}
