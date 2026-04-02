import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { subDays, startOfDay } from "date-fns";
import { LocalTime } from "@/components/local-time";

function gradeColor(grade: string | null): string {
  if (!grade) return "text-muted-foreground";
  if (grade.startsWith("A")) return "text-green-600 dark:text-green-400";
  if (grade === "B") return "text-blue-600 dark:text-blue-400";
  if (grade === "C") return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

function dexScoreColor(score: number): string {
  if (score >= 80) return "text-green-600 dark:text-green-400";
  if (score >= 60) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

function dexScoreBg(score: number): string {
  if (score >= 80) return "bg-green-500";
  if (score >= 60) return "bg-yellow-500";
  return "bg-red-500";
}

/** Compute a DEX score (0–100) for a device based on multiple signals */
function computeDeviceDex(device: {
  status: string;
  securityGrade: string | null;
  performanceScore: number | null;
  rebootPending: boolean;
  bsodCount: number;
  antivirusName: string | null;
  defenderStatus: string | null;
  updateServiceStatus: string | null;
  pendingUpdates: unknown;
  uptimeSeconds: number | null;
}): number {
  let score = 100;

  // Online status
  if (device.status === "OFFLINE") score -= 25;
  else if (device.status === "STALE") score -= 15;

  // Security grade
  const g = device.securityGrade;
  if (g === "F") score -= 30;
  else if (g === "D") score -= 20;
  else if (g === "C") score -= 10;
  else if (g === "B") score -= 5;

  // Performance
  if (device.performanceScore !== null) {
    if (device.performanceScore < 50) score -= 15;
    else if (device.performanceScore < 70) score -= 5;
  }

  // Reboot pending
  if (device.rebootPending) score -= 5;

  // BSODs
  if (device.bsodCount > 5) score -= 15;
  else if (device.bsodCount > 0) score -= 5;

  // AV / Defender
  if (!device.antivirusName && device.defenderStatus !== "enabled") score -= 10;

  // Updates
  if (device.updateServiceStatus === "disabled") score -= 10;
  else if (device.updateServiceStatus === "stopped") score -= 5;

  const pending = device.pendingUpdates;
  if (Array.isArray(pending) && pending.length > 5) score -= 10;
  else if (Array.isArray(pending) && pending.length > 0) score -= 3;

  // Uptime (>30 days without reboot is bad)
  if (device.uptimeSeconds && device.uptimeSeconds > 30 * 86400) score -= 5;

  return Math.max(0, Math.min(100, score));
}

export default async function FleetHealthPage() {
  const session = await auth();
  if (!session) redirect("/login");

  if (!hasPermission(session.user.role, "security:read")) {
    redirect("/dashboard");
  }

  const orgId = session.user.organizationId;
  const thirtyDaysAgo = startOfDay(subDays(new Date(), 30));

  const [devices, recentAlerts] = await Promise.all([
    prisma.agentDevice.findMany({
      where: { organizationId: orgId },
      include: {
        user: { select: { id: true, name: true, department: true } },
      },
      orderBy: { lastSeenAt: "desc" },
    }),
    prisma.securityAlert.count({
      where: { organizationId: orgId, createdAt: { gte: thirtyDaysAgo }, status: "OPEN" },
    }),
  ]);

  // Compute DEX scores
  const devicesWithDex = devices.map((d) => ({
    ...d,
    dexScore: computeDeviceDex(d),
  }));

  // Aggregates
  const totalDevices = devices.length;
  const onlineCount = devices.filter((d) => d.status === "ONLINE").length;
  const staleCount = devices.filter((d) => d.status === "STALE").length;
  const offlineCount = devices.filter((d) => d.status === "OFFLINE").length;

  // OS breakdown
  const platformCounts: Record<string, number> = {};
  const osCounts: Record<string, number> = {};
  for (const d of devices) {
    const platform = d.platform || "Unknown";
    platformCounts[platform] = (platformCounts[platform] || 0) + 1;
    const os = d.osVersion || "Unknown";
    osCounts[os] = (osCounts[os] || 0) + 1;
  }

  // Update compliance
  const updateServiceRunning = devices.filter((d) => d.updateServiceStatus === "running").length;
  const rebootNeeded = devices.filter((d) => d.rebootPending).length;
  const pendingUpdateDevices = devices.filter(
    (d) => Array.isArray(d.pendingUpdates) && (d.pendingUpdates as unknown[]).length > 0
  ).length;

  // Security posture
  const avProtected = devices.filter((d) => d.antivirusName || d.defenderStatus === "enabled").length;
  const bsodDevices = devices.filter((d) => d.bsodCount > 0).length;

  // DEX score org average
  const avgDex = totalDevices > 0
    ? Math.round(devicesWithDex.reduce((sum, d) => sum + d.dexScore, 0) / totalDevices)
    : 0;

  // Sort OS versions by count for the compliance table
  const osVersionsSorted = Object.entries(osCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 15);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Fleet Health & Diagnostics</h1>
        <p className="text-muted-foreground">
          Real-time visibility across {totalDevices} device{totalDevices !== 1 ? "s" : ""} — OS compliance, agent status, and DEX scores
        </p>
      </div>

      {/* Top KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Organization DEX Score</CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${dexScoreColor(avgDex)}`}>{avgDex}</div>
            <p className="text-xs text-muted-foreground mt-1">Digital Employee Experience</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Agent Status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">{onlineCount}/{totalDevices}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {staleCount > 0 && <span className="text-yellow-600 dark:text-yellow-400">{staleCount} stale</span>}
              {staleCount > 0 && offlineCount > 0 && " · "}
              {offlineCount > 0 && <span className="text-red-600 dark:text-red-400">{offlineCount} offline</span>}
              {staleCount === 0 && offlineCount === 0 && "All agents reporting"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Update Compliance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {totalDevices > 0 ? Math.round((updateServiceRunning / totalDevices) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {pendingUpdateDevices} device{pendingUpdateDevices !== 1 ? "s" : ""} with pending updates
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Security Posture</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {totalDevices > 0 ? Math.round((avProtected / totalDevices) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {avProtected} device{avProtected !== 1 ? "s" : ""} protected
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Open Alerts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${recentAlerts > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
              {recentAlerts}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Platform Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Platform Distribution</CardTitle>
            <CardDescription>Devices by operating system</CardDescription>
          </CardHeader>
          <CardContent>
            {Object.entries(platformCounts).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No devices registered.</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(platformCounts).sort(([, a], [, b]) => b - a).map(([platform, count]) => {
                  const pct = totalDevices > 0 ? Math.round((count / totalDevices) * 100) : 0;
                  const isWin = platform.toLowerCase().includes("win");
                  const isMac = platform.toLowerCase().includes("mac") || platform.toLowerCase().includes("darwin");
                  const color = isWin ? "bg-blue-500" : isMac ? "bg-gray-600 dark:bg-gray-500" : "bg-green-500";
                  return (
                    <div key={platform} className="flex items-center gap-3">
                      <span className="text-sm w-28 truncate font-medium">
                        {isWin ? "Windows" : isMac ? "macOS" : platform}
                      </span>
                      <div className="flex-1 bg-muted rounded-full h-3">
                        <div className={`h-3 rounded-full ${color}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-sm font-medium w-16 text-right">{count} ({pct}%)</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* OS Version Compliance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">OS Version Distribution</CardTitle>
            <CardDescription>Cross-check versioning across your fleet</CardDescription>
          </CardHeader>
          <CardContent>
            {osVersionsSorted.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No OS data available.</p>
            ) : (
              <div className="space-y-2 max-h-[280px] overflow-y-auto">
                {osVersionsSorted.map(([version, count]) => (
                  <div key={version} className="flex items-center justify-between py-1.5 border-b last:border-0">
                    <span className="text-sm truncate flex-1">{version}</span>
                    <Badge variant="outline">{count} device{count !== 1 ? "s" : ""}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Health Issues */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Proactive Health Alerts</CardTitle>
            <CardDescription>Issues requiring attention before they escalate</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {rebootNeeded > 0 && (
                <div className="flex items-center gap-3 p-3 rounded-lg border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-800">
                  <div className="h-2 w-2 rounded-full bg-yellow-500 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="text-sm font-medium">Reboot Pending</div>
                    <div className="text-xs text-muted-foreground">{rebootNeeded} device{rebootNeeded !== 1 ? "s" : ""} need a restart to complete updates</div>
                  </div>
                </div>
              )}
              {bsodDevices > 0 && (
                <div className="flex items-center gap-3 p-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800">
                  <div className="h-2 w-2 rounded-full bg-red-500 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="text-sm font-medium">BSOD History</div>
                    <div className="text-xs text-muted-foreground">{bsodDevices} device{bsodDevices !== 1 ? "s" : ""} have experienced blue screen crashes</div>
                  </div>
                </div>
              )}
              {offlineCount > 0 && (
                <div className="flex items-center gap-3 p-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800">
                  <div className="h-2 w-2 rounded-full bg-red-500 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="text-sm font-medium">Agents Offline</div>
                    <div className="text-xs text-muted-foreground">{offlineCount} device{offlineCount !== 1 ? "s" : ""} not reporting — possible blind spots</div>
                  </div>
                </div>
              )}
              {staleCount > 0 && (
                <div className="flex items-center gap-3 p-3 rounded-lg border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-800">
                  <div className="h-2 w-2 rounded-full bg-yellow-500 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="text-sm font-medium">Stale Agents</div>
                    <div className="text-xs text-muted-foreground">{staleCount} device{staleCount !== 1 ? "s" : ""} haven&apos;t checked in recently</div>
                  </div>
                </div>
              )}
              {(totalDevices - avProtected) > 0 && (
                <div className="flex items-center gap-3 p-3 rounded-lg border border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-800">
                  <div className="h-2 w-2 rounded-full bg-orange-500 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="text-sm font-medium">Unprotected Devices</div>
                    <div className="text-xs text-muted-foreground">{totalDevices - avProtected} device{(totalDevices - avProtected) !== 1 ? "s" : ""} without antivirus or Defender</div>
                  </div>
                </div>
              )}
              {rebootNeeded === 0 && bsodDevices === 0 && offlineCount === 0 && staleCount === 0 && avProtected === totalDevices && (
                <div className="text-center py-4">
                  <p className="text-sm text-green-600 dark:text-green-400 font-medium">All clear — no proactive issues detected</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Update Compliance Detail */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Update Service Status</CardTitle>
            <CardDescription>Windows Update agent status across fleet</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { label: "Running", count: devices.filter((d) => d.updateServiceStatus === "running").length, color: "bg-green-500" },
                { label: "Stopped", count: devices.filter((d) => d.updateServiceStatus === "stopped").length, color: "bg-yellow-500" },
                { label: "Disabled", count: devices.filter((d) => d.updateServiceStatus === "disabled").length, color: "bg-red-500" },
                { label: "Unknown", count: devices.filter((d) => !d.updateServiceStatus).length, color: "bg-gray-300 dark:bg-gray-600" },
              ].map((item) => {
                const pct = totalDevices > 0 ? Math.round((item.count / totalDevices) * 100) : 0;
                return (
                  <div key={item.label} className="flex items-center gap-3">
                    <span className="text-sm w-20">{item.label}</span>
                    <div className="flex-1 bg-muted rounded-full h-2">
                      <div className={`h-2 rounded-full ${item.color}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-sm w-16 text-right">{item.count}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Device DEX Score Table */}
      <Card>
        <CardHeader>
          <CardTitle>Device DEX Scores</CardTitle>
          <CardDescription>
            Digital Employee Experience score per device — combining security, performance, compliance, and availability
          </CardDescription>
        </CardHeader>
        <CardContent>
          {devicesWithDex.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No devices registered. Deploy the MyDex agent to start monitoring fleet health.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">Device</th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">User</th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">Platform</th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">OS Version</th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground text-center">DEX Score</th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground text-center">Security</th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground text-center">Status</th>
                    <th className="pb-3 font-medium text-muted-foreground">Last Seen</th>
                  </tr>
                </thead>
                <tbody>
                  {devicesWithDex
                    .sort((a, b) => a.dexScore - b.dexScore)
                    .map((device) => (
                      <tr key={device.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                        <td className="py-3 pr-4">
                          <Link href={`/devices`} className="font-medium text-primary hover:underline">
                            {device.hostname}
                          </Link>
                        </td>
                        <td className="py-3 pr-4">
                          <Link href={`/employees/${device.user.id}`} className="text-muted-foreground hover:text-foreground hover:underline">
                            {device.user.name}
                          </Link>
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground">{device.platform}</td>
                        <td className="py-3 pr-4 text-muted-foreground text-xs">{device.osVersion || "—"}</td>
                        <td className="py-3 pr-4 text-center">
                          <div className="inline-flex items-center gap-2">
                            <div className="w-12 bg-muted rounded-full h-2">
                              <div className={`h-2 rounded-full ${dexScoreBg(device.dexScore)}`} style={{ width: `${device.dexScore}%` }} />
                            </div>
                            <span className={`font-bold text-sm ${dexScoreColor(device.dexScore)}`}>{device.dexScore}</span>
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-center">
                          <span className={`font-bold ${gradeColor(device.securityGrade)}`}>
                            {device.securityGrade || "—"}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-center">
                          <Badge variant={device.status === "ONLINE" ? "success" : device.status === "STALE" ? "warning" : "destructive"}>
                            {device.status}
                          </Badge>
                        </td>
                        <td className="py-3 text-muted-foreground text-xs">
                          <LocalTime date={new Date(device.lastSeenAt).toISOString()} fmt="MMM d, h:mm a" />
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
