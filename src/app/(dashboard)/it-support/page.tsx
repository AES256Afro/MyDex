"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Wrench, Activity, ClipboardList, Settings, Zap, Clock, Timer,
  ShieldCheck, ShieldAlert, Monitor, Laptop, Globe, Wifi, WifiOff,
  Play, CheckCircle, RefreshCw, Search, Lock, Trash2, Download,
  CircleStop, HardDrive, Bug, Recycle, RotateCcw, Leaf, FileText,
  XCircle, UserPlus, Terminal, Server, ChevronRight, PrinterCheck,
  Sparkles, BatteryCharging, Volume2, Bluetooth, MousePointer,
  Keyboard, Eye, Shield, LifeBuoy, Loader2, AlertTriangle, X,
  ScrollText, ChevronDown, ChevronUp, MessageCircle, Send, ArrowLeft,
  Star, BarChart3, TrendingUp, AlertOctagon,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface DeviceInfo {
  id: string;
  hostname: string;
  platform: string;
  status: string;
  ipAddress: string;
  osVersion: string;
  user: { name: string; email: string };
  installedSoftware: { name: string; version: string }[];
}

interface CommandLog {
  id: string;
  title: string;
  script: string;
  deviceId: string;
  deviceName: string;
  status: "PENDING" | "SENT" | "EXECUTING" | "COMPLETED" | "FAILED";
  issuedAt: Date;
  completedAt?: Date;
  result?: string;
  exitCode?: number;
  commandId?: string;
}

interface TicketData {
  id: string;
  subject: string;
  category: string;
  reason?: string;
  appName?: string;
  description?: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  status: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  slaResponseDue?: string;
  slaResolutionDue?: string;
  slaResponseBreached?: boolean;
  slaResolutionBreached?: boolean;
  firstResponseAt?: string;
  satisfactionRating?: number | null;
  submitter: { id: string; name: string; email: string; image?: string };
  assignee?: { id: string; name: string; email: string } | null;
  device?: { id: string; hostname: string; platform: string } | null;
  deviceInfo?: Record<string, unknown> | null;
  messages?: { user: { name: string }; createdAt: string }[];
  _count?: { messages: number };
}

interface AgentMetric {
  id: string; name: string; email: string;
  totalAssigned: number; resolved: number; closed: number;
  avgResponseMinutes: number | null; avgResolutionMinutes: number | null;
  avgSatisfaction: number | null; totalRatings: number;
  slaBreaches: number; resolutionRate: number;
}

interface OrgMetrics {
  totalTickets: number; resolvedTickets: number; activeTickets: number;
  breachedTickets: number; avgSatisfaction: number | null; totalRatings: number;
  overdueResponse: number; overdueResolution: number;
  slaTargets: Record<string, { responseMinutes: number; resolutionMinutes: number }>;
}

interface TicketMessageData {
  id: string;
  message: string;
  isInternal: boolean;
  createdAt: string;
  user: { id: string; name: string; email: string; image?: string; role: string };
}

