"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const HEARTBEAT_INTERVAL = 60_000; // 60 seconds
const VISIT_POLL_INTERVAL = 30_000; // 30 seconds
const BROADCAST_CHANNEL_NAME = "mydex-tracker";

interface SiteVisit {
  domain: string;
  url: string;
  title: string;
  firstSeen: Date;
  lastSeen: Date;
  durationSeconds: number;
  eventCount: number;
}

interface BroadcastMessage {
  type: "TAB_REPORT";
  url: string;
  domain: string;
  title: string;
  timestamp: string;
}

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [
    h.toString().padStart(2, "0"),
    m.toString().padStart(2, "0"),
    s.toString().padStart(2, "0"),
  ].join(":");
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return `${m}m ${s}s`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return `${h}h ${rm}m`;
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export default function TrackerPage() {
  const { data: session, status } = useSession();

  const [consented, setConsented] = useState(false);
  const [tracking, setTracking] = useState(false);
  const [sessionStart, setSessionStart] = useState<Date | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [lastHeartbeat, setLastHeartbeat] = useState<Date | null>(null);
  const [siteVisits, setSiteVisits] = useState<SiteVisit[]>([]);

  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const visitPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const broadcastRef = useRef<BroadcastChannel | null>(null);

  // Record a site visit into the visits table, merging with existing entry if same URL
  const recordVisit = useCallback(
    (url: string, domain: string, title: string) => {
      setSiteVisits((prev) => {
        const existing = prev.find((v) => v.url === url);
        const now = new Date();
        if (existing) {
          return prev.map((v) =>
            v.url === url
              ? {
                  ...v,
                  lastSeen: now,
                  durationSeconds:
                    v.durationSeconds +
                    Math.round(
                      (now.getTime() - v.lastSeen.getTime()) / 1000
                    ),
                  eventCount: v.eventCount + 1,
                  title: title || v.title, // update title if available
                }
              : v
          );
        }
        return [
          {
            domain,
            url,
            title: title || domain,
            firstSeen: now,
            lastSeen: now,
            durationSeconds: 0,
            eventCount: 1,
          },
          ...prev,
        ];
      });
    },
    []
  );

  // Send a WEBSITE_VISIT event to the API
  const sendVisitEvent = useCallback(
    async (url: string, domain: string, windowTitle: string) => {
      try {
        await fetch("/api/v1/activity/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            events: [
              {
                eventType: "WEBSITE_VISIT",
                timestamp: new Date().toISOString(),
                url,
                domain,
                windowTitle,
              },
            ],
          }),
        });
      } catch {
        // Silently fail -- heartbeat will confirm connectivity
      }
    },
    []
  );

  // Send a HEARTBEAT event
  const sendHeartbeat = useCallback(async () => {
    try {
      await fetch("/api/v1/activity/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          events: [
            {
              eventType: "HEARTBEAT",
              timestamp: new Date().toISOString(),
            },
          ],
        }),
      });
      setLastHeartbeat(new Date());
    } catch {
      // Will retry on next interval
    }
  }, []);

  // Capture the current page and send a visit event
  const captureCurrentPage = useCallback(() => {
    if (document.hidden) return; // Only track when tab is visible

    const url = window.location.href;
    const domain = extractDomain(url);
    const title = document.title;

    recordVisit(url, domain, title);
    sendVisitEvent(url, domain, title);
  }, [recordVisit, sendVisitEvent]);

  // Handle incoming BroadcastChannel messages from other tabs
  const handleBroadcastMessage = useCallback(
    (event: MessageEvent<BroadcastMessage>) => {
      const { type, url, domain, title } = event.data;
      if (type === "TAB_REPORT") {
        recordVisit(url, domain, title);
        sendVisitEvent(url, domain, title);
      }
    },
    [recordVisit, sendVisitEvent]
  );

  // Session timer
  useEffect(() => {
    if (tracking && sessionStart) {
      timerRef.current = setInterval(() => {
        setElapsed(
          Math.floor((Date.now() - sessionStart.getTime()) / 1000)
        );
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [tracking, sessionStart]);

  // Heartbeat every 60 seconds
  useEffect(() => {
    if (tracking) {
      sendHeartbeat();
      heartbeatRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
    }
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, [tracking, sendHeartbeat]);

  // Website visit polling every 30 seconds + visibility change
  useEffect(() => {
    if (!tracking) return;

    // Capture immediately on start
    captureCurrentPage();

    // Poll every 30 seconds
    visitPollRef.current = setInterval(captureCurrentPage, VISIT_POLL_INTERVAL);

    // Also capture when tab becomes visible again
    function handleVisibilityChange() {
      if (!document.hidden) {
        captureCurrentPage();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      if (visitPollRef.current) clearInterval(visitPollRef.current);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [tracking, captureCurrentPage]);

  // BroadcastChannel for cross-tab communication
  useEffect(() => {
    if (!tracking) return;

    try {
      const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      broadcastRef.current = channel;

      // Listen for reports from other tabs
      channel.onmessage = handleBroadcastMessage;

      // Request other tabs to report
      channel.postMessage({ type: "REQUEST_REPORT" });

      return () => {
        channel.close();
        broadcastRef.current = null;
      };
    } catch {
      // BroadcastChannel not supported -- gracefully degrade
      return;
    }
  }, [tracking, handleBroadcastMessage]);

  // BroadcastChannel listener for non-tracker tabs (runs always when authenticated)
  useEffect(() => {
    if (!session) return;

    // If this tab is the tracker and is tracking, it handles messages above
    // This effect lets any page with MyDex loaded respond to report requests
    let responderChannel: BroadcastChannel | null = null;
    try {
      responderChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      responderChannel.onmessage = (event) => {
        if (event.data?.type === "REQUEST_REPORT") {
          const msg: BroadcastMessage = {
            type: "TAB_REPORT",
            url: window.location.href,
            domain: extractDomain(window.location.href),
            title: document.title,
            timestamp: new Date().toISOString(),
          };
          responderChannel?.postMessage(msg);
        }
      };
    } catch {
      // BroadcastChannel not supported
    }

    return () => {
      responderChannel?.close();
    };
  }, [session]);

  function startTracking() {
    setTracking(true);
    setSessionStart(new Date());
    setElapsed(0);
    setSiteVisits([]);
  }

  function stopTracking() {
    setTracking(false);
    setSessionStart(null);
  }

  // Sort visits: most recently seen first
  const sortedVisits = [...siteVisits].sort(
    (a, b) => b.lastSeen.getTime() - a.lastSeen.getTime()
  );

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Please sign in to use the activity tracker.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">
            Activity Tracker
          </h1>
          <p className="text-muted-foreground text-sm">
            Keep this page open to track your browsing activity
          </p>
        </div>

        {/* Status Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              {/* Pulse Indicator */}
              <div className="relative">
                <div
                  className={`w-20 h-20 rounded-full flex items-center justify-center ${
                    tracking ? "bg-green-100" : "bg-muted"
                  }`}
                >
                  {tracking && (
                    <div className="absolute inset-0 rounded-full bg-green-400 opacity-25 animate-ping" />
                  )}
                  <div
                    className={`w-12 h-12 rounded-full ${
                      tracking ? "bg-green-500" : "bg-muted-foreground/30"
                    }`}
                  />
                </div>
              </div>

              <Badge
                variant={tracking ? "success" : "secondary"}
                className="text-sm px-4 py-1"
              >
                {tracking ? "Tracking Active" : "Tracking Inactive"}
              </Badge>

              {/* Session Timer */}
              <div className="text-center">
                <div className="text-4xl font-mono font-bold tabular-nums">
                  {formatElapsed(elapsed)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Session Duration
                </p>
              </div>

              {lastHeartbeat && (
                <p className="text-xs text-muted-foreground">
                  Last heartbeat: {lastHeartbeat.toLocaleTimeString()}
                </p>
              )}

              {tracking && siteVisits.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {siteVisits.length} site{siteVisits.length !== 1 ? "s" : ""}{" "}
                  tracked this session
                </p>
              )}

              {/* Controls */}
              <div className="flex gap-3">
                {!tracking ? (
                  <Button
                    onClick={startTracking}
                    disabled={!consented}
                    size="lg"
                  >
                    Start Tracking
                  </Button>
                ) : (
                  <Button
                    variant="destructive"
                    onClick={stopTracking}
                    size="lg"
                  >
                    Stop Tracking
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Privacy & Consent */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Privacy Notice</CardTitle>
            <CardDescription>
              Please review what is tracked before enabling
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
              <li>
                <span className="font-medium text-foreground">
                  Website visits
                </span>{" "}
                -- the URL, domain, and page title of sites you visit are
                recorded every 30 seconds while the tracker tab is open
              </li>
              <li>
                <span className="font-medium text-foreground">
                  Tab tracking
                </span>{" "}
                -- other MyDex-connected tabs report their active URL back to
                the tracker using cross-tab communication
              </li>
              <li>
                <span className="font-medium text-foreground">Heartbeats</span>{" "}
                -- a signal is sent every 60 seconds to confirm you are online
              </li>
              <li>
                <span className="font-medium text-foreground">
                  Session duration
                </span>{" "}
                -- how long the tracker has been active
              </li>
            </ul>

            <p className="text-xs text-muted-foreground">
              No screenshots, keystrokes, or screen content is captured. Only
              website URLs, page titles, and online presence are recorded. A
              desktop agent (built separately) can provide deeper activity
              tracking across all applications.
            </p>

            <Separator />

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={consented}
                onChange={(e) => setConsented(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              <span className="text-sm">
                I understand and consent to website and tab activity tracking as
                described above
              </span>
            </label>
          </CardContent>
        </Card>

        {/* Sites Visited Table */}
        {sortedVisits.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sites Visited</CardTitle>
              <CardDescription>
                Websites tracked during this session
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-2 pr-4 font-medium text-muted-foreground">
                        Time
                      </th>
                      <th className="pb-2 pr-4 font-medium text-muted-foreground">
                        Domain
                      </th>
                      <th className="pb-2 pr-4 font-medium text-muted-foreground">
                        Page Title
                      </th>
                      <th className="pb-2 font-medium text-muted-foreground text-right">
                        Duration
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedVisits.map((visit, i) => (
                      <tr
                        key={visit.url + i}
                        className="border-b border-border/50 last:border-0"
                      >
                        <td className="py-2 pr-4 text-muted-foreground whitespace-nowrap font-mono text-xs">
                          {visit.firstSeen.toLocaleTimeString()}
                        </td>
                        <td className="py-2 pr-4 whitespace-nowrap">
                          <Badge variant="outline" className="font-mono text-xs">
                            {visit.domain}
                          </Badge>
                        </td>
                        <td
                          className="py-2 pr-4 max-w-[200px] truncate"
                          title={visit.title}
                        >
                          {visit.title}
                        </td>
                        <td className="py-2 text-right font-mono text-xs whitespace-nowrap">
                          {formatDuration(visit.durationSeconds)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
