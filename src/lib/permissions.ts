import type { Role } from "@/generated/prisma";

const ROLE_HIERARCHY: Record<Role, number> = {
  SUPER_ADMIN: 4,
  ADMIN: 3,
  MANAGER: 2,
  EMPLOYEE: 1,
};

type Permission =
  | "employees:read"
  | "employees:write"
  | "employees:invite"
  | "time-entries:read"
  | "time-entries:read-all"
  | "time-entries:write"
  | "attendance:read"
  | "attendance:read-all"
  | "attendance:write"
  | "leave:approve"
  | "activity:read"
  | "activity:read-all"
  | "projects:read"
  | "projects:write"
  | "tasks:read"
  | "tasks:write"
  | "tasks:assign"
  | "security:read"
  | "security:manage"
  | "reports:read"
  | "reports:create"
  | "reports:schedule"
  | "settings:read"
  | "settings:write"
  | "team:manage"
  | "mdm:read"
  | "mdm:write"
  | "mdm:actions"
  | "patch-notes:read"
  | "patch-notes:write";

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  SUPER_ADMIN: [
    "employees:read", "employees:write", "employees:invite",
    "time-entries:read", "time-entries:read-all", "time-entries:write",
    "attendance:read", "attendance:read-all", "attendance:write", "leave:approve",
    "activity:read", "activity:read-all",
    "projects:read", "projects:write",
    "tasks:read", "tasks:write", "tasks:assign",
    "security:read", "security:manage",
    "reports:read", "reports:create", "reports:schedule",
    "settings:read", "settings:write", "team:manage",
    "mdm:read", "mdm:write", "mdm:actions",
    "patch-notes:read", "patch-notes:write",
  ],
  ADMIN: [
    "employees:read", "employees:write", "employees:invite",
    "time-entries:read", "time-entries:read-all", "time-entries:write",
    "attendance:read", "attendance:read-all", "attendance:write", "leave:approve",
    "activity:read", "activity:read-all",
    "projects:read", "projects:write",
    "tasks:read", "tasks:write", "tasks:assign",
    "security:read", "security:manage",
    "reports:read", "reports:create", "reports:schedule",
    "settings:read", "settings:write", "team:manage",
    "mdm:read", "mdm:write", "mdm:actions",
    "patch-notes:read", "patch-notes:write",
  ],
  MANAGER: [
    "employees:read",
    "time-entries:read", "time-entries:read-all", "time-entries:write",
    "attendance:read", "attendance:read-all", "leave:approve",
    "activity:read", "activity:read-all",
    "projects:read", "projects:write",
    "tasks:read", "tasks:write", "tasks:assign",
    "security:read",
    "reports:read", "reports:create",
    "settings:read",
    "patch-notes:read",
  ],
  EMPLOYEE: [
    "time-entries:read", "time-entries:write",
    "attendance:read",
    "activity:read",
    "projects:read",
    "tasks:read", "tasks:write",
    "reports:read",
    "settings:read",
    "patch-notes:read",
  ],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function hasMinRole(role: Role, minRole: Role): boolean {
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[minRole];
}

export type { Permission };
