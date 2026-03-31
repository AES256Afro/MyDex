import { vi } from "vitest";

function createModelMock() {
  return {
    findMany: vi.fn().mockResolvedValue([]),
    findFirst: vi.fn().mockResolvedValue(null),
    findUnique: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) => Promise.resolve({ id: "mock-id", ...data })),
    createMany: vi.fn().mockResolvedValue({ count: 0 }),
    update: vi.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) => Promise.resolve({ id: "mock-id", ...data })),
    updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    upsert: vi.fn().mockImplementation(({ create }: { create: Record<string, unknown> }) => Promise.resolve({ id: "mock-id", ...create })),
    delete: vi.fn().mockResolvedValue({ id: "mock-id" }),
    deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    count: vi.fn().mockResolvedValue(0),
    aggregate: vi.fn().mockResolvedValue({}),
  };
}

export const mockPrisma = {
  // Multi-tenancy & Auth
  organization: createModelMock(),
  user: createModelMock(),
  account: createModelMock(),
  session: createModelMock(),
  verificationToken: createModelMock(),

  // Departments & Host Groups
  department: createModelMock(),
  hostGroup: createModelMock(),
  hostGroupMember: createModelMock(),
  domainBlocklist: createModelMock(),
  hostGroupPolicy: createModelMock(),

  // Time & Attendance
  timeEntry: createModelMock(),
  attendanceRecord: createModelMock(),
  leaveRequest: createModelMock(),

  // Activity Monitoring
  activityEvent: createModelMock(),
  activitySummary: createModelMock(),

  // Projects & Tasks
  project: createModelMock(),
  task: createModelMock(),
  milestone: createModelMock(),

  // Security
  securityAlert: createModelMock(),
  dlpPolicy: createModelMock(),
  auditLog: createModelMock(),
  iocEntry: createModelMock(),
  iocMatch: createModelMock(),
  cveEntry: createModelMock(),
  cveScanResult: createModelMock(),

  // Reports
  scheduledReport: createModelMock(),
  reportHistory: createModelMock(),

  // Agent & Device
  agentDevice: createModelMock(),
  deviceDiagnostic: createModelMock(),
  remediationCommand: createModelMock(),
  agentApiKey: createModelMock(),
  telemetryBatch: createModelMock(),
  networkConnection: createModelMock(),
  dnsQueryLog: createModelMock(),
  usbDeviceEvent: createModelMock(),
  agentPolicy: createModelMock(),

  // Auth & SSO
  mfaCredential: createModelMock(),
  ssoProvider: createModelMock(),
  loginAttempt: createModelMock(),
  activeSession: createModelMock(),
  passwordResetToken: createModelMock(),

  // Boarding
  boardingTask: createModelMock(),

  // Support
  supportTicket: createModelMock(),
  ticketMessage: createModelMock(),

  // MDM
  mdmProvider: createModelMock(),
  mdmDevice: createModelMock(),
  mdmAction: createModelMock(),

  // Misc
  monitoringChangeLog: createModelMock(),
  patchNote: createModelMock(),
  softwareLicense: createModelMock(),
  itBudgetEntry: createModelMock(),
  energyReading: createModelMock(),
  sustainabilityGoal: createModelMock(),
  notification: createModelMock(),
  integration: createModelMock(),
  scimToken: createModelMock(),
  scimEvent: createModelMock(),

  // Workflows
  workflow: createModelMock(),
  workflowLog: createModelMock(),

  // Transaction support
  $transaction: vi.fn().mockImplementation((fn: unknown) => {
    if (typeof fn === "function") {
      return fn(mockPrisma);
    }
    // Support array-style transactions
    return Promise.all(fn as Promise<unknown>[]);
  }),
};

export function resetPrismaMocks() {
  for (const model of Object.values(mockPrisma)) {
    if (typeof model === "object" && model !== null) {
      for (const method of Object.values(model as Record<string, unknown>)) {
        if (typeof method === "function" && "mockReset" in method) {
          (method as ReturnType<typeof vi.fn>).mockReset();
        }
      }
    }
  }
}