// App install paths by OS
const appPaths: Record<string, { win?: string; mac?: string }> = {
  "VS Code": { win: "C:\\Users\\%USER%\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe", mac: "/Applications/Visual Studio Code.app" },
  "Chrome": { win: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", mac: "/Applications/Google Chrome.app" },
  "Slack": { win: "C:\\Users\\%USER%\\AppData\\Local\\slack\\slack.exe", mac: "/Applications/Slack.app" },
  "Docker Desktop": { win: "C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe", mac: "/Applications/Docker.app" },
  "Photoshop": { win: "C:\\Program Files\\Adobe\\Adobe Photoshop 2025\\Photoshop.exe", mac: "/Applications/Adobe Photoshop 2025/Adobe Photoshop 2025.app" },
  "Figma": { win: "C:\\Users\\%USER%\\AppData\\Local\\Figma\\Figma.exe", mac: "/Applications/Figma.app" },
  "Excel": { win: "C:\\Program Files\\Microsoft Office\\root\\Office16\\EXCEL.EXE", mac: "/Applications/Microsoft Excel.app" },
  "Postman": { win: "C:\\Users\\%USER%\\AppData\\Local\\Postman\\Postman.exe", mac: "/Applications/Postman.app" },
  "Node.js": { win: "C:\\Program Files\\nodejs\\node.exe", mac: "/usr/local/bin/node" },
  "Git": { win: "C:\\Program Files\\Git\\bin\\git.exe", mac: "/usr/bin/git" },
  "Teams": { win: "C:\\Users\\%USER%\\AppData\\Local\\Microsoft\\Teams\\Update.exe", mac: "/Applications/Microsoft Teams.app" },
  "Outlook": { win: "C:\\Program Files\\Microsoft Office\\root\\Office16\\OUTLOOK.EXE", mac: "/Applications/Microsoft Outlook.app" },
  "Zoom": { win: "C:\\Users\\%USER%\\AppData\\Roaming\\Zoom\\bin\\Zoom.exe", mac: "/Applications/zoom.us.app" },
};

const defaultStockReasons = [
  { id: "sr1", label: "System is slow", category: "performance", icon: "🐌", enabled: true, common: true },
  { id: "sr2", label: "App is slow or crashing", category: "app-issue", icon: "💥", enabled: true, common: true },
  { id: "sr3", label: "Unable to access SaaS/cloud app or site", category: "access", icon: "🌐", enabled: true, common: true },
  { id: "sr4", label: "VPN/Network connectivity issues", category: "network", icon: "📡", enabled: true, common: true },
  { id: "sr5", label: "Printer not working", category: "hardware", icon: "🖨️", enabled: true, common: true },
  { id: "sr6", label: "Can't login / password issue", category: "access", icon: "🔑", enabled: true, common: true },
  { id: "sr7", label: "Blue screen / system crash", category: "performance", icon: "🔵", enabled: true, common: false },
  { id: "sr8", label: "Software installation request", category: "app-issue", icon: "📦", enabled: true, common: false },
  { id: "sr9", label: "Email not syncing", category: "app-issue", icon: "📧", enabled: true, common: false },
  { id: "sr10", label: "Monitor/display issue", category: "hardware", icon: "🖥️", enabled: true, common: false },
  { id: "sr11", label: "Audio/microphone not working", category: "hardware", icon: "🎤", enabled: false, common: false },
  { id: "sr12", label: "USB device not recognized", category: "hardware", icon: "🔌", enabled: false, common: false },
  { id: "sr13", label: "File access / permissions issue", category: "access", icon: "📂", enabled: true, common: false },
  { id: "sr14", label: "Security alert on my device", category: "security", icon: "🛡️", enabled: true, common: false },
  { id: "sr15", label: "Other", category: "other", icon: "💬", enabled: true, common: false },
];

const defaultRemediationGroups = [
  { id: "rg1", name: "Standard IT Maintenance", os: "all", enabled: true, remediations: ["Disk Cleanup", "Network Reset", "Time Sync", "Process Management", "Service Management"], hostGroups: ["All Devices"] },
  { id: "rg2", name: "Windows Security Hardening", os: "windows", enabled: true, remediations: ["Group Policy Refresh", "System File Repair", "Windows Update Reset", "WMI Repair"], hostGroups: ["Windows Devices"] },
  { id: "rg3", name: "macOS Compliance", os: "macos", enabled: true, remediations: ["FileVault Verification", "TCC Permission Reset", "Spotlight Re-index", "DNS Flush"], hostGroups: ["Mac Fleet"] },
  { id: "rg4", name: "Developer Workstations", os: "all", enabled: false, remediations: ["Docker Reset", "Node Cache Clear", "Git Credential Refresh"], hostGroups: ["Engineering"] },
  { id: "rg5", name: "Print & Peripheral Fix", os: "windows", enabled: true, remediations: ["Clear Print Spooler", "USB Driver Reset", "Explorer Restart"], hostGroups: ["Office Desktops"] },
];

// ─── Component ──────────────────────────────────────────────────────────────

export default function ITSupportPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<"queue" | "tickets" | "submit" | "selfservice" | "metrics" | "config">("tickets");
  const [selfServiceFilter, setSelfServiceFilter] = useState<"all" | "performance" | "network" | "display" | "apps" | "security" | "peripherals">("all");
  const [ranRemediations, setRanRemediations] = useState<Set<string>>(new Set());
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [selectedApp, setSelectedApp] = useState<string | null>(null);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [ticketDescription, setTicketDescription] = useState("");
  const [stockReasons, setStockReasons] = useState(defaultStockReasons);
  const [remediationGroups, setRemediationGroups] = useState(defaultRemediationGroups);
  const [editingNewReason, setEditingNewReason] = useState(false);
  const [newReasonLabel, setNewReasonLabel] = useState("");
  const [loading, setLoading] = useState(true);
  const [commandLogs, setCommandLogs] = useState<CommandLog[]>([]);
  const [showLogPanel, setShowLogPanel] = useState(false);
  const [logPanelMinimized, setLogPanelMinimized] = useState(false);
  const [runningCommands, setRunningCommands] = useState<Set<string>>(new Set());
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [viewingTicket, setViewingTicket] = useState<string | null>(null);
  const [ticketMessages, setTicketMessages] = useState<TicketMessageData[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [ticketFilter, setTicketFilter] = useState<"all" | "active" | "mine">("all");
  const [submittingTicket, setSubmittingTicket] = useState(false);
  const [assignTo, setAssignTo] = useState<string>("");
  const [orgUsers, setOrgUsers] = useState<{ id: string; name: string; email: string; role: string }[]>([]);
  const [orgMetrics, setOrgMetrics] = useState<OrgMetrics | null>(null);
  const [agentMetrics, setAgentMetrics] = useState<AgentMetric[]>([]);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch real devices from API
  useEffect(() => {
    async function fetchDevices() {
      try {
        const res = await fetch("/api/v1/agents/devices");
        if (res.ok) {
          const data = await res.json();
          setDevices(data.devices || []);
        }
      } catch {
        // API not available — leave empty
      } finally {
        setLoading(false);
      }
    }
    fetchDevices();

    // Fetch org users for assignment dropdown
    async function fetchOrgUsers() {
      try {
        const res = await fetch("/api/v1/employees");
        if (res.ok) {
          const data = await res.json();
          setOrgUsers((data.employees || data || []).map((u: { id: string; name: string; email: string; role: string }) => ({
            id: u.id, name: u.name, email: u.email, role: u.role,
          })));
        }
      } catch { /* ignore */ }
    }
    fetchOrgUsers();
  }, []);

  const device = selectedDevice ? devices.find(d => d.hostname === selectedDevice) : null;
  const isWindows = device?.platform === "win32" || device?.platform?.toLowerCase() === "windows";
  const isMac = device?.platform === "darwin" || device?.platform?.toLowerCase() === "macos";
  const deviceApps = device?.installedSoftware || [];

  // Auto-scroll log panel
  useEffect(() => {
    if (logEndRef.current && showLogPanel && !logPanelMinimized) {
      logEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [commandLogs, showLogPanel, logPanelMinimized]);

  // Poll for command status updates
  const pollCommandStatus = useCallback(async (logId: string, commandId: string) => {
    try {
      const res = await fetch(`/api/v1/agents/commands?status=COMPLETED&status=FAILED`);
      if (!res.ok) return;
      const data = await res.json();
      const cmd = data.commands?.find((c: { id: string }) => c.id === commandId);
      if (cmd && (cmd.status === "COMPLETED" || cmd.status === "FAILED")) {
        setCommandLogs(prev => prev.map(l =>
          l.id === logId ? {
            ...l,
            status: cmd.status,
            result: cmd.result || (cmd.status === "COMPLETED" ? "Command executed successfully." : "Command execution failed."),
            exitCode: cmd.exitCode,
            completedAt: new Date(),
          } : l
        ));
        setRunningCommands(prev => { const s = new Set(prev); s.delete(logId); return s; });
        return true; // done polling
      }
    } catch { /* ignore */ }
    return false;
  }, []);

  // Execute a remediation command
  const executeRemediation = useCallback(async (title: string, script: string, targetDevice?: DeviceInfo) => {
    const dev = targetDevice || device;
    if (!dev) return;

    const logId = `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newLog: CommandLog = {
      id: logId,
      title,
      script,
      deviceId: dev.id,
      deviceName: dev.hostname,
      status: "PENDING",
      issuedAt: new Date(),
    };

    setCommandLogs(prev => [newLog, ...prev]);
    setShowLogPanel(true);
    setLogPanelMinimized(false);
    setRunningCommands(prev => new Set(prev).add(logId));

    try {
      // Send command to the API
      const res = await fetch("/api/v1/agents/commands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId: dev.id,
          commandType: "RUN_SCRIPT",
          command: script,
          description: `IT Support: ${title}`,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        setCommandLogs(prev => prev.map(l =>
          l.id === logId ? {
            ...l,
            status: "FAILED" as const,
            result: `Failed to send command: ${err.error || res.statusText}`,
            completedAt: new Date(),
          } : l
        ));
        setRunningCommands(prev => { const s = new Set(prev); s.delete(logId); return s; });
        return;
      }

      const cmdData = await res.json();
      setCommandLogs(prev => prev.map(l =>
        l.id === logId ? { ...l, status: "SENT" as const, commandId: cmdData.id } : l
      ));

      // Poll for completion (every 3 seconds, up to 2 minutes)
      let attempts = 0;
      const maxAttempts = 40;
      const pollInterval = setInterval(async () => {
        attempts++;
        const done = await pollCommandStatus(logId, cmdData.id);
        if (done || attempts >= maxAttempts) {
          clearInterval(pollInterval);
          if (attempts >= maxAttempts) {
            setCommandLogs(prev => prev.map(l =>
              l.id === logId && l.status !== "COMPLETED" && l.status !== "FAILED" ? {
                ...l,
                status: "COMPLETED" as const,
                result: "Command sent to device. Awaiting agent pickup — the agent will execute this when it next checks in.",
                completedAt: new Date(),
              } : l
            ));
            setRunningCommands(prev => { const s = new Set(prev); s.delete(logId); return s; });
          }
        }
      }, 3000);
    } catch (err) {
      setCommandLogs(prev => prev.map(l =>
        l.id === logId ? {
          ...l,
          status: "FAILED" as const,
          result: `Network error: ${err instanceof Error ? err.message : "Unknown error"}`,
          completedAt: new Date(),
        } : l
      ));
      setRunningCommands(prev => { const s = new Set(prev); s.delete(logId); return s; });
    }
  }, [device, pollCommandStatus]);

  // Fetch all org tickets (admin view)
  const fetchTickets = useCallback(async () => {
    setTicketsLoading(true);
    try {
      const params = new URLSearchParams();
      if (ticketFilter === "active") params.set("status", "active");
      if (ticketFilter === "mine") params.set("mine", "true");
      const res = await fetch(`/api/v1/tickets?${params}`);
      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets || []);
      }
    } catch { /* ignore */ } finally {
      setTicketsLoading(false);
    }
  }, [ticketFilter]);

  // Fetch tickets on mount (for KPI) and when viewing tickets tab
  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  useEffect(() => {
    if (activeTab === "tickets") fetchTickets();
  }, [activeTab, fetchTickets]);

  // Submit ticket from admin
  const submitTicket = async () => {
    if (!selectedReason || !selectedDevice) return;
    setSubmittingTicket(true);
    try {
      const reason = stockReasons.find(r => r.id === selectedReason);
      const dev = devices.find(d => d.hostname === selectedDevice);
      const subject = `${reason?.label || "Support Request"}${selectedApp ? ` — ${selectedApp}` : ""}${dev ? ` (${dev.hostname})` : ""}`;
      const autoInfo = [
        `Issue: ${reason?.label}`,
        dev ? `Device: ${dev.hostname} (${dev.platform})` : null,
        dev ? `IP: ${dev.ipAddress}` : null,
        selectedApp ? `Application: ${selectedApp}` : null,
      ].filter(Boolean).join("\n");
      const fullDescription = ticketDescription
        ? `${ticketDescription}\n\n--- Auto-captured Info ---\n${autoInfo}`
        : autoInfo;

      const res = await fetch("/api/v1/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          category: reason?.category || "other",
          reason: reason?.label,
          appName: selectedApp || undefined,
          description: fullDescription,
          deviceId: dev?.id,
          deviceInfo: dev ? { hostname: dev.hostname, platform: dev.platform, ipAddress: dev.ipAddress } : undefined,
          assignedTo: assignTo || undefined,
        }),
      });
      if (res.ok) {
        setSelectedReason(null);
        setSelectedApp(null);
        setTicketDescription("");
        setAssignTo("");
        setActiveTab("tickets");
        fetchTickets();
      } else {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        alert(`Failed to submit ticket: ${err.error || res.statusText}`);
      }
    } catch (error) {
      alert(`Network error: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setSubmittingTicket(false);
    }
  };

  // Fetch messages for a ticket
  const fetchMessages = useCallback(async (ticketId: string) => {
    try {
      const res = await fetch(`/api/v1/tickets/${ticketId}/messages`);
      if (res.ok) {
        const data = await res.json();
        setTicketMessages(data.messages || []);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (viewingTicket) {
      fetchMessages(viewingTicket);
      const interval = setInterval(() => fetchMessages(viewingTicket), 5000);
      return () => clearInterval(interval);
    }
  }, [viewingTicket, fetchMessages]);

  // Send a message on a ticket
  const sendMessage = async () => {
    if (!viewingTicket || !newMessage.trim()) return;
    setSendingMessage(true);
    try {
      const res = await fetch(`/api/v1/tickets/${viewingTicket}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: newMessage.trim(), isInternal: isInternalNote }),
      });
      if (res.ok) {
        setNewMessage("");
        setIsInternalNote(false);
        fetchMessages(viewingTicket);
        fetchTickets();
      }
    } catch { /* ignore */ } finally {
      setSendingMessage(false);
    }
  };

  // Update ticket status/assignment
  const updateTicket = async (ticketId: string, updates: Record<string, unknown>) => {
    try {
      await fetch("/api/v1/tickets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: ticketId, ...updates }),
      });
      fetchTickets();
      if (viewingTicket === ticketId) fetchMessages(ticketId);
    } catch { /* ignore */ }
  };

  // Fetch metrics
  const fetchMetrics = useCallback(async () => {
    setMetricsLoading(true);
    try {
      const res = await fetch("/api/v1/tickets?metrics=true");
      if (res.ok) {
        const data = await res.json();
        setOrgMetrics(data.metrics || null);
        setAgentMetrics(data.agentMetrics || []);
      }
    } catch { /* ignore */ } finally {
      setMetricsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "metrics") fetchMetrics();
  }, [activeTab, fetchMetrics]);

  // SLA helper: time remaining or overdue
  const getSlaStatus = (dueDate?: string, breached?: boolean) => {
    if (!dueDate) return null;
    const now = Date.now();
    const due = new Date(dueDate).getTime();
    const diff = due - now;
    if (breached || diff < 0) {
      const overdue = Math.abs(diff);
      const hours = Math.floor(overdue / 3600000);
      const mins = Math.floor((overdue % 3600000) / 60000);
      return { overdue: true, text: hours > 0 ? `${hours}h ${mins}m overdue` : `${mins}m overdue`, color: "text-red-600" };
    }
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    const urgent = diff < 3600000; // less than 1 hour
    return { overdue: false, text: hours > 0 ? `${hours}h ${mins}m left` : `${mins}m left`, color: urgent ? "text-orange-600" : "text-green-600" };
  };

  const formatMinutes = (mins: number | null) => {
    if (mins === null) return "--";
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  useEffect(() => {
    if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [ticketMessages]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Wrench className="h-6 w-6" /> IT Support &amp; Remediation
        </h1>
        <p className="text-muted-foreground text-sm">
          Resolve digital friction, enforce compliance, and maintain fleet health — remotely and at scale.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-5">
        {[
          { label: "Enrolled Devices", value: String(devices.length), icon: Monitor, color: "text-blue-600" },
          { label: "Online Now", value: String(devices.filter(d => d.status === "ONLINE").length), icon: Zap, color: "text-green-600" },
          { label: "Open Tickets", value: String(tickets.filter(t => ["OPEN", "IN_PROGRESS", "WAITING_ON_USER", "WAITING_ON_IT"].includes(t.status)).length), icon: ClipboardList, color: "text-amber-600" },
          { label: "Compliance Score", value: "--", icon: ShieldCheck, color: "text-indigo-600" },
          { label: "Avg Resolution", value: "--", icon: Timer, color: "text-purple-600" },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-4 pb-3 text-center">
              <stat.icon className={`h-5 w-5 mx-auto mb-1 ${stat.color}`} />
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Sub-Tab Navigation */}
      <div className="flex gap-1 bg-muted/50 p-1 rounded-lg w-fit">
        {([
          { id: "queue" as const, label: "Remediation Queue", icon: Activity },
          { id: "tickets" as const, label: "Support Tickets", icon: ClipboardList },
          { id: "submit" as const, label: "Submit Ticket", icon: UserPlus },
          { id: "selfservice" as const, label: "Self-Service Fix", icon: LifeBuoy },
          { id: "metrics" as const, label: "Metrics", icon: BarChart3 },
          { id: "config" as const, label: "Configuration", icon: Settings },
        ]).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === tab.id ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <tab.icon className="h-3.5 w-3.5" />{tab.label}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* TAB: REMEDIATION QUEUE                                     */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {activeTab === "queue" && (
        <>
          {/* Advanced Capabilities */}
          <Card>
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Zap className="h-5 w-5 text-amber-500" /> Advanced Capabilities</CardTitle></CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[
                  { title: "Offline Remediation", icon: WifiOff, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30", desc: "Execute scripts even when disconnected. Commands queue and run on reconnect.", status: "Active", sc: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
                  { title: "Compliance Drift Monitoring", icon: ShieldAlert, color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/30", desc: "Detect and auto-correct unauthorized registry changes, file modifications, or disabled security tools.", status: "Monitoring", sc: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
                  { title: "Zero-Day Patching", icon: Bug, color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-950/30", desc: "Rapid patch deployment across the entire fleet within minutes of a threat announcement.", status: "Ready", sc: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
                  { title: "Resource Reclamation", icon: Recycle, color: "text-teal-600", bg: "bg-teal-50 dark:bg-teal-950/30", desc: "Auto-uninstall unused licenses and kill zombie processes to reclaim resources.", status: "Enabled", sc: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
                  { title: "Ransomware Rollback", icon: RotateCcw, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950/30", desc: "Detect anomalous encryption and auto-revert via VSS / Time Machine.", status: "Monitoring", sc: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
                  { title: "Carbon Reporting", icon: Leaf, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/30", desc: "Track power consumption and device age to optimize refresh cycles.", status: "Enabled", sc: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
                ].map((c) => (
                  <div key={c.title} className={`rounded-xl border p-4 ${c.bg}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2"><c.icon className={`h-5 w-5 ${c.color}`} /><span className="font-semibold text-sm">{c.title}</span></div>
                      <Badge className={`text-[10px] ${c.sc}`}>{c.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{c.desc}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Device Selector for Targeted Remediations */}
          <Card>
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Monitor className="h-5 w-5 text-indigo-500" /> Targeted Device Remediation</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading devices...</p>
              ) : devices.length === 0 ? (
                <div className="text-center py-8">
                  <Monitor className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No devices enrolled yet.</p>
                  <p className="text-xs text-muted-foreground mt-1">Deploy the MyDex agent on your devices to enable remediations.</p>
                  <Button size="sm" variant="outline" className="mt-3" onClick={() => window.location.href = "/settings/agent-setup"}>
                    <Download className="h-3.5 w-3.5 mr-1.5" /> Agent Setup
                  </Button>
                </div>
              ) : (
                <>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Select a device to see OS-specific remediations:</label>
                    <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
                      {devices.map((dev) => (
                        <button key={dev.id} onClick={() => setSelectedDevice(selectedDevice === dev.hostname ? null : dev.hostname)}
                          className={`p-3 rounded-lg border text-left transition-all ${selectedDevice === dev.hostname ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 ring-1 ring-indigo-500" : "hover:bg-muted/30"}`}>
                          <div className="flex items-center gap-2 mb-1">
                            <div className={`w-2 h-2 rounded-full ${dev.status === "ONLINE" ? "bg-green-500" : "bg-red-400"}`} />
                            <span className="text-sm font-medium truncate">{dev.hostname}</span>
                          </div>
                          <div className="text-[11px] text-muted-foreground">{dev.user?.name || "Unknown User"}</div>
                          <div className="text-[11px] text-muted-foreground">{dev.platform === "win32" || dev.platform?.toLowerCase() === "windows" ? "🪟 Windows" : "🍎 macOS"} &bull; {dev.ipAddress}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {device && (
                    <div className="space-y-4 pt-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Badge variant="outline">{isWindows ? "🪟 Windows" : "🍎 macOS"}</Badge>
                        <span className="font-medium">{device.hostname}</span>
                        <span className="text-muted-foreground">({device.user?.name})</span>
                        <span className="text-muted-foreground">&bull; {device.osVersion}</span>
                      </div>

                      {/* OS-Specific Quick Actions */}
                      <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                        {[
                          { title: "Kill Hung Process", icon: CircleStop, code: isWindows ? "Get-Process | Where {$_.Responding -eq $false} | Stop-Process -Force" : "kill -9 $(ps aux | awk 'NR>1 && $8~/Z/{print $2}')" },
                          { title: "Flush DNS", icon: Wifi, code: isWindows ? "ipconfig /flushdns" : "sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder" },
                          { title: "Disk Cleanup", icon: Trash2, code: isWindows ? "Remove-Item -Path \"$env:TEMP\\*\" -Recurse -Force -EA SilentlyContinue" : "rm -rf ~/Library/Caches/* ~/Library/Logs/*" },
                        ].map((a) => {
                          const cmdKey = `queue_${a.title}`;
                          const isRunning = runningCommands.has(cmdKey);
                          const hasRun = commandLogs.some(l => l.title === a.title && l.deviceId === device?.id && (l.status === "COMPLETED" || l.status === "SENT"));
                          return (
                          <div key={a.title} className="rounded-lg border overflow-hidden">
                            <div className="flex items-center justify-between p-2.5 bg-muted/30">
                              <div className="flex items-center gap-2"><a.icon className="h-4 w-4 text-blue-600" /><span className="text-sm font-medium">{a.title}</span></div>
                              <Button size="sm" variant="outline" className={`text-[11px] h-7 ${hasRun ? "border-green-400 text-green-700" : ""}`}
                                disabled={isRunning}
                                onClick={() => executeRemediation(a.title, a.code)}>
                                {isRunning ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Running...</> : hasRun ? <><CheckCircle className="h-3 w-3 mr-1" />Sent</> : <><Play className="h-3 w-3 mr-1" />Run</>}
                              </Button>
                            </div>
                            <div className="bg-gray-950 text-green-400 p-2 font-mono text-[11px] overflow-x-auto"><pre className="whitespace-pre-wrap">{a.code}</pre></div>
                          </div>
                          );
                        })}
                        {isWindows && [
                          { title: "SFC / DISM Repair", icon: HardDrive, code: "sfc /scannow\nDISM /Online /Cleanup-Image /RestoreHealth" },
                          { title: "GP Update", icon: RefreshCw, code: "gpupdate /force" },
                          { title: "Print Spooler Reset", icon: PrinterCheck, code: "Stop-Service Spooler -Force\nRemove-Item \"$env:SystemRoot\\System32\\spool\\PRINTERS\\*\" -Force\nStart-Service Spooler" },
                          { title: "Explorer Restart", icon: Monitor, code: "Stop-Process -Name explorer -Force; Start-Process explorer" },
                          { title: "Windows Update Reset", icon: Download, code: "Stop-Service wuauserv -Force\nRemove-Item \"C:\\Windows\\SoftwareDistribution\\*\" -Recurse -Force\nStart-Service wuauserv" },
                        ].map((a) => {
                          const hasRun = commandLogs.some(l => l.title === a.title && l.deviceId === device?.id && (l.status === "COMPLETED" || l.status === "SENT"));
                          return (
                          <div key={a.title} className="rounded-lg border overflow-hidden">
                            <div className="flex items-center justify-between p-2.5 bg-muted/30">
                              <div className="flex items-center gap-2"><a.icon className="h-4 w-4 text-cyan-600" /><span className="text-sm font-medium">{a.title}</span></div>
                              <Button size="sm" variant="outline" className={`text-[11px] h-7 ${hasRun ? "border-green-400 text-green-700" : ""}`}
                                onClick={() => executeRemediation(a.title, a.code)}>
                                {hasRun ? <><CheckCircle className="h-3 w-3 mr-1" />Sent</> : <><Play className="h-3 w-3 mr-1" />Run</>}
                              </Button>
                            </div>
                            <div className="bg-gray-950 text-green-400 p-2 font-mono text-[11px] overflow-x-auto"><pre className="whitespace-pre-wrap">{a.code}</pre></div>
                          </div>
                          );
                        })}
                        {isMac && [
                          { title: "Reset TCC Permissions", icon: Lock, code: "tccutil reset All <bundle-id>" },
                          { title: "Spotlight Re-index", icon: Search, code: "mdutil -i on /\nmdutil -E /" },
                          { title: "FileVault Check", icon: Lock, code: "fdesetup status" },
                          { title: "Dock/Finder Restart", icon: RefreshCw, code: "killall Finder; killall Dock" },
                          { title: "SystemUIServer", icon: Monitor, code: "killall SystemUIServer" },
                        ].map((a) => {
                          const hasRun = commandLogs.some(l => l.title === a.title && l.deviceId === device?.id && (l.status === "COMPLETED" || l.status === "SENT"));
                          return (
                          <div key={a.title} className="rounded-lg border overflow-hidden">
                            <div className="flex items-center justify-between p-2.5 bg-muted/30">
                              <div className="flex items-center gap-2"><a.icon className="h-4 w-4 text-gray-500 dark:text-gray-400" /><span className="text-sm font-medium">{a.title}</span></div>
                              <Button size="sm" variant="outline" className={`text-[11px] h-7 ${hasRun ? "border-green-400 text-green-700" : ""}`}
                                onClick={() => executeRemediation(a.title, a.code)}>
                                {hasRun ? <><CheckCircle className="h-3 w-3 mr-1" />Sent</> : <><Play className="h-3 w-3 mr-1" />Run</>}
                              </Button>
                            </div>
                            <div className="bg-gray-950 text-green-400 p-2 font-mono text-[11px] overflow-x-auto"><pre className="whitespace-pre-wrap">{a.code}</pre></div>
                          </div>
                          );
                        })}
                      </div>

                      {/* Security Remediations */}
                      <div className="grid gap-2 md:grid-cols-2">
                        {[
                          { title: "Certificate Injection", icon: Lock, desc: "Push missing certs to system store", status: "Check required", sc: "text-amber-600", script: isWindows ? "certutil -pulse" : "security find-certificate -a /System/Library/Keychains/SystemRootCertificates.keychain | head -20" },
                          { title: "Agent Health Recovery", icon: ShieldCheck, desc: "Restart EDR/AV agent on this device", status: "Healthy", sc: "text-green-600", script: isWindows ? "Restart-Service WinDefend -Force\nGet-Service WinDefend | Select Status" : "sudo launchctl kickstart -kp system/com.apple.ManagedClient\necho 'Agent restarted'" },
                          { title: "Local Admin Removal", icon: XCircle, desc: "Strip unauthorized admin privileges", status: "Compliant", sc: "text-green-600", script: isWindows ? "Get-LocalGroupMember -Group 'Administrators' | Format-Table" : "dscl . -read /Groups/admin GroupMembership" },
                          { title: "Unauthorized App Removal", icon: XCircle, desc: "Remove blacklisted software", status: "No violations", sc: "text-green-600", script: isWindows ? "Get-AppxPackage | Where {$_.Name -match 'unauthorized'} | Select Name,Version" : "ls /Applications | head -30" },
                        ].map((r) => {
                          const hasRun = commandLogs.some(l => l.title === r.title && l.deviceId === device?.id && (l.status === "COMPLETED" || l.status === "SENT"));
                          return (
                          <div key={r.title} className="flex items-start gap-3 p-3 rounded-lg border">
                            <r.icon className="h-4 w-4 text-red-500 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium">{r.title}</div>
                              <div className="text-xs text-muted-foreground">{r.desc}</div>
                              <div className={`text-xs font-medium mt-1 ${r.sc}`}>{r.status}</div>
                            </div>
                            <Button size="sm" variant="outline" className={`text-xs shrink-0 ${hasRun ? "border-green-400 text-green-700" : ""}`}
                              onClick={() => executeRemediation(r.title, r.script)}>
                              {hasRun ? <><CheckCircle className="h-3 w-3 mr-1" />Sent</> : "Run"}
                            </Button>
                          </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* TAB: SUPPORT TICKETS                                       */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {activeTab === "tickets" && (
        <>
          {viewingTicket ? (() => {
            const ticket = tickets.find(t => t.id === viewingTicket);
            if (!ticket) return null;
            const statusColors: Record<string, string> = { OPEN: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200", IN_PROGRESS: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200", WAITING_ON_USER: "bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200", WAITING_ON_IT: "bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200", RESOLVED: "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200", CLOSED: "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200" };
            const priorityColors: Record<string, string> = { LOW: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300", MEDIUM: "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300", HIGH: "bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300", URGENT: "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300" };
            return (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Button variant="ghost" size="sm" onClick={() => { setViewingTicket(null); setTicketMessages([]); }}><ArrowLeft className="h-4 w-4" /></Button>
                    <div className="flex-1">
                      <CardTitle className="text-lg">{ticket.subject}</CardTitle>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge className={`text-[10px] ${statusColors[ticket.status] || "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200"}`}>{ticket.status.replace(/_/g, " ")}</Badge>
                        <Badge className={`text-[10px] ${priorityColors[ticket.priority] || ""}`}>{ticket.priority}</Badge>
                        <span className="text-xs text-muted-foreground">by {ticket.submitter.name} ({ticket.submitter.email})</span>
                        {ticket.device && <span className="text-xs text-muted-foreground">{ticket.device.hostname}</span>}
                        <span className="text-xs text-muted-foreground">{new Date(ticket.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                    {/* Status actions */}
                    <div className="flex items-center gap-2">
                      {ticket.assignee && ticket.assignee.id === session?.user?.id ? (
                        <Badge className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Assigned: {ticket.assignee.name}</Badge>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => updateTicket(ticket.id, { status: "IN_PROGRESS", assignedTo: session?.user?.id })}>Assign to Me</Button>
                      )}
                      {!["RESOLVED", "CLOSED"].includes(ticket.status) && (
                        <>
                          {ticket.firstResponseAt && <Button size="sm" variant="outline" className="text-orange-600" onClick={() => updateTicket(ticket.id, { status: "WAITING_ON_USER" })}>Waiting on User</Button>}
                          <Button size="sm" variant="outline" className="text-red-600 border-red-300" onClick={() => updateTicket(ticket.id, { status: "CLOSED" })}>Close</Button>
                        </>
                      )}
                      {ticket.status === "RESOLVED" && <Button size="sm" variant="outline" className="text-red-600 border-red-300" onClick={() => updateTicket(ticket.id, { status: "CLOSED" })}>Close</Button>}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* SLA Timer Bar */}
                  {["OPEN", "IN_PROGRESS", "WAITING_ON_USER", "WAITING_ON_IT"].includes(ticket.status) && (
                    <div className="flex gap-3">
                      {!ticket.firstResponseAt && (() => {
                        const sla = getSlaStatus(ticket.slaResponseDue, ticket.slaResponseBreached);
                        return sla ? (
                          <div className={`flex-1 rounded-lg border p-2 ${sla.overdue ? "border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-950/20" : "border-green-300 dark:border-green-600 bg-green-50 dark:bg-green-950/20"}`}>
                            <div className="text-[10px] text-muted-foreground">First Response SLA</div>
                            <div className={`text-sm font-bold ${sla.color}`}>{sla.text}</div>
                          </div>
                        ) : null;
                      })()}
                      {(() => {
                        const sla = getSlaStatus(ticket.slaResolutionDue, ticket.slaResolutionBreached);
                        return sla ? (
                          <div className={`flex-1 rounded-lg border p-2 ${sla.overdue ? "border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-950/20" : "border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-950/20"}`}>
                            <div className="text-[10px] text-muted-foreground">Resolution SLA</div>
                            <div className={`text-sm font-bold ${sla.color}`}>{sla.text}</div>
                          </div>
                        ) : null;
                      })()}
                      {ticket.firstResponseAt && (
                        <div className="flex-1 rounded-lg border p-2 border-green-300 dark:border-green-600 bg-green-50 dark:bg-green-950/20">
                          <div className="text-[10px] text-muted-foreground">First Response</div>
                          <div className="text-sm font-bold text-green-600">{formatMinutes(Math.round((new Date(ticket.firstResponseAt).getTime() - new Date(ticket.createdAt).getTime()) / 60000))}</div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Ticket info row */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {ticket.reason && <div className="rounded-lg border p-2"><div className="text-[10px] text-muted-foreground">Issue</div><div className="text-sm font-medium">{ticket.reason}</div></div>}
                    {ticket.appName && <div className="rounded-lg border p-2"><div className="text-[10px] text-muted-foreground">Application</div><div className="text-sm font-medium">{ticket.appName}</div></div>}
                    {ticket.device && <div className="rounded-lg border p-2"><div className="text-[10px] text-muted-foreground">Device</div><div className="text-sm font-medium">{ticket.device.hostname}</div></div>}
                    {ticket.assignee && <div className="rounded-lg border p-2"><div className="text-[10px] text-muted-foreground">Assigned To</div><div className="text-sm font-medium">{ticket.assignee.name}</div></div>}
                  </div>

                  {ticket.description && (
                    <div className="rounded-lg border bg-muted/20 p-3">
                      <div className="text-xs font-medium text-muted-foreground mb-1">Description</div>
                      <p className="text-sm">{ticket.description}</p>
                    </div>
                  )}

                  {/* Messages thread */}
                  <div className="border rounded-lg">
                    <div className="px-3 py-2 border-b bg-muted/30">
                      <div className="flex items-center gap-2 text-sm font-medium"><MessageCircle className="h-4 w-4" /> Conversation ({ticketMessages.length})</div>
                    </div>
                    <div className="max-h-96 overflow-y-auto p-3 space-y-3">
                      {ticketMessages.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-6">No messages yet. Send a reply to the user.</p>
                      ) : (
                        ticketMessages.map((msg) => {
                          const isMe = msg.user.id === session?.user?.id;
                          const isIT = msg.user.role === "ADMIN" || msg.user.role === "SUPER_ADMIN";
                          return (
                            <div key={msg.id} className={`flex ${isIT ? "justify-end" : "justify-start"}`}>
                              <div className={`max-w-[75%] rounded-xl px-3 py-2 ${msg.isInternal ? "bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-300 dark:border-yellow-700" : isIT ? "bg-blue-600 text-white" : "bg-muted"}`}>
                                <div className={`text-[10px] font-medium mb-0.5 ${msg.isInternal ? "text-yellow-700 dark:text-yellow-300" : isIT ? "text-blue-200" : "text-muted-foreground"}`}>
                                  {msg.user.name} {isIT && <Badge className="text-[8px] ml-1 bg-green-100 text-green-700 px-1 py-0">IT</Badge>}
                                  {msg.isInternal && <Badge className="text-[8px] ml-1 bg-yellow-100 text-yellow-700 px-1 py-0">Internal Note</Badge>}
                                </div>
                                <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                                <div className={`text-[9px] mt-1 ${msg.isInternal ? "text-yellow-600" : isIT ? "text-blue-200" : "text-muted-foreground"}`}>{new Date(msg.createdAt).toLocaleString()}</div>
                              </div>
                            </div>
                          );
                        })
                      )}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Message input with internal note toggle */}
                    {!["CLOSED"].includes(ticket.status) && (
                      <div className="border-t p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <button onClick={() => setIsInternalNote(false)}
                            className={`text-xs px-2 py-1 rounded ${!isInternalNote ? "bg-blue-100 text-blue-700 font-medium" : "text-muted-foreground hover:text-foreground"}`}>
                            Reply to User
                          </button>
                          <button onClick={() => setIsInternalNote(true)}
                            className={`text-xs px-2 py-1 rounded ${isInternalNote ? "bg-yellow-100 text-yellow-700 font-medium" : "text-muted-foreground hover:text-foreground"}`}>
                            Internal Note
                          </button>
                        </div>
                        <div className="flex gap-2">
                          <textarea
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                            placeholder={isInternalNote ? "Add an internal note (not visible to user)..." : "Reply to user..."}
                            className={`flex-1 h-10 rounded-lg border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 ${isInternalNote ? "focus:ring-yellow-500 border-yellow-300" : "focus:ring-blue-500"}`}
                          />
                          <Button onClick={sendMessage} disabled={!newMessage.trim() || sendingMessage}
                            className={isInternalNote ? "bg-yellow-600 hover:bg-yellow-700 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"}>
                            {sendingMessage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })() : (
            (() => {
              const statusColors: Record<string, string> = { OPEN: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200", IN_PROGRESS: "bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200", WAITING_ON_USER: "bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200", WAITING_ON_IT: "bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200", RESOLVED: "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200", CLOSED: "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200" };
              const priorityColors: Record<string, string> = { LOW: "", MEDIUM: "", HIGH: "border-orange-300", URGENT: "border-red-400 bg-red-50/30 dark:bg-red-950/20" };
              const openTickets = tickets.filter(t => !["RESOLVED", "CLOSED"].includes(t.status));
              const resolvedTickets = tickets.filter(t => t.status === "RESOLVED");
              const closedTickets = tickets.filter(t => t.status === "CLOSED");

              const renderTicket = (ticket: TicketData) => (
                <button key={ticket.id} onClick={() => { setViewingTicket(ticket.id); fetchMessages(ticket.id); }}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left hover:bg-muted/30 transition-colors ${priorityColors[ticket.priority] || ""}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{ticket.subject}</span>
                      <Badge className={`text-[10px] shrink-0 ${statusColors[ticket.status] || ""}`}>{ticket.status.replace(/_/g, " ")}</Badge>
                      {ticket.priority === "HIGH" && <Badge className="text-[10px] bg-orange-100 text-orange-700 shrink-0">HIGH</Badge>}
                      {ticket.priority === "URGENT" && <Badge className="text-[10px] bg-red-100 text-red-700 shrink-0">URGENT</Badge>}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>{ticket.submitter.name}</span>
                      {ticket.device && <span>{ticket.device.hostname}</span>}
                      <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                      {ticket._count && ticket._count.messages > 0 && (
                        <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" />{ticket._count.messages}</span>
                      )}
                      {ticket.assignee && <span className="text-blue-600">Assigned: {ticket.assignee.name}</span>}
                      {ticket.satisfactionRating && (
                        <span className="flex items-center gap-0.5">{[1,2,3,4,5].map(s => <Star key={s} className={`h-2.5 w-2.5 ${s <= ticket.satisfactionRating! ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />)}</span>
                      )}
                    </div>
                  </div>
                  {/* SLA indicator */}
                  {["OPEN", "IN_PROGRESS", "WAITING_ON_USER", "WAITING_ON_IT"].includes(ticket.status) && (() => {
                    const responseSla = !ticket.firstResponseAt ? getSlaStatus(ticket.slaResponseDue, ticket.slaResponseBreached) : null;
                    const resolutionSla = getSlaStatus(ticket.slaResolutionDue, ticket.slaResolutionBreached);
                    const sla = responseSla || resolutionSla;
                    return sla ? (
                      <div className={`text-[10px] font-medium shrink-0 ${sla.color}`}>
                        {responseSla ? <><AlertOctagon className="h-3 w-3 inline mr-0.5" />Respond: {sla.text}</> : <>Resolve: {sla.text}</>}
                      </div>
                    ) : null;
                  })()}
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              );

              return (
                <div className="space-y-6">
                  {/* Header with filters */}
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold flex items-center gap-2"><ClipboardList className="h-5 w-5 text-amber-500" /> Support Tickets</h2>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1 bg-muted/50 p-0.5 rounded-md">
                        {([{ id: "active" as const, label: "Active" }, { id: "all" as const, label: "All" }, { id: "mine" as const, label: "My Tickets" }]).map(f => (
                          <button key={f.id} onClick={() => setTicketFilter(f.id)}
                            className={`text-xs px-2 py-1 rounded ${ticketFilter === f.id ? "bg-background shadow font-medium" : "text-muted-foreground hover:text-foreground"}`}>{f.label}</button>
                        ))}
                      </div>
                      <Button size="sm" onClick={() => setActiveTab("submit")}><UserPlus className="h-3.5 w-3.5 mr-1.5" /> New Ticket</Button>
                    </div>
                  </div>

                  {ticketsLoading ? (
                    <Card><CardContent className="py-8"><div className="text-center"><Loader2 className="h-6 w-6 mx-auto animate-spin text-muted-foreground" /></div></CardContent></Card>
                  ) : tickets.length === 0 ? (
                    <Card>
                      <CardContent className="py-12">
                        <div className="text-center">
                          <ClipboardList className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
                          <p className="text-sm font-medium">No support tickets yet</p>
                          <p className="text-xs text-muted-foreground mt-1">Tickets submitted by users will appear here with device info, network data, and app details.</p>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <>
                      {/* Open Tickets */}
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Activity className="h-4 w-4 text-blue-500" />
                            Open Tickets
                            {openTickets.length > 0 && <Badge className="text-[10px] bg-blue-100 text-blue-800">{openTickets.length}</Badge>}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {openTickets.length === 0 ? (
                            <div className="text-center py-6">
                              <CheckCircle className="h-8 w-8 mx-auto text-green-400 mb-2" />
                              <p className="text-sm font-medium text-muted-foreground">No Open Tickets</p>
                              <p className="text-xs text-muted-foreground mt-1">All tickets are resolved or closed.</p>
                            </div>
                          ) : (
                            <div className="space-y-2">{openTickets.map(renderTicket)}</div>
                          )}
                        </CardContent>
                      </Card>

                      {/* Resolved Tickets */}
                      {resolvedTickets.length > 0 && (
                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              Resolved Tickets
                              <Badge className="text-[10px] bg-green-100 text-green-800">{resolvedTickets.length}</Badge>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">{resolvedTickets.map(renderTicket)}</div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Closed Tickets */}
                      {closedTickets.length > 0 && (
                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                              <XCircle className="h-4 w-4 text-gray-400" />
                              Closed Tickets
                              <Badge className="text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">{closedTickets.length}</Badge>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">{closedTickets.map(renderTicket)}</div>
                          </CardContent>
                        </Card>
                      )}
                    </>
                  )}
                </div>
              );
            })()
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* TAB: SUBMIT TICKET                                         */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {activeTab === "submit" && (
        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><UserPlus className="h-5 w-5 text-blue-500" /> Submit a Support Ticket</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            {/* Step 1: Device */}
            <div>
              <label className="text-sm font-medium mb-2 block">1. Select your device</label>
              {devices.length === 0 ? (
                <p className="text-sm text-muted-foreground">No devices enrolled. Deploy the agent first.</p>
              ) : (
                <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
                  {devices.map((dev) => (
                    <button key={dev.id} onClick={() => { setSelectedDevice(selectedDevice === dev.hostname ? null : dev.hostname); setSelectedApp(null); }}
                      className={`p-3 rounded-lg border text-left transition-all ${selectedDevice === dev.hostname ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30 ring-1 ring-blue-500" : "hover:bg-muted/30"}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-2 h-2 rounded-full ${dev.status === "ONLINE" ? "bg-green-500" : "bg-red-400"}`} />
                        <span className="text-sm font-medium">{dev.hostname}</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground">{dev.platform === "win32" || dev.platform?.toLowerCase() === "windows" ? "🪟 " : "🍎 "}{dev.osVersion}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Step 2: Stock reason */}
            <div>
              <label className="text-sm font-medium mb-2 block">2. What&apos;s the issue?</label>
              <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                {stockReasons.filter(r => r.enabled).map((reason) => (
                  <button key={reason.id} onClick={() => setSelectedReason(selectedReason === reason.id ? null : reason.id)}
                    className={`flex items-center gap-2.5 p-3 rounded-lg border text-left transition-all text-sm ${selectedReason === reason.id ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30 ring-1 ring-blue-500" : "hover:bg-muted/30"}`}>
                    <span className="text-lg">{reason.icon}</span>
                    <span>{reason.label}</span>
                    {reason.common && <Badge className="ml-auto text-[9px] bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">Common</Badge>}
                  </button>
                ))}
              </div>
            </div>

            {/* Step 3: App selector */}
            {device && (selectedReason === "sr2" || selectedReason === "sr3") && (
              <div>
                <label className="text-sm font-medium mb-2 block">3. Which application? <span className="text-muted-foreground font-normal">(installed on {device.hostname})</span></label>
                <div className="grid gap-2 md:grid-cols-3 lg:grid-cols-4">
                  {deviceApps.map((app) => {
                    const path = isWindows ? appPaths[app.name]?.win : appPaths[app.name]?.mac;
                    return (
                      <button key={app.name} onClick={() => setSelectedApp(selectedApp === app.name ? null : app.name)}
                        className={`p-2.5 rounded-lg border text-left transition-all ${selectedApp === app.name ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30 ring-1 ring-blue-500" : "hover:bg-muted/30"}`}>
                        <div className="text-sm font-medium">{app.name}</div>
                        <div className="text-[10px] text-muted-foreground">v{app.version}</div>
                        {path && <div className="text-[10px] text-muted-foreground mt-0.5 font-mono truncate">{path}</div>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Network auto-capture for network issues */}
            {device && (selectedReason === "sr3" || selectedReason === "sr4") && (
              <div className="rounded-lg border bg-muted/20 p-4">
                <div className="text-sm font-medium mb-2 flex items-center gap-2"><Wifi className="h-4 w-4 text-blue-500" /> Network Information <Badge className="text-[9px] bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Auto-captured</Badge></div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div><span className="text-muted-foreground text-xs">IP Address</span><div className="font-medium">{device.ipAddress}</div></div>
                  <div><span className="text-muted-foreground text-xs">DNS Server</span><div className="font-medium">--</div></div>
                  <div><span className="text-muted-foreground text-xs">Gateway</span><div className="font-medium">--</div></div>
                  <div><span className="text-muted-foreground text-xs">Platform</span><div className="font-medium">{device.platform === "win32" || device.platform?.toLowerCase() === "windows" ? "Windows" : "macOS"}</div></div>
                </div>
              </div>
            )}

            {/* Step 4: Description */}
            <div>
              <label className="text-sm font-medium mb-2 block">{(selectedReason === "sr2" || selectedReason === "sr3") ? "4" : "3"}. Additional details <span className="text-muted-foreground font-normal">(optional)</span></label>
              <textarea value={ticketDescription} onChange={(e) => setTicketDescription(e.target.value)} placeholder="Describe the issue in more detail..." className="w-full h-24 rounded-lg border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            {/* Assign to */}
            <div>
              <label className="text-sm font-medium mb-2 block">Assign to <span className="text-muted-foreground font-normal">(optional)</span></label>
              <select
                value={assignTo}
                onChange={(e) => setAssignTo(e.target.value)}
                className="w-full max-w-sm h-10 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Unassigned</option>
                <optgroup label="IT Staff">
                  {orgUsers.filter(u => u.role === "ADMIN" || u.role === "SUPER_ADMIN").map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                  ))}
                </optgroup>
                <optgroup label="All Users">
                  {orgUsers.filter(u => u.role !== "ADMIN" && u.role !== "SUPER_ADMIN").map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Submit */}
            <div className="flex items-center justify-between pt-2">
              <div className="text-xs text-muted-foreground">
                {selectedDevice && <span className="mr-3">Device: <strong>{selectedDevice}</strong></span>}
                {selectedReason && <span className="mr-3">Issue: <strong>{stockReasons.find(r => r.id === selectedReason)?.label}</strong></span>}
                {selectedApp && <span className="mr-3">App: <strong>{selectedApp}</strong></span>}
                {assignTo && <span>Assigned: <strong>{orgUsers.find(u => u.id === assignTo)?.name}</strong></span>}
              </div>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white" disabled={!selectedReason || !selectedDevice || submittingTicket} onClick={submitTicket}>
                {submittingTicket ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Submitting...</> : <><ClipboardList className="h-4 w-4 mr-2" />Submit Ticket</>}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* TAB: SELF-SERVICE REMEDIATION                               */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {activeTab === "selfservice" && (() => {
        const selfDevice = selectedDevice ? devices.find(d => d.hostname === selectedDevice) : null;
        const selfIsWindows = selfDevice?.platform === "win32" || selfDevice?.platform?.toLowerCase() === "windows";
        const selfIsMac = selfDevice?.platform === "darwin" || selfDevice?.platform?.toLowerCase() === "macos";

        type SelfRemedy = { id: string; title: string; desc: string; icon: React.ElementType; category: string; risk: "safe" | "low" | "medium"; os: "all" | "windows" | "macos"; steps: string[]; script?: string; time: string };
        const selfRemediations: SelfRemedy[] = [
          // Performance
          { id: "sf1", title: "Clear Temporary Files", desc: "Free up disk space by removing cached and temp files", icon: Trash2, category: "performance", risk: "safe", os: "all", steps: ["Closes running temp file handles", "Deletes user-level temp files", "Reports space recovered"], script: selfIsWindows ? "Remove-Item -Path \"$env:TEMP\\*\" -Recurse -Force -EA SilentlyContinue\nWrite-Host \"Temp files cleared\"" : "rm -rf ~/Library/Caches/* ~/Library/Logs/* /tmp/$USER-*\necho 'Temp files cleared'", time: "~30s" },
          { id: "sf2", title: "Close Background Apps", desc: "Shut down heavy background processes eating memory and CPU", icon: CircleStop, category: "performance", risk: "safe", os: "all", steps: ["Scans for high-memory background processes", "Shows a list before terminating", "Keeps essential system services running"], script: selfIsWindows ? "Get-Process | Where-Object {$_.WorkingSet -gt 500MB -and $_.MainWindowHandle -eq 0} | Select-Object Name,@{N='MB';E={[math]::Round($_.WorkingSet/1MB)}} | Format-Table" : "ps aux | awk '$6 > 500000 {print $11, $6/1024 \" MB\"}' | head -10", time: "~10s" },
          { id: "sf3", title: "Restart Explorer / Finder", desc: "Fix frozen desktop, taskbar, or file browser", icon: RefreshCw, category: "performance", risk: "safe", os: "all", steps: ["Gracefully restarts the shell process", "Taskbar/Dock refreshes automatically", "Open windows may briefly disappear"], script: selfIsWindows ? "Stop-Process -Name explorer -Force; Start-Sleep 2; Start-Process explorer" : "killall Finder", time: "~5s" },
          { id: "sf4", title: "Free Up RAM", desc: "Purge inactive memory and clear system caches", icon: BatteryCharging, category: "performance", risk: "safe", os: "all", steps: ["Flushes standby memory pages", "Clears file system cache", "No apps are closed"], script: selfIsWindows ? "# Standby memory flush\nGet-Process | Where {$_.WorkingSet -gt 1GB} | ForEach { $_.MinWorkingSet = 1MB }" : "sudo purge\necho 'Memory cache purged'", time: "~15s" },

          // Network
          { id: "sf5", title: "Fix Internet Connection", desc: "Reset DNS cache and renew IP address", icon: Wifi, category: "network", risk: "safe", os: "all", steps: ["Flushes DNS resolver cache", "Releases and renews DHCP lease", "Tests connectivity after"], script: selfIsWindows ? "ipconfig /flushdns\nipconfig /release\nipconfig /renew\nTest-NetConnection google.com -Port 443" : "sudo dscacheutil -flushcache\nsudo killall -HUP mDNSResponder\nping -c 3 google.com", time: "~20s" },
          { id: "sf6", title: "Reset Wi-Fi Adapter", desc: "Turn Wi-Fi off and back on to fix connectivity issues", icon: WifiOff, category: "network", risk: "safe", os: "all", steps: ["Disables the Wi-Fi adapter", "Waits 5 seconds", "Re-enables and reconnects"], script: selfIsWindows ? "Disable-NetAdapter -Name 'Wi-Fi' -Confirm:$false\nStart-Sleep 5\nEnable-NetAdapter -Name 'Wi-Fi'" : "networksetup -setairportpower en0 off\nsleep 5\nnetworksetup -setairportpower en0 on", time: "~15s" },
          { id: "sf7", title: "Test VPN Connectivity", desc: "Check if VPN tunnel is active and route traffic correctly", icon: Globe, category: "network", risk: "safe", os: "all", steps: ["Checks VPN adapter status", "Tests internal DNS resolution", "Verifies tunnel routing"], script: selfIsWindows ? "Get-VpnConnection | Format-Table Name,ServerAddress,ConnectionStatus\nTest-NetConnection internal.corp.com -Port 443" : "ifconfig | grep -A 5 utun\nping -c 2 internal.corp.com", time: "~10s" },

          // Display
          { id: "sf8", title: "Fix Display Scaling", desc: "Reset DPI and display scaling to defaults", icon: Eye, category: "display", risk: "low", os: "all", steps: ["Resets display scaling to recommended", "Refreshes desktop rendering", "May require re-login for full effect"], script: selfIsWindows ? "# Reset to recommended scaling\nSet-ItemProperty -Path 'HKCU:\\Control Panel\\Desktop' -Name LogPixels -Value 96\nWrite-Host 'Display scaling reset. Log off to apply.'" : "defaults delete NSGlobalDomain AppleDisplayScaleFactor 2>/dev/null\nkillall Dock\necho 'Display settings reset'", time: "~5s" },
          { id: "sf9", title: "Fix Black/Blank Screen", desc: "Reset graphics driver without rebooting", icon: Monitor, category: "display", risk: "low", os: "windows", steps: ["Sends Win+Ctrl+Shift+B shortcut", "Restarts the graphics driver", "Screen may flicker briefly"], script: "Write-Host 'Press Win+Ctrl+Shift+B to reset graphics driver'\nWrite-Host 'Screen will flicker — this is normal'", time: "~3s" },

          // Apps
          { id: "sf10", title: "Clear Browser Cache", desc: "Remove cached data from Chrome, Edge, or Firefox", icon: Globe, category: "apps", risk: "safe", os: "all", steps: ["Closes browser processes safely", "Clears cache and session storage", "Preserves bookmarks and passwords"], script: selfIsWindows ? "Stop-Process -Name chrome,msedge,firefox -Force -EA SilentlyContinue\nRemove-Item \"$env:LOCALAPPDATA\\Google\\Chrome\\User Data\\Default\\Cache\\*\" -Recurse -Force -EA SilentlyContinue\nRemove-Item \"$env:LOCALAPPDATA\\Microsoft\\Edge\\User Data\\Default\\Cache\\*\" -Recurse -Force -EA SilentlyContinue\nWrite-Host 'Browser cache cleared'" : "rm -rf ~/Library/Caches/Google/Chrome/Default/Cache/*\nrm -rf ~/Library/Caches/com.microsoft.edgemac/Default/Cache/*\necho 'Browser cache cleared'", time: "~15s" },
          { id: "sf11", title: "Reset Stuck Application", desc: "Force-quit and relaunch a frozen application", icon: Zap, category: "apps", risk: "safe", os: "all", steps: ["Select the frozen application", "Force terminates the process", "Relaunches from install path"], script: selfIsWindows ? "# Replace 'AppName' with the stuck app\nStop-Process -Name AppName -Force\nStart-Sleep 2\nWrite-Host 'Application terminated. Relaunch from Start menu.'" : "# Replace 'AppName' with the stuck app\nkillall AppName\nsleep 2\necho 'Application terminated. Relaunch from Applications.'", time: "~5s" },
          { id: "sf12", title: "Repair Microsoft Office", desc: "Run the built-in Office repair tool", icon: FileText, category: "apps", risk: "low", os: "windows", steps: ["Launches Office Click-to-Run repair", "Verifies Office file integrity", "May take several minutes"], script: "& \"C:\\Program Files\\Common Files\\Microsoft Shared\\ClickToRun\\OfficeC2RClient.exe\" /update user displaylevel=false", time: "~5min" },
          { id: "sf13", title: "Fix Teams/Slack Issues", desc: "Clear app cache and reset for fresh login", icon: RefreshCw, category: "apps", risk: "low", os: "all", steps: ["Stops the application", "Clears local cache and storage", "Relaunches with fresh state"], script: selfIsWindows ? "Stop-Process -Name Teams,slack -Force -EA SilentlyContinue\nRemove-Item \"$env:APPDATA\\Microsoft\\Teams\\Cache\\*\" -Recurse -Force -EA SilentlyContinue\nRemove-Item \"$env:APPDATA\\Slack\\Cache\\*\" -Recurse -Force -EA SilentlyContinue\nWrite-Host 'App cache cleared. Relaunch the app.'" : "killall Teams Slack 2>/dev/null\nrm -rf ~/Library/Application\\ Support/Microsoft/Teams/Cache/*\nrm -rf ~/Library/Application\\ Support/Slack/Cache/*\necho 'App cache cleared. Relaunch the app.'", time: "~15s" },

          // Security
          { id: "sf14", title: "Check for Malware", desc: "Run a quick scan with built-in security tools", icon: Shield, category: "security", risk: "safe", os: "all", steps: ["Initiates a quick system scan", "Checks running processes against known threats", "Reports findings immediately"], script: selfIsWindows ? "Start-MpScan -ScanType QuickScan\nGet-MpThreatDetection | Format-Table -AutoSize" : "# macOS XProtect runs automatically\nspctl --assess --type execute /Applications/*.app 2>&1 | head -20\necho 'XProtect is active and monitoring'", time: "~2min" },
          { id: "sf15", title: "Update Security Definitions", desc: "Force-update antivirus/malware definitions", icon: ShieldCheck, category: "security", risk: "safe", os: "all", steps: ["Downloads latest threat definitions", "Updates local signature database", "Verifies update was applied"], script: selfIsWindows ? "Update-MpSignature -UpdateSource MicrosoftUpdateServer\nGet-MpComputerStatus | Select AntivirusSignatureLastUpdated" : "softwareupdate --background-critical\necho 'Security definitions update initiated'", time: "~1min" },
          { id: "sf16", title: "Check Disk Encryption", desc: "Verify BitLocker or FileVault is enabled", icon: Lock, category: "security", risk: "safe", os: "all", steps: ["Checks encryption status on all drives", "Reports protection percentage", "Alerts if encryption is off"], script: selfIsWindows ? "Get-BitLockerVolume | Select MountPoint,VolumeStatus,EncryptionPercentage,ProtectionStatus | Format-Table" : "fdesetup status", time: "~5s" },

          // Peripherals
          { id: "sf17", title: "Fix Audio Issues", desc: "Reset audio service and default output device", icon: Volume2, category: "peripherals", risk: "safe", os: "all", steps: ["Restarts the audio service", "Resets default playback device", "Tests audio output"], script: selfIsWindows ? "Restart-Service AudioSrv -Force\nRestart-Service AudioEndpointBuilder -Force\nWrite-Host 'Audio services restarted'" : "sudo killall coreaudiod\necho 'CoreAudio daemon restarted'", time: "~10s" },
          { id: "sf18", title: "Fix Bluetooth Devices", desc: "Reset Bluetooth adapter and re-pair devices", icon: Bluetooth, category: "peripherals", risk: "safe", os: "all", steps: ["Restarts Bluetooth service", "Clears pairing cache", "Device will need to re-pair"], script: selfIsWindows ? "Restart-Service bthserv -Force\nWrite-Host 'Bluetooth service restarted. Re-pair your devices.'" : "sudo pkill bluetoothd\necho 'Bluetooth daemon restarted. Re-pair your devices.'", time: "~10s" },
          { id: "sf19", title: "Fix Mouse/Trackpad", desc: "Reset pointer settings and drivers", icon: MousePointer, category: "peripherals", risk: "safe", os: "all", steps: ["Resets pointer acceleration", "Refreshes HID driver", "Restores default sensitivity"], script: selfIsWindows ? "Set-ItemProperty -Path 'HKCU:\\Control Panel\\Mouse' -Name MouseSpeed -Value 1\nWrite-Host 'Mouse settings reset to defaults'" : "defaults write .GlobalPreferences com.apple.mouse.scaling -1\necho 'Mouse acceleration reset'", time: "~5s" },
          { id: "sf20", title: "Fix Keyboard Input", desc: "Reset keyboard layout and input method", icon: Keyboard, category: "peripherals", risk: "safe", os: "all", steps: ["Resets keyboard layout to default", "Clears stuck modifier keys", "Fixes dead key issues"], script: selfIsWindows ? "# Reset sticky keys and filter keys\nSet-ItemProperty -Path 'HKCU:\\Control Panel\\Accessibility\\StickyKeys' -Name Flags -Value 506\nSet-ItemProperty -Path 'HKCU:\\Control Panel\\Accessibility\\Keyboard Response' -Name Flags -Value 122\nWrite-Host 'Keyboard accessibility settings reset'" : "# Reset keyboard settings\ndefaults delete com.apple.HIToolbox 2>/dev/null\necho 'Keyboard input method reset'", time: "~5s" },
          { id: "sf21", title: "Fix Printer Issues", desc: "Clear print queue and restart spooler", icon: PrinterCheck, category: "peripherals", risk: "safe", os: "all", steps: ["Stops the print spooler", "Clears all stuck print jobs", "Restarts the spooler service"], script: selfIsWindows ? "Stop-Service Spooler -Force\nRemove-Item \"$env:SystemRoot\\System32\\spool\\PRINTERS\\*\" -Force -EA SilentlyContinue\nStart-Service Spooler\nWrite-Host 'Print spooler cleared and restarted'" : "cancel -a\ncupsctl\necho 'Print queue cleared'", time: "~10s" },
        ];

        const filteredRemediations = selfServiceFilter === "all" ? selfRemediations : selfRemediations.filter(r => r.category === selfServiceFilter);
        const displayRemediations = selfDevice ? filteredRemediations.filter(r => r.os === "all" || (selfIsWindows && r.os === "windows") || (selfIsMac && r.os === "macos")) : filteredRemediations;

        const categories = [
          { id: "all" as const, label: "All", icon: Sparkles, count: selfRemediations.length },
          { id: "performance" as const, label: "Performance", icon: Zap, count: selfRemediations.filter(r => r.category === "performance").length },
          { id: "network" as const, label: "Network", icon: Wifi, count: selfRemediations.filter(r => r.category === "network").length },
          { id: "display" as const, label: "Display", icon: Monitor, count: selfRemediations.filter(r => r.category === "display").length },
          { id: "apps" as const, label: "Applications", icon: Globe, count: selfRemediations.filter(r => r.category === "apps").length },
          { id: "security" as const, label: "Security", icon: Shield, count: selfRemediations.filter(r => r.category === "security").length },
          { id: "peripherals" as const, label: "Peripherals", icon: MousePointer, count: selfRemediations.filter(r => r.category === "peripherals").length },
        ];

        return (
          <>
            {/* Self-Service Header */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <LifeBuoy className="h-5 w-5 text-emerald-500" /> Self-Service Remediation
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Fix common issues on your own device — no IT ticket needed. These are safe, pre-approved actions you can run instantly.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Device Selector */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Select your device for OS-specific fixes:</label>
                  {devices.length === 0 ? (
                    <div className="text-center py-6 rounded-lg border border-dashed">
                      <Monitor className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">No devices enrolled. Showing all available remediations.</p>
                    </div>
                  ) : (
                    <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
                      {devices.map((dev) => (
                        <button key={dev.id} onClick={() => setSelectedDevice(selectedDevice === dev.hostname ? null : dev.hostname)}
                          className={`p-3 rounded-lg border text-left transition-all ${selectedDevice === dev.hostname ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 ring-1 ring-emerald-500" : "hover:bg-muted/30"}`}>
                          <div className="flex items-center gap-2 mb-1">
                            <div className={`w-2 h-2 rounded-full ${dev.status === "ONLINE" ? "bg-green-500" : "bg-red-400"}`} />
                            <span className="text-sm font-medium">{dev.hostname}</span>
                          </div>
                          <div className="text-[11px] text-muted-foreground">{dev.platform === "win32" || dev.platform?.toLowerCase() === "windows" ? "🪟 Windows" : "🍎 macOS"} &bull; {dev.ipAddress}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Category Filter */}
                <div className="flex gap-1.5 flex-wrap">
                  {categories.map((cat) => (
                    <button key={cat.id} onClick={() => setSelfServiceFilter(cat.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${selfServiceFilter === cat.id ? "bg-emerald-100 border-emerald-400 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700" : "border-transparent bg-muted/40 text-muted-foreground hover:bg-muted/60"}`}>
                      <cat.icon className="h-3 w-3" />
                      {cat.label}
                      <span className="text-[10px] opacity-70">({cat.count})</span>
                    </button>
                  ))}
                </div>

                {/* Remediation Grid */}
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {displayRemediations.map((remedy) => {
                    const hasRun = ranRemediations.has(remedy.id);
                    return (
                      <div key={remedy.id} className={`rounded-xl border overflow-hidden transition-all ${hasRun ? "border-green-300 bg-green-50/50 dark:bg-green-950/20 dark:border-green-800" : "hover:border-emerald-300 hover:shadow-sm"}`}>
                        <div className="p-4 space-y-2">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <div className={`p-1.5 rounded-lg ${remedy.risk === "safe" ? "bg-green-100 dark:bg-green-900/40" : remedy.risk === "low" ? "bg-amber-100 dark:bg-amber-900/40" : "bg-red-100 dark:bg-red-900/40"}`}>
                                <remedy.icon className={`h-4 w-4 ${remedy.risk === "safe" ? "text-green-600" : remedy.risk === "low" ? "text-amber-600" : "text-red-600"}`} />
                              </div>
                              <div>
                                <div className="text-sm font-semibold">{remedy.title}</div>
                                <div className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                                  <Badge variant="outline" className={`text-[9px] px-1 ${remedy.risk === "safe" ? "text-green-700 border-green-300" : remedy.risk === "low" ? "text-amber-700 border-amber-300" : "text-red-700 border-red-300"}`}>
                                    {remedy.risk === "safe" ? "✓ Safe" : remedy.risk === "low" ? "⚡ Low Risk" : "⚠ Medium"}
                                  </Badge>
                                  <Badge variant="outline" className="text-[9px] px-1">
                                    {remedy.os === "all" ? "🌐 All" : remedy.os === "windows" ? "🪟 Win" : "🍎 Mac"}
                                  </Badge>
                                  <span className="text-muted-foreground"><Clock className="h-2.5 w-2.5 inline mr-0.5" />{remedy.time}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">{remedy.desc}</p>
                          <div className="space-y-1">
                            <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">What it does:</div>
                            <ul className="space-y-0.5">
                              {remedy.steps.map((step, i) => (
                                <li key={i} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                                  <span className="text-emerald-500 mt-0.5 shrink-0">{hasRun ? "✓" : `${i + 1}.`}</span>
                                  {step}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        {/* Script Preview + Run */}
                        {remedy.script && selfDevice && (
                          <div className="border-t">
                            <details className="group">
                              <summary className="px-4 py-2 text-[11px] text-muted-foreground cursor-pointer hover:text-foreground flex items-center gap-1">
                                <ChevronRight className="h-3 w-3 transition-transform group-open:rotate-90" />
                                Preview script
                              </summary>
                              <div className="bg-gray-950 text-green-400 px-4 py-2 font-mono text-[10px] overflow-x-auto max-h-32">
                                <pre className="whitespace-pre-wrap">{remedy.script}</pre>
                              </div>
                            </details>
                          </div>
                        )}

                        <div className="px-4 py-2.5 bg-muted/20 border-t">
                          <Button
                            size="sm"
                            className={`w-full text-xs h-8 ${hasRun ? "bg-green-600 hover:bg-green-700" : "bg-emerald-600 hover:bg-emerald-700"} text-white`}
                            onClick={() => {
                              setRanRemediations(prev => new Set(prev).add(remedy.id));
                              if (remedy.script && selfDevice) {
                                executeRemediation(remedy.title, remedy.script, selfDevice);
                              }
                            }}
                          >
                            {hasRun ? <><CheckCircle className="h-3 w-3 mr-1.5" />Completed</> : <><Play className="h-3 w-3 mr-1.5" />Run Fix</>}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {displayRemediations.length === 0 && (
                  <div className="text-center py-8">
                    <Search className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">No remediations available for this filter{selfDevice ? ` on ${selfDevice.platform === "win32" || selfDevice.platform?.toLowerCase() === "windows" ? "Windows" : "macOS"}` : ""}.</p>
                  </div>
                )}

                {/* Still need help? */}
                <div className="rounded-lg border border-dashed p-4 text-center bg-muted/10">
                  <p className="text-sm font-medium">Still having issues?</p>
                  <p className="text-xs text-muted-foreground mt-1">If none of these fixes solved your problem, submit a ticket and IT will help.</p>
                  <Button size="sm" variant="outline" className="mt-3" onClick={() => setActiveTab("submit")}>
                    <ClipboardList className="h-3.5 w-3.5 mr-1.5" /> Submit a Ticket
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        );
      })()}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* TAB: METRICS                                                  */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {activeTab === "metrics" && (
        <>
          {metricsLoading ? (
            <div className="text-center py-12"><Loader2 className="h-6 w-6 mx-auto animate-spin text-muted-foreground" /></div>
          ) : (
            <>
              {/* Org-wide KPIs */}
              <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-8">
                {[
                  { label: "Total Tickets", value: String(orgMetrics?.totalTickets || 0), icon: ClipboardList, color: "text-blue-600" },
                  { label: "Resolved", value: String(orgMetrics?.resolvedTickets || 0), icon: CheckCircle, color: "text-green-600" },
                  { label: "Active", value: String(orgMetrics?.activeTickets || 0), icon: Activity, color: "text-amber-600" },
                  { label: "SLA Breaches", value: String(orgMetrics?.breachedTickets || 0), icon: AlertOctagon, color: orgMetrics?.breachedTickets ? "text-red-600" : "text-green-600" },
                  { label: "Overdue Response", value: String(orgMetrics?.overdueResponse || 0), icon: Clock, color: orgMetrics?.overdueResponse ? "text-red-600" : "text-green-600" },
                  { label: "Overdue Resolution", value: String(orgMetrics?.overdueResolution || 0), icon: Timer, color: orgMetrics?.overdueResolution ? "text-red-600" : "text-green-600" },
                  { label: "Avg Satisfaction", value: orgMetrics?.avgSatisfaction ? `${orgMetrics.avgSatisfaction}/5` : "--", icon: Star, color: "text-yellow-600" },
                  { label: "Total Ratings", value: String(orgMetrics?.totalRatings || 0), icon: TrendingUp, color: "text-purple-600" },
                ].map(s => (
                  <Card key={s.label}>
                    <CardContent className="pt-4 pb-3 text-center">
                      <s.icon className={`h-4 w-4 mx-auto mb-1 ${s.color}`} />
                      <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                      <div className="text-[10px] text-muted-foreground">{s.label}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* SLA Targets Reference */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2"><Clock className="h-5 w-5 text-blue-500" /> SLA Targets (ITIL/HDI Standard)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 md:grid-cols-4">
                    {[
                      { priority: "URGENT", response: "15 min", resolution: "4 hours", color: "border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-950/20" },
                      { priority: "HIGH", response: "1 hour", resolution: "8 hours", color: "border-orange-300 dark:border-orange-600 bg-orange-50 dark:bg-orange-950/20" },
                      { priority: "MEDIUM", response: "4 hours", resolution: "24 hours", color: "border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-950/20" },
                      { priority: "LOW", response: "8 hours", resolution: "48 hours", color: "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-950/20" },
                    ].map(sla => (
                      <div key={sla.priority} className={`rounded-lg border p-3 ${sla.color}`}>
                        <div className="text-sm font-bold mb-2">{sla.priority}</div>
                        <div className="text-xs space-y-1">
                          <div className="flex justify-between"><span className="text-muted-foreground">First Response</span><span className="font-medium">{sla.response}</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">Resolution</span><span className="font-medium">{sla.resolution}</span></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Agent Performance Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2"><BarChart3 className="h-5 w-5 text-indigo-500" /> IT Staff Performance</CardTitle>
                  <p className="text-xs text-muted-foreground">Individual metrics for each IT support agent. Based on assigned and resolved tickets.</p>
                </CardHeader>
                <CardContent>
                  {agentMetrics.length === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      No agent data yet. Assign tickets to IT staff to start tracking performance.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-xs text-muted-foreground">
                            <th className="pb-2 pr-4">Agent</th>
                            <th className="pb-2 px-2 text-center">Assigned</th>
                            <th className="pb-2 px-2 text-center">Resolved</th>
                            <th className="pb-2 px-2 text-center">Resolution Rate</th>
                            <th className="pb-2 px-2 text-center">Avg Response</th>
                            <th className="pb-2 px-2 text-center">Avg Resolution</th>
                            <th className="pb-2 px-2 text-center">SLA Breaches</th>
                            <th className="pb-2 px-2 text-center">Satisfaction</th>
                          </tr>
                        </thead>
                        <tbody>
                          {agentMetrics.map(agent => (
                            <tr key={agent.id} className="border-b hover:bg-muted/20">
                              <td className="py-3 pr-4">
                                <div className="font-medium">{agent.name}</div>
                                <div className="text-[10px] text-muted-foreground">{agent.email}</div>
                              </td>
                              <td className="px-2 text-center font-medium">{agent.totalAssigned}</td>
                              <td className="px-2 text-center font-medium text-green-600">{agent.resolved}</td>
                              <td className="px-2 text-center">
                                <Badge className={`text-[10px] ${agent.resolutionRate >= 80 ? "bg-green-100 text-green-800" : agent.resolutionRate >= 50 ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800"}`}>
                                  {agent.resolutionRate}%
                                </Badge>
                              </td>
                              <td className="px-2 text-center">
                                <span className={agent.avgResponseMinutes !== null && agent.avgResponseMinutes > 240 ? "text-red-600 font-medium" : ""}>
                                  {formatMinutes(agent.avgResponseMinutes)}
                                </span>
                              </td>
                              <td className="px-2 text-center">
                                <span className={agent.avgResolutionMinutes !== null && agent.avgResolutionMinutes > 1440 ? "text-red-600 font-medium" : ""}>
                                  {formatMinutes(agent.avgResolutionMinutes)}
                                </span>
                              </td>
                              <td className="px-2 text-center">
                                <span className={agent.slaBreaches > 0 ? "text-red-600 font-medium" : "text-green-600"}>
                                  {agent.slaBreaches}
                                </span>
                              </td>
                              <td className="px-2 text-center">
                                {agent.avgSatisfaction ? (
                                  <div className="flex items-center justify-center gap-1">
                                    <span className="font-medium">{agent.avgSatisfaction}</span>
                                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                    <span className="text-[10px] text-muted-foreground">({agent.totalRatings})</span>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">--</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}

      {/* TAB: CONFIGURATION                                         */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {activeTab === "config" && (
        <>
          {/* Stock Reason Management */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2"><ClipboardList className="h-5 w-5 text-blue-500" /> Stock Ticket Reasons</CardTitle>
                <Button size="sm" variant="outline" onClick={() => setEditingNewReason(true)}><UserPlus className="h-3.5 w-3.5 mr-1" />Add Reason</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {editingNewReason && (
                <div className="flex items-center gap-2 p-3 rounded-lg border border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-950/30">
                  <span className="text-lg">💬</span>
                  <Input value={newReasonLabel} onChange={(e) => setNewReasonLabel(e.target.value)} placeholder="Enter new reason label..." className="flex-1 h-8 text-sm" />
                  <Button size="sm" onClick={() => { if (newReasonLabel.trim()) { setStockReasons([...stockReasons, { id: `sr${stockReasons.length + 1}`, label: newReasonLabel.trim(), category: "other", icon: "💬", enabled: true, common: false }]); setNewReasonLabel(""); setEditingNewReason(false); } }}>Save</Button>
                  <Button size="sm" variant="outline" onClick={() => { setEditingNewReason(false); setNewReasonLabel(""); }}>Cancel</Button>
                </div>
              )}
              {stockReasons.map((reason) => (
                <div key={reason.id} className={`flex items-center justify-between p-3 rounded-lg border ${!reason.enabled ? "opacity-50" : ""}`}>
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{reason.icon}</span>
                    <div>
                      <div className="text-sm font-medium">{reason.label}</div>
                      <div className="text-xs text-muted-foreground">Category: {reason.category}{reason.common ? " \u2022 Common" : ""}</div>
                    </div>
                  </div>
                  <button onClick={() => setStockReasons(stockReasons.map(r => r.id === reason.id ? { ...r, enabled: !r.enabled } : r))}
                    className={`relative w-10 h-5 rounded-full transition-colors ${reason.enabled ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"}`}>
                    <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${reason.enabled ? "translate-x-5" : ""}`} />
                  </button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Remediation Groups */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2"><Server className="h-5 w-5 text-purple-500" /> Remediation Groups &amp; Host Group Assignment</CardTitle>
                <Button size="sm" variant="outline"><UserPlus className="h-3.5 w-3.5 mr-1" />Create Group</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">Assign sets of remediations to host groups. Toggle groups on/off. Build custom remediation sets per OS.</p>
              {remediationGroups.map((group) => (
                <div key={group.id} className={`rounded-lg border overflow-hidden ${!group.enabled ? "opacity-60" : ""}`}>
                  <div className="flex items-center justify-between p-3 bg-muted/30">
                    <div className="flex items-center gap-3">
                      <button onClick={() => setRemediationGroups(remediationGroups.map(g => g.id === group.id ? { ...g, enabled: !g.enabled } : g))}
                        className={`relative w-10 h-5 rounded-full transition-colors ${group.enabled ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"}`}>
                        <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${group.enabled ? "translate-x-5" : ""}`} />
                      </button>
                      <div>
                        <div className="text-sm font-medium">{group.name}</div>
                        <div className="text-xs text-muted-foreground">
                          <Badge variant="outline" className="text-[10px] mr-1">{group.os === "all" ? "🌐 All OS" : group.os === "windows" ? "🪟 Windows" : "🍎 macOS"}</Badge>
                          {group.hostGroups.map(hg => <Badge key={hg} variant="outline" className="text-[10px] mr-1">{hg}</Badge>)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{group.remediations.length} remediations</span>
                      <Button size="sm" variant="outline" className="text-xs">Edit</Button>
                    </div>
                  </div>
                  <div className="px-3 py-2 flex flex-wrap gap-1.5">
                    {group.remediations.map((r) => <Badge key={r} variant="outline" className="text-[10px]">{r}</Badge>)}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Custom Remediation Builder */}
          <Card>
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Terminal className="h-5 w-5 text-green-500" /> Custom Remediation Builder</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">Create custom remediation scripts and assign them to groups or host groups. Specify OS target and risk level.</p>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium mb-1 block">Remediation Name</label>
                    <Input placeholder="e.g., Reset Docker Service" className="h-8 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block">Target OS</label>
                    <div className="flex gap-2">
                      {["All", "Windows", "macOS"].map(os => (
                        <button key={os} className="px-3 py-1 rounded border text-xs hover:bg-muted/30 transition-colors">{os === "All" ? "🌐" : os === "Windows" ? "🪟" : "🍎"} {os}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block">Risk Level</label>
                    <div className="flex gap-2">
                      {[{ l: "Low", c: "bg-green-100 text-green-800" }, { l: "Medium", c: "bg-amber-100 text-amber-800" }, { l: "High", c: "bg-red-100 text-red-800" }].map(r => (
                        <button key={r.l} className={`px-3 py-1 rounded text-xs ${r.c}`}>{r.l}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block">Assign to Host Groups</label>
                    <div className="flex flex-wrap gap-1.5">
                      {["All Devices", "Windows Devices", "Mac Fleet", "Engineering", "Office Desktops"].map(hg => (
                        <Badge key={hg} variant="outline" className="text-[10px] cursor-pointer hover:bg-muted/30">{hg}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Script (PowerShell / Zsh)</label>
                  <div className="bg-gray-950 rounded-lg p-3 h-48">
                    <textarea className="w-full h-full bg-transparent text-green-400 font-mono text-xs resize-none focus:outline-none" placeholder="# Enter your remediation script here..." />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm">Test on Device</Button>
                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white">Save Remediation</Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* FLOATING COMMAND LOG PANEL                                  */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {showLogPanel && commandLogs.length > 0 && (
        <div className={`fixed bottom-0 right-0 left-64 z-50 bg-background border-t shadow-2xl transition-all ${logPanelMinimized ? "h-12" : "h-80"}`}>
          {/* Panel Header */}
          <div className="flex items-center justify-between px-4 h-12 border-b bg-gray-950 text-white cursor-pointer"
            onClick={() => setLogPanelMinimized(!logPanelMinimized)}>
            <div className="flex items-center gap-2">
              <ScrollText className="h-4 w-4 text-green-400" />
              <span className="text-sm font-medium">Command Log</span>
              <Badge className="text-[10px] bg-gray-800 text-gray-300">{commandLogs.length} command{commandLogs.length !== 1 ? "s" : ""}</Badge>
              {runningCommands.size > 0 && (
                <Badge className="text-[10px] bg-amber-900 text-amber-300 animate-pulse">
                  <Loader2 className="h-2.5 w-2.5 mr-1 animate-spin" />{runningCommands.size} running
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button className="p-1 hover:bg-gray-800 rounded" onClick={(e) => { e.stopPropagation(); setLogPanelMinimized(!logPanelMinimized); }}>
                {logPanelMinimized ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              <button className="p-1 hover:bg-gray-800 rounded" onClick={(e) => { e.stopPropagation(); setShowLogPanel(false); }}>
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Log Entries */}
          {!logPanelMinimized && (
            <div className="overflow-y-auto h-[calc(100%-3rem)] bg-gray-950 font-mono text-xs">
              {commandLogs.map((log) => (
                <div key={log.id} className="border-b border-gray-800 px-4 py-3 hover:bg-gray-900/50">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {/* Status Icon */}
                      <div className="mt-0.5">
                        {log.status === "PENDING" && <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />}
                        {log.status === "SENT" && <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />}
                        {log.status === "EXECUTING" && <Loader2 className="h-4 w-4 text-amber-400 animate-spin" />}
                        {log.status === "COMPLETED" && <CheckCircle className="h-4 w-4 text-green-400" />}
                        {log.status === "FAILED" && <AlertTriangle className="h-4 w-4 text-red-400" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Command Title & Device */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-white font-semibold">{log.title}</span>
                          <span className="text-gray-500">→</span>
                          <span className="text-blue-400">{log.deviceName}</span>
                          <Badge className={`text-[9px] px-1.5 py-0 ${
                            log.status === "COMPLETED" ? "bg-green-900/50 text-green-400 border-green-800" :
                            log.status === "FAILED" ? "bg-red-900/50 text-red-400 border-red-800" :
                            log.status === "SENT" || log.status === "EXECUTING" ? "bg-blue-900/50 text-blue-400 border-blue-800" :
                            "bg-gray-800 text-gray-400 border-gray-700"
                          }`}>
                            {log.status}
                          </Badge>
                        </div>

                        {/* Timestamp */}
                        <div className="text-gray-500 text-[10px] mt-0.5">
                          Issued: {log.issuedAt.toLocaleTimeString()}
                          {log.completedAt && ` • Completed: ${log.completedAt.toLocaleTimeString()}`}
                          {log.completedAt && ` • Duration: ${Math.round((log.completedAt.getTime() - log.issuedAt.getTime()) / 1000)}s`}
                          {log.exitCode !== undefined && ` • Exit code: ${log.exitCode}`}
                        </div>

                        {/* Script sent */}
                        <details className="mt-1.5 group">
                          <summary className="text-gray-500 cursor-pointer hover:text-gray-300 text-[10px] flex items-center gap-1">
                            <ChevronRight className="h-2.5 w-2.5 transition-transform group-open:rotate-90" />
                            Script sent
                          </summary>
                          <pre className="text-green-400/70 mt-1 whitespace-pre-wrap text-[10px] leading-relaxed pl-3 border-l border-gray-800">{log.script}</pre>
                        </details>

                        {/* Result output */}
                        {log.result && (
                          <div className={`mt-1.5 p-2 rounded text-[11px] leading-relaxed whitespace-pre-wrap ${
                            log.status === "COMPLETED" ? "bg-green-950/30 text-green-300 border border-green-900/50" :
                            log.status === "FAILED" ? "bg-red-950/30 text-red-300 border border-red-900/50" :
                            "bg-gray-900 text-gray-300"
                          }`}>
                            <pre className="whitespace-pre-wrap">{log.result}</pre>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          )}
        </div>
      )}

      {/* Log panel toggle button (when panel is closed but has logs) */}
      {!showLogPanel && commandLogs.length > 0 && (
        <button
          onClick={() => { setShowLogPanel(true); setLogPanelMinimized(false); }}
          className="fixed bottom-4 right-4 z-50 bg-gray-900 text-white px-4 py-2.5 rounded-lg shadow-lg border border-gray-700 flex items-center gap-2 hover:bg-gray-800 transition-colors"
        >
          <ScrollText className="h-4 w-4 text-green-400" />
          <span className="text-sm font-medium">Command Log</span>
          <Badge className="text-[10px] bg-gray-800 text-gray-300">{commandLogs.length}</Badge>
          {runningCommands.size > 0 && <Loader2 className="h-3 w-3 text-amber-400 animate-spin" />}
        </button>
      )}
    </div>
  );
}
