-- ============================================================
-- Enable Row Level Security on ALL tables
-- ============================================================
-- The MyDex app connects via Prisma using the `postgres` role
-- (table owner), which bypasses RLS. This migration locks down
-- the Supabase anon/authenticated key access via PostgREST.
--
-- Policy: only the `service_role` (used by backend) gets full
-- access. The `anon` and `authenticated` roles get NOTHING by
-- default — all data access must go through the API layer.
-- ============================================================

-- ── Multi-tenancy & Auth ──

ALTER TABLE "Organization" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Account" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VerificationToken" ENABLE ROW LEVEL SECURITY;

-- ── Departments & Host Groups ──

ALTER TABLE "Department" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "HostGroup" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "HostGroupMember" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DomainBlocklist" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "HostGroupPolicy" ENABLE ROW LEVEL SECURITY;

-- ── Time & Attendance ──

ALTER TABLE "TimeEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AttendanceRecord" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LeaveRequest" ENABLE ROW LEVEL SECURITY;

-- ── Activity & Productivity ──

ALTER TABLE "ActivityEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ActivitySummary" ENABLE ROW LEVEL SECURITY;

-- ── Projects & Tasks ──

ALTER TABLE "Project" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Task" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Milestone" ENABLE ROW LEVEL SECURITY;

-- ── Security ──

ALTER TABLE "SecurityAlert" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DlpPolicy" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "IocEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "IocMatch" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CveEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CveScanResult" ENABLE ROW LEVEL SECURITY;

-- ── Reports ──

ALTER TABLE "ScheduledReport" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ReportHistory" ENABLE ROW LEVEL SECURITY;

-- ── Agent & Devices ──

ALTER TABLE "AgentDevice" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DeviceDiagnostic" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RemediationCommand" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AgentApiKey" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TelemetryBatch" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "NetworkConnection" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DnsQueryLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UsbDeviceEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AgentPolicy" ENABLE ROW LEVEL SECURITY;

-- ── Auth & SSO ──

ALTER TABLE "MfaCredential" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SsoProvider" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LoginAttempt" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ActiveSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PasswordResetToken" ENABLE ROW LEVEL SECURITY;

-- ── Onboarding & Support ──

ALTER TABLE "BoardingTask" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SupportTicket" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TicketMessage" ENABLE ROW LEVEL SECURITY;

-- ── MDM ──

ALTER TABLE "MdmProvider" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MdmDevice" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MdmAction" ENABLE ROW LEVEL SECURITY;

-- ── Operations ──

ALTER TABLE "MonitoringChangeLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PatchNote" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SoftwareLicense" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ItBudgetEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EnergyReading" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SustainabilityGoal" ENABLE ROW LEVEL SECURITY;

-- ── Notifications & Realtime ──

ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RealtimeEvent" ENABLE ROW LEVEL SECURITY;

-- ── Integrations & Workflows ──

ALTER TABLE "Integration" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ScimToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ScimEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Workflow" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkflowLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DomainCategory" ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Grant service_role full access to all tables
-- The service_role is used by the backend (via service key)
-- and should bypass RLS restrictions.
-- ============================================================

DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'Organization', 'User', 'Account', 'Session', 'VerificationToken',
    'Department', 'HostGroup', 'HostGroupMember', 'DomainBlocklist', 'HostGroupPolicy',
    'TimeEntry', 'AttendanceRecord', 'LeaveRequest',
    'ActivityEvent', 'ActivitySummary',
    'Project', 'Task', 'Milestone',
    'SecurityAlert', 'DlpPolicy', 'AuditLog', 'IocEntry', 'IocMatch', 'CveEntry', 'CveScanResult',
    'ScheduledReport', 'ReportHistory',
    'AgentDevice', 'DeviceDiagnostic', 'RemediationCommand', 'AgentApiKey', 'TelemetryBatch',
    'NetworkConnection', 'DnsQueryLog', 'UsbDeviceEvent', 'AgentPolicy',
    'MfaCredential', 'SsoProvider', 'LoginAttempt', 'ActiveSession', 'PasswordResetToken',
    'BoardingTask', 'SupportTicket', 'TicketMessage',
    'MdmProvider', 'MdmDevice', 'MdmAction',
    'MonitoringChangeLog', 'PatchNote', 'SoftwareLicense', 'ItBudgetEntry',
    'EnergyReading', 'SustainabilityGoal',
    'Notification', 'RealtimeEvent',
    'Integration', 'ScimToken', 'ScimEvent', 'Workflow', 'WorkflowLog', 'DomainCategory'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format(
      'CREATE POLICY "service_role_full_access" ON %I FOR ALL TO service_role USING (true) WITH CHECK (true)',
      tbl
    );
  END LOOP;
END $$;

-- ============================================================
-- Explicitly deny anon and authenticated roles
-- (RLS is enabled with no policies = deny all by default,
--  but these explicit denies make the intent clear)
-- ============================================================
-- No policies created for anon/authenticated = implicit deny.
-- All data access MUST go through the Next.js API layer which
-- authenticates users and enforces RBAC via application code.
