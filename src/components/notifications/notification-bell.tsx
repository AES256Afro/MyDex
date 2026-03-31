"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Bell,
  Shield,
  Monitor,
  Clock,
  LifeBuoy,
  CalendarCheck,
  Users,
  CheckCheck,
} from "lucide-react";
import { useRealtimeStore } from "@/stores/realtime-store";
import type { RealtimeNotification } from "@/stores/realtime-store";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

const TYPE_ICONS: Record<string, typeof Bell> = {
  SECURITY_ALERT: Shield,
  DEVICE_OFFLINE: Monitor,
  CLOCK_REMINDER: Clock,
  TICKET_UPDATE: LifeBuoy,
  SYSTEM: Bell,
  LEAVE_REQUEST: CalendarCheck,
  ONBOARDING: Users,
};

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffSec = Math.floor((now - then) / 1000);

  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

/** Convert a realtime SSE notification into the local Notification shape */
function toLocalNotification(n: RealtimeNotification): Notification {
  return {
    id: n.id,
    type: n.type ?? "SYSTEM",
    title: n.title,
    message: n.message,
    link: n.link ?? null,
    read: false,
    createdAt: new Date().toISOString(),
  };
}

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasNewPulse, setHasNewPulse] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const prevRealtimeCountRef = useRef(0);

  // Subscribe to realtime notifications from SSE
  const realtimeNotifications = useRealtimeStore(
    (s) => s.pendingNotifications
  );

  // When SSE pushes new notifications, prepend them to the list
  useEffect(() => {
    const currentCount = realtimeNotifications.length;
    if (currentCount > prevRealtimeCountRef.current) {
      // New notifications arrived via SSE
      const newCount = currentCount - prevRealtimeCountRef.current;
      const newOnes = realtimeNotifications
        .slice(0, newCount)
        .map(toLocalNotification);

      setNotifications((prev) => {
        // Deduplicate by id
        const existingIds = new Set(prev.map((n) => n.id));
        const unique = newOnes.filter((n) => !existingIds.has(n.id));
        return [...unique, ...prev];
      });
      setUnreadCount((c) => c + newCount);

      // Trigger pulse animation
      setHasNewPulse(true);
      const timeout = setTimeout(() => setHasNewPulse(false), 2000);
      return () => clearTimeout(timeout);
    }
    prevRealtimeCountRef.current = currentCount;
  }, [realtimeNotifications]);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      // silently fail
    }
  }, []);

  // Fetch on mount + poll every 60s (reduced from 30s since SSE handles real-time)
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function markAllRead() {
    await fetch("/api/v1/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }

  async function handleClick(notification: Notification) {
    if (!notification.read) {
      await fetch("/api/v1/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [notification.id] }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    if (notification.link) {
      setOpen(false);
      router.push(notification.link);
    }
  }

  return (
    <div ref={ref} className="relative">
      <Button
        variant="ghost"
        size="icon"
        className={`relative ${hasNewPulse ? "animate-bounce" : ""}`}
        onClick={() => setOpen(!open)}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 rounded-md border bg-popover shadow-lg z-50">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-4 py-2">
            <span className="text-sm font-semibold text-foreground">
              Notifications
            </span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                <Bell className="h-8 w-8 mb-2 opacity-40" />
                <span className="text-sm">No notifications yet</span>
              </div>
            ) : (
              notifications.map((n) => {
                const Icon = TYPE_ICONS[n.type] || Bell;
                return (
                  <button
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent ${
                      !n.read ? "bg-accent/40" : ""
                    }`}
                  >
                    <div className="mt-0.5 flex-shrink-0">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-sm truncate ${
                            !n.read
                              ? "font-semibold text-foreground"
                              : "font-medium text-foreground/80"
                          }`}
                        >
                          {n.title}
                        </span>
                        {!n.read && (
                          <span className="h-2 w-2 flex-shrink-0 rounded-full bg-blue-500" />
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                        {n.message}
                      </p>
                      <span className="mt-1 text-[11px] text-muted-foreground/70">
                        {relativeTime(n.createdAt)}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
