import type { Role } from "@/generated/prisma";

/**
 * Module visibility configuration.
 * Each module maps to a sidebar nav item and defines which roles can see it.
 * Admins can override these defaults via org settings.
 */

export interface ModuleConfig {
  id: string;
  label: string;
  href: string;
  description: string;
  /** Minimum role required (EMPLOYEE < MANAGER < ADMIN < SUPER_ADMIN) */
  minRole: Role;
  /** Can this module be enabled for lower roles by admin? */
  configurable: boolean;
  /** Category for grouping in the admin config UI */
  category: "core" | "monitoring" | "management" | "security" | "compliance" | "it-support" | "insights" | "admin";
}

export const MODULE_REGISTRY: ModuleConfig[] = [
  // Core — always visible to all
  {
    id: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
    description: "Overview and stats",
    minRole: "EMPLOYEE",
    configurable: false,
    category: "core",
  },
  {
    id: "time-tracking",
    label: "Time Tracking",
    href: "/time-tracking",
    description: "Clock in/out and timesheets",
    minRole: "EMPLOYEE",
    configurable: false,
    category: "core",
  },
  {
    id: "attendance",
    label: "Attendance",
    href: "/attendance",
    description: "Attendance records and leave requests",
    minRole: "EMPLOYEE",
    configurable: false,
    category: "core",
  },
  {
    id: "projects",
    label: "Projects",
    href: "/projects",
    description: "Project and task management",
    minRole: "EMPLOYEE",
    configurable: false,
    category: "core",
  },
  {
    id: "my-account",
    label: "My Account",
    href: "/account",
    description: "Profile, password, and MFA settings",
    minRole: "EMPLOYEE",
    configurable: false,
    category: "core",
  },

  // Monitoring — admin by default, optionally visible to employees
  {
    id: "activity",
    label: "Activity",
    href: "/activity",
    description: "Application and website usage monitoring",
    minRole: "MANAGER",
    configurable: true,
    category: "monitoring",
  },
  {
    id: "productivity",
    label: "Productivity",
    href: "/productivity",
    description: "Productivity scores and trends",
    minRole: "MANAGER",
    configurable: true,
    category: "monitoring",
  },

  // Management — manager and above
  {
    id: "employees",
    label: "Employees",
    href: "/employees",
    description: "Employee directory and profiles",
    minRole: "MANAGER",
    configurable: true,
    category: "management",
  },
  {
    id: "user-management",
    label: "User Management",
    href: "/user-management",
    description: "Bulk user operations and role assignments",
    minRole: "ADMIN",
    configurable: false,
    category: "management",
  },
  {
    id: "departments",
    label: "Departments",
    href: "/departments",
    description: "Department structure and members",
    minRole: "MANAGER",
    configurable: false,
    category: "management",
  },
  {
    id: "reports",
    label: "Reports",
    href: "/reports",
    description: "Generate and schedule reports",
    minRole: "MANAGER",
    configurable: true,
    category: "management",
  },

  // Security — admin only
  {
    id: "fleet-health",
    label: "Fleet Health",
    href: "/fleet-health",
    description: "DEX scores, OS compliance, agent status, and proactive health alerts",
    minRole: "ADMIN",
    configurable: false,
    category: "security",
  },
  {
    id: "devices",
    label: "Devices",
    href: "/devices",
    description: "Endpoint device management",
    minRole: "ADMIN",
    configurable: false,
    category: "security",
  },
  {
    id: "software-inventory",
    label: "Software Inventory",
    href: "/software-inventory",
    description: "Software versions, paths, and usage across devices",
    minRole: "ADMIN",
    configurable: false,
    category: "security",
  },
  {
    id: "host-groups",
    label: "Host Groups",
    href: "/host-groups",
    description: "Device groups and policies",
    minRole: "ADMIN",
    configurable: false,
    category: "security",
  },
  {
    id: "security",
    label: "Security",
    href: "/security",
    description: "Security alerts and threat detection",
    minRole: "ADMIN",
    configurable: false,
    category: "security",
  },

  // Compliance
  {
    id: "compliance",
    label: "SOC 2 Compliance",
    href: "/compliance",
    description: "SOC 2 compliance health, controls, evidence, and audit readiness",
    minRole: "MANAGER",
    configurable: true,
    category: "compliance",
  },

  // IT Support — user-facing self-service
  {
    id: "support",
    label: "IT Support",
    href: "/support",
    description: "Self-service remediation, submit tickets, and view your device",
    minRole: "EMPLOYEE",
    configurable: false,
    category: "it-support",
  },
  // IT Support Admin — full admin portal
  {
    id: "it-support",
    label: "IT Admin Portal",
    href: "/it-support",
    description: "Ticket queue, configuration, and device troubleshooting",
    minRole: "ADMIN",
    configurable: false,
    category: "it-support",
  },

  // Admin — admin only
  {
    id: "settings",
    label: "Settings",
    href: "/settings",
    description: "Organization settings and configuration",
    minRole: "ADMIN",
    configurable: false,
    category: "admin",
  },
  {
    id: "mfa-security",
    label: "MFA & Security",
    href: "/settings/security",
    description: "Two-factor authentication and login audit",
    minRole: "EMPLOYEE", // Everyone should be able to set up MFA
    configurable: false,
    category: "admin",
  },
  {
    id: "sso-providers",
    label: "SSO Providers",
    href: "/settings/sso",
    description: "Enterprise SSO configuration",
    minRole: "ADMIN",
    configurable: false,
    category: "admin",
  },
  {
    id: "module-access",
    label: "Module Access",
    href: "/settings/modules",
    description: "Configure which modules each role can see",
    minRole: "ADMIN",
    configurable: false,
    category: "admin",
  },
  {
    id: "agent-setup",
    label: "Agent Setup",
    href: "/settings/agent-setup",
    description: "Deploy, download, and manage monitoring agents",
    minRole: "ADMIN",
    configurable: false,
    category: "admin",
  },
  {
    id: "mdm-providers",
    label: "MDM Integration",
    href: "/settings/mdm",
    description: "Connect and manage MDM providers (Intune, Jamf, Kandji)",
    minRole: "ADMIN",
    configurable: false,
    category: "admin",
  },
  {
    id: "branding",
    label: "Branding",
    href: "/settings/branding",
    description: "Customize logo, company name, and brand colors",
    minRole: "ADMIN",
    configurable: false,
    category: "admin",
  },
  {
    id: "alert-thresholds",
    label: "Alert Thresholds",
    href: "/settings/alerts",
    description: "Customize alert thresholds, workflows, and auto-remediation rules",
    minRole: "ADMIN",
    configurable: false,
    category: "admin",
  },
  {
    id: "integrations",
    label: "Integrations",
    href: "/settings/integrations",
    description: "Connect Slack, Microsoft Teams, and other tools",
    minRole: "ADMIN",
    configurable: false,
    category: "admin",
  },
  // Insights
  {
    id: "cost-optimization",
    label: "Cost Optimization",
    href: "/cost-optimization",
    description: "IT financial analytics, budget forecasting, and ROI tracking",
    minRole: "ADMIN",
    configurable: true,
    category: "insights",
  },
  {
    id: "sustainability",
    label: "Sustainability",
    href: "/sustainability",
    description: "Green IT metrics, carbon tracking, and sustainability scoring",
    minRole: "ADMIN",
    configurable: true,
    category: "insights",
  },
  {
    id: "patch-notes",
    label: "Patch Notes",
    href: "/patch-notes",
    description: "View and manage platform patch notes and release updates",
    minRole: "EMPLOYEE",
    configurable: false,
    category: "insights",
  },
];

