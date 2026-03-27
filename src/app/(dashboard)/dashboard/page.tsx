import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Clock, CalendarCheck, Shield } from "lucide-react";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const orgId = session.user.organizationId;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [totalEmployees, activeTimeEntries, presentToday, openAlerts] =
    await Promise.all([
      prisma.user.count({
        where: { organizationId: orgId, status: "ACTIVE" },
      }),
      prisma.timeEntry.count({
        where: { organizationId: orgId, status: "ACTIVE" },
      }),
      prisma.attendanceRecord.count({
        where: {
          organizationId: orgId,
          date: today,
          status: "PRESENT",
        },
      }),
      prisma.securityAlert.count({
        where: { organizationId: orgId, status: "OPEN" },
      }),
    ]);

  const stats = [
    {
      title: "Total Employees",
      value: totalEmployees,
      icon: Users,
      description: "Active team members",
    },
    {
      title: "Currently Working",
      value: activeTimeEntries,
      icon: Clock,
      description: "Clocked in right now",
    },
    {
      title: "Present Today",
      value: presentToday,
      icon: CalendarCheck,
      description: "Attendance recorded",
    },
    {
      title: "Open Alerts",
      value: openAlerts,
      icon: Shield,
      description: "Security alerts pending",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {session.user.name}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Activity monitoring data will appear here once employees start
              using the tracker.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Invite team members, create projects, and configure monitoring
              from the Settings page.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
