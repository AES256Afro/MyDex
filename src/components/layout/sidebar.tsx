"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
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
  Monitor,
  Building2,
  Server,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Employees", href: "/employees", icon: Users },
  { label: "Departments", href: "/departments", icon: Building2 },
  { label: "Time Tracking", href: "/time-tracking", icon: Clock },
  { label: "Attendance", href: "/attendance", icon: CalendarCheck },
  { label: "Activity", href: "/activity", icon: Activity },
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "Devices", href: "/devices", icon: Monitor },
  { label: "Host Groups", href: "/host-groups", icon: Server },
  { label: "Security", href: "/security", icon: Shield },
  { label: "Reports", href: "/reports", icon: BarChart3 },
  { label: "Productivity", href: "/productivity", icon: Brain },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 border-r bg-sidebar">
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/dashboard" className="text-xl font-bold text-primary">
          MyDex
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
