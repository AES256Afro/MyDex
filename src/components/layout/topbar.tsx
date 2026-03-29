"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { useBranding } from "@/components/branding-provider";
import { getVisibleModules } from "@/lib/module-access";
import type { Role } from "@/generated/prisma";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Bell,
  Menu,
  X,
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
  LogOut,
  Monitor,
  Building2,
  Server,
  ShieldCheck,
  KeyRound,
  User,
  Blocks,
  Download,
  Package,
  Wrench,
  LifeBuoy,
  Palette,
  Smartphone,
  HeartPulse,
  Sun,
  Moon,
  Megaphone,
  TrendingUp,
  Leaf,
  type LucideIcon,
} from "lucide-react";

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
  "fleet-health": HeartPulse,
  devices: Monitor,
  "host-groups": Server,
  security: Shield,
  settings: Settings,
  "mfa-security": ShieldCheck,
  "sso-providers": KeyRound,
  "module-access": Blocks,
  "software-inventory": Package,
  "compliance": ShieldCheck,
  "support": LifeBuoy,
  "it-support": Wrench,
  "agent-setup": Download,
  "mdm-providers": Smartphone,
  branding: Palette,
  "alert-thresholds": Bell,
  "cost-optimization": TrendingUp,
  sustainability: Leaf,
  "patch-notes": Megaphone,
};

export function Topbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const branding = useBranding();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  const role = (session?.user?.role as Role) || "EMPLOYEE";
  const visibleModules = getVisibleModules(role);

  const initials = session?.user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) ?? "?";

  return (
    <>
      <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="flex-1" />

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>

        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
        </Button>

        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2"
          >
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <span className="hidden text-sm font-medium lg:inline-block">
              {session?.user?.name}
            </span>
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 rounded-md border bg-popover p-1 shadow-lg z-50">
              <div className="px-3 py-2 text-sm text-muted-foreground">
                {session?.user?.email}
              </div>
              <div className="px-3 py-1">
                <span className={cn(
                  "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                  role === "ADMIN" || role === "SUPER_ADMIN"
                    ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                    : role === "MANAGER"
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                    : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                )}>
                  {role.replace("_", " ")}
                </span>
              </div>
              <hr className="my-1" />
              <Link
                href="/account"
                className="flex items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-accent"
                onClick={() => setUserMenuOpen(false)}
              >
                <User className="h-4 w-4" />
                My Account
              </Link>
              <Link
                href="/settings/security"
                className="flex items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-accent"
                onClick={() => setUserMenuOpen(false)}
              >
                <ShieldCheck className="h-4 w-4" />
                MFA & Security
              </Link>
              {(role === "ADMIN" || role === "SUPER_ADMIN") && (
                <Link
                  href="/settings"
                  className="flex items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-accent"
                  onClick={() => setUserMenuOpen(false)}
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
              )}
              <hr className="my-1" />
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm text-destructive hover:bg-accent"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Mobile sidebar overlay — role-filtered */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-72 bg-sidebar border-r overflow-y-auto">
            {branding.bannerUrl && (
              <div className="border-b overflow-hidden">
                <img src={branding.bannerUrl} alt={branding.companyName} className="w-full h-auto object-cover max-h-24" />
              </div>
            )}
            <div className="flex h-16 items-center justify-between border-b px-4">
              <span className="flex items-center gap-2.5 min-w-0 overflow-hidden">
                {branding.logoUrl && <img src={branding.logoUrl} alt="" className="h-8 w-8 object-contain flex-shrink-0" />}
                {branding.brandingMode === "alongside" ? (
                  <span className="flex items-baseline gap-1.5 truncate">
                    <span className="text-xl font-bold text-primary">MyDex</span>
                    {branding.companyName && branding.companyName !== "MyDex" && (
                      <span className="text-sm font-medium text-muted-foreground truncate">| {branding.companyName}</span>
                    )}
                  </span>
                ) : (
                  <span className="text-xl font-bold text-primary truncate">{branding.companyName}</span>
                )}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10"
                onClick={() => setMobileOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <nav className="px-3 py-4 space-y-1">
              {visibleModules.map((mod) => {
                const Icon = MODULE_ICONS[mod.id] || LayoutDashboard;
                const isActive =
                  pathname === mod.href ||
                  pathname.startsWith(mod.href + "/");
                return (
                  <Link
                    key={mod.href}
                    href={mod.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-3 text-base font-medium transition-colors touch-manipulation",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent/50 active:bg-sidebar-accent/70"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {mod.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
