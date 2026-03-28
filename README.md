<p align="center">
  <h1 align="center">MyDex</h1>
  <p align="center">
    Open-source employee monitoring & productivity management platform for small businesses.
    <br />
    <a href="https://antifascist.work/demo"><strong>View Live Demo</strong></a>
    &nbsp;&middot;&nbsp;
    <a href="https://antifascist.work">Production Site</a>
    &nbsp;&middot;&nbsp;
    <a href="#getting-started">Getting Started</a>
  </p>
</p>

<br />

## Overview

MyDex is a self-hostable, multi-tenant SaaS platform that gives small businesses visibility into how their teams work — from device health and application usage to time tracking, project management, and security posture. Built with a modern web stack and designed for privacy-first deployments.

### Key Capabilities

- **Device Monitoring** — Real-time agent-based telemetry from Windows/macOS workstations (CPU, RAM, GPU, disk, network, USB events)
- **Activity Tracking** — App usage, website visits, file operations, and hourly activity heatmaps
- **Time & Attendance** — Clock in/out, timesheets, attendance calendar, leave request management
- **Project Management** — Projects, tasks, milestones, and Kanban board with drag-and-drop
- **Security Center** — CVE scanning, IOC matching, DLP policies, threat alerts, audit logging
- **Productivity Analytics** — Scoring, engagement metrics, trends, and AI-driven insights
- **Enterprise Auth** — MFA (TOTP), SSO (Microsoft Entra ID, Okta, GitHub), brute-force protection
- **Role-Based Access** — 4-tier RBAC (Super Admin, Admin, Manager, Employee) with configurable module visibility

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui |
| **Backend** | Next.js API Routes (REST) |
| **Database** | PostgreSQL via Prisma ORM |
| **Auth** | NextAuth.js v5 (Credentials + OAuth + SSO) |
| **Charts** | Recharts |
| **Desktop Agent** | Node.js + systeminformation + active-win |
| **Deployment** | Vercel + Neon PostgreSQL |

---

## Features

### Dashboard

![Dashboard](screenshots/dashboard.png)

The admin dashboard provides a bird's-eye view of your organization with KPI cards (employee count, devices online, open alerts, blocked domains), a 24-hour activity heatmap, recent activity feed, and a security overview panel. Employees see a simplified personal dashboard with their clock status, attendance, tasks, and leave requests.

### Device Management

![Devices](screenshots/devices.png)

Full hardware inventory for every enrolled workstation. Expandable device cards show CPU, RAM, GPU, disk, network info, pending OS updates, and reboot status. Tabbed views for Overview, Security posture, Installed Software, and Recent Activity. Real-time online/offline status with last-seen timestamps.

### Activity Monitoring

![Activity](screenshots/activity.png)

Track application usage and website visits across your team. Horizontal bar charts show time spent per app (VS Code, Chrome, Slack, etc.). Hourly activity heatmaps visualize work patterns across a 24-hour period. Filter by employee and date range.

### Time Tracking & Attendance

![Time Tracking](screenshots/time-tracking.png)

Built-in clock widget for employees to clock in/out. Daily and weekly timesheet views. Attendance calendar with present/absent/late status. Leave request system with approval workflow.

![Attendance](screenshots/attendance.png)

### Project Management

![Projects](screenshots/projects.png)

Create projects with descriptions, deadlines, and team assignments. Kanban task board with drag-and-drop between columns (To Do, In Progress, Review, Done). Milestone tracking with progress indicators. List and board view alternatives.

### Security Center

![Security](screenshots/security.png)

Centralized security dashboard with:
- **CVE Detection** — Scan devices for known vulnerabilities, import from NVD feeds
- **IOC Matching** — Indicator of Compromise lookups against threat intelligence
- **DLP Policies** — Data Loss Prevention rules with pattern matching
- **Threat Alerts** — Severity-classified alerts (High/Medium/Low) with device attribution
- **Device Security Posture** — Antivirus, firewall, update compliance per device
- **Audit Log** — Complete audit trail of all administrative actions

