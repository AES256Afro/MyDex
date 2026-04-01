"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  Shield,
  Zap,
  Users,
  AlertTriangle,
  Check,
  CheckCheck,
  X,
  Settings,
  Info,
  Megaphone,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type NotificationType =
  | "security"
  | "workflow"
  | "provisioning"
  | "announcement";

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  timestamp: Date;
  read: boolean;
}

// ---------------------------------------------------------------------------
// Constants & helpers
// ---------------------------------------------------------------------------

const TYPE_META: Record<
  NotificationType,
  { icon: typeof Bell; label: string; color: string }
> = {
  security: {
    icon: Shield,
    label: "Security",
    color: "text-red-500 dark:text-red-400",
  },
  workflow: {
    icon: Zap,
    label: "Workflow",
    color: "text-amber-500 dark:text-amber-400",
  },
  provisioning: {
    icon: Users,
    label: "Provisioning",
    color: "text-blue-500 dark:text-blue-400",
  },
  announcement: {
    icon: Megaphone,
    label: "Announcement",
    color: "text-purple-500 dark:text-purple-400",
  },
};

function relativeTime(date: Date): string {
  const now = Date.now();
  const diffSec = Math.floor((now - date.getTime()) / 1000);

  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// ---------------------------------------------------------------------------
// Mock data factory — timestamps are relative to component mount so they
// always look recent.
// ---------------------------------------------------------------------------

function createMockNotifications(): Notification[] {
  const now = Date.now();
  const min = 60_000;
  const hr = 3_600_000;

  return [
    {
      id: "n-001",
      type: "security",
      title: "Failed login attempt blocked",
      description:
        "3 consecutive failed login attempts from 198.51.100.14 for user admin@antifascist.work. The IP has been temporarily blocked.",
      timestamp: new Date(now - 4 * min),
      read: false,
    },
    {
      id: "n-002",
      type: "workflow",
      title: "Onboarding workflow completed",
      description:
        'Workflow "New Hire Setup — Jordan Rivera" finished all 12 steps successfully. All accounts and devices are provisioned.',
      timestamp: new Date(now - 18 * min),
      read: false,
    },
    {
      id: "n-003",
      type: "provisioning",
      title: "SCIM sync: 3 users provisioned",
      description:
        "Azure AD SCIM connector synced 3 new users into the Engineering group. Review provisioned accounts in the directory.",
      timestamp: new Date(now - 42 * min),
      read: false,
    },
    {
      id: "n-004",
      type: "announcement",
      title: "Scheduled maintenance window",
      description:
        "MyDex will undergo scheduled maintenance on Saturday 04:00–06:00 UTC. Expect brief downtime for database migrations.",
      timestamp: new Date(now - 1.5 * hr),
      read: false,
    },
    {
      id: "n-005",
      type: "security",
      title: "MFA enrollment reminder",
      description:
        "2 users in the Operations team have not enrolled in MFA within the required 7-day window. Consider sending a nudge.",
      timestamp: new Date(now - 3 * hr),
      read: true,
    },
    {
      id: "n-006",
      type: "workflow",
      title: "Offboarding workflow stalled",
      description:
        'Step "Revoke VPN access" in the offboarding workflow for Casey Kim is awaiting manual approval from IT Lead.',
      timestamp: new Date(now - 5 * hr),
      read: true,
    },
    {
      id: "n-007",
      type: "provisioning",
      title: "License limit approaching",
      description:
        "Google Workspace licenses: 47 of 50 seats consumed. Consider upgrading your plan or deprovisioning inactive accounts.",
      timestamp: new Date(now - 8 * hr),
      read: true,
    },
    {
      id: "n-008",
      type: "announcement",
      title: "New feature: AI Insights dashboard",
      description:
        "The AI Insights panel is now available on the admin dashboard. Get automated recommendations for security posture and workflow efficiency.",
      timestamp: new Date(now - 22 * hr),
      read: true,
    },
    {
      id: "n-009",
      type: "security",
      title: "Device compliance drift detected",
      description:
        '5 macOS devices dropped below the compliance baseline after skipping the latest OS update. View affected devices in MDM.',
      timestamp: new Date(now - 26 * hr),
      read: true,
    },
    {
      id: "n-010",
      type: "workflow",
      title: "Automated backup verified",
      description:
        "Nightly configuration backup completed and integrity check passed. All tenant settings are recoverable.",
      timestamp: new Date(now - 30 * hr),
      read: true,
    },
  ];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(() =>
    createMockNotifications()
  );
  const containerRef = useRef<HTMLDivElement>(null);

  // Derived state
  const unreadCount = notifications.filter((n) => !n.read).length;

  // Close on outside click
  useEffect(() => {
    function handlePointerDown(e: PointerEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [open]);

  // Actions
  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const markOneRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const dismissOne = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  return (
    <div ref={containerRef} className="relative">
      {/* ----------------------------------------------------------------- */}
      {/* Bell trigger                                                       */}
      {/* ----------------------------------------------------------------- */}
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((o) => !o)}
        className="relative"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </Button>

      {/* ----------------------------------------------------------------- */}
      {/* Dropdown panel                                                     */}
      {/* ----------------------------------------------------------------- */}
      {open && (
        <Card className="absolute right-0 top-full mt-2 w-96 z-50 shadow-lg border overflow-hidden">
          {/* Header */}
          <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 py-3 border-b">
            <CardTitle className="text-sm font-semibold">
              Notifications
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-2 text-[10px] px-1.5 py-0">
                  {unreadCount}
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllRead}
                  className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Mark all read
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setOpen(false)}
              >
                <X className="h-3.5 w-3.5" />
                <span className="sr-only">Close</span>
              </Button>
            </div>
          </CardHeader>

          {/* Notification list */}
          <CardContent className="p-0">
            <div className="max-h-[28rem] overflow-y-auto">
              {notifications.length === 0 ? (
                /* ----- Empty state ----- */
                <div className="flex flex-col items-center justify-center py-14 text-muted-foreground">
                  <Bell className="h-10 w-10 mb-3 opacity-30" />
                  <p className="text-sm font-medium">All caught up</p>
                  <p className="mt-1 text-xs opacity-70">
                    No notifications to show right now.
                  </p>
                </div>
              ) : (
                notifications.map((notification) => {
                  const meta = TYPE_META[notification.type];
                  const Icon = meta.icon;

                  return (
                    <div
                      key={notification.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => markOneRead(notification.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          markOneRead(notification.id);
                        }
                      }}
                      className={`group relative flex items-start gap-3 px-4 py-3 text-left transition-colors cursor-pointer
                        hover:bg-accent/60 focus-visible:outline-none focus-visible:bg-accent/60
                        ${!notification.read ? "bg-accent/30" : ""}`}
                    >
                      {/* Icon */}
                      <div
                        className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-muted ${meta.color}`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-sm leading-tight ${
                              !notification.read
                                ? "font-semibold text-foreground"
                                : "font-medium text-foreground/80"
                            }`}
                          >
                            {notification.title}
                          </span>
                          {!notification.read && (
                            <span className="h-2 w-2 flex-shrink-0 rounded-full bg-blue-500" />
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {notification.description}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="text-[11px] text-muted-foreground/70">
                            {relativeTime(notification.timestamp)}
                          </span>
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0 h-4 font-normal"
                          >
                            {meta.label}
                          </Badge>
                        </div>
                      </div>

                      {/* Dismiss button — visible on hover */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          dismissOne(notification.id);
                        }}
                        className="absolute right-2 top-2 hidden h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground group-hover:flex"
                        aria-label={`Dismiss notification: ${notification.title}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="border-t px-4 py-2.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setOpen(false);
                    // In a real app this would navigate to /notifications
                  }}
                >
                  View all notifications
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
