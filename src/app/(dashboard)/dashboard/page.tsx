import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  Clock,
  CalendarCheck,
  Shield,
  FolderKanban,
  CheckSquare,
  ShieldCheck,
  ShieldX,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { hasMinRole } from "@/lib/permissions";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const orgId = session.user.organizationId;
  const userId = session.user.id;
  const role = session.user.role;
  const isAdmin = hasMinRole(role, "ADMIN");
  const isManager = hasMinRole(role, "MANAGER");
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (isAdmin || isManager) {
    // Admin/Manager dashboard
    const [totalEmployees, activeTimeEntries, presentToday, openAlerts, totalDevices, onlineDevices] =
      await Promise.all([
        prisma.user.count({
          where: { organizationId: orgId, status: "ACTIVE" },
        }),
        prisma.timeEntry.count({
          where: { organizationId: orgId, status: "ACTIVE" },
        }),
        prisma.attendanceRecord.count({
          where: { organizationId: orgId, date: today, status: "PRESENT" },
        }),
        prisma.securityAlert.count({
          where: { organizationId: orgId, status: "OPEN" },
        }),
        prisma.agentDevice.count({
          where: { organizationId: orgId },
        }),
        prisma.agentDevice.count({
          where: { organizationId: orgId, status: "ONLINE" },
        }),
      ]);

    // Compute org-level DEX score from device data
    let orgDexScore = 0;
    if (isAdmin && totalDevices > 0) {
      const devices = await prisma.agentDevice.findMany({
        where: { organizationId: orgId },
        select: {
          status: true, securityGrade: true, performanceScore: true,
          rebootPending: true, bsodCount: true, antivirusName: true,
          defenderStatus: true, updateServiceStatus: true, pendingUpdates: true,
          uptimeSeconds: true,
        },
      });
      let totalScore = 0;
      for (const d of devices) {
        let score = 100;
        if (d.status === "OFFLINE") score -= 25;
        else if (d.status === "STALE") score -= 15;
        const g = d.securityGrade;
        if (g === "F") score -= 30; else if (g === "D") score -= 20; else if (g === "C") score -= 10; else if (g === "B") score -= 5;
        if (d.performanceScore !== null && d.performanceScore < 50) score -= 15;
        else if (d.performanceScore !== null && d.performanceScore < 70) score -= 5;
        if (d.rebootPending) score -= 5;
        if (d.bsodCount > 5) score -= 15; else if (d.bsodCount > 0) score -= 5;
        if (!d.antivirusName && d.defenderStatus !== "enabled") score -= 10;
        if (d.updateServiceStatus === "disabled") score -= 10;
        else if (d.updateServiceStatus === "stopped") score -= 5;
        const pending = d.pendingUpdates;
        if (Array.isArray(pending) && pending.length > 5) score -= 10;
        else if (Array.isArray(pending) && pending.length > 0) score -= 3;
        if (d.uptimeSeconds && d.uptimeSeconds > 30 * 86400) score -= 5;
        totalScore += Math.max(0, Math.min(100, score));
      }
      orgDexScore = Math.round(totalScore / devices.length);
    }

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {session.user.name}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {isAdmin && totalDevices > 0 && (
            <Link href="/fleet-health">
              <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">DEX Score</CardTitle>
                  <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${orgDexScore >= 80 ? "text-green-600" : orgDexScore >= 60 ? "text-yellow-600" : "text-red-600"}`}>
                    {orgDexScore}/100
                  </div>
                  <p className="text-xs text-muted-foreground">Digital Employee Experience</p>
                </CardContent>
              </Card>
            </Link>
          )}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalEmployees}</div>
              <p className="text-xs text-muted-foreground">Active team members</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Currently Working</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeTimeEntries}</div>
              <p className="text-xs text-muted-foreground">Clocked in right now</p>
            </CardContent>
          </Card>
          {isAdmin && totalDevices > 0 && (
            <Link href="/devices">
              <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Devices Online</CardTitle>
                  <Shield className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{onlineDevices}/{totalDevices}</div>
                  <p className="text-xs text-muted-foreground">Connected agents</p>
                </CardContent>
              </Card>
            </Link>
          )}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Open Alerts</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${openAlerts > 0 ? "text-red-600" : ""}`}>{openAlerts}</div>
              <p className="text-xs text-muted-foreground">Security alerts pending</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Real-time Monitoring</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Continuous data collection providing immediate insights into employee experience across all locations and devices.
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <Link href="/productivity" className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  Productivity & Engagement
                </Link>
                <Link href="/fleet-health" className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="h-2 w-2 rounded-full bg-blue-500" />
                  Fleet Health & DEX
                </Link>
                <Link href="/security" className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="h-2 w-2 rounded-full bg-red-500" />
                  Security & Alerts
                </Link>
                <Link href="/compliance" className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="h-2 w-2 rounded-full bg-purple-500" />
                  SOC 2 Compliance
                </Link>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-1 gap-2 text-sm">
                <Link href="/settings/team" className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <ArrowRight className="h-4 w-4 text-primary" /> Invite team members
                </Link>
                <Link href="/settings/agent-setup" className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <ArrowRight className="h-4 w-4 text-primary" /> Deploy monitoring agents
                </Link>
                <Link href="/settings/mdm" className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <ArrowRight className="h-4 w-4 text-primary" /> Connect MDM provider
                </Link>
                <Link href="/reports" className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <ArrowRight className="h-4 w-4 text-primary" /> Generate reports
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Employee dashboard — focused on their own data
  const [
    myActiveEntry,
    myAttendanceToday,
    myTasks,
    myLeaveRequests,
    myMfa,
  ] = await Promise.all([
    prisma.timeEntry.findFirst({
      where: { userId, status: "ACTIVE" },
      orderBy: { clockIn: "desc" },
    }),
    prisma.attendanceRecord.findFirst({
      where: { userId, date: today },
    }),
    prisma.task.count({
      where: { assigneeId: userId, status: { in: ["TODO", "IN_PROGRESS"] } },
    }),
    prisma.leaveRequest.count({
      where: { userId, status: "PENDING" },
    }),
    prisma.mfaCredential.findUnique({
      where: { userId },
      select: { verified: true },
    }),
  ]);

  const mfaEnabled = myMfa?.verified ?? false;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome, {session.user.name}
        </h1>
        <p className="text-muted-foreground">
          Here&apos;s your overview for today
        </p>
      </div>

      {/* MFA warning banner */}
      {!mfaEnabled && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldX className="h-5 w-5 text-amber-600" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-200">
                  Secure your account
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Enable two-factor authentication to protect your account
                </p>
              </div>
            </div>
            <Link
              href="/account"
              className="inline-flex items-center gap-1 text-sm font-medium text-amber-700 hover:text-amber-900 dark:text-amber-300"
            >
              Set up 2FA <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}

      {/* Employee stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${myActiveEntry ? "text-green-600" : "text-muted-foreground"}`}>
              {myActiveEntry ? "Clocked In" : "Not Clocked In"}
            </div>
            {myActiveEntry && (
              <p className="text-xs text-muted-foreground">
                Since {new Date(myActiveEntry.clockIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Attendance</CardTitle>
            <CalendarCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {myAttendanceToday ? myAttendanceToday.status : "Not Recorded"}
            </div>
            <p className="text-xs text-muted-foreground">Today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Open Tasks</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{myTasks}</div>
            <p className="text-xs text-muted-foreground">Assigned to you</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Leave Requests</CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{myLeaveRequests}</div>
            <p className="text-xs text-muted-foreground">Pending approval</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick actions for employees */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/time-tracking">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardContent className="flex items-center gap-4 py-6">
              <div className="p-3 rounded-lg bg-primary/10">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="font-medium">Time Tracking</div>
                <div className="text-sm text-muted-foreground">Clock in/out and view timesheets</div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/projects">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardContent className="flex items-center gap-4 py-6">
              <div className="p-3 rounded-lg bg-primary/10">
                <FolderKanban className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="font-medium">My Projects</div>
                <div className="text-sm text-muted-foreground">View tasks and assignments</div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/account">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardContent className="flex items-center gap-4 py-6">
              <div className="p-3 rounded-lg bg-primary/10">
                {mfaEnabled ? (
                  <ShieldCheck className="h-6 w-6 text-green-600" />
                ) : (
                  <ShieldX className="h-6 w-6 text-amber-600" />
                )}
              </div>
              <div>
                <div className="font-medium">My Account</div>
                <div className="text-sm text-muted-foreground">
                  {mfaEnabled ? "Profile & security settings" : "Set up 2FA"}
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
