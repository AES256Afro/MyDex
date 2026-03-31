import { hasPermission, hasMinRole } from "@/lib/permissions";

// ── hasPermission ──

describe("hasPermission", () => {
  // Table-driven: [role, permission, expected]
  const cases: [string, string, boolean][] = [
    // SUPER_ADMIN has everything
    ["SUPER_ADMIN", "employees:read", true],
    ["SUPER_ADMIN", "employees:write", true],
    ["SUPER_ADMIN", "employees:invite", true],
    ["SUPER_ADMIN", "mdm:write", true],
    ["SUPER_ADMIN", "mdm:actions", true],
    ["SUPER_ADMIN", "security:manage", true],
    ["SUPER_ADMIN", "settings:write", true],
    ["SUPER_ADMIN", "team:manage", true],
    ["SUPER_ADMIN", "patch-notes:write", true],
    ["SUPER_ADMIN", "reports:schedule", true],

    // ADMIN mirrors SUPER_ADMIN
    ["ADMIN", "employees:read", true],
    ["ADMIN", "employees:write", true],
    ["ADMIN", "employees:invite", true],
    ["ADMIN", "mdm:write", true],
    ["ADMIN", "mdm:actions", true],
    ["ADMIN", "security:manage", true],
    ["ADMIN", "settings:write", true],
    ["ADMIN", "team:manage", true],
    ["ADMIN", "patch-notes:write", true],
    ["ADMIN", "reports:schedule", true],

    // MANAGER: has some, lacks admin-level
    ["MANAGER", "employees:read", true],
    ["MANAGER", "employees:write", false],
    ["MANAGER", "employees:invite", false],
    ["MANAGER", "leave:approve", true],
    ["MANAGER", "projects:write", true],
    ["MANAGER", "tasks:assign", true],
    ["MANAGER", "reports:create", true],
    ["MANAGER", "reports:schedule", false],
    ["MANAGER", "security:read", true],
    ["MANAGER", "security:manage", false],
    ["MANAGER", "settings:read", true],
    ["MANAGER", "settings:write", false],
    ["MANAGER", "team:manage", false],
    ["MANAGER", "mdm:read", false],
    ["MANAGER", "mdm:write", false],
    ["MANAGER", "mdm:actions", false],
    ["MANAGER", "patch-notes:read", true],
    ["MANAGER", "patch-notes:write", false],

    // EMPLOYEE: minimal permissions
    ["EMPLOYEE", "time-entries:read", true],
    ["EMPLOYEE", "time-entries:write", true],
    ["EMPLOYEE", "time-entries:read-all", false],
    ["EMPLOYEE", "attendance:read", true],
    ["EMPLOYEE", "attendance:read-all", false],
    ["EMPLOYEE", "attendance:write", false],
    ["EMPLOYEE", "leave:approve", false],
    ["EMPLOYEE", "activity:read", true],
    ["EMPLOYEE", "activity:read-all", false],
    ["EMPLOYEE", "projects:read", true],
    ["EMPLOYEE", "projects:write", false],
    ["EMPLOYEE", "tasks:read", true],
    ["EMPLOYEE", "tasks:write", true],
    ["EMPLOYEE", "tasks:assign", false],
    ["EMPLOYEE", "reports:read", true],
    ["EMPLOYEE", "reports:create", false],
    ["EMPLOYEE", "settings:read", true],
    ["EMPLOYEE", "settings:write", false],
    ["EMPLOYEE", "employees:read", false],
    ["EMPLOYEE", "employees:write", false],
    ["EMPLOYEE", "employees:invite", false],
    ["EMPLOYEE", "security:read", false],
    ["EMPLOYEE", "security:manage", false],
    ["EMPLOYEE", "mdm:read", false],
    ["EMPLOYEE", "mdm:write", false],
    ["EMPLOYEE", "patch-notes:read", true],
    ["EMPLOYEE", "patch-notes:write", false],
  ];

  it.each(cases)(
    "role %s with permission %s should return %s",
    (role, permission, expected) => {
      expect(hasPermission(role as any, permission as any)).toBe(expected);
    }
  );

  it("returns false for an unknown role", () => {
    expect(hasPermission("INTERN" as any, "employees:read" as any)).toBe(false);
  });

  it("returns false for undefined role", () => {
    expect(hasPermission(undefined as any, "employees:read" as any)).toBe(false);
  });

  it("returns false for an unknown permission on a valid role", () => {
    expect(hasPermission("ADMIN" as any, "teleport:activate" as any)).toBe(false);
  });
});

// ── hasMinRole ──

describe("hasMinRole", () => {
  // Table-driven: [userRole, requiredRole, expected]
  const cases: [string, string, boolean][] = [
    // Same role always passes
    ["SUPER_ADMIN", "SUPER_ADMIN", true],
    ["ADMIN", "ADMIN", true],
    ["MANAGER", "MANAGER", true],
    ["EMPLOYEE", "EMPLOYEE", true],

    // Higher role passes lower requirement
    ["SUPER_ADMIN", "ADMIN", true],
    ["SUPER_ADMIN", "MANAGER", true],
    ["SUPER_ADMIN", "EMPLOYEE", true],
    ["ADMIN", "MANAGER", true],
    ["ADMIN", "EMPLOYEE", true],
    ["MANAGER", "EMPLOYEE", true],

    // Lower role fails higher requirement
    ["ADMIN", "SUPER_ADMIN", false],
    ["MANAGER", "SUPER_ADMIN", false],
    ["MANAGER", "ADMIN", false],
    ["EMPLOYEE", "SUPER_ADMIN", false],
    ["EMPLOYEE", "ADMIN", false],
    ["EMPLOYEE", "MANAGER", false],
  ];

  it.each(cases)(
    "user role %s with required role %s should return %s",
    (userRole, requiredRole, expected) => {
      expect(hasMinRole(userRole as any, requiredRole as any)).toBe(expected);
    }
  );
});
