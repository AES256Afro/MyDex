"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format, formatDistanceToNow } from "date-fns";
import {
  User,
  Mail,
  Building2,
  Briefcase,
  Clock,
  CalendarCheck,
  ArrowLeft,
  LifeBuoy,
  Activity,
  FileText,
  FilePlus,
  FileX,
  Files,
  FileOutput,
  FileEdit,
  Usb,
  Monitor,
  Smartphone,
  CheckCircle2,
  Circle,
  Loader2,
  Plus,
  Trash2,
  UserPlus,
  UserMinus,
  ChevronDown,
  ChevronRight,
  AppWindow,
} from "lucide-react";

type Role = "SUPER_ADMIN" | "ADMIN" | "MANAGER" | "EMPLOYEE";
type UserStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";
type TimeEntryStatus = "ACTIVE" | "COMPLETED" | "EDITED" | "FLAGGED";
type AttendanceStatus = "PRESENT" | "ABSENT" | "HALF_DAY" | "LEAVE" | "HOLIDAY" | "WEEKEND";

interface Props {
  employee: {
    id: string;
    name: string;
    email: string;
    image: string | null;
    role: Role;
    status: UserStatus;
    department: string | null;
    jobTitle: string | null;
    createdAt: string;
    manager: { id: string; name: string } | null;
    directReports: { id: string; name: string; image: string | null }[];
    agentDevices: { id: string; hostname: string; platform: string; status: string }[];
  };
  recentTimeEntries: {
    id: string;
    clockIn: string;
    clockOut: string | null;
    activeSeconds: number;
    idleSeconds: number;
    status: TimeEntryStatus;
  }[];
  attendanceRecords: { id: string; date: string; status: AttendanceStatus }[];
  tickets: {
    id: string;
    subject: string;
    status: string;
    priority: string;
    category: string;
    createdAt: string;
    resolvedAt: string | null;
    assignee: { id: string; name: string } | null;
    device: { hostname: string } | null;
  }[];
  recentActivity: {
    id: string;
    eventType: string;
    appName: string | null;
    windowTitle: string | null;
    url: string | null;
    domain: string | null;
    metadata: Record<string, unknown> | null;
    timestamp: string;
  }[];
  usbEvents: {
    id: string;
    deviceName: string;
    vendorId: string | null;
    productId: string | null;
    action: string;
    timestamp: string;
    device: { hostname: string } | null;
  }[];
  mdmDevices: {
    id: string;
    deviceName: string | null;
    platform: string | null;
    enrollmentStatus: string | null;
    complianceStatus: string | null;
    model: string | null;
    serialNumber: string | null;
    lastCheckIn: string | null;
    mdmProvider: { name: string; providerType: string };
    agentDevice: { hostname: string } | null;
  }[];
  boardingTasks: {
    id: string;
    type: "ONBOARDING" | "OFFBOARDING";
    category: string;
    title: string;
    description: string | null;
    completed: boolean;
    completedAt: string | null;
    completedBy: { id: string; name: string } | null;
    dueDate: string | null;
  }[];
  canWrite: boolean;
  currentUserId: string;
}

function roleBadgeVariant(role: Role) {
  switch (role) {
    case "SUPER_ADMIN": return "destructive" as const;
    case "ADMIN": return "default" as const;
    case "MANAGER": return "warning" as const;
    case "EMPLOYEE": return "secondary" as const;
  }
}

function statusBadgeVariant(status: UserStatus) {
  switch (status) {
    case "ACTIVE": return "success" as const;
    case "INACTIVE": return "secondary" as const;
    case "SUSPENDED": return "destructive" as const;
  }
}

function timeEntryStatusVariant(status: TimeEntryStatus) {
  switch (status) {
    case "ACTIVE": return "success" as const;
    case "COMPLETED": return "secondary" as const;
    case "EDITED": return "warning" as const;
    case "FLAGGED": return "destructive" as const;
  }
}

function ticketStatusColor(status: string) {
  switch (status) {
    case "OPEN": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
    case "IN_PROGRESS": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
    case "WAITING_ON_USER": return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300";
    case "WAITING_ON_IT": return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
    case "RESOLVED": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
    case "CLOSED": return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300";
    default: return "bg-gray-100 text-gray-800";
  }
}

