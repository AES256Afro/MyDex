import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ScheduledReportActions } from "./actions";

export default async function ScheduledReportsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  if (!hasPermission(session.user.role, "reports:read")) {
    redirect("/dashboard");
  }

  const canSchedule = hasPermission(session.user.role, "reports:schedule");
  const orgId = session.user.organizationId;

  const reports = await prisma.scheduledReport.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Scheduled Reports
        </h1>
        <p className="text-muted-foreground">
          Manage automated report generation schedules
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Scheduled Reports</CardTitle>
          <CardDescription>
            {reports.length} scheduled report{reports.length !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No scheduled reports. Go to the Reports page to create one.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">
                      Name
                    </th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">
                      Type
                    </th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">
                      Schedule
                    </th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">
                      Recipients
                    </th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">
                      Format
                    </th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">
                      Last Run
                    </th>
                    {canSchedule && (
                      <th className="pb-3 font-medium text-muted-foreground">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report) => {
                    const recipients = report.recipients as string[];
                    return (
                      <tr
                        key={report.id}
                        className="border-b last:border-0 hover:bg-muted/50 transition-colors"
                      >
                        <td className="py-3 pr-4 font-medium">
                          {report.name}
                        </td>
                        <td className="py-3 pr-4 capitalize">
                          {report.reportType}
                        </td>
                        <td className="py-3 pr-4 font-mono text-xs">
                          {report.schedule}
                        </td>
                        <td className="py-3 pr-4">
                          <div className="flex flex-wrap gap-1">
                            {recipients.map((email, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {email}
                              </Badge>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 pr-4 uppercase text-xs">
                          {report.format}
                        </td>
                        <td className="py-3 pr-4">
                          <Badge
                            variant={
                              report.isActive ? "success" : "secondary"
                            }
                          >
                            {report.isActive ? "Active" : "Paused"}
                          </Badge>
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground">
                          {report.lastRunAt
                            ? format(
                                new Date(report.lastRunAt),
                                "MMM d, yyyy h:mm a"
                              )
                            : "Never"}
                        </td>
                        {canSchedule && (
                          <td className="py-3">
                            <ScheduledReportActions
                              reportId={report.id}
                              isActive={report.isActive}
                            />
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
