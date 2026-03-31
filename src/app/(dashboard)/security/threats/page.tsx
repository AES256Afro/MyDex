import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import type { AlertSeverity, AlertStatus } from "@/generated/prisma";
import Link from "next/link";
import { Shield, AlertTriangle, AlertCircle, Info } from "lucide-react";
import { ExportButton } from "@/components/shared/export-button";

function severityBadgeVariant(severity: AlertSeverity) {
  switch (severity) {
    case "CRITICAL":
      return "destructive" as const;
    case "HIGH":
      return "warning" as const;
    case "MEDIUM":
      return "default" as const;
    case "LOW":
      return "secondary" as const;
  }
}

function severityColor(severity: AlertSeverity) {
  switch (severity) {
    case "CRITICAL":
      return "text-red-600 bg-red-50 border-red-200";
    case "HIGH":
      return "text-orange-600 bg-orange-50 border-orange-200";
    case "MEDIUM":
      return "text-yellow-600 bg-yellow-50 border-yellow-200";
    case "LOW":
      return "text-blue-600 bg-blue-50 border-blue-200";
  }
}

function statusBadgeVariant(status: AlertStatus) {
  switch (status) {
    case "OPEN":
      return "destructive" as const;
    case "INVESTIGATING":
      return "warning" as const;
    case "RESOLVED":
      return "success" as const;
    case "DISMISSED":
      return "secondary" as const;
  }
}

function severityIcon(severity: AlertSeverity) {
  switch (severity) {
    case "CRITICAL":
      return <AlertCircle className="h-5 w-5 text-red-600" />;
    case "HIGH":
      return <AlertTriangle className="h-5 w-5 text-orange-600" />;
    case "MEDIUM":
      return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
    case "LOW":
      return <Info className="h-5 w-5 text-blue-600" />;
  }
}

interface SearchParams {
  status?: string;
}

export default async function ThreatsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  if (!hasPermission(session.user.role, "security:read")) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const statusFilter = params.status;

  const where: Record<string, unknown> = {
    organizationId: session.user.organizationId,
  };

  if (
    statusFilter &&
    ["OPEN", "INVESTIGATING", "RESOLVED", "DISMISSED"].includes(statusFilter)
  ) {
    where.status = statusFilter;
  }

  const [alerts, severityCounts] = await Promise.all([
    prisma.securityAlert.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.securityAlert.groupBy({
      by: ["severity"],
      where: { organizationId: session.user.organizationId },
      _count: { severity: true },
    }),
  ]);

  const counts: Record<AlertSeverity, number> = {
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
  };
  for (const row of severityCounts) {
    counts[row.severity] = row._count.severity;
  }

  const statuses: AlertStatus[] = [
    "OPEN",
    "INVESTIGATING",
    "RESOLVED",
    "DISMISSED",
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Threat Dashboard
          </h1>
          <p className="text-muted-foreground">
            Security alerts for your organization
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton type="security-alerts" />
          <Link
            href="/security"
            className="text-sm text-muted-foreground hover:underline"
          >
            Back to Security
          </Link>
        </div>
      </div>

      {/* Severity Breakdown Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(["CRITICAL", "HIGH", "MEDIUM", "LOW"] as AlertSeverity[]).map(
          (severity) => (
            <Card
              key={severity}
              className={`border ${severityColor(severity)}`}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {severity}
                </CardTitle>
                {severityIcon(severity)}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{counts[severity]}</div>
                <p className="text-xs opacity-70">alerts total</p>
              </CardContent>
            </Card>
          )
        )}
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        <Link
          href="/security/threats"
          className={`inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            !statusFilter
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          All
        </Link>
        {statuses.map((s) => (
          <Link
            key={s}
            href={`/security/threats?status=${s}`}
            className={`inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              statusFilter === s
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {s.charAt(0) + s.slice(1).toLowerCase()}
          </Link>
        ))}
      </div>

      {/* Alerts Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5" />
            Security Alerts
            <span className="text-sm font-normal text-muted-foreground">
              ({alerts.length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No security alerts found
              {statusFilter ? ` with status "${statusFilter}"` : ""}.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">
                      Title
                    </th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">
                      User
                    </th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">
                      Type
                    </th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">
                      Severity
                    </th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="pb-3 font-medium text-muted-foreground">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.map((alert) => (
                    <tr key={alert.id} className="group">
                      <td className="py-3 pr-4" colSpan={6}>
                        <details className="cursor-pointer">
                          <summary className="list-none">
                            <div className="grid grid-cols-6 gap-4 items-center">
                              <div className="font-medium">{alert.title}</div>
                              <div className="text-muted-foreground">
                                {alert.user.name}
                              </div>
                              <div className="text-muted-foreground">
                                {alert.alertType.replace(/_/g, " ")}
                              </div>
                              <div>
                                <Badge
                                  variant={severityBadgeVariant(
                                    alert.severity
                                  )}
                                >
                                  {alert.severity}
                                </Badge>
                              </div>
                              <div>
                                <Badge
                                  variant={statusBadgeVariant(alert.status)}
                                >
                                  {alert.status}
                                </Badge>
                              </div>
                              <div className="text-muted-foreground">
                                {format(
                                  new Date(alert.createdAt),
                                  "MMM d, yyyy HH:mm"
                                )}
                              </div>
                            </div>
                          </summary>
                          <div className="mt-3 ml-4 p-4 rounded-md bg-muted/50 border space-y-2">
                            <p className="text-sm">
                              <span className="font-medium">Description:</span>{" "}
                              {alert.description}
                            </p>
                            {alert.metadata && (
                              <div className="text-sm">
                                <span className="font-medium">Metadata:</span>
                                <pre className="mt-1 p-2 rounded bg-muted text-xs overflow-x-auto">
                                  {JSON.stringify(alert.metadata, null, 2)}
                                </pre>
                              </div>
                            )}
                            {alert.resolvedBy && (
                              <p className="text-sm text-muted-foreground">
                                Resolved by: {alert.resolvedBy}
                                {alert.resolvedAt &&
                                  ` on ${format(
                                    new Date(alert.resolvedAt),
                                    "MMM d, yyyy HH:mm"
                                  )}`}
                              </p>
                            )}
                          </div>
                        </details>
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