### Software Inventory

![Software Inventory](screenshots/software-inventory.png)

Complete software catalog across all enrolled devices. Version distribution charts, outdated software detection, and per-device software listings. Track what's installed, where, and whether it's up to date.

### Productivity & Engagement

![Productivity](screenshots/productivity.png)

Productivity scoring based on active time ratios, productive app usage, and task completion rates. Engagement scoring combining attendance, activity, and project participation. Team comparison charts and trend analysis.

### Employee Management

![Employees](screenshots/employees.png)

Full employee directory with role, department, and status filters. Invite new users, manage profiles, and view individual activity timelines. Bulk operations for large teams.

### Department & Host Group Management

![Departments](screenshots/departments.png)

Organize employees into departments with managers and headcount tracking.

![Host Groups](screenshots/host-groups.png)

Group devices by function, location, or team. Apply policies and blocklists at the group level.

### Reports

![Reports](screenshots/reports.png)

Generate PDF, CSV, and XLSX reports. Report builder with configurable type, filters, and date ranges. Scheduled report delivery via email (Resend).

### User Management

![User Management](screenshots/user-management.png)

Manage all users across your organization. Assign roles, reset passwords, enable/disable accounts, and audit login history. Bulk invite and provisioning support.

### Settings & Administration

![Settings](screenshots/settings.png)

Organization-wide settings including company info, registration mode, device allowlists, and agent policies.

![MFA & Security](screenshots/mfa-security.png)

Configure MFA enforcement, security policies, and brute-force protection settings.

![SSO Providers](screenshots/sso-providers.png)

Set up enterprise SSO with Microsoft Entra ID, Okta, GitHub, and custom OIDC/SAML providers. Step-by-step configuration guides included.

![Module Access](screenshots/module-access.png)

Fine-grained control over which modules each role can access. Toggle visibility for all 22 modules across 5 categories.

![Agent Setup](screenshots/agent-setup.png)

Download and deploy the MyDex agent on Windows, macOS, and Linux. API key management for agent authentication. MDM deployment guides for Intune, Jamf, SCCM, and GPO.

### Account Settings

![My Account](screenshots/my-account.png)

Employee self-service portal for profile management, password changes, MFA setup, and monitoring pause controls. Privacy-first design lets users pause agent reporting at any time.

### Authentication

![Login](screenshots/login.png)

Secure login with email/password, GitHub OAuth, and Microsoft SSO. Protected by rate limiting, MFA enforcement, and full audit logging.

### IT Support & Remediation

![IT Support](screenshots/it-support.png)

Full IT support console for resolving digital friction remotely and at scale. Includes:
- **Advanced Capabilities** — Offline remediation, compliance drift monitoring, zero-day vulnerability patching, resource reclamation, ransomware rollback, and sustainability/carbon reporting
- **Cross-Platform Remediations** — Process management, disk cleanup, network reset, service restart, NTP sync, and reboot orchestration
- **Windows Remediations (PowerShell)** — Print spooler clear, SFC/DISM repair, Group Policy refresh, Explorer restart, Windows Update reset, WMI repair, temp file cleanup
- **macOS Remediations (Zsh)** — TCC permission reset, Spotlight re-index, SystemUIServer restart, DNS flush, FileVault verification, Dock/Finder restart, LaunchDaemon management
- **Security & Compliance** — Certificate injection, agent health recovery, local admin removal, unauthorized app removal
- **Live Remediation Queue** — Real-time status tracking with auto-trigger and manual execution modes
- **Remediation History** — Full audit trail of every action taken across the fleet

### Licensing & Pricing

![Licensing](screenshots/licensing.png)

Transparent, tiered pricing with an interactive cost calculator. Three plans (Starter, Business, Enterprise) scaling from 10 to 1,000+ employees. Optional Security Suite add-on for CVE scanning, threat intelligence, and DLP.

