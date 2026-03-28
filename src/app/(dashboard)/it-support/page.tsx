"use client";

import { useState, useEffect } from "react";
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
  const [activeTab, setActiveTab] = useState<"queue" | "tickets" | "submit" | "config">("queue");
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
  const isWindows = device?.platform === "win32";
  const isMac = device?.platform === "darwin";
  const deviceApps = device?.installedSoftware || [];

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
                          <div className="text-[11px] text-muted-foreground">{dev.platform === "win32" ? "🪟 Windows" : "🍎 macOS"} &bull; {dev.ipAddress}</div>
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
                        ].map((a) => (
                          <div key={a.title} className="rounded-lg border overflow-hidden">
                            <div className="flex items-center justify-between p-2.5 bg-muted/30">
                              <div className="flex items-center gap-2"><a.icon className="h-4 w-4 text-blue-600" /><span className="text-sm font-medium">{a.title}</span></div>
                              <Button size="sm" variant="outline" className="text-[11px] h-7"><Play className="h-3 w-3 mr-1" />Run</Button>
                            </div>
                            <div className="bg-gray-950 text-green-400 p-2 font-mono text-[11px] overflow-x-auto"><pre className="whitespace-pre-wrap">{a.code}</pre></div>
                          </div>
                        ))}
                        {isWindows && [
                          { title: "SFC / DISM Repair", icon: HardDrive, code: "sfc /scannow\nDISM /Online /Cleanup-Image /RestoreHealth" },
                          { title: "GP Update", icon: RefreshCw, code: "gpupdate /force" },
                          { title: "Print Spooler Reset", icon: PrinterCheck, code: "Stop-Service Spooler -Force\nRemove-Item \"$env:SystemRoot\\System32\\spool\\PRINTERS\\*\" -Force\nStart-Service Spooler" },
                          { title: "Explorer Restart", icon: Monitor, code: "Stop-Process -Name explorer -Force; Start-Process explorer" },
                          { title: "Windows Update Reset", icon: Download, code: "Stop-Service wuauserv -Force\nRemove-Item \"C:\\Windows\\SoftwareDistribution\\*\" -Recurse -Force\nStart-Service wuauserv" },
                        ].map((a) => (
                          <div key={a.title} className="rounded-lg border overflow-hidden">
                            <div className="flex items-center justify-between p-2.5 bg-muted/30">
                              <div className="flex items-center gap-2"><a.icon className="h-4 w-4 text-cyan-600" /><span className="text-sm font-medium">{a.title}</span></div>
                              <Button size="sm" variant="outline" className="text-[11px] h-7"><Play className="h-3 w-3 mr-1" />Run</Button>
                            </div>
                            <div className="bg-gray-950 text-green-400 p-2 font-mono text-[11px] overflow-x-auto"><pre className="whitespace-pre-wrap">{a.code}</pre></div>
                          </div>
                        ))}
                        {isMac && [
                          { title: "Reset TCC Permissions", icon: Lock, code: "tccutil reset All <bundle-id>" },
                          { title: "Spotlight Re-index", icon: Search, code: "mdutil -i on /\nmdutil -E /" },
                          { title: "FileVault Check", icon: Lock, code: "fdesetup status" },
                          { title: "Dock/Finder Restart", icon: RefreshCw, code: "killall Finder; killall Dock" },
                          { title: "SystemUIServer", icon: Monitor, code: "killall SystemUIServer" },
                        ].map((a) => (
                          <div key={a.title} className="rounded-lg border overflow-hidden">
                            <div className="flex items-center justify-between p-2.5 bg-muted/30">
                              <div className="flex items-center gap-2"><a.icon className="h-4 w-4 text-gray-500" /><span className="text-sm font-medium">{a.title}</span></div>
                              <Button size="sm" variant="outline" className="text-[11px] h-7"><Play className="h-3 w-3 mr-1" />Run</Button>
                            </div>
                            <div className="bg-gray-950 text-green-400 p-2 font-mono text-[11px] overflow-x-auto"><pre className="whitespace-pre-wrap">{a.code}</pre></div>
                          </div>
                        ))}
                      </div>

                      {/* Security Remediations */}
                      <div className="grid gap-2 md:grid-cols-2">
                        {[
                          { title: "Certificate Injection", icon: Lock, desc: "Push missing certs to system store", status: "Check required", sc: "text-amber-600" },
                          { title: "Agent Health Recovery", icon: ShieldCheck, desc: "Restart EDR/AV agent on this device", status: "Healthy", sc: "text-green-600" },
                          { title: "Local Admin Removal", icon: XCircle, desc: "Strip unauthorized admin privileges", status: "Compliant", sc: "text-green-600" },
                          { title: "Unauthorized App Removal", icon: XCircle, desc: "Remove blacklisted software", status: "No violations", sc: "text-green-600" },
                        ].map((r) => (
                          <div key={r.title} className="flex items-start gap-3 p-3 rounded-lg border">
                            <r.icon className="h-4 w-4 text-red-500 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium">{r.title}</div>
                              <div className="text-xs text-muted-foreground">{r.desc}</div>
                              <div className={`text-xs font-medium mt-1 ${r.sc}`}>{r.status}</div>
                            </div>
                            <Button size="sm" variant="outline" className="text-xs shrink-0">Run</Button>
                          </div>
                        ))}
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
                      <div className="text-[11px] text-muted-foreground">{dev.platform === "win32" ? "🪟 " : "🍎 "}{dev.osVersion}</div>
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
                  <div><span className="text-muted-foreground text-xs">Platform</span><div className="font-medium">{device.platform === "win32" ? "Windows" : "macOS"}</div></div>
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
    </div>
  );
}
