"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Bell,
  Menu,
  X,
  LayoutDashboard,
  Users,
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
} from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Employees", href: "/employees", icon: Users },
  { label: "Time Tracking", href: "/time-tracking", icon: Clock },
  { label: "Attendance", href: "/attendance", icon: CalendarCheck },
  { label: "Activity", href: "/activity", icon: Activity },
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "Devices", href: "/devices", icon: Monitor },
  { label: "Security", href: "/security", icon: Shield },
  { label: "Reports", href: "/reports", icon: BarChart3 },
  { label: "Productivity", href: "/productivity", icon: Brain },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function Topbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

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
            <div className="absolute right-0 mt-2 w-48 rounded-md border bg-popover p-1 shadow-lg">
              <div className="px-3 py-2 text-sm text-muted-foreground">
                {session?.user?.email}
              </div>
              <hr className="my-1" />
              <Link
                href="/settings"
                className="flex items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-accent"
                onClick={() => setUserMenuOpen(false)}
              >
                <Settings className="h-4 w-4" />
                Settings
              </Link>
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

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-72 bg-sidebar border-r overflow-y-auto">
            <div className="flex h-16 items-center justify-between border-b px-6">
              <span className="text-xl font-bold text-primary">MyDex</span>
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
              {navItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-3 text-base font-medium transition-colors touch-manipulation",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent/50 active:bg-sidebar-accent/70"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
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
