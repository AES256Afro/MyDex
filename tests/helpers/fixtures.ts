export function createMockUser(overrides?: Record<string, unknown>) {
  return {
    id: "user-1",
    email: "john@example.com",
    name: "John Doe",
    role: "EMPLOYEE",
    organizationId: "org-1",
    status: "ACTIVE",
    department: "Engineering",
    jobTitle: "Software Engineer",
    monitoringPaused: false,
    monitoringMode: "ALWAYS",
    canToggleMonitoring: false,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    ...overrides,
  };
}

export function createMockTimeEntry(overrides?: Record<string, unknown>) {
  return {
    id: "te-1",
    userId: "user-1",
    organizationId: "org-1",
    clockIn: new Date("2024-01-15T09:00:00Z"),
    clockOut: new Date("2024-01-15T17:00:00Z"),
    notes: null,
    createdAt: new Date("2024-01-15T09:00:00Z"),
    ...overrides,
  };
}

export function createMockAttendanceRecord(overrides?: Record<string, unknown>) {
  return {
    id: "att-1",
    userId: "user-1",
    organizationId: "org-1",
    date: new Date("2024-01-15"),
    status: "PRESENT",
    clockIn: new Date("2024-01-15T09:00:00Z"),
    clockOut: new Date("2024-01-15T17:00:00Z"),
    hoursWorked: 8,
    createdAt: new Date("2024-01-15"),
    ...overrides,
  };
}

export function createMockWorkflow(overrides?: Record<string, unknown>) {
  return {
    id: "wf-1",
    organizationId: "org-1",
    name: "Test Workflow",
    description: "A test workflow",
    trigger: "ticket_created",
    conditions: [],
    actions: [{ type: "send_notification", config: { title: "Test", message: "Hello" } }],
    isActive: true,
    createdById: "user-1",
    lastTriggeredAt: null,
    triggerCount: 0,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    ...overrides,
  };
}

export function createMockWorkflowLog(overrides?: Record<string, unknown>) {
  return {
    id: "wfl-1",
    workflowId: "wf-1",
    organizationId: "org-1",
    trigger: "ticket_created",
    triggerData: { ticketId: "ticket-1" },
    actionsExecuted: [{ type: "send_notification", success: true }],
    success: true,
    errorMessage: null,
    createdAt: new Date("2024-01-15T10:00:00Z"),
    ...overrides,
  };
}

export function createMockMdmProvider(overrides?: Record<string, unknown>) {
  return {
    id: "mdm-1",
    organizationId: "org-1",
    name: "Test MDM",
    type: "INTUNE",
    apiUrl: "https://graph.microsoft.com",
    credentials: {},
    isActive: true,
    lastSync: null,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    ...overrides,
  };
}

export function createMockMdmDevice(overrides?: Record<string, unknown>) {
  return {
    id: "mdm-dev-1",
    providerId: "mdm-1",
    organizationId: "org-1",
    externalId: "ext-123",
    deviceName: "Test Laptop",
    platform: "WINDOWS",
    osVersion: "11.0",
    serialNumber: "SN12345",
    complianceStatus: "COMPLIANT",
    lastCheckin: new Date("2024-01-15T08:00:00Z"),
    matchedUserId: "user-1",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-15"),
    ...overrides,
  };
}

export function createMockSupportTicket(overrides?: Record<string, unknown>) {
  return {
    id: "ticket-1",
    organizationId: "org-1",
    submittedBy: "user-1",
    assignedTo: null,
    subject: "Test Ticket",
    category: "IT Support",
    description: "Something is broken",
    priority: "MEDIUM",
    status: "OPEN",
    createdAt: new Date("2024-01-15T09:00:00Z"),
    updatedAt: new Date("2024-01-15T09:00:00Z"),
    ...overrides,
  };
}

export function createMockAgentDevice(overrides?: Record<string, unknown>) {
  return {
    id: "agent-1",
    userId: "user-1",
    organizationId: "org-1",
    hostname: "DESKTOP-TEST",
    os: "Windows 11",
    agentVersion: "1.0.0",
    status: "ONLINE",
    lastHeartbeat: new Date("2024-01-15T10:00:00Z"),
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-15"),
    ...overrides,
  };
}

export function createMockSecurityAlert(overrides?: Record<string, unknown>) {
  return {
    id: "alert-1",
    userId: "user-1",
    organizationId: "org-1",
    type: "SUSPICIOUS_LOGIN",
    severity: "HIGH",
    title: "Suspicious login detected",
    description: "Login from unusual location",
    resolved: false,
    resolvedAt: null,
    resolvedBy: null,
    createdAt: new Date("2024-01-15T10:00:00Z"),
    ...overrides,
  };
}

export function createMockNotification(overrides?: Record<string, unknown>) {
  return {
    id: "notif-1",
    userId: "user-1",
    organizationId: "org-1",
    type: "GENERAL",
    title: "Test Notification",
    message: "This is a test notification",
    link: null,
    read: false,
    createdAt: new Date("2024-01-15T10:00:00Z"),
    ...overrides,
  };
}

export function createMockProject(overrides?: Record<string, unknown>) {
  return {
    id: "proj-1",
    organizationId: "org-1",
    name: "Test Project",
    description: "A test project",
    status: "ACTIVE",
    startDate: new Date("2024-01-01"),
    endDate: new Date("2024-06-30"),
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    ...overrides,
  };
}
