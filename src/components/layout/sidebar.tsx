"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { getVisibleModules } from "@/lib/module-access";
import type { Role } from "@/generated/prisma";
import {
  LayoutDashboard,
  Users,
  UserCog,
  Clock,
  CalendarCheck,
  Activity,
  FolderKanban,
  Shield,
  BarChart3,
  Brain,
  Settings,
  Monitor,
  Building2,
  Server,
  ShieldCheck,
  KeyRound,
  User,
  Blocks,
  type LucideIcon,
} from "lucide-react";

// Map module IDs to icons
const MODULE_ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  "time-tracking": Clock,
  attendance: CalendarCheck,
  projects: FolderKanban,
  "my-account": User,
  activity: Activity,
  productivity: Brain,
  employees: Users,
  "user-management": UserCog,
  departments: Building2,
  reports: BarChart3,
  devices: Monitor,
  "host-groups": Server,
  security: Shield,
  settings: Settings,
  "mfa-security": ShieldCheck,
  "sso-providers": KeyRound,
  "module-access": Blocks,
};

// Category labels and order
const CATEGORY_ORDER = ["core", "monitoring", "management", "security", "admin"];
const CATEGORY_LABELS: Record<string, string> = {
  core: "",
  monitoring: "Monitoring",
  management: "Management",
  security: "Security",
  admin: "Administration",
};

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const role = (session?.user?.role as Role) || "EMPLOYEE";
  const visibleModules = getVisibleModules(role);

  // Group modules by category
  const grouped = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    label: CATEGORY_LABELS[cat],
    items: visibleModules.filter((m) => m.category === cat),
  })).filter((g) => g.items.length > 0);

  return (
    <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 border-r bg-sidebar">
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/dashboard" className="text-xl font-bold text-primary">
          MyDex
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {grouped.map((group) => (
          <div key={group.category}>
            {group.label && (
              <div className="px-3 pt-4 pb-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {group.label}
              </div>
            )}
            {group.items.map((mod) => {
              const Icon = MODULE_ICONS[mod.id] || LayoutDashboard;
              const isActive =
                pathname === mod.href || pathname.startsWith(mod.href + "/");
              return (
                <Link
                  key={mod.href}
                  href={mod.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {mod.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Role badge at bottom */}
      <div className="border-t px-4 py-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div
            className={cn(
              "h-2 w-2 rounded-full",
              role === "SUPER_ADMIN" || role === "ADMIN"
                ? "bg-red-500"
                : role === "MANAGER"
                ? "bg-amber-500"
                : "bg-green-500"
            )}
          />
          <span className="capitalize">{role.replace("_", " ").toLowerCase()}</span>
        </div>
      </div>
    </aside>
  );
}