const ROLE_LEVEL: Record<Role, number> = {
  EMPLOYEE: 1,
  MANAGER: 2,
  ADMIN: 3,
  SUPER_ADMIN: 4,
};

/**
 * Get visible modules for a given role, considering org-level overrides.
 * @param role - User's role
 * @param orgOverrides - Org-level module visibility overrides from settings
 */
export function getVisibleModules(
  role: Role,
  orgOverrides?: Record<string, { enabled: boolean; minRole?: Role }>
): ModuleConfig[] {
  const roleLevel = ROLE_LEVEL[role] || 1;

  return MODULE_REGISTRY.filter((mod) => {
    // Check org-level override first
    const override = orgOverrides?.[mod.id];
    if (override) {
      if (!override.enabled) return false;
      const overrideLevel = ROLE_LEVEL[override.minRole || mod.minRole] || 1;
      return roleLevel >= overrideLevel;
    }

    // Default: check minRole
    const requiredLevel = ROLE_LEVEL[mod.minRole] || 1;
    return roleLevel >= requiredLevel;
  });
}

/**
 * Check if a specific module is accessible for a role.
 */
export function canAccessModule(
  moduleId: string,
  role: Role,
  orgOverrides?: Record<string, { enabled: boolean; minRole?: Role }>
): boolean {
  const mod = MODULE_REGISTRY.find((m) => m.id === moduleId);
  if (!mod) return false;

  const roleLevel = ROLE_LEVEL[role] || 1;
  const override = orgOverrides?.[mod.id];

  if (override) {
    if (!override.enabled) return false;
    const overrideLevel = ROLE_LEVEL[override.minRole || mod.minRole] || 1;
    return roleLevel >= overrideLevel;
  }

  const requiredLevel = ROLE_LEVEL[mod.minRole] || 1;
  return roleLevel >= requiredLevel;
}