function priorityColor(priority: string) {
  switch (priority) {
    case "URGENT": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
    case "HIGH": return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300";
    case "MEDIUM": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
    case "LOW": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
    default: return "bg-gray-100 text-gray-800";
  }
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function activityIcon(eventType: string) {
  switch (eventType) {
    case "FILE_CREATE": return <FilePlus className="h-4 w-4 text-green-600" />;
    case "FILE_DELETE": return <FileX className="h-4 w-4 text-red-600" />;
    case "FILE_COPY": return <Files className="h-4 w-4 text-blue-600" />;
    case "FILE_MOVE": return <FileOutput className="h-4 w-4 text-amber-600" />;
    case "FILE_RENAME": return <FileEdit className="h-4 w-4 text-purple-600" />;
    case "HEARTBEAT": return <Activity className="h-4 w-4 text-green-500" />;
    case "APP_SWITCH": return <AppWindow className="h-4 w-4 text-blue-500" />;
    default: return <FileText className="h-4 w-4 text-muted-foreground" />;
  }
}

function activityLabel(eventType: string) {
  switch (eventType) {
    case "FILE_CREATE": return "File created";
    case "FILE_DELETE": return "File deleted";
    case "FILE_COPY": return "File copied";
    case "FILE_MOVE": return "File moved";
    case "FILE_RENAME": return "File renamed";
    case "HEARTBEAT": return "Heartbeat";
    case "APP_SWITCH": return "App switch";
    default: return eventType.replace(/_/g, " ").toLowerCase();
  }
}

export default function EmployeeDetailClient({
  employee,
  recentTimeEntries,
  attendanceRecords,
  tickets,
  recentActivity,
  usbEvents,
  mdmDevices,
  boardingTasks: initialBoardingTasks,
  canWrite,
  currentUserId,
}: Props) {
  const [activeTab, setActiveTab] = useState<"overview" | "boarding" | "tickets" | "activity">("overview");
  const [boardingTasks, setBoardingTasks] = useState(initialBoardingTasks);
  const [loadingInit, setLoadingInit] = useState<string | null>(null);
  const [togglingTask, setTogglingTask] = useState<string | null>(null);
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskCategory, setNewTaskCategory] = useState("IT Setup");
  const [newTaskType, setNewTaskType] = useState<"ONBOARDING" | "OFFBOARDING">("ONBOARDING");
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  // Attendance summary
  const attendanceSummary: Record<AttendanceStatus, number> = {
    PRESENT: 0, ABSENT: 0, HALF_DAY: 0, LEAVE: 0, HOLIDAY: 0, WEEKEND: 0,
  };
  for (const record of attendanceRecords) {
    attendanceSummary[record.status]++;
  }

  const totalHoursWorked = recentTimeEntries.reduce(
    (acc, entry) => acc + entry.activeSeconds + entry.idleSeconds, 0
  );

  // Boarding tasks grouped
  const onboardingTasks = boardingTasks.filter((t) => t.type === "ONBOARDING");
  const offboardingTasks = boardingTasks.filter((t) => t.type === "OFFBOARDING");
  const onboardingProgress = onboardingTasks.length > 0
    ? Math.round((onboardingTasks.filter((t) => t.completed).length / onboardingTasks.length) * 100)
    : 0;
  const offboardingProgress = offboardingTasks.length > 0
    ? Math.round((offboardingTasks.filter((t) => t.completed).length / offboardingTasks.length) * 100)
    : 0;

  // File activities and USB combined for timeline
  const fileActivities = recentActivity.filter((a) => a.eventType.startsWith("FILE_"));
  const heartbeats = recentActivity.filter((a) => a.eventType === "HEARTBEAT");
  const appSwitches = recentActivity.filter((a) => a.eventType === "APP_SWITCH");

  async function initBoarding(type: "ONBOARDING" | "OFFBOARDING") {
    setLoadingInit(type);
    try {
      const res = await fetch(`/api/v1/employees/${employee.id}/boarding`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initTemplate: true, type }),
      });
      if (res.ok) {
        const data = await res.json();
        setBoardingTasks((prev) => [...prev, ...data.tasks.map((t: Record<string, unknown>) => ({
          ...t, completedBy: null,
        }))]);
      }
    } catch { /* ignore */ } finally {
      setLoadingInit(null);
    }
  }

  async function toggleTask(taskId: string, completed: boolean) {
    setTogglingTask(taskId);
    try {
      const res = await fetch(`/api/v1/employees/${employee.id}/boarding`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, completed }),
      });
      if (res.ok) {
        const data = await res.json();
        setBoardingTasks((prev) => prev.map((t) => t.id === taskId ? data.task : t));
      }
    } catch { /* ignore */ } finally {
      setTogglingTask(null);
    }
  }

  async function deleteTask(taskId: string) {
    try {
      await fetch(`/api/v1/employees/${employee.id}/boarding?taskId=${taskId}`, { method: "DELETE" });
      setBoardingTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch { /* ignore */ }
  }

  async function deleteAllTasks(type: "ONBOARDING" | "OFFBOARDING") {
    try {
      await fetch(`/api/v1/employees/${employee.id}/boarding?type=${type}`, { method: "DELETE" });
      setBoardingTasks((prev) => prev.filter((t) => t.type !== type));
    } catch { /* ignore */ }
  }

  async function addTask() {
    if (!newTaskTitle.trim()) return;
    try {
      const res = await fetch(`/api/v1/employees/${employee.id}/boarding`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: newTaskType,
          category: newTaskCategory,
          title: newTaskTitle.trim(),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setBoardingTasks((prev) => [...prev, { ...data.task, completedBy: null }]);
        setNewTaskTitle("");
        setShowAddTask(false);
      }
    } catch { /* ignore */ }
  }

  function toggleCategory(key: string) {
    setExpandedCategories((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const tabs = [
    { id: "overview" as const, label: "Overview" },
    { id: "boarding" as const, label: "Onboarding / Offboarding", count: boardingTasks.length },
    { id: "tickets" as const, label: "Support Tickets", count: tickets.length },
    { id: "activity" as const, label: "Activity", count: recentActivity.length + usbEvents.length },
  ];

  function renderBoardingSection(type: "ONBOARDING" | "OFFBOARDING", tasks: typeof boardingTasks, progress: number) {
    const isOnboarding = type === "ONBOARDING";
    const icon = isOnboarding ? <UserPlus className="h-5 w-5 text-green-600" /> : <UserMinus className="h-5 w-5 text-red-600" />;
    const label = isOnboarding ? "Onboarding" : "Offboarding";
    const completedCount = tasks.filter((t) => t.completed).length;

    if (tasks.length === 0) {
      return (
        <Card key={type}>
          <CardContent className="py-8 text-center">
            {icon}
            <h3 className="text-sm font-medium mt-2">{label} Checklist</h3>
            <p className="text-xs text-muted-foreground mt-1">
              No {label.toLowerCase()} tasks created yet.
            </p>
            {canWrite && (
              <Button
                size="sm"
                className="mt-3"
                onClick={() => initBoarding(type)}
                disabled={loadingInit === type}
              >
                {loadingInit === type ? (
                  <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Creating...</>
                ) : (
                  <><Plus className="h-4 w-4 mr-1" /> Initialize {label} Template</>
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      );
    }

    // Group by category
    const categories: Record<string, typeof tasks> = {};
    for (const task of tasks) {
      if (!categories[task.category]) categories[task.category] = [];
      categories[task.category].push(task);
    }

    return (
      <Card key={type}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              {icon} {label} Checklist
            </CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {completedCount}/{tasks.length} complete
              </span>
              {canWrite && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 h-7 text-xs"
                  onClick={() => deleteAllTasks(type)}
                >
                  Reset
                </Button>
              )}
            </div>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-muted rounded-full h-2 mt-2">
            <div
              className={`h-2 rounded-full transition-all ${progress === 100 ? "bg-green-500" : isOnboarding ? "bg-blue-500" : "bg-red-500"}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {Object.entries(categories).map(([cat, catTasks]) => {
            const catKey = `${type}-${cat}`;
            const isExpanded = expandedCategories[catKey] !== false; // default expanded
            const catCompleted = catTasks.filter((t) => t.completed).length;
            return (
              <div key={catKey}>
                <button
                  onClick={() => toggleCategory(catKey)}
                  className="flex items-center gap-2 w-full text-left py-1"
                >
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <span className="text-sm font-medium">{cat}</span>
                  <span className="text-xs text-muted-foreground">({catCompleted}/{catTasks.length})</span>
                </button>
                {isExpanded && (
                  <div className="ml-6 space-y-1 mt-1">
                    {catTasks.map((task) => (
                      <div key={task.id} className="flex items-center gap-2 group py-1">
                        {canWrite ? (
                          <button
                            onClick={() => toggleTask(task.id, !task.completed)}
                            disabled={togglingTask === task.id}
                            className="flex-shrink-0"
                          >
                            {togglingTask === task.id ? (
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            ) : task.completed ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            ) : (
                              <Circle className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                            )}
                          </button>
                        ) : task.completed ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <Circle className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className={`text-sm flex-1 ${task.completed ? "line-through text-muted-foreground" : ""}`}>
                          {task.title}
                        </span>
                        {task.completedBy && (
                          <span className="text-xs text-muted-foreground hidden group-hover:inline">
                            by {task.completedBy.name}
                          </span>
                        )}
                        {canWrite && (
                          <button
                            onClick={() => deleteTask(task.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-red-600" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/employees"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Employees
      </Link>

      {/* Profile Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <Avatar className="h-20 w-20">
              {employee.image && <AvatarImage src={employee.image} alt={employee.name} />}
              <AvatarFallback className="text-xl">{getInitials(employee.name)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-3">
              <div>
                <h1 className="text-2xl font-bold">{employee.name}</h1>
                <div className="flex flex-wrap gap-2 mt-1">
                  <Badge variant={roleBadgeVariant(employee.role)}>{employee.role.replace("_", " ")}</Badge>
                  <Badge variant={statusBadgeVariant(employee.status)}>{employee.status}</Badge>
                </div>
              </div>
              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" /> {employee.email}
                </div>
                {employee.department && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Building2 className="h-4 w-4" /> {employee.department}
                  </div>
                )}
                {employee.jobTitle && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Briefcase className="h-4 w-4" /> {employee.jobTitle}
                  </div>
                )}
                {employee.manager && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="h-4 w-4" />
                    Reports to{" "}
                    <Link href={`/employees/${employee.manager.id}`} className="underline hover:text-foreground">
                      {employee.manager.name}
                    </Link>
                  </div>
                )}
              </div>
              {employee.agentDevices.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {employee.agentDevices.map((d) => (
                    <Badge key={d.id} variant="outline" className="gap-1">
                      <Monitor className="h-3 w-3" />
                      {d.hostname}
                      <span className={`h-1.5 w-1.5 rounded-full ${d.status === "ONLINE" ? "bg-green-500" : d.status === "STALE" ? "bg-yellow-500" : "bg-gray-400"}`} />
                    </Badge>
                  ))}
                  {mdmDevices.filter((m) => !m.agentDevice).map((m) => (
                    <Badge key={m.id} variant="outline" className="gap-1">
                      <Smartphone className="h-3 w-3" />
                      {m.deviceName || m.model || "MDM Device"}
                      <span className={`h-1.5 w-1.5 rounded-full ${m.complianceStatus === "compliant" ? "bg-green-500" : m.complianceStatus === "noncompliant" ? "bg-red-500" : "bg-gray-400"}`} />
                    </Badge>
                  ))}
                </div>
              )}
              {mdmDevices.length > 0 && employee.agentDevices.length === 0 && (
                <div className="flex flex-wrap gap-2">
                  {mdmDevices.map((m) => (
                    <Badge key={m.id} variant="outline" className="gap-1">
                      <Smartphone className="h-3 w-3" />
                      {m.deviceName || m.model || "MDM Device"}
                      <span className="text-xs text-muted-foreground">({m.mdmProvider.name})</span>
                      <span className={`h-1.5 w-1.5 rounded-full ${m.complianceStatus === "compliant" ? "bg-green-500" : "bg-yellow-500"}`} />
                    </Badge>
                  ))}
                </div>
              )}
              {employee.directReports.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium">Direct reports:</span>{" "}
                  {employee.directReports.map((r, i) => (
                    <span key={r.id}>
                      {i > 0 && ", "}
                      <Link href={`/employees/${r.id}`} className="underline hover:text-foreground">{r.name}</Link>
                    </span>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Member since {format(new Date(employee.createdAt), "MMM d, yyyy")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="border-b">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
              }`}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="ml-1.5 text-xs bg-muted px-1.5 py-0.5 rounded-full">{tab.count}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Attendance Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CalendarCheck className="h-5 w-5" /> Attendance Summary (30 days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {attendanceRecords.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No attendance records in the last 30 days.</p>
                ) : (
                  <div className="grid grid-cols-3 gap-4">
                    {(["PRESENT", "ABSENT", "HALF_DAY", "LEAVE", "HOLIDAY", "WEEKEND"] as AttendanceStatus[]).map((s) => (
                      <div key={s} className="text-center">
                        <div className={`text-2xl font-bold ${s === "PRESENT" ? "text-green-600" : s === "ABSENT" ? "text-red-600" : s === "HALF_DAY" ? "text-yellow-600" : s === "LEAVE" ? "text-blue-600" : "text-muted-foreground"}`}>
                          {attendanceSummary[s]}
                        </div>
                        <div className="text-xs text-muted-foreground">{s.replace("_", " ")}</div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Hours Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock className="h-5 w-5" /> Time Summary (30 days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{formatDuration(totalHoursWorked)}</div>
                    <div className="text-xs text-muted-foreground">Total Time</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{recentTimeEntries.length}</div>
                    <div className="text-xs text-muted-foreground">Sessions</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Time Entries */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="h-5 w-5" /> Recent Time Entries
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentTimeEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No time entries in the last 30 days.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-3 pr-4 font-medium text-muted-foreground">Date</th>
                        <th className="pb-3 pr-4 font-medium text-muted-foreground">Clock In</th>
                        <th className="pb-3 pr-4 font-medium text-muted-foreground">Clock Out</th>
                        <th className="pb-3 pr-4 font-medium text-muted-foreground">Duration</th>
                        <th className="pb-3 font-medium text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentTimeEntries.map((entry) => {
                        const duration = entry.clockOut
                          ? Math.floor((new Date(entry.clockOut).getTime() - new Date(entry.clockIn).getTime()) / 1000)
                          : Math.floor((Date.now() - new Date(entry.clockIn).getTime()) / 1000);
                        return (
                          <tr key={entry.id} className="border-b last:border-0 hover:bg-muted/50">
                            <td className="py-3 pr-4">{format(new Date(entry.clockIn), "MMM d, yyyy")}</td>
                            <td className="py-3 pr-4">{format(new Date(entry.clockIn), "h:mm a")}</td>
                            <td className="py-3 pr-4">{entry.clockOut ? format(new Date(entry.clockOut), "h:mm a") : "—"}</td>
                            <td className="py-3 pr-4">{formatDuration(duration)}</td>
                            <td className="py-3">
                              <Badge variant={timeEntryStatusVariant(entry.status)}>{entry.status}</Badge>
                            </td>
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
      )}

      {activeTab === "boarding" && (
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {renderBoardingSection("ONBOARDING", onboardingTasks, onboardingProgress)}
            {renderBoardingSection("OFFBOARDING", offboardingTasks, offboardingProgress)}
          </div>

          {/* Add custom task */}
          {canWrite && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Plus className="h-4 w-4" /> Add Custom Task
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!showAddTask ? (
                  <Button variant="outline" size="sm" onClick={() => setShowAddTask(true)}>
                    <Plus className="h-4 w-4 mr-1" /> Add Task
                  </Button>
                ) : (
                  <div className="flex flex-wrap gap-2 items-end">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Type</label>
                      <select
                        value={newTaskType}
                        onChange={(e) => setNewTaskType(e.target.value as "ONBOARDING" | "OFFBOARDING")}
                        className="block mt-1 rounded-md border px-3 py-2 text-sm bg-background"
                      >
                        <option value="ONBOARDING">Onboarding</option>
                        <option value="OFFBOARDING">Offboarding</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Category</label>
                      <Input
                        value={newTaskCategory}
                        onChange={(e) => setNewTaskCategory(e.target.value)}
                        placeholder="IT Setup"
                        className="mt-1 w-32"
                      />
                    </div>
                    <div className="flex-1 min-w-[200px]">
                      <label className="text-xs font-medium text-muted-foreground">Task</label>
                      <Input
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        placeholder="Task description"
                        className="mt-1"
                        onKeyDown={(e) => e.key === "Enter" && addTask()}
                      />
                    </div>
                    <Button size="sm" onClick={addTask}>Add</Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowAddTask(false)}>Cancel</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === "tickets" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <LifeBuoy className="h-5 w-5" /> Support Tickets
              </CardTitle>
              <CardDescription>{tickets.length} ticket{tickets.length !== 1 ? "s" : ""} submitted</CardDescription>
            </CardHeader>
            <CardContent>
              {tickets.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No support tickets submitted.</p>
              ) : (
                <div className="space-y-3">
                  {tickets.map((ticket) => (
                    <Link
                      key={ticket.id}
                      href={`/support?ticket=${ticket.id}`}
                      className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm truncate">{ticket.subject}</span>
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ticketStatusColor(ticket.status)}`}>
                            {ticket.status.replace(/_/g, " ")}
                          </span>
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${priorityColor(ticket.priority)}`}>
                            {ticket.priority}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span>{format(new Date(ticket.createdAt), "MMM d, yyyy h:mm a")}</span>
                          <span>{ticket.category}</span>
                          {ticket.assignee && <span>Assigned: {ticket.assignee.name}</span>}
                          {ticket.device && (
                            <span className="flex items-center gap-1">
                              <Monitor className="h-3 w-3" /> {ticket.device.hostname}
                            </span>
                          )}
                        </div>
                      </div>
                      {ticket.resolvedAt && (
                        <span className="text-xs text-green-600 whitespace-nowrap">
                          Resolved {formatDistanceToNow(new Date(ticket.resolvedAt), { addSuffix: true })}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "activity" && (
        <div className="space-y-6">
          {/* Heartbeat status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="h-4 w-4 text-green-500" /> Agent Heartbeat
              </CardTitle>
            </CardHeader>
            <CardContent>
              {heartbeats.length === 0 ? (
                <p className="text-sm text-muted-foreground">No heartbeat data in the last 30 days.</p>
              ) : (
                <div className="flex items-center gap-4">
                  <div>
                    <div className="text-2xl font-bold">{heartbeats.length}</div>
                    <div className="text-xs text-muted-foreground">Heartbeats (30d)</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium">
                      Last seen: {formatDistanceToNow(new Date(heartbeats[0].timestamp), { addSuffix: true })}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(heartbeats[0].timestamp), "MMM d, yyyy h:mm a")}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            {/* File Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-4 w-4" /> File Activity
                  {fileActivities.length > 0 && (
                    <span className="text-xs font-normal text-muted-foreground">({fileActivities.length} events)</span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {fileActivities.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No file activity recorded.</p>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {fileActivities.slice(0, 30).map((event) => (
                      <div key={event.id} className="flex items-start gap-2 py-1.5 border-b last:border-0">
                        {activityIcon(event.eventType)}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">{activityLabel(event.eventType)}</div>
                          {event.windowTitle && (
                            <div className="text-xs text-muted-foreground truncate">{event.windowTitle}</div>
                          )}
                          {event.appName && (
                            <div className="text-xs text-muted-foreground">{event.appName}</div>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* USB Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Usb className="h-4 w-4" /> USB Activity
                  {usbEvents.length > 0 && (
                    <span className="text-xs font-normal text-muted-foreground">({usbEvents.length} events)</span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {usbEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No USB activity recorded.</p>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {usbEvents.map((event) => (
                      <div key={event.id} className="flex items-start gap-2 py-1.5 border-b last:border-0">
                        <Usb className={`h-4 w-4 flex-shrink-0 ${event.action === "connected" ? "text-green-600" : "text-red-600"}`} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">{event.deviceName}</div>
                          <div className="text-xs text-muted-foreground">
                            {event.action === "connected" ? "Connected" : "Disconnected"}
                            {event.device && ` on ${event.device.hostname}`}
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* App Switches */}
          {appSwitches.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <AppWindow className="h-4 w-4" /> Recent App Usage
                  <span className="text-xs font-normal text-muted-foreground">({appSwitches.length} switches)</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {appSwitches.slice(0, 20).map((event) => (
                    <div key={event.id} className="flex items-start gap-2 py-1.5 border-b last:border-0">
                      <AppWindow className="h-4 w-4 text-blue-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{event.appName || "Unknown app"}</div>
                        {event.windowTitle && (
                          <div className="text-xs text-muted-foreground truncate">{event.windowTitle}</div>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
