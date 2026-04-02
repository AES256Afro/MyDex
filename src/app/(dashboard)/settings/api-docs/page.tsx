"use client";

import { useState, useMemo } from "react";
import { useRequireRole } from "@/hooks/use-require-role";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Search,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

interface Endpoint {
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  path: string;
  description: string;
  auth: string;
  body?: string;
  query?: string;
  response?: string;
}

interface ApiCategory {
  category: string;
  endpoints: Endpoint[];
}

const METHOD_COLORS: Record<string, string> = {
  GET: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-300 dark:border-green-700",
  POST: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-300 dark:border-blue-700",
  PATCH: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700",
  PUT: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 border-orange-300 dark:border-orange-700",
  DELETE: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-300 dark:border-red-700",
};

const API_DOCS: ApiCategory[] = [
  {
    category: "Authentication & Account",
    endpoints: [
      { method: "POST", path: "/api/v1/auth/forgot-password", description: "Send password reset email", auth: "None", body: "{ email: string }" },
      { method: "POST", path: "/api/v1/auth/reset-password", description: "Reset password with token", auth: "None", body: "{ token: string, password: string }" },
      { method: "GET", path: "/api/v1/auth/mfa", description: "Get MFA status for current user", auth: "Session", response: "{ enabled: boolean, backupCodesRemaining: number, recoveryCodesRemaining: number }" },
      { method: "POST", path: "/api/v1/auth/mfa", description: "Setup, confirm, or verify MFA", auth: "Session", body: "{ action: 'setup' | 'confirm' | 'verify', code?: string }", response: "{ secret?, qrCode?, backupCodes?, recoveryCodes? } | { success: boolean }" },
      { method: "DELETE", path: "/api/v1/auth/mfa", description: "Disable MFA for current user", auth: "Session", response: "{ success: boolean }" },
      { method: "POST", path: "/api/v1/auth/mfa/verify", description: "Verify MFA code during login flow", auth: "Session", body: "{ code: string }", response: "{ success: boolean }" },
      { method: "POST", path: "/api/v1/auth/mfa/recovery", description: "Verify a recovery code during login flow", auth: "Session", body: "{ code: string }", response: "{ success: boolean }" },
      { method: "GET", path: "/api/v1/auth/login-history", description: "Get login history for current user", auth: "Session", query: "?limit=20", response: "{ attempts: LoginAttempt[], stats: { failedLast24h, totalLast7d } }" },
      { method: "GET", path: "/api/v1/auth/sso", description: "List SSO providers for the organization", auth: "Session (Admin)", response: "SsoProvider[]" },
      { method: "GET", path: "/api/v1/account/profile", description: "Get current user profile", auth: "Session", response: "{ user: User }" },
      { method: "PATCH", path: "/api/v1/account/profile", description: "Update current user profile", auth: "Session", body: "{ name?, image?, department?, jobTitle? }" },
      { method: "POST", path: "/api/v1/account/password", description: "Change password", auth: "Session", body: "{ currentPassword: string, newPassword: string }" },
    ],
  },
  {
    category: "Time Tracking & Attendance",
    endpoints: [
      { method: "GET", path: "/api/v1/time-entries", description: "List time entries for the current user or team", auth: "Session", query: "?from=&to=&userId=" },
      { method: "POST", path: "/api/v1/time-entries", description: "Create a manual time entry", auth: "Session", body: "{ startTime, endTime, projectId?, notes? }" },
      { method: "POST", path: "/api/v1/time-entries/clock", description: "Clock in or clock out", auth: "Session", body: "{ action: 'in' | 'out' }" },
      { method: "GET", path: "/api/v1/attendance", description: "List attendance records", auth: "Session", query: "?from=&to=&userId=" },
      { method: "GET", path: "/api/v1/attendance/leave-requests", description: "List leave requests", auth: "Session", query: "?status=&userId=" },
      { method: "POST", path: "/api/v1/attendance/leave-requests", description: "Submit a leave request", auth: "Session", body: "{ startDate, endDate, type, reason? }" },
      { method: "PATCH", path: "/api/v1/attendance/leave-requests", description: "Approve or reject a leave request", auth: "Session (Manager+)", body: "{ id: string, status: 'APPROVED' | 'REJECTED' }" },
    ],
  },
  {
    category: "Activity & Monitoring",
    endpoints: [
      { method: "GET", path: "/api/v1/activity/events", description: "List activity events with filtering", auth: "Session (Manager+)", query: "?userId=&from=&to=&eventType=&limit=&offset=" },
      { method: "GET", path: "/api/v1/activity/summary", description: "Get activity summaries (aggregated)", auth: "Session (Manager+)", query: "?userId=&from=&to=&granularity=daily|hourly" },
      { method: "GET", path: "/api/v1/activity/aggregate", description: "Get aggregate activity stats", auth: "Session (Manager+)", query: "?from=&to=" },
      { method: "GET", path: "/api/v1/productivity/insights", description: "Get productivity insights and scores", auth: "Session (Manager+)", query: "?from=&to=" },
      { method: "GET", path: "/api/v1/monitoring/settings", description: "Get monitoring settings for the org", auth: "Session (Admin)", response: "{ defaultMode, requireAgent, ... }" },
      { method: "PATCH", path: "/api/v1/monitoring/settings", description: "Update monitoring settings", auth: "Session (Admin)", body: "{ defaultMode?, requireAgent?, ... }" },
      { method: "GET", path: "/api/v1/monitoring/changelog", description: "Get monitoring configuration change log", auth: "Session (Admin)" },
    ],
  },
  {
    category: "Employees & Teams",
    endpoints: [
      { method: "GET", path: "/api/v1/employees", description: "List employees with filtering and pagination", auth: "Session (Manager+)", query: "?search=&department=&role=&status=&page=&limit=" },
      { method: "POST", path: "/api/v1/employees", description: "Invite/create a new employee", auth: "Session (Admin)", body: "{ email, name, role?, department? }" },
      { method: "GET", path: "/api/v1/employees/[id]", description: "Get employee details by ID", auth: "Session (Manager+)" },
      { method: "PATCH", path: "/api/v1/employees/[id]", description: "Update employee details", auth: "Session (Admin)", body: "{ name?, role?, department?, status?, managerId? }" },
      { method: "DELETE", path: "/api/v1/employees/[id]", description: "Deactivate an employee", auth: "Session (Admin)" },
      { method: "POST", path: "/api/v1/employees/bulk", description: "Bulk employee operations (invite, update, deactivate)", auth: "Session (Admin)", body: "{ action, employees: [...] }" },
      { method: "GET", path: "/api/v1/employees/[id]/boarding", description: "Get onboarding/offboarding tasks", auth: "Session (Admin)" },
      { method: "POST", path: "/api/v1/employees/[id]/boarding", description: "Create boarding task", auth: "Session (Admin)", body: "{ type, title, description?, dueDate? }" },
      { method: "GET", path: "/api/v1/departments", description: "List departments", auth: "Session (Manager+)" },
      { method: "POST", path: "/api/v1/departments", description: "Create a department", auth: "Session (Admin)", body: "{ name, description?, managerId? }" },
    ],
  },
  {
    category: "Projects & Tasks",
    endpoints: [
      { method: "GET", path: "/api/v1/projects", description: "List projects", auth: "Session", query: "?status=&search=" },
      { method: "POST", path: "/api/v1/projects", description: "Create a project", auth: "Session (Manager+)", body: "{ name, description?, startDate?, endDate? }" },
      { method: "GET", path: "/api/v1/projects/[id]", description: "Get project details", auth: "Session" },
      { method: "PATCH", path: "/api/v1/projects/[id]", description: "Update a project", auth: "Session (Manager+)", body: "{ name?, status?, description? }" },
      { method: "DELETE", path: "/api/v1/projects/[id]", description: "Delete a project", auth: "Session (Manager+)" },
      { method: "GET", path: "/api/v1/projects/[id]/tasks", description: "List tasks for a project", auth: "Session", query: "?status=&assigneeId=" },
      { method: "POST", path: "/api/v1/projects/[id]/tasks", description: "Create a task", auth: "Session", body: "{ title, description?, assigneeId?, priority?, dueDate? }" },
      { method: "PATCH", path: "/api/v1/projects/[id]/tasks/[taskId]", description: "Update a task", auth: "Session", body: "{ title?, status?, assigneeId?, priority? }" },
      { method: "DELETE", path: "/api/v1/projects/[id]/tasks/[taskId]", description: "Delete a task", auth: "Session (Manager+)" },
    ],
  },
  {
    category: "Security & Compliance",
    endpoints: [
      { method: "GET", path: "/api/v1/security/alerts", description: "List security alerts", auth: "Session (Admin)", query: "?severity=&status=" },
      { method: "GET", path: "/api/v1/security/audit-log", description: "Query audit log entries", auth: "Session (Admin)", query: "?action=&userId=&from=&to=&limit=" },
      { method: "GET", path: "/api/v1/security/threats", description: "List detected threats", auth: "Session (Admin)" },
      { method: "GET", path: "/api/v1/security/dlp-policies", description: "List DLP policies", auth: "Session (Admin)" },
      { method: "POST", path: "/api/v1/security/dlp-policies", description: "Create a DLP policy", auth: "Session (Admin)", body: "{ name, patterns, action }" },
      { method: "GET", path: "/api/v1/security/cve", description: "List known CVEs", auth: "Session (Admin)" },
      { method: "POST", path: "/api/v1/security/cve/scan", description: "Trigger a CVE scan", auth: "Session (Admin)" },
      { method: "GET", path: "/api/v1/security/cve/scan/results", description: "Get CVE scan results", auth: "Session (Admin)" },
      { method: "POST", path: "/api/v1/security/cve/import", description: "Import CVE data", auth: "Session (Admin)" },
      { method: "POST", path: "/api/v1/security/cve/assess", description: "Assess CVE risk", auth: "Session (Admin)", body: "{ cveId: string }" },
      { method: "GET", path: "/api/v1/security/ioc", description: "List indicators of compromise", auth: "Session (Admin)" },
      { method: "POST", path: "/api/v1/security/ioc/import", description: "Import IOC data", auth: "Session (Admin)" },
      { method: "POST", path: "/api/v1/security/ioc/lookup", description: "Look up an IOC", auth: "Session (Admin)", body: "{ indicator: string, type: string }" },
      { method: "POST", path: "/api/v1/security/ioc/enrich", description: "Enrich IOC with external data", auth: "Session (Admin)", body: "{ indicator: string }" },
      { method: "GET", path: "/api/v1/domain-blocklists", description: "List domain blocklists", auth: "Session (Admin)" },
      { method: "POST", path: "/api/v1/domain-blocklists", description: "Create a domain blocklist", auth: "Session (Admin)", body: "{ name, domains: string[], category? }" },
      { method: "PATCH", path: "/api/v1/domain-blocklists", description: "Update a domain blocklist", auth: "Session (Admin)", body: "{ id, name?, domains?, isActive? }" },
      { method: "DELETE", path: "/api/v1/domain-blocklists", description: "Delete a domain blocklist", auth: "Session (Admin)", query: "?id=" },
    ],
  },
  {
    category: "Devices & Agents",
    endpoints: [
      { method: "GET", path: "/api/v1/agents/devices", description: "List registered agent devices", auth: "Session (Admin)", query: "?status=&search=" },
      { method: "GET", path: "/api/v1/agents/devices/[id]", description: "Get device details", auth: "Session (Admin)" },
      { method: "PATCH", path: "/api/v1/agents/devices/[id]", description: "Update device info or status", auth: "Session (Admin)" },
      { method: "POST", path: "/api/v1/agents/auth", description: "Agent authentication (API key)", auth: "Agent API Key" },
      { method: "POST", path: "/api/v1/agents/telemetry", description: "Submit agent telemetry data", auth: "Agent Token", body: "{ metrics, events, ... }" },
      { method: "GET", path: "/api/v1/agents/commands", description: "Poll for pending agent commands", auth: "Agent Token" },
      { method: "GET", path: "/api/v1/agents/keys", description: "List agent API keys", auth: "Session (Admin)" },
      { method: "POST", path: "/api/v1/agents/keys", description: "Create an agent API key", auth: "Session (Admin)", body: "{ name, expiresAt? }" },
      { method: "GET", path: "/api/v1/agents/policy", description: "Get agent policy configuration", auth: "Session (Admin)" },
      { method: "POST", path: "/api/v1/agents/policy", description: "Update agent policy", auth: "Session (Admin)", body: "{ screenshotInterval?, keylogger?, ... }" },
      { method: "GET", path: "/api/v1/agents/downloads", description: "Get agent download links", auth: "Session (Admin)" },
      { method: "GET", path: "/api/v1/agents/install", description: "Get agent install script metadata", auth: "Session (Admin)" },
      { method: "GET", path: "/api/v1/agents/install.sh", description: "Download agent install shell script", auth: "Agent API Key" },
      { method: "GET", path: "/api/v1/host-groups", description: "List host groups", auth: "Session (Admin)" },
      { method: "POST", path: "/api/v1/host-groups", description: "Create a host group", auth: "Session (Admin)", body: "{ name, description? }" },
      { method: "GET", path: "/api/v1/software-inventory", description: "List software inventory across devices", auth: "Session (Admin)", query: "?search=&deviceId=" },
    ],
  },
  {
    category: "MDM Management",
    endpoints: [
      { method: "GET", path: "/api/v1/mdm/providers", description: "List MDM provider integrations", auth: "Session (Admin)" },
      { method: "POST", path: "/api/v1/mdm/providers", description: "Add/update an MDM provider", auth: "Session (Admin)", body: "{ type: 'intune' | 'jamf' | 'kandji', config: {...} }" },
      { method: "POST", path: "/api/v1/mdm/providers/test", description: "Test MDM provider connection", auth: "Session (Admin)", body: "{ type, config }" },
      { method: "GET", path: "/api/v1/mdm/devices", description: "List MDM-managed devices", auth: "Session (Admin)", query: "?provider=&compliance=" },
      { method: "POST", path: "/api/v1/mdm/sync", description: "Trigger MDM data sync", auth: "Session (Admin)" },
      { method: "POST", path: "/api/v1/mdm/sync/cron", description: "Cron-triggered MDM sync", auth: "Cron Secret" },
      { method: "POST", path: "/api/v1/mdm/actions", description: "Execute MDM action on a device", auth: "Session (Admin)", body: "{ deviceId, action: 'lock' | 'wipe' | 'restart' }" },
    ],
  },
  {
    category: "Reports & Export",
    endpoints: [
      { method: "POST", path: "/api/v1/reports/generate", description: "Generate a report", auth: "Session (Manager+)", body: "{ type, from, to, format?, filters? }" },
      { method: "GET", path: "/api/v1/reports/history", description: "List generated report history", auth: "Session (Manager+)" },
      { method: "GET", path: "/api/v1/reports/scheduled", description: "List scheduled reports", auth: "Session (Manager+)" },
      { method: "POST", path: "/api/v1/reports/scheduled", description: "Create a scheduled report", auth: "Session (Admin)", body: "{ type, schedule, recipients, filters? }" },
      { method: "GET", path: "/api/v1/reports/pdf", description: "Download a generated report as PDF", auth: "Session (Manager+)", query: "?reportId=" },
      { method: "POST", path: "/api/v1/reports/cron", description: "Cron-triggered report generation", auth: "Cron Secret" },
      { method: "GET", path: "/api/v1/export", description: "Export data in CSV/JSON format", auth: "Session (Manager+)", query: "?type=&from=&to=&format=csv|json" },
    ],
  },
  {
    category: "Workflows & Automation",
    endpoints: [
      { method: "GET", path: "/api/v1/workflows", description: "List automation workflows", auth: "Session (Admin)" },
      { method: "POST", path: "/api/v1/workflows", description: "Create a workflow", auth: "Session (Admin)", body: "{ name, trigger, conditions, actions }" },
      { method: "PATCH", path: "/api/v1/workflows", description: "Update a workflow", auth: "Session (Admin)", body: "{ id, name?, isActive?, conditions?, actions? }" },
      { method: "DELETE", path: "/api/v1/workflows", description: "Delete a workflow", auth: "Session (Admin)", query: "?id=" },
      { method: "GET", path: "/api/v1/workflows/logs", description: "List workflow execution logs", auth: "Session (Admin)", query: "?workflowId=&from=&to=" },
    ],
  },
  {
    category: "Integrations & SCIM",
    endpoints: [
      { method: "GET", path: "/api/v1/integrations", description: "List configured integrations", auth: "Session (Admin)" },
      { method: "POST", path: "/api/v1/integrations", description: "Create/update an integration", auth: "Session (Admin)", body: "{ provider, config, isActive? }" },
      { method: "POST", path: "/api/v1/integrations/[provider]/test", description: "Test an integration connection", auth: "Session (Admin)" },
      { method: "GET", path: "/api/v1/scim/Users", description: "SCIM - List users", auth: "SCIM Bearer Token" },
      { method: "POST", path: "/api/v1/scim/Users", description: "SCIM - Create a user", auth: "SCIM Bearer Token", body: "SCIM User schema" },
      { method: "GET", path: "/api/v1/scim/Users/[id]", description: "SCIM - Get user by ID", auth: "SCIM Bearer Token" },
      { method: "PATCH", path: "/api/v1/scim/Users/[id]", description: "SCIM - Update a user", auth: "SCIM Bearer Token" },
      { method: "DELETE", path: "/api/v1/scim/Users/[id]", description: "SCIM - Deactivate a user", auth: "SCIM Bearer Token" },
      { method: "GET", path: "/api/v1/scim/ServiceProviderConfig", description: "SCIM - Service provider configuration", auth: "None" },
      { method: "GET", path: "/api/v1/scim/tokens", description: "List SCIM tokens", auth: "Session (Admin)" },
      { method: "POST", path: "/api/v1/scim/tokens", description: "Create a SCIM token", auth: "Session (Admin)", body: "{ name, expiresAt? }" },
      { method: "GET", path: "/api/v1/scim/events", description: "List SCIM provisioning events", auth: "Session (Admin)" },
    ],
  },
  {
    category: "Admin & Settings",
    endpoints: [
      { method: "GET", path: "/api/v1/settings", description: "Get organization settings", auth: "Session (Admin)" },
      { method: "PATCH", path: "/api/v1/settings", description: "Update organization settings", auth: "Session (Admin)", body: "{ settings: Record<string, any> }" },
      { method: "GET", path: "/api/v1/branding", description: "Get branding configuration", auth: "Session" },
      { method: "POST", path: "/api/v1/branding", description: "Update branding settings", auth: "Session (Admin)", body: "{ companyName?, brandingMode?, ... }" },
      { method: "POST", path: "/api/v1/branding/upload", description: "Upload logo or banner image", auth: "Session (Admin)", body: "FormData with file" },
      { method: "GET", path: "/api/v1/branding/favicon", description: "Fetch favicon for a domain", auth: "Session", query: "?domain=" },
      { method: "GET", path: "/api/v1/domain-categories", description: "List domain categorizations", auth: "Session (Admin)", response: "{ categories: DomainCategory[], suggestions: [...] }" },
      { method: "POST", path: "/api/v1/domain-categories", description: "Create/upsert domain category (single or bulk)", auth: "Session (Admin)", body: "{ domain, category, label? } or { domains: string[], category }" },
      { method: "DELETE", path: "/api/v1/domain-categories", description: "Remove a domain category", auth: "Session (Admin)", query: "?domain=example.com" },
      { method: "GET", path: "/api/v1/notifications", description: "List notifications for the current user", auth: "Session" },
      { method: "PATCH", path: "/api/v1/notifications", description: "Mark notifications as read", auth: "Session", body: "{ ids: string[] }" },
      { method: "GET", path: "/api/v1/search", description: "Global search across entities", auth: "Session", query: "?q=&type=" },
      { method: "GET", path: "/api/v1/events/stream", description: "Server-sent events for real-time updates", auth: "Session" },
      { method: "POST", path: "/api/v1/events/cleanup", description: "Clean up stale real-time events", auth: "Cron Secret" },
      { method: "GET", path: "/api/v1/patch-notes", description: "List patch notes", auth: "Session" },
      { method: "POST", path: "/api/v1/patch-notes", description: "Create a patch note", auth: "Session (Admin)", body: "{ version, title, content, category? }" },
      { method: "PATCH", path: "/api/v1/patch-notes/[id]", description: "Update a patch note", auth: "Session (Admin)" },
      { method: "DELETE", path: "/api/v1/patch-notes/[id]", description: "Delete a patch note", auth: "Session (Admin)" },
      { method: "POST", path: "/api/v1/patch-notes/seed", description: "Seed default patch notes", auth: "Session (Admin)" },
      { method: "POST", path: "/api/v1/contact", description: "Submit a contact form message", auth: "None", body: "{ name, email, message }" },
      { method: "GET", path: "/api/v1/cost-optimization/licenses", description: "List software license costs", auth: "Session (Admin)" },
      { method: "POST", path: "/api/v1/cost-optimization/licenses", description: "Add/update a software license entry", auth: "Session (Admin)" },
      { method: "GET", path: "/api/v1/cost-optimization/budget", description: "List IT budget entries", auth: "Session (Admin)" },
      { method: "POST", path: "/api/v1/cost-optimization/budget", description: "Add/update a budget entry", auth: "Session (Admin)" },
      { method: "GET", path: "/api/v1/sustainability/energy", description: "List energy readings", auth: "Session (Admin)" },
      { method: "POST", path: "/api/v1/sustainability/energy", description: "Add an energy reading", auth: "Session (Admin)" },
      { method: "GET", path: "/api/v1/sustainability/goals", description: "List sustainability goals", auth: "Session (Admin)" },
      { method: "POST", path: "/api/v1/sustainability/goals", description: "Create/update a sustainability goal", auth: "Session (Admin)" },
      { method: "GET", path: "/api/v1/tickets", description: "List support tickets", auth: "Session" },
      { method: "POST", path: "/api/v1/tickets", description: "Create a support ticket", auth: "Session", body: "{ subject, description, priority? }" },
      { method: "GET", path: "/api/v1/tickets/[id]/messages", description: "List messages for a ticket", auth: "Session" },
      { method: "POST", path: "/api/v1/tickets/[id]/messages", description: "Add a message to a ticket", auth: "Session", body: "{ content }" },
    ],
  },
];

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export default function ApiDocsPage() {
  const { authorized } = useRequireRole("ADMIN");
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const filteredDocs = useMemo(() => {
    if (!search) return API_DOCS;
    const q = search.toLowerCase();
    return API_DOCS.map((cat) => ({
      ...cat,
      endpoints: cat.endpoints.filter(
        (e) =>
          e.path.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q) ||
          e.method.toLowerCase().includes(q) ||
          e.auth.toLowerCase().includes(q)
      ),
    })).filter((cat) => cat.endpoints.length > 0);
  }, [search]);

  const totalEndpoints = API_DOCS.reduce((sum, cat) => sum + cat.endpoints.length, 0);

  function toggleCategory(category: string) {
    setCollapsed((prev) => ({ ...prev, [category]: !prev[category] }));
  }

  if (!authorized) return null;

  return (
    <div className="flex gap-6">
      {/* Sidebar Navigation */}
      <aside className="hidden xl:block w-56 flex-shrink-0">
        <div className="sticky top-20 space-y-1">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">Categories</h3>
          {API_DOCS.map((cat) => (
            <a
              key={cat.category}
              href={`#${slugify(cat.category)}`}
              className="block text-sm py-1.5 px-2 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            >
              {cat.category}
              <span className="ml-1 text-xs opacity-60">({cat.endpoints.length})</span>
            </a>
          ))}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0 space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6" />
            API Documentation
          </h1>
          <p className="text-muted-foreground">
            {totalEndpoints} endpoints across {API_DOCS.length} categories. All endpoints are prefixed with your base URL.
          </p>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search endpoints..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Auth Info */}
        <div className="rounded-lg border p-4 bg-muted/30 text-sm space-y-2">
          <p className="font-medium">Authentication</p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li><strong>Session</strong> -- Requires an active session cookie (NextAuth.js). Most endpoints use this.</li>
            <li><strong>Agent API Key</strong> -- Used by the desktop agent. Pass via <code className="bg-muted px-1 rounded">Authorization: Bearer &lt;key&gt;</code> header.</li>
            <li><strong>SCIM Bearer Token</strong> -- Used for SCIM provisioning. Pass via <code className="bg-muted px-1 rounded">Authorization: Bearer &lt;token&gt;</code>.</li>
            <li><strong>Cron Secret</strong> -- Internal cron endpoints require <code className="bg-muted px-1 rounded">x-cron-secret</code> header.</li>
            <li><strong>None</strong> -- Public endpoints (password reset, contact form, etc.).</li>
          </ul>
        </div>

        {/* Categories */}
        {filteredDocs.map((cat) => {
          const slug = slugify(cat.category);
          const isCollapsed = collapsed[cat.category];

          return (
            <div key={cat.category} id={slug} className="scroll-mt-20">
              <button
                onClick={() => toggleCategory(cat.category)}
                className="flex items-center gap-2 w-full text-left py-3 group"
              >
                {isCollapsed ? (
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
                <h2 className="text-lg font-semibold">{cat.category}</h2>
                <span className="text-sm text-muted-foreground">
                  ({cat.endpoints.length} endpoint{cat.endpoints.length !== 1 ? "s" : ""})
                </span>
              </button>

              {!isCollapsed && (
                <div className="space-y-3 ml-7">
                  {cat.endpoints.map((ep, i) => (
                    <div
                      key={`${ep.method}-${ep.path}-${i}`}
                      className="rounded-lg border p-4 space-y-2"
                    >
                      <div className="flex items-center gap-3 flex-wrap">
                        <Badge
                          variant="outline"
                          className={`font-mono text-xs px-2 py-0.5 ${METHOD_COLORS[ep.method] || ""}`}
                        >
                          {ep.method}
                        </Badge>
                        <code className="text-sm font-mono font-medium">{ep.path}</code>
                        <span className="text-sm text-muted-foreground ml-auto">{ep.auth}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{ep.description}</p>
                      {ep.query && (
                        <div className="text-xs">
                          <span className="font-medium text-muted-foreground">Query: </span>
                          <code className="bg-muted px-1.5 py-0.5 rounded">{ep.query}</code>
                        </div>
                      )}
                      {ep.body && (
                        <div className="text-xs">
                          <span className="font-medium text-muted-foreground">Body: </span>
                          <code className="bg-muted px-1.5 py-0.5 rounded">{ep.body}</code>
                        </div>
                      )}
                      {ep.response && (
                        <div className="text-xs">
                          <span className="font-medium text-muted-foreground">Response: </span>
                          <code className="bg-muted px-1.5 py-0.5 rounded">{ep.response}</code>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {filteredDocs.length === 0 && (
          <p className="text-center text-muted-foreground py-12">
            No endpoints match your search.
          </p>
        )}
      </div>
    </div>
  );
}
