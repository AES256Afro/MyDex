"use client";

import { useState, useEffect, useCallback } from "react";
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
import {
  BarChart3,
  CalendarCheck,
  Shield,
  Clock,
  Download,
  FileText,
  Loader2,
  TrendingUp,
  Users,
  AlertTriangle,
  History,
  FileSpreadsheet,
  Printer,
} from "lucide-react";

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

interface ReportHistoryItem {
  id: string;
  reportType: string;
  dateFrom: string;
  dateTo: string;
  format: string;
  generatedAt: string;
  fileName: string;
  fileSize: number | null;
  recordCount: number;
  status: string;
  summary: {
    title?: string;
    totalEmployees?: number;
    totalRecords?: number;
    avgScore?: number | null;
    attendanceRate?: number | null;
    totalAlerts?: number | null;
    totalHours?: number | null;
  } | null;
  user: { id: string; name: string };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface GeneratedReport {
  id: string;
  reportType: string;
  dateRange: { from: string; to: string };
  format: string;
  generatedAt: string;
  fileName: string;
  recordCount: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  summary: Record<string, any>;
}

const reportTypeConfig: Record<ReportType, { label: string; icon: typeof BarChart3; color: string }> = {
  productivity: { label: "Productivity", icon: TrendingUp, color: "text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900" },
  attendance: { label: "Attendance", icon: CalendarCheck, color: "text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900" },
  security: { label: "Security", icon: Shield, color: "text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900" },
  "time-tracking": { label: "Time Tracking", icon: Clock, color: "text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900" },
};

export default function ReportsPage() {
  const { data: session } = useSession();

  const [reportType, setReportType] = useState<ReportType>("productivity");
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(new Date(), "yyyy-MM-dd"));
  const [reportFormat, setReportFormat] = useState<ReportFormat>("pdf");
  const [generating, setGenerating] = useState(false);
  const [generatedReport, setGeneratedReport] = useState<GeneratedReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>([]);
  const [loadingScheduled, setLoadingScheduled] = useState(true);
  const [reportHistory, setReportHistory] = useState<ReportHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Schedule form
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [scheduleName, setScheduleName] = useState("");
  const [scheduleCron, setScheduleCron] = useState("0 8 * * 1");
  const [scheduleRecipients, setScheduleRecipients] = useState("");
  const [savingSchedule, setSavingSchedule] = useState(false);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/reports/history");
      if (res.ok) {
        const data = await res.json();
        setReportHistory(data.reports);
      }
    } catch {
      // silently fail
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    async function fetchScheduled() {
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
    fetchScheduled();
    fetchHistory();
  }, [fetchHistory]);

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

      // CSV returns as a file download
      if (reportFormat === "csv") {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${reportType}-report-${dateFrom}-${dateTo}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        fetchHistory();
        return;
      }

      const data = await res.json();
      setGeneratedReport(data);
      fetchHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setGenerating(false);
    }
  }

  async function handlePrintReport() {
    // Fetch the printable HTML report and open it in a new tab
    const type = generatedReport?.reportType || reportType;
    const dr = generatedReport?.dateRange || { from: dateFrom, to: dateTo };

    try {
      const res = await fetch("/api/v1/reports/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, dateRange: dr }),
      });
      if (!res.ok) throw new Error("Failed to generate printable report");
      const html = await res.text();
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      // Clean up the blob URL after a delay
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch {
      setError("Failed to open printable report");
    }
  }

  async function handleDownloadCsv() {
    try {
      const res = await fetch("/api/v1/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: generatedReport?.reportType || reportType,
          dateRange: generatedReport?.dateRange || { from: dateFrom, to: dateTo },
          format: "csv",
        }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${generatedReport?.reportType || reportType}-report.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      // silently fail
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
          recipients: scheduleRecipients.split(",").map((e) => e.trim()).filter(Boolean),
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
      const scheduled = await fetch("/api/v1/reports/scheduled");
      if (scheduled.ok) {
        const data = await scheduled.json();
        setScheduledReports(data.reports);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSavingSchedule(false);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function renderReportSummary(report: GeneratedReport) {
    const s = report.summary;
    const type = report.reportType as ReportType;
    const config = reportTypeConfig[type];
    const Icon = config?.icon || FileText;

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${config?.color || "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg">{s.title || `${config?.label} Report`}</CardTitle>
                <CardDescription>{s.dateRange || `${report.dateRange.from} to ${report.dateRange.to}`}</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handlePrintReport}>
                <Printer className="h-4 w-4 mr-1" /> Print Report
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadCsv}>
                <Download className="h-4 w-4 mr-1" /> Download CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Summary stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {type === "productivity" && (
              <>
                <SummaryCard label="Employees" value={s.totalEmployees || 0} />
                <SummaryCard label="Avg Score" value={s.avgProductivityScore != null ? `${s.avgProductivityScore}%` : "—"} />
                <SummaryCard label="Records" value={s.totalRecords || 0} />
                <SummaryCard label="Report Type" value="Productivity" />
              </>
            )}
            {type === "attendance" && (
              <>
                <SummaryCard label="Employees" value={s.uniqueEmployees || 0} />
                <SummaryCard label="Attendance Rate" value={s.attendanceRate != null ? `${s.attendanceRate}%` : "—"} />
                <SummaryCard label="Total Records" value={s.totalRecords || 0} />
                <SummaryCard label="Status Breakdown" value={Object.keys(s.statusBreakdown || {}).length + " statuses"} />
              </>
            )}
            {type === "security" && (
              <>
                <SummaryCard label="Total Alerts" value={s.totalAlerts || 0} />
                <SummaryCard label="Critical" value={(s.bySeverity as Record<string, number>)?.CRITICAL || 0} color="text-red-600 dark:text-red-400" />
                <SummaryCard label="High" value={(s.bySeverity as Record<string, number>)?.HIGH || 0} color="text-orange-600 dark:text-orange-400" />
                <SummaryCard label="Medium" value={(s.bySeverity as Record<string, number>)?.MEDIUM || 0} color="text-amber-600 dark:text-amber-400" />
              </>
            )}
            {type === "time-tracking" && (
              <>
                <SummaryCard label="Employees" value={s.totalEmployees || 0} />
                <SummaryCard label="Total Hours" value={s.totalOrgFormatted || `${s.totalHoursOrg}h`} />
                <SummaryCard label="Clock Entries" value={s.totalEntries || 0} />
                <SummaryCard label="Report Type" value="Time Tracking" />
              </>
            )}
          </div>

          {/* Employee table */}
          {s.employees && s.employees.length > 0 && (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    {type === "productivity" && (
                      <>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Employee</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Department</th>
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">Avg Score</th>
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">Active Time</th>
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">Days</th>
                      </>
                    )}
                    {type === "attendance" && (
                      <>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Employee</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Department</th>
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">Present</th>
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">Absent</th>
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">Late</th>
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">Rate</th>
                      </>
                    )}
                    {type === "security" && (
                      <>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Alert</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Severity</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">User</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                      </>
                    )}
                    {type === "time-tracking" && (
                      <>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Employee</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Department</th>
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">Total</th>
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">Active</th>
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">Idle</th>
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">Entries</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {(type === "security" ? s.recentAlerts : s.employees)?.slice(0, 25).map((row: any, i: number) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      {type === "productivity" && (
                        <>
                          <td className="px-4 py-3 font-medium">{row.name}</td>
                          <td className="px-4 py-3 text-muted-foreground">{row.department}</td>
                          <td className="px-4 py-3 text-right">
                            {row.avgScore != null ? (
                              <Badge className={row.avgScore >= 70 ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300" : row.avgScore >= 40 ? "bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300" : "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300"}>
                                {row.avgScore}%
                              </Badge>
                            ) : "—"}
                          </td>
                          <td className="px-4 py-3 text-right text-muted-foreground">{row.activeFormatted}</td>
                          <td className="px-4 py-3 text-right text-muted-foreground">{row.daysTracked}</td>
                        </>
                      )}
                      {type === "attendance" && (
                        <>
                          <td className="px-4 py-3 font-medium">{row.name}</td>
                          <td className="px-4 py-3 text-muted-foreground">{row.department}</td>
                          <td className="px-4 py-3 text-right text-green-600 dark:text-green-400">{row.present}</td>
                          <td className="px-4 py-3 text-right text-red-600 dark:text-red-400">{row.absent}</td>
                          <td className="px-4 py-3 text-right text-amber-600 dark:text-amber-400">{row.late}</td>
                          <td className="px-4 py-3 text-right">
                            <Badge className={row.rate >= 90 ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300" : row.rate >= 70 ? "bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300" : "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300"}>
                              {row.rate}%
                            </Badge>
                          </td>
                        </>
                      )}
                      {type === "security" && (
                        <>
                          <td className="px-4 py-3 font-medium">{row.title}</td>
                          <td className="px-4 py-3">
                            <Badge className={row.severity === "CRITICAL" ? "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300" : row.severity === "HIGH" ? "bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300" : "bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300"}>
                              {row.severity}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="outline">{row.status}</Badge>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{row.user}</td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(row.createdAt).toLocaleDateString()}</td>
                        </>
                      )}
                      {type === "time-tracking" && (
                        <>
                          <td className="px-4 py-3 font-medium">{row.name}</td>
                          <td className="px-4 py-3 text-muted-foreground">{row.department}</td>
                          <td className="px-4 py-3 text-right font-medium">{row.totalFormatted}</td>
                          <td className="px-4 py-3 text-right text-green-600 dark:text-green-400">{row.activeFormatted}</td>
                          <td className="px-4 py-3 text-right text-muted-foreground">{row.idleFormatted}</td>
                          <td className="px-4 py-3 text-right text-muted-foreground">{row.entries}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Empty state */}
          {(!s.employees || s.employees.length === 0) && (!s.recentAlerts || s.recentAlerts.length === 0) && (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No data found for the selected date range.</p>
              <p className="text-xs mt-1">Try expanding the date range or ensure activity data is being collected.</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  if (!session) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="h-8 w-8" /> Reports
          </h1>
          <p className="text-muted-foreground">Generate, download, and schedule organization reports</p>
        </div>
      </div>

      {/* Report Builder */}
      <Card>
        <CardHeader>
          <CardTitle>Report Builder</CardTitle>
          <CardDescription>Configure and generate a one-time report</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reportType">Report Type</Label>
              <Select id="reportType" value={reportType} onChange={(e) => setReportType(e.target.value as ReportType)}>
                <option value="productivity">Productivity</option>
                <option value="attendance">Attendance</option>
                <option value="security">Security</option>
                <option value="time-tracking">Time Tracking</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateFrom">From</Label>
              <Input id="dateFrom" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateTo">To</Label>
              <Input id="dateTo" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="format">Format</Label>
              <Select id="format" value={reportFormat} onChange={(e) => setReportFormat(e.target.value as ReportFormat)}>
                <option value="pdf">View Report</option>
                <option value="csv">Download CSV</option>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={handleGenerate} disabled={generating}>
              {generating ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
              ) : (
                <><FileText className="mr-2 h-4 w-4" /> Generate Report</>
              )}
            </Button>
            <Button variant="outline" onClick={() => setShowScheduleForm(!showScheduleForm)}>
              {showScheduleForm ? "Cancel" : "Schedule Report"}
            </Button>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      {/* Schedule Form */}
      {showScheduleForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create Scheduled Report</CardTitle>
            <CardDescription>This report will run automatically on the configured schedule</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="scheduleName">Report Name</Label>
                <Input id="scheduleName" placeholder="Weekly Productivity Report" value={scheduleName} onChange={(e) => setScheduleName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="scheduleCron">Schedule (Cron Expression)</Label>
                <Input id="scheduleCron" placeholder="0 8 * * 1" value={scheduleCron} onChange={(e) => setScheduleCron(e.target.value)} />
                <p className="text-xs text-muted-foreground">Default: Every Monday at 8 AM</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="recipients">Recipients (comma-separated emails)</Label>
              <Input id="recipients" placeholder="admin@company.com, manager@company.com" value={scheduleRecipients} onChange={(e) => setScheduleRecipients(e.target.value)} />
            </div>
            <Button onClick={handleCreateScheduled} disabled={savingSchedule || !scheduleName}>
              {savingSchedule ? "Creating..." : "Create Scheduled Report"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Generated Report Result */}
      {generatedReport && renderReportSummary(generatedReport)}

      <Separator />

      {/* Report History Timeline */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle>Report History</CardTitle>
                <CardDescription>Timeline of generated reports</CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingHistory ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : reportHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileSpreadsheet className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No reports generated yet.</p>
              <p className="text-xs mt-1">Use the Report Builder above to generate your first report.</p>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />

              <div className="space-y-4">
                {reportHistory.map((item) => {
                  const config = reportTypeConfig[item.reportType as ReportType];
                  const Icon = config?.icon || FileText;
                  const colorClass = config?.color || "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400";

                  return (
                    <div key={item.id} className="relative flex gap-4 pl-1">
                      {/* Timeline dot */}
                      <div className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-background ${colorClass}`}>
                        <Icon className="h-4 w-4" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 rounded-lg border p-4 hover:bg-muted/30 transition-colors">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{config?.label || item.reportType} Report</span>
                              <Badge variant="outline" className="text-[10px]">{item.format.toUpperCase()}</Badge>
                              <Badge className={item.status === "completed" ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-[10px]" : "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 text-[10px]"}>
                                {item.status}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(item.dateFrom), "MMM d, yyyy")} – {format(new Date(item.dateTo), "MMM d, yyyy")}
                              {item.recordCount > 0 && <> &middot; {item.recordCount} records</>}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">{format(new Date(item.generatedAt), "MMM d, yyyy h:mm a")}</p>
                            <p className="text-xs text-muted-foreground">by {item.user.name}</p>
                          </div>
                        </div>

                        {/* Quick summary */}
                        {item.summary && (
                          <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                            {item.summary.totalEmployees != null && item.summary.totalEmployees > 0 && (
                              <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {item.summary.totalEmployees} employees</span>
                            )}
                            {item.summary.avgScore != null && (
                              <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" /> {item.summary.avgScore}% avg</span>
                            )}
                            {item.summary.attendanceRate != null && (
                              <span className="flex items-center gap-1"><CalendarCheck className="h-3 w-3" /> {item.summary.attendanceRate}% attendance</span>
                            )}
                            {item.summary.totalAlerts != null && (
                              <span className="flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> {item.summary.totalAlerts} alerts</span>
                            )}
                            {item.summary.totalHours != null && (
                              <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {item.summary.totalHours}h total</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Scheduled Reports */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Scheduled Reports</CardTitle>
              <CardDescription>Reports that run automatically on a schedule</CardDescription>
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
            <p className="text-sm text-muted-foreground py-4 text-center">Loading...</p>
          ) : scheduledReports.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No scheduled reports yet. Create one above.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">Name</th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">Type</th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">Schedule</th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">Format</th>
                    <th className="pb-3 font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {scheduledReports.map((report) => (
                    <tr key={report.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                      <td className="py-3 pr-4 font-medium">{report.name}</td>
                      <td className="py-3 pr-4 capitalize">{report.reportType}</td>
                      <td className="py-3 pr-4 font-mono text-xs">{report.schedule}</td>
                      <td className="py-3 pr-4 uppercase">{report.format}</td>
                      <td className="py-3">
                        <Badge variant={report.isActive ? "success" : "secondary"}>
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

function SummaryCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="rounded-lg border p-4 text-center">
      <p className={`text-2xl font-bold ${color || ""}`}>{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}