---

## Security & Authentication

### Multi-Factor Authentication (MFA)

TOTP-based two-factor authentication compatible with Google Authenticator, Authy, and 1Password. Includes:
- QR code setup wizard
- 6-digit verification with auto-advance input
- 10 one-time backup codes (bcrypt-hashed)
- MFA enforcement on login flow
- Self-service enable/disable from account settings

### Single Sign-On (SSO)

Enterprise SSO with Just-In-Time (JIT) user provisioning:
- **Microsoft Entra ID** (Azure AD) with step-by-step setup guide
- **Okta** with OIDC configuration
- **GitHub** OAuth for developer teams
- Auto-provision users into the correct organization on first SSO login
- Configurable default role for JIT-provisioned users

### Security Hardening

- **Rate Limiting** — In-memory sliding window (login: 5/15min, register: 3/hr, API: 100/min)
- **Brute-Force Protection** — Account lockout after 10 failed attempts in 30 minutes
- **Login Audit Trail** — Every login attempt recorded with IP, user-agent, success/failure reason
- **Security Headers** — CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Permissions-Policy
- **Email Allowlist** — Registration modes: open, allowlist (email + domain), or closed
- **Device Allowlist** — Restrict which device hostnames can connect (wildcard support)
- **Auto-Allowlist on Invite** — Invited users automatically added to the org's email allowlist

---

## Role-Based Access Control

MyDex uses a 4-tier RBAC system with configurable module visibility:

| Role | Access Level |
|---|---|
| **Super Admin** | Full platform access, all 22 modules |
| **Admin** | Organization management, 18 modules |
| **Manager** | Team oversight and monitoring, 12 modules |
| **Employee** | Personal dashboard, time tracking, tasks, account settings, 6 modules |

### Module Access Control

Admins can configure which modules are visible to each role. The module registry contains 22 modules across 5 categories:

- **Core** — Dashboard, My Profile, Time Tracking, My Tasks, Attendance, Announcements
- **Monitoring** — Device List, Activity Feed, Productivity, Host Groups, Departments
- **Management** — Projects, Reports, User Management, Scheduled Reports
- **Security** — Security Center, Threat Dashboard, DLP Policies, Audit Log, CVE Scanner, IOC Lookup
- **Administration** — Organization Settings, SSO Configuration, Module Access, Agent Keys

### Employee View

Employees see a streamlined interface with only the modules relevant to their role. Their personal dashboard shows clock status, attendance, open tasks, and pending leave. Quick action cards link to Time Tracking, My Projects, and My Account. A security prompt encourages MFA setup.

---

## Architecture

### Multi-Tenancy

Shared database with `organizationId` on every table. Prisma middleware auto-scopes all queries to the current tenant. Complete data isolation between organizations.

### Desktop Agent

A lightweight Node.js agent runs on employee workstations and reports telemetry to the MyDex API:
- System info (CPU, RAM, GPU, disk, network)
- Active window tracking (app name, window title)
- USB device events
- DNS query logging
- Network connections
- Heartbeat with configurable interval

Agent authentication uses JWT tokens issued per-device with API key validation. Agents can be managed remotely with commands (restart, update policy, run diagnostics).

### Database Schema

29+ Prisma models organized into domains:

```
Auth & Tenancy:    Organization, User, Account, Session, VerificationToken
Security Auth:     MfaCredential, SsoProvider, LoginAttempt, ActiveSession
Time & Attendance: TimeEntry, AttendanceRecord, LeaveRequest
Activity:          ActivityEvent, ActivitySummary
Projects:          Project, Task, Milestone
Devices:           AgentDevice, DeviceDiagnostic, RemediationCommand
Telemetry:         AgentApiKey, TelemetryBatch, NetworkConnection, DnsQueryLog, UsbDeviceEvent
Security:          SecurityAlert, DlpPolicy, AuditLog, IocEntry, IocMatch, CveEntry, CveScanResult
Organization:      Department, HostGroup, HostGroupMember, HostGroupPolicy, DomainBlocklist, AgentPolicy
```

