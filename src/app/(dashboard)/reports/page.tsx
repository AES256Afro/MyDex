"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format, subDays } from "date-fns";

type ReportType = "productivity" | "attendance" | "security" | "time-tracking";
type ReportFormat = "pdf" | "csv";

interface ScheduledReport {
  id: string;
  name: string;
  reportType: string;
  schedule: string;
  format: string;
  isActive: boolean;
  lastRunAt: string | null;
  recipients: string[];
}

interface GeneratedReport {
  reportType: string;
  dateRange: { from: string; to: string };
  format: string;
  generatedAt: string;
  summary: Record<string, unknown>;
}

export default function ReportsPage() {
  const { data: session } = useSession();

  const [reportType, setReportType] = useState<ReportType>("productivity");
  const [dateFrom, setDateFrom] = useState(
    format(subDays(new Date(), 30), "yyyy-MM-dd")
  );
  const [dateTo, setDateTo] = useState(format(new Date(), "yyyy-MM-dd"));
  const [reportFormat, setReportFormat] = useState<ReportFormat>("pdf");
  const [generating, setGenerating] = useState(false);
  const [generatedReport, setGeneratedReport] =
    useState<GeneratedReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>(
    []
  );
  const [loadingScheduled, setLoadingScheduled] = useState(true);

  // New scheduled report form
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [scheduleName, setScheduleName] = useState("");
  const [scheduleCron, setScheduleCron] = useState("0 8 * * 1");
  const [scheduleRecipients, setScheduleRecipients] = useState("");
  const [savingSchedule, setSavingSchedule] = useState(false);

  useEffect(() => {
    fetchScheduledReports();
  }, []);

  async function fetchScheduledReports() {
    try {
      const res = await fetch("/api/v1/reports/scheduled");
      if (res.ok) {
        const data = await res.json();
        setScheduledReports(data.reports);
      }
    } catch {
      // silently fail
    } finally {
      setLoadingScheduled(false);
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    setGeneratedReport(null);
    try {
      const res = await fetch("/api/v1/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: reportType,
          dateRange: { from: dateFrom, to: dateTo },
          format: reportFormat,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate report");
      }
      const data = await res.json();
      setGeneratedReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setGenerating(false);
    }
  }

  async function handleCreateScheduled() {
    setSavingSchedule(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/reports/scheduled", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: scheduleName,
          reportType,
          config: { dateRangePreset: "last_30_days" },
          schedule: scheduleCron,
          recipients: scheduleRecipients
            .split(",")
            .map((e) => e.trim())
            .filter(Boolean),
          format: reportFormat,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create scheduled report");
      }
      setShowScheduleForm(false);
      setScheduleName("");
      setScheduleRecipients("");
      fetchScheduledReports();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSavingSchedule(false);
    }
  }

  if (!session) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground">
          Generate and schedule organization reports
        </p>
      </div>

      {/* Report Builder */}
      <Card>
        <CardHeader>
          <CardTitle>Report Builder</CardTitle>
          <CardDescription>
            Configure and generate a one-time report
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reportType">Report Type</Label>
              <Select
                id="reportType"
                value={reportType}
                onChange={(e) =>
                  setReportType(e.target.value as ReportType)
                }
              >
                <option value="productivity">Productivity</option>
                <option value="attendance">Attendance</option>
                <option value="security">Security</option>
                <option value="time-tracking">Time Tracking</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateFrom">From</Label>
              <Input
                id="dateFrom"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateTo">To</Label>
              <Input
                id="dateTo"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="format">Format</Label>
              <Select
                id="format"
                value={reportFormat}
                onChange={(e) =>
                  setReportFormat(e.target.value as ReportFormat)
                }
              >
                <option value="pdf">PDF</option>
                <option value="csv">CSV</option>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={handleGenerate} disabled={generating}>
              {generating ? "Generating..." : "Generate Report"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowScheduleForm(!showScheduleForm)}
            >
              {showScheduleForm ? "Cancel" : "Schedule Report"}
            </Button>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </CardContent>
      </Card>

      {/* Schedule Form */}
      {showScheduleForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create Scheduled Report</CardTitle>
            <CardDescription>
              This report will run automatically on the configured schedule
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="scheduleName">Report Name</Label>
                <Input
                  id="scheduleName"
                  placeholder="Weekly Productivity Report"
                  value={scheduleName}
                  onChange={(e) => setScheduleName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="scheduleCron">
                  Schedule (Cron Expression)
                </Label>
                <Input
                  id="scheduleCron"
                  placeholder="0 8 * * 1"
                  value={scheduleCron}
                  onChange={(e) => setScheduleCron(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Default: Every Monday at 8 AM
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="recipients">
                Recipients (comma-separated emails)
              </Label>
              <Input
                id="recipients"
                placeholder="admin@company.com, manager@company.com"
                value={scheduleRecipients}
                onChange={(e) => setScheduleRecipients(e.target.value)}
              />
            </div>
            <Button
              onClick={handleCreateScheduled}
              disabled={savingSchedule || !scheduleName}
            >
              {savingSchedule ? "Creating..." : "Create Scheduled Report"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Generated Report Result */}
      {generatedReport && (
        <Card>
          <CardHeader>
            <CardTitle>Generated Report</CardTitle>
            <CardDescription>
              {generatedReport.reportType} report for{" "}
              {generatedReport.dateRange.from} to{" "}
              {generatedReport.dateRange.to} ({generatedReport.format.toUpperCase()})
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-md text-sm overflow-auto max-h-96">
              {JSON.stringify(generatedReport.summary, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Scheduled Reports List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Scheduled Reports</CardTitle>
              <CardDescription>
                Reports that run automatically on a schedule
              </CardDescription>
            </div>
            <a
              href="/reports/scheduled"
              className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
            >
              Manage All
            </a>
          </div>
        </CardHeader>
        <CardContent>
          {loadingScheduled ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Loading...
            </p>
          ) : scheduledReports.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No scheduled reports yet. Create one above.
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
                      Format
                    </th>
                    <th className="pb-3 font-medium text-muted-foreground">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {scheduledReports.map((report) => (
                    <tr
                      key={report.id}
                      className="border-b last:border-0 hover:bg-muted/50 transition-colors"
                    >
                      <td className="py-3 pr-4 font-medium">{report.name}</td>
                      <td className="py-3 pr-4 capitalize">
                        {report.reportType}
                      </td>
                      <td className="py-3 pr-4 font-mono text-xs">
                        {report.schedule}
                      </td>
                      <td className="py-3 pr-4 uppercase">{report.format}</td>
                      <td className="py-3">
                        <Badge
                          variant={report.isActive ? "success" : "secondary"}
                        >
                          {report.isActive ? "Active" : "Paused"}
                        </Badge>
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
