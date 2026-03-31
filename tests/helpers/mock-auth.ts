import { vi } from "vitest";

interface MockUser {
  id: string;
  email: string;
  name: string;
  role: string;
  organizationId: string;
  mfaRequired?: boolean;
  status?: string;
  department?: string | null;
}

interface MockSession {
  user: MockUser;
}

const defaultUser: MockUser = {
  id: "test-user-id",
  email: "test@example.com",
  name: "Test User",
  role: "ADMIN",
  organizationId: "test-org-id",
  mfaRequired: false,
  status: "ACTIVE",
  department: null,
};

export function mockSession(overrides?: Partial<MockUser>): MockSession {
  return { user: { ...defaultUser, ...overrides } };
}

export function mockAdminSession(): MockSession {
  return mockSession({ role: "ADMIN" });
}

export function mockSuperAdminSession(): MockSession {
  return mockSession({ role: "SUPER_ADMIN" });
}

export function mockManagerSession(): MockSession {
  return mockSession({ role: "MANAGER", id: "test-manager-id", email: "manager@example.com", name: "Test Manager" });
}

export function mockEmployeeSession(): MockSession {
  return mockSession({ role: "EMPLOYEE", id: "test-employee-id", email: "employee@example.com", name: "Test Employee" });
}

export async function setAuthSession(session: MockSession | null) {
  const { auth } = await import("@/lib/auth");
  (auth as ReturnType<typeof vi.fn>).mockResolvedValue(session);
}