---

## Project Structure

```
MyDex/
├── prisma/
│   └── schema.prisma          # Database schema (29+ models)
├── src/
│   ├── app/
│   │   ├── (auth)/             # Login, Register, MFA Verify pages
│   │   ├── (dashboard)/        # All authenticated pages
│   │   │   ├── dashboard/      # Admin + Employee dashboards
│   │   │   ├── devices/        # Device inventory
│   │   │   ├── activity/       # Activity monitoring
│   │   │   ├── time-tracking/  # Clock in/out, timesheets
│   │   │   ├── attendance/     # Attendance + leave requests
│   │   │   ├── projects/       # Project + task management
│   │   │   ├── security/       # Threats, DLP, audit, CVE, IOC
│   │   │   ├── productivity/   # Scoring + analytics
│   │   │   ├── reports/        # Report generation
│   │   │   ├── employees/      # Employee directory
│   │   │   ├── departments/    # Department management
│   │   │   ├── host-groups/    # Device grouping
│   │   │   ├── settings/       # Org settings, SSO, modules, security
│   │   │   ├── account/        # Employee self-service (profile, MFA)
│   │   │   └── user-management/# Bulk user operations
│   │   ├── (tracker)/          # Web-based activity tracker
│   │   ├── api/                # REST API routes
│   │   │   ├── auth/           # NextAuth handlers
│   │   │   ├── register/       # Registration endpoint
│   │   │   └── v1/             # Versioned API
│   │   │       ├── account/    # Profile, password
│   │   │       ├── agents/     # Agent auth, telemetry, commands
│   │   │       ├── attendance/ # Attendance + leave CRUD
│   │   │       ├── auth/       # MFA, SSO, login history
│   │   │       ├── employees/  # Employee CRUD + bulk
│   │   │       ├── projects/   # Projects + tasks CRUD
│   │   │       ├── security/   # Alerts, DLP, audit, CVE, IOC
│   │   │       ├── settings/   # Org settings
│   │   │       └── ...         # Time entries, reports, etc.
│   │   └── demo/               # Interactive demo with mock data
│   ├── components/
│   │   ├── ui/                 # shadcn/ui primitives
│   │   ├── layout/             # Sidebar, Topbar (role-aware)
│   │   ├── time-tracking/      # Clock widget
│   │   └── projects/           # Task board
│   ├── lib/
│   │   ├── auth.ts             # NextAuth config (credentials + OAuth + SSO)
│   │   ├── prisma.ts           # Prisma client
│   │   ├── permissions.ts      # RBAC permission checks
│   │   ├── module-access.ts    # Module registry + role filtering
│   │   ├── mfa.ts              # TOTP generation, verification, backup codes
│   │   ├── rate-limit.ts       # Sliding window rate limiter
│   │   ├── login-audit.ts      # Login attempt recording + lockout
│   │   ├── allowlist.ts        # Email/domain/device allowlist
│   │   ├── security-headers.ts # CSP, HSTS, X-Frame-Options
│   │   ├── agent-auth.ts       # Desktop agent JWT auth
│   │   └── tenant.ts           # Multi-tenant scoping
│   └── types/
│       └── next-auth.d.ts      # Extended session types
├── agent/                      # Desktop agent source
├── next.config.ts              # Security headers + image config
└── middleware.ts               # Auth + security header middleware
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (or Neon/Supabase)
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/MyDex.git
cd MyDex

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database URL, auth secrets, etc.

# Push database schema
npx prisma db push

# Generate Prisma client
npx prisma generate

# Start development server
npm run dev
```

### Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:pass@host:5432/mydex"

