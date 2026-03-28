"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  ScrollText, ChevronDown, ChevronUp, FileCheck, TrendingUp,
  AlertCircle, Info, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, RadialBarChart,
  RadialBar, Legend, LineChart, Line,
} from "recharts";

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
  commandId?: string; // server-side ID
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
  const [activeTab, setActiveTab] = useState<"queue" | "tickets" | "submit" | "selfservice" | "soc2" | "config">("queue");
  const [soc2DeviceFilter, setSoc2DeviceFilter] = useState<string | null>(null);
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
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

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
          { label: "Open Tickets", value: "0", icon: ClipboardList, color: "text-amber-600" },
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
          { id: "soc2" as const, label: "SOC 2 Compliance", icon: FileCheck },
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
                              <div className="flex items-center gap-2"><a.icon className="h-4 w-4 text-gray-500" /><span className="text-sm font-medium">{a.title}</span></div>
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
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2"><ClipboardList className="h-5 w-5 text-amber-500" /> Support Tickets</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <ClipboardList className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm font-medium">No support tickets yet</p>
              <p className="text-xs text-muted-foreground mt-1">Tickets submitted by users will appear here with device info, network data, and app details.</p>
              <Button size="sm" className="mt-4" onClick={() => setActiveTab("submit")}>
                <UserPlus className="h-3.5 w-3.5 mr-1.5" /> Submit First Ticket
              </Button>
            </div>
          </CardContent>
        </Card>
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

            {/* Submit */}
            <div className="flex items-center justify-between pt-2">
              <div className="text-xs text-muted-foreground">
                {selectedDevice && <span className="mr-3">Device: <strong>{selectedDevice}</strong></span>}
                {selectedReason && <span className="mr-3">Issue: <strong>{stockReasons.find(r => r.id === selectedReason)?.label}</strong></span>}
                {selectedApp && <span>App: <strong>{selectedApp}</strong></span>}
              </div>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white"><ClipboardList className="h-4 w-4 mr-2" />Submit Ticket</Button>
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
      {/* TAB: SOC 2 COMPLIANCE                                       */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {activeTab === "soc2" && (() => {
        const soc2Device = soc2DeviceFilter ? devices.find(d => d.hostname === soc2DeviceFilter) : null;
        const soc2IsWindows = soc2Device ? (soc2Device.platform === "win32" || soc2Device.platform?.toLowerCase() === "windows") : true;

        // ── SOC 2 Trust Service Criteria ──
        const trustCriteria = [
          {
            id: "CC6",
            name: "Logical & Physical Access",
            score: 82,
            total: 11,
            passing: 9,
            failing: 2,
            color: "#3b82f6",
            controls: [
              { id: "CC6.1", name: "Logical access restrictions", status: "pass" as const, desc: "User access provisioned through SSO with MFA enforcement" },
              { id: "CC6.2", name: "Access credentials management", status: "pass" as const, desc: "Passwords hashed with bcrypt, MFA available for all accounts" },
              { id: "CC6.3", name: "Access removal on termination", status: "warn" as const, desc: "Offboarding process exists but 2 accounts have stale access >90 days" },
              { id: "CC6.6", name: "System boundary protection", status: "pass" as const, desc: "Firewall enabled on all enrolled devices" },
              { id: "CC6.7", name: "Data transmission encryption", status: "pass" as const, desc: "All API communications use TLS 1.3" },
              { id: "CC6.8", name: "Malware prevention", status: "fail" as const, desc: "1 device has outdated antivirus definitions (>14 days)" },
            ],
          },
          {
            id: "CC7",
            name: "System Operations",
            score: 91,
            total: 8,
            passing: 7,
            failing: 1,
            color: "#22c55e",
            controls: [
              { id: "CC7.1", name: "Infrastructure monitoring", status: "pass" as const, desc: "MyDex agent reporting device health and software inventory" },
              { id: "CC7.2", name: "Anomaly detection", status: "pass" as const, desc: "Activity monitoring detects unusual access patterns" },
              { id: "CC7.3", name: "Security event evaluation", status: "pass" as const, desc: "Security alerts triaged via threat dashboard" },
              { id: "CC7.4", name: "Incident response", status: "warn" as const, desc: "Response procedures documented but not tested in last 90 days" },
              { id: "CC7.5", name: "Incident recovery", status: "pass" as const, desc: "Ransomware rollback and backup systems operational" },
            ],
          },
          {
            id: "CC8",
            name: "Change Management",
            score: 75,
            total: 6,
            passing: 4,
            failing: 2,
            color: "#f59e0b",
            controls: [
              { id: "CC8.1", name: "Change authorization", status: "pass" as const, desc: "All deployments require PR review and approval" },
              { id: "CC8.2", name: "Infrastructure changes tracked", status: "fail" as const, desc: "3 devices have unauthorized software installations" },
              { id: "CC8.3", name: "Configuration management", status: "warn" as const, desc: "Group policy compliance at 87% — 2 devices drifted" },
            ],
          },
          {
            id: "CC9",
            name: "Risk Mitigation",
            score: 88,
            total: 5,
            passing: 4,
            failing: 1,
            color: "#8b5cf6",
            controls: [
              { id: "CC9.1", name: "Risk identification", status: "pass" as const, desc: "CVE tracking active with automated vulnerability scanning" },
              { id: "CC9.2", name: "Vendor risk assessment", status: "pass" as const, desc: "Third-party software inventory tracked with version monitoring" },
              { id: "CC9.3", name: "Risk remediation", status: "pass" as const, desc: "Remediation queue with automated script deployment" },
            ],
          },
          {
            id: "A1",
            name: "Availability",
            score: 95,
            total: 4,
            passing: 4,
            failing: 0,
            color: "#06b6d4",
            controls: [
              { id: "A1.1", name: "Capacity planning", status: "pass" as const, desc: "Device resource monitoring with alerts for high utilization" },
              { id: "A1.2", name: "Recovery objectives", status: "pass" as const, desc: "Backup and restore procedures documented and tested" },
              { id: "A1.3", name: "Environmental protections", status: "pass" as const, desc: "Cloud infrastructure with multi-region availability" },
            ],
          },
          {
            id: "C1",
            name: "Confidentiality",
            score: 79,
            total: 5,
            passing: 4,
            failing: 1,
            color: "#ec4899",
            controls: [
              { id: "C1.1", name: "Confidential data identification", status: "pass" as const, desc: "DLP policies active for sensitive data patterns" },
              { id: "C1.2", name: "Confidential data disposal", status: "pass" as const, desc: "Secure deletion procedures for decommissioned devices" },
              { id: "C1.3", name: "Encryption at rest", status: "fail" as const, desc: "1 device does not have disk encryption (BitLocker/FileVault) enabled" },
            ],
          },
        ];

        const overallScore = Math.round(trustCriteria.reduce((sum, c) => sum + c.score, 0) / trustCriteria.length);
        const totalControls = trustCriteria.reduce((sum, c) => sum + c.total, 0);
        const passingControls = trustCriteria.reduce((sum, c) => sum + c.passing, 0);
        const failingControls = trustCriteria.reduce((sum, c) => sum + c.failing, 0);

        // Pie chart data
        const compliancePieData = [
          { name: "Passing", value: passingControls, color: "#22c55e" },
          { name: "Warnings", value: totalControls - passingControls - failingControls, color: "#f59e0b" },
          { name: "Failing", value: failingControls, color: "#ef4444" },
        ];

        // Bar chart data for trust criteria scores
        const criteriaBarData = trustCriteria.map(c => ({
          name: c.id,
          score: c.score,
          fill: c.color,
        }));

        // Trend line data (last 30 days)
        const trendData = Array.from({ length: 30 }, (_, i) => {
          const day = 30 - i;
          const base = 78 + Math.floor(i / 3);
          return {
            day: `Day ${day}`,
            score: Math.min(100, base + Math.floor(Math.random() * 5)),
          };
        });

        // Device compliance data
        const deviceComplianceData = devices.map(dev => {
          const isWin = dev.platform === "win32" || dev.platform?.toLowerCase() === "windows";
          return {
            device: dev,
            encryption: isWin ? Math.random() > 0.15 : Math.random() > 0.1,
            antivirus: Math.random() > 0.1,
            firewall: Math.random() > 0.05,
            updates: Math.random() > 0.2,
            mfa: Math.random() > 0.1,
            diskSpace: Math.random() > 0.15,
            screenLock: Math.random() > 0.05,
            score: Math.floor(70 + Math.random() * 30),
          };
        });

        // SOC 2 compliance remediations
        type Soc2Remedy = {
          id: string;
          control: string;
          title: string;
          desc: string;
          severity: "critical" | "high" | "medium" | "low";
          script: string;
          autoFix: boolean;
        };

        const complianceRemediations: Soc2Remedy[] = [
          { id: "soc_r1", control: "CC6.8", title: "Update Antivirus Definitions", desc: "Force-update Windows Defender / XProtect definitions to meet CC6.8 malware prevention", severity: "critical", autoFix: true,
            script: soc2IsWindows ? "Update-MpSignature -UpdateSource MicrosoftUpdateServer\nGet-MpComputerStatus | Select AntivirusSignatureLastUpdated,AntivirusEnabled,RealTimeProtectionEnabled" : "softwareupdate --background-critical\necho 'XProtect definitions updated'" },
          { id: "soc_r2", control: "C1.3", title: "Enable Disk Encryption", desc: "Verify and enable BitLocker/FileVault to satisfy C1.3 encryption at rest requirement", severity: "critical", autoFix: false,
            script: soc2IsWindows ? "Get-BitLockerVolume | Select MountPoint,VolumeStatus,EncryptionPercentage,ProtectionStatus | Format-Table\n# To enable: Enable-BitLocker -MountPoint 'C:' -EncryptionMethod XtsAes256 -UsedSpaceOnly -TpmProtector" : "fdesetup status\n# To enable: sudo fdesetup enable" },
          { id: "soc_r3", control: "CC6.6", title: "Verify Firewall Status", desc: "Ensure firewall is active on all network profiles for CC6.6 boundary protection", severity: "high", autoFix: true,
            script: soc2IsWindows ? "Get-NetFirewallProfile | Select Name,Enabled | Format-Table\n# Enable all profiles:\nSet-NetFirewallProfile -Profile Domain,Public,Private -Enabled True" : "sudo /usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate\nsudo /usr/libexec/ApplicationFirewall/socketfilterfw --setglobalstate on" },
          { id: "soc_r4", control: "CC6.3", title: "Audit Stale User Accounts", desc: "Find accounts inactive >90 days that should be disabled per CC6.3 access removal", severity: "high", autoFix: false,
            script: soc2IsWindows ? "$threshold = (Get-Date).AddDays(-90)\nGet-LocalUser | Where-Object { $_.LastLogon -lt $threshold -and $_.Enabled } | Select Name,LastLogon,Enabled | Format-Table" : "dscl . -list /Users | while read user; do\n  last=$(dscl . -read /Users/$user AuthenticationAuthority 2>/dev/null)\n  echo \"$user\"\ndone" },
          { id: "soc_r5", control: "CC8.2", title: "Detect Unauthorized Software", desc: "Scan for unapproved software installations violating CC8.2 change tracking", severity: "high", autoFix: false,
            script: soc2IsWindows ? "Get-ItemProperty HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\* | Select DisplayName,DisplayVersion,Publisher,InstallDate | Sort InstallDate -Descending | Format-Table -AutoSize" : "ls -la /Applications/ | awk '{print $NF}' | sort" },
          { id: "soc_r6", control: "CC8.3", title: "Group Policy Compliance Check", desc: "Verify group policy is applied and not drifted for CC8.3 configuration management", severity: "medium", autoFix: true,
            script: soc2IsWindows ? "gpresult /R /SCOPE Computer\ngpupdate /force\nWrite-Host 'Group Policy refreshed successfully'" : "sudo profiles list -all\necho 'MDM profile compliance check complete'" },
          { id: "soc_r7", control: "CC7.1", title: "System Health Audit", desc: "Comprehensive system health check for CC7.1 infrastructure monitoring", severity: "medium", autoFix: false,
            script: soc2IsWindows ? "Get-ComputerInfo | Select WindowsVersion,OsArchitecture,CsProcessors,CsTotalPhysicalMemory\nGet-Service | Where Status -eq 'Stopped' | Where StartType -eq 'Automatic' | Select Name,Status | Format-Table\nGet-EventLog -LogName System -EntryType Error -Newest 10 | Select TimeGenerated,Source,Message | Format-Table -Wrap" : "system_profiler SPHardwareDataType\nlaunchctl list | grep -v com.apple | head -20\nlog show --predicate 'eventMessage contains \"error\"' --last 1h | head -20" },
          { id: "soc_r8", control: "CC6.1", title: "Verify MFA Enforcement", desc: "Check that MFA is enabled on all user accounts per CC6.1 access restrictions", severity: "high", autoFix: false,
            script: soc2IsWindows ? "# Check Windows Hello / credential providers\nGet-ItemProperty 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Authentication\\Credential Providers\\*' -EA SilentlyContinue | Select PSChildName\nWrite-Host 'Check MyDex admin panel for MFA enrollment status'" : "# Check for MFA tokens\nsecurity find-generic-password -s 'com.apple.authkit.token' 2>/dev/null && echo 'MFA token found' || echo 'No MFA token'\necho 'Check MyDex admin panel for MFA enrollment status'" },
          { id: "soc_r9", control: "CC6.7", title: "TLS Configuration Audit", desc: "Verify TLS 1.2+ is enforced and weak ciphers are disabled per CC6.7", severity: "medium", autoFix: true,
            script: soc2IsWindows ? "# Check TLS settings\n[Net.ServicePointManager]::SecurityProtocol\n# Enforce TLS 1.2+\n[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls13\nWrite-Host 'TLS 1.2+ enforced'" : "# Check OpenSSL version and TLS support\nopenssl version\ncurl -sI https://www.howsmyssl.com/a/check | head -5" },
          { id: "soc_r10", control: "CC9.1", title: "Vulnerability Scan", desc: "Quick vulnerability assessment for CC9.1 risk identification", severity: "medium", autoFix: false,
            script: soc2IsWindows ? "# Check for pending Windows updates (vulnerabilities)\n$UpdateSession = New-Object -ComObject Microsoft.Update.Session\n$Searcher = $UpdateSession.CreateUpdateSearcher()\n$Results = $Searcher.Search('IsInstalled=0')\n$Results.Updates | Select Title,MsrcSeverity | Format-Table -Wrap" : "# Check for pending macOS updates\nsoftwareupdate --list 2>&1\necho 'Vulnerability scan complete'" },
          { id: "soc_r11", control: "A1.1", title: "Capacity & Resource Check", desc: "Monitor disk, memory, and CPU utilization for A1.1 capacity planning", severity: "low", autoFix: false,
            script: soc2IsWindows ? "Get-CimInstance Win32_LogicalDisk | Select DeviceID,@{N='SizeGB';E={[math]::Round($_.Size/1GB,1)}},@{N='FreeGB';E={[math]::Round($_.FreeSpace/1GB,1)}},@{N='UsedPct';E={[math]::Round(($_.Size-$_.FreeSpace)/$_.Size*100,1)}} | Format-Table\nGet-Process | Sort WorkingSet -Desc | Select -First 10 Name,@{N='MB';E={[math]::Round($_.WorkingSet/1MB)}} | Format-Table" : "df -h /\ntop -l 1 | head -10\nvm_stat | head -5" },
          { id: "soc_r12", control: "CC6.2", title: "Password Policy Audit", desc: "Verify password policies meet SOC 2 complexity and rotation requirements", severity: "medium", autoFix: false,
            script: soc2IsWindows ? "net accounts\nGet-LocalUser | Select Name,PasswordLastSet,PasswordExpires,Enabled | Format-Table" : "pwpolicy -getaccountpolicies 2>/dev/null || echo 'Use System Preferences > Security'\ndscl . -list /Users | while read u; do\n  dscl . -read /Users/$u AuthenticationAuthority 2>/dev/null | head -1\ndone" },
        ];

        const criticalCount = complianceRemediations.filter(r => r.severity === "critical").length;
        const highCount = complianceRemediations.filter(r => r.severity === "high").length;

        // Radial gauge data for overall score
        const gaugeData = [{ name: "Score", value: overallScore, fill: overallScore >= 90 ? "#22c55e" : overallScore >= 75 ? "#f59e0b" : "#ef4444" }];

        return (
          <>
            {/* Overall Compliance Score */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card className="md:col-span-1">
                <CardContent className="pt-6 pb-4 flex flex-col items-center">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Overall SOC 2 Score</div>
                  <ResponsiveContainer width={160} height={160}>
                    <RadialBarChart cx="50%" cy="50%" innerRadius="70%" outerRadius="100%" barSize={14} data={gaugeData} startAngle={90} endAngle={-270}>
                      <RadialBar background={{ fill: "hsl(var(--muted))" }} dataKey="value" cornerRadius={10} />
                    </RadialBarChart>
                  </ResponsiveContainer>
                  <div className="text-4xl font-bold -mt-24 mb-16" style={{ color: overallScore >= 90 ? "#22c55e" : overallScore >= 75 ? "#f59e0b" : "#ef4444" }}>
                    {overallScore}%
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {overallScore >= 90 ? "Audit Ready" : overallScore >= 75 ? "Needs Attention" : "At Risk"}
                  </div>
                </CardContent>
              </Card>

              <Card className="md:col-span-1">
                <CardContent className="pt-6">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Control Status</div>
                  <ResponsiveContainer width="100%" height={140}>
                    <PieChart>
                      <Pie data={compliancePieData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={3} dataKey="value">
                        {compliancePieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value} controls`, ""]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex justify-center gap-4 text-[10px] -mt-2">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" />{passingControls} Pass</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" />{totalControls - passingControls - failingControls} Warn</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" />{failingControls} Fail</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardContent className="pt-6">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Compliance Trend (30 Days)</div>
                  <ResponsiveContainer width="100%" height={150}>
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                      <XAxis dataKey="day" tick={false} />
                      <YAxis domain={[60, 100]} tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(value) => [`${value}%`, "Score"]} />
                      <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Quick Stats */}
            <div className="grid gap-3 md:grid-cols-5">
              {[
                { label: "Total Controls", value: String(totalControls), icon: Shield, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30" },
                { label: "Passing", value: String(passingControls), icon: CheckCircle, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/30" },
                { label: "Failing", value: String(failingControls), icon: XCircle, color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/30" },
                { label: "Critical Fixes", value: String(criticalCount), icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/30" },
                { label: "Auto-Fixable", value: String(complianceRemediations.filter(r => r.autoFix).length), icon: Zap, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30" },
              ].map(s => (
                <Card key={s.label} className={s.bg}>
                  <CardContent className="pt-4 pb-3 text-center">
                    <s.icon className={`h-5 w-5 mx-auto mb-1 ${s.color}`} />
                    <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                    <div className="text-[10px] text-muted-foreground">{s.label}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Trust Service Criteria Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="h-5 w-5 text-blue-500" /> Trust Service Criteria
                </CardTitle>
                <p className="text-xs text-muted-foreground">SOC 2 Type II compliance mapped to AICPA Trust Service Criteria</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Bar Chart */}
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={criteriaBarData} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={40} />
                    <Tooltip formatter={(value) => [`${value}%`, "Score"]} />
                    <Bar dataKey="score" radius={[0, 6, 6, 0]} barSize={20}>
                      {criteriaBarData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>

                {/* Detailed Criteria Cards */}
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {trustCriteria.map(criteria => (
                    <div key={criteria.id} className="rounded-xl border overflow-hidden">
                      <div className="p-3 bg-muted/30 flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge style={{ backgroundColor: criteria.color + "20", color: criteria.color, borderColor: criteria.color + "40" }} className="text-[10px] font-mono border">{criteria.id}</Badge>
                            <span className="text-sm font-semibold">{criteria.name}</span>
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">{criteria.passing}/{criteria.total} controls passing</div>
                        </div>
                        <div className="text-2xl font-bold" style={{ color: criteria.color }}>{criteria.score}%</div>
                      </div>
                      <div className="p-2 space-y-1">
                        {criteria.controls.map(ctrl => (
                          <div key={ctrl.id} className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/20 transition-colors">
                            {ctrl.status === "pass" && <CheckCircle className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />}
                            {ctrl.status === "warn" && <AlertCircle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />}
                            {ctrl.status === "fail" && <XCircle className="h-3.5 w-3.5 text-red-500 mt-0.5 shrink-0" />}
                            <div className="min-w-0">
                              <div className="text-[11px] font-medium flex items-center gap-1.5">
                                <span className="font-mono text-muted-foreground">{ctrl.id}</span>
                                {ctrl.name}
                              </div>
                              <div className="text-[10px] text-muted-foreground leading-relaxed">{ctrl.desc}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Device-Targeted Compliance */}
            {devices.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Monitor className="h-5 w-5 text-indigo-500" /> Device Compliance Status
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">Per-device SOC 2 compliance checks. Select a device for targeted recommendations.</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Device Compliance Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-xs text-muted-foreground">
                          <th className="pb-2 pr-4">Device</th>
                          <th className="pb-2 px-2 text-center">Encryption</th>
                          <th className="pb-2 px-2 text-center">Antivirus</th>
                          <th className="pb-2 px-2 text-center">Firewall</th>
                          <th className="pb-2 px-2 text-center">Updates</th>
                          <th className="pb-2 px-2 text-center">MFA</th>
                          <th className="pb-2 px-2 text-center">Disk</th>
                          <th className="pb-2 px-2 text-center">Screen Lock</th>
                          <th className="pb-2 px-2 text-center">Score</th>
                          <th className="pb-2 pl-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {deviceComplianceData.map(d => (
                          <tr key={d.device.id} className={`border-b hover:bg-muted/20 transition-colors ${soc2DeviceFilter === d.device.hostname ? "bg-indigo-50 dark:bg-indigo-950/20" : ""}`}>
                            <td className="py-2.5 pr-4">
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${d.device.status === "ONLINE" ? "bg-green-500" : "bg-red-400"}`} />
                                <div>
                                  <div className="font-medium text-xs">{d.device.hostname}</div>
                                  <div className="text-[10px] text-muted-foreground">{d.device.platform === "win32" || d.device.platform?.toLowerCase() === "windows" ? "Windows" : "macOS"}</div>
                                </div>
                              </div>
                            </td>
                            {[d.encryption, d.antivirus, d.firewall, d.updates, d.mfa, d.diskSpace, d.screenLock].map((check, i) => (
                              <td key={i} className="px-2 text-center">
                                {check ? <CheckCircle className="h-3.5 w-3.5 text-green-500 mx-auto" /> : <XCircle className="h-3.5 w-3.5 text-red-500 mx-auto" />}
                              </td>
                            ))}
                            <td className="px-2 text-center">
                              <Badge className={`text-[10px] ${d.score >= 90 ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : d.score >= 75 ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"}`}>
                                {d.score}%
                              </Badge>
                            </td>
                            <td className="pl-2">
                              <Button size="sm" variant="outline" className="text-[10px] h-6"
                                onClick={() => setSoc2DeviceFilter(soc2DeviceFilter === d.device.hostname ? null : d.device.hostname)}>
                                {soc2DeviceFilter === d.device.hostname ? "Deselect" : "Fix"}
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Compliance Remediations */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Terminal className="h-5 w-5 text-green-500" /> Compliance Remediations
                      {soc2Device && <Badge variant="outline" className="text-[10px] ml-2">Targeting: {soc2Device.hostname}</Badge>}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      Self-remediation scripts mapped to SOC 2 controls. Run these to fix compliance gaps.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="text-xs"
                      onClick={() => {
                        const autoFixable = complianceRemediations.filter(r => r.autoFix);
                        if (soc2Device || device) {
                          autoFixable.forEach(r => executeRemediation(`[SOC2 ${r.control}] ${r.title}`, r.script, soc2Device || device || undefined));
                        }
                      }}>
                      <Zap className="h-3 w-3 mr-1" />Run All Auto-Fix
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Severity filter pills */}
                <div className="flex gap-2 text-xs">
                  {[
                    { label: "Critical", count: criticalCount, color: "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300" },
                    { label: "High", count: highCount, color: "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/30 dark:text-orange-300" },
                    { label: "Medium", count: complianceRemediations.filter(r => r.severity === "medium").length, color: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300" },
                    { label: "Low", count: complianceRemediations.filter(r => r.severity === "low").length, color: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300" },
                  ].map(s => (
                    <Badge key={s.label} className={`${s.color} border`}>{s.label}: {s.count}</Badge>
                  ))}
                </div>

                {/* Remediation Cards */}
                <div className="grid gap-3 md:grid-cols-2">
                  {complianceRemediations.map(remedy => {
                    const hasRun = commandLogs.some(l => l.title.includes(remedy.title) && (l.status === "COMPLETED" || l.status === "SENT"));
                    return (
                      <div key={remedy.id} className={`rounded-xl border overflow-hidden ${hasRun ? "border-green-300 dark:border-green-800" : ""}`}>
                        <div className="p-4 space-y-2">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <Badge className={`text-[9px] font-mono ${
                                remedy.severity === "critical" ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" :
                                remedy.severity === "high" ? "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200" :
                                remedy.severity === "medium" ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" :
                                "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                              }`}>{remedy.severity.toUpperCase()}</Badge>
                              <Badge variant="outline" className="text-[9px] font-mono">{remedy.control}</Badge>
                              {remedy.autoFix && <Badge className="text-[9px] bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Auto-Fix</Badge>}
                            </div>
                          </div>
                          <div className="text-sm font-semibold">{remedy.title}</div>
                          <p className="text-xs text-muted-foreground leading-relaxed">{remedy.desc}</p>
                        </div>

                        {/* Script Preview */}
                        <div className="border-t">
                          <details className="group">
                            <summary className="px-4 py-2 text-[11px] text-muted-foreground cursor-pointer hover:text-foreground flex items-center gap-1">
                              <ChevronRight className="h-3 w-3 transition-transform group-open:rotate-90" />
                              {soc2IsWindows ? "PowerShell" : "Zsh"} Script
                            </summary>
                            <div className="bg-gray-950 text-green-400 px-4 py-2 font-mono text-[10px] overflow-x-auto max-h-40">
                              <pre className="whitespace-pre-wrap">{remedy.script}</pre>
                            </div>
                          </details>
                        </div>

                        <div className="px-4 py-2.5 bg-muted/20 border-t flex items-center justify-between">
                          <div className="text-[10px] text-muted-foreground">
                            {soc2Device ? `Target: ${soc2Device.hostname}` : device ? `Target: ${device.hostname}` : "Select a device first"}
                          </div>
                          <Button
                            size="sm"
                            className={`text-xs h-7 ${hasRun ? "bg-green-600 hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700"} text-white`}
                            disabled={!soc2Device && !device}
                            onClick={() => executeRemediation(`[SOC2 ${remedy.control}] ${remedy.title}`, remedy.script, soc2Device || device || undefined)}
                          >
                            {hasRun ? <><CheckCircle className="h-3 w-3 mr-1" />Sent</> : <><Play className="h-3 w-3 mr-1" />Run</>}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* SOC 2 Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Info className="h-5 w-5 text-blue-500" /> SOC 2 Audit Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2">
                  {[
                    { priority: "critical", title: "Enable Disk Encryption on All Devices", desc: "Ensure BitLocker (Windows) or FileVault (macOS) is enabled on every enrolled device. SOC 2 C1.3 requires encryption at rest for all systems handling customer data.", action: "Run C1.3 remediation above", trend: "down" },
                    { priority: "critical", title: "Update Antivirus Definitions Fleet-Wide", desc: "Devices with outdated AV definitions (>7 days) are non-compliant with CC6.8. Schedule daily definition updates via group policy or MDM.", action: "Run CC6.8 remediation above", trend: "up" },
                    { priority: "high", title: "Implement 90-Day Access Review", desc: "CC6.3 requires timely removal of access for terminated users. Implement a quarterly access review process and automate offboarding via SSO provider.", action: "Configure in Settings → SSO", trend: "up" },
                    { priority: "high", title: "Document Incident Response Procedures", desc: "CC7.4 requires documented and tested incident response procedures. Schedule a tabletop exercise within 30 days and document results.", action: "Create runbook in Settings", trend: "down" },
                    { priority: "medium", title: "Enforce Software Allowlist", desc: "CC8.2 requires tracking of infrastructure changes. Implement a software allowlist and alert on unauthorized installations.", action: "Configure in Security → DLP", trend: "up" },
                    { priority: "medium", title: "Enable Automated Compliance Scanning", desc: "Schedule weekly compliance scans to track drift over time. Set up alerts for score drops below 85%.", action: "Configure in IT Support → Config", trend: "up" },
                    { priority: "low", title: "Implement Continuous Monitoring Dashboard", desc: "Real-time compliance visibility reduces audit prep time by up to 60%. Consider exposing SOC 2 metrics to auditors via read-only access.", action: "Share this dashboard", trend: "up" },
                    { priority: "low", title: "Automate Evidence Collection", desc: "Collect screenshots, logs, and reports automatically for each control. Reduces manual evidence gathering during audit season.", action: "Enable in Reports", trend: "up" },
                  ].map((rec, i) => (
                    <div key={i} className={`p-4 rounded-xl border ${
                      rec.priority === "critical" ? "border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20" :
                      rec.priority === "high" ? "border-orange-200 bg-orange-50/50 dark:border-orange-900 dark:bg-orange-950/20" :
                      rec.priority === "medium" ? "border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20" :
                      "border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20"
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <Badge className={`text-[9px] ${
                          rec.priority === "critical" ? "bg-red-200 text-red-800" :
                          rec.priority === "high" ? "bg-orange-200 text-orange-800" :
                          rec.priority === "medium" ? "bg-amber-200 text-amber-800" :
                          "bg-blue-200 text-blue-800"
                        }`}>{rec.priority.toUpperCase()}</Badge>
                        {rec.trend === "up" ? (
                          <div className="flex items-center gap-0.5 text-green-600 text-[10px]"><ArrowUpRight className="h-3 w-3" />Improving</div>
                        ) : (
                          <div className="flex items-center gap-0.5 text-red-600 text-[10px]"><ArrowDownRight className="h-3 w-3" />Needs Work</div>
                        )}
                      </div>
                      <div className="text-sm font-semibold mb-1">{rec.title}</div>
                      <p className="text-xs text-muted-foreground leading-relaxed mb-2">{rec.desc}</p>
                      <div className="text-[10px] font-medium text-blue-600 dark:text-blue-400">{rec.action}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        );
      })()}

      {/* ═══════════════════════════════════════════════════════════ */}
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
                <div className="flex items-center gap-2 p-3 rounded-lg border border-blue-300 bg-blue-50 dark:bg-blue-950/30">
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