# NextAuth
NEXTAUTH_SECRET="your-secret-here"
NEXTAUTH_URL="http://localhost:3000"

# OAuth Providers (optional)
GITHUB_CLIENT_ID=""
GITHUB_CLIENT_SECRET=""

# Microsoft Entra ID / Azure AD (optional)
AZURE_AD_CLIENT_ID=""
AZURE_AD_CLIENT_SECRET=""
AZURE_AD_TENANT_ID=""

# Access Control (optional)
REGISTRATION_MODE="open"          # open | allowlist | closed
ALLOWED_EMAILS=""                 # comma-separated
ALLOWED_DOMAINS=""                # comma-separated
DEVICE_ALLOWLIST_ENABLED="false"
```

---

## API Reference

All API endpoints are under `/api/v1/` and require JWT authentication via NextAuth session.

| Endpoint | Methods | Description |
|---|---|---|
| `/api/v1/employees` | GET, POST | Employee directory + invite |
| `/api/v1/employees/[id]` | GET, PATCH, DELETE | Individual employee |
| `/api/v1/employees/bulk` | POST | Bulk operations |
| `/api/v1/time-entries` | GET, POST | Time entry CRUD |
| `/api/v1/time-entries/clock` | POST | Clock in/out |
| `/api/v1/attendance` | GET, POST | Attendance records |
| `/api/v1/attendance/leave-requests` | GET, POST | Leave requests |
| `/api/v1/projects` | GET, POST | Project CRUD |
| `/api/v1/projects/[id]/tasks` | GET, POST | Task CRUD |
| `/api/v1/activity/events` | GET, POST | Activity events |
| `/api/v1/activity/summary` | GET | Activity summaries |
| `/api/v1/security/alerts` | GET, POST | Security alerts |
| `/api/v1/security/cve` | GET | CVE entries |
| `/api/v1/security/ioc` | GET, POST | IOC entries |
| `/api/v1/security/dlp-policies` | GET, POST | DLP policies |
| `/api/v1/security/audit-log` | GET | Audit log |
| `/api/v1/auth/mfa` | GET, POST, DELETE | MFA management |
| `/api/v1/auth/sso` | GET, POST, PATCH, DELETE | SSO providers |
| `/api/v1/auth/login-history` | GET | Login audit trail |
| `/api/v1/agents/auth` | POST | Agent authentication |
| `/api/v1/agents/telemetry` | POST | Telemetry ingestion |
| `/api/v1/agents/devices` | GET | Device inventory |
| `/api/v1/agents/commands` | GET, POST | Remote commands |
| `/api/v1/settings` | GET, PATCH | Org settings |
| `/api/v1/reports/generate` | POST | Report generation |

---

## Demo

Visit the [live interactive demo](https://antifascist.work/demo) to explore all features with simulated data. The demo includes:

- **Admin Dashboard** with KPI cards, activity heatmap, and security overview
- **Device Management** with 4 mock workstations showing full hardware specs
- **Activity Monitoring** with app usage charts and hourly heatmaps
- **Security Center** with alerts, CVE detection, and device compliance table
- **Employee View** toggle showing the restricted employee experience
- **MFA Setup** wizard with QR code and backup codes
- **SSO Provider** management with Microsoft Entra ID, Okta, and GitHub
- **Module Access Control** with role-based visibility configuration

No account required. All data is simulated client-side.

---

## Deployment

### Vercel (Recommended)

1. Push your repo to GitHub
2. Import into Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

The `build` script automatically runs `prisma generate` before `next build`.

### Self-Hosted

```bash
npm run build
npm start
```

Ensure your PostgreSQL database is accessible and `DATABASE_URL` is set.

---

## License

This project is open source. See [LICENSE](LICENSE) for details.

---

<p align="center">
  Built with Next.js, Prisma, and TypeScript
  <br />
  <a href="https://antifascist.work/demo">Try the Demo</a>
</p>
