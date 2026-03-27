"use client";

import { useState, Fragment } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Monitor, Cpu, HardDrive, Shield, RefreshCw, ChevronDown, ChevronRight,
  Wifi, AlertTriangle, CheckCircle, XCircle, Clock, Search, FileText,
  Trash2, ArrowRightLeft, Copy, Bug, Activity, Package, Play,
  Users, CalendarCheck, LayoutDashboard, FolderKanban, BarChart3, Brain, Settings,
} from "lucide-react";

// ─── Mock Data ───────────────────────────────────────────────────────────────

const now = new Date();
const ago = (mins: number) => new Date(now.getTime() - mins * 60000).toISOString();

const mockDevices = [
  {
    id: "dev-1",
    hostname: "DESKTOP-JMILLER",
    platform: "win32",
    agentVersion: "0.2.0",
    status: "ONLINE" as const,
    lastSeenAt: ago(2),
    ipAddress: "192.168.1.105",
    osVersion: "Windows 11 Pro 10.0.26100",
    cpuName: "AMD Ryzen 7 7800X3D 8-Core Processor",
    cpuCores: 8,
    ramTotalGb: 32.0,
    ramAvailGb: 18.4,
    gpuName: "NVIDIA GeForce RTX 4070 Ti",
    diskDrives: [
      { model: "Samsung 990 Pro 2TB", sizeGb: 1863, type: "SSD" },
      { model: "WD Black SN850X 1TB", sizeGb: 931, type: "SSD" },
    ],
    uptimeSeconds: 345600,
    antivirusName: "Windows Defender",
    firewallStatus: { domain: true, private: true, public: true },
    defenderStatus: "enabled",
    securityGrade: "A",
    lastUpdateDate: "2026-03-20",
    pendingUpdates: [
      { title: "2026-03 Cumulative Update for Windows 11", kb: "KB5035942" },
    ],
    updateServiceStatus: "running",
    rebootPending: false,
    bsodEvents: [],
    bsodCount: 0,
    performanceIssues: [],
    dnsServers: "1.1.1.1, 8.8.8.8",
    networkAdapters: [
      { name: "Ethernet", description: "Intel I225-V", mac: "A4:BB:6D:12:34:56", speed: "2.5 Gbps" },
    ],
    wifiSignal: null,
    installedSoftware: [
      { name: "Google Chrome", version: "123.0.6312.86" },
      { name: "Microsoft 365 Apps", version: "16.0.17328" },
      { name: "Slack", version: "4.38.125" },
      { name: "Visual Studio Code", version: "1.96.2" },
      { name: "Zoom", version: "6.0.11" },
      { name: "1Password", version: "8.10.38" },
      { name: "Docker Desktop", version: "4.36.0" },
      { name: "Git", version: "2.47.1" },
      { name: "Node.js", version: "22.12.0" },
      { name: "Python", version: "3.12.8" },
      { name: "Adobe Acrobat Reader", version: "24.004.20220" },
      { name: "Figma", version: "124.5.2" },
    ],
    runningSoftware: [
      { name: "chrome", count: 14, memoryMb: 2340 },
      { name: "Code", count: 5, memoryMb: 890 },
      { name: "slack", count: 3, memoryMb: 420 },
      { name: "docker", count: 8, memoryMb: 1100 },
      { name: "node", count: 4, memoryMb: 560 },
      { name: "explorer", count: 1, memoryMb: 85 },
    ],
    user: { id: "u1", name: "Jordan Miller", email: "jordan@acmecorp.com" },
    _count: { commands: 3, diagnostics: 12 },
    openCves: 2,
    activeIocs: 0,
    recentActivity: [
      { eventType: "APP_SWITCH", appName: "Google Chrome", windowTitle: "Jira - Sprint Board", timestamp: ago(3), url: null },
      { eventType: "WEBSITE_VISIT", appName: "Google Chrome", windowTitle: null, timestamp: ago(8), url: "https://github.com/acmecorp/api-gateway/pull/247" },
      { eventType: "APP_SWITCH", appName: "VS Code", windowTitle: "api-gateway — server.ts", timestamp: ago(15), url: null },
      { eventType: "WEBSITE_VISIT", appName: "Google Chrome", windowTitle: null, timestamp: ago(22), url: "https://stackoverflow.com/questions/prisma-connection-pool" },
      { eventType: "APP_SWITCH", appName: "Slack", windowTitle: "#engineering - Acme Corp", timestamp: ago(30), url: null },
      { eventType: "APP_SWITCH", appName: "Docker Desktop", windowTitle: "Containers", timestamp: ago(45), url: null },
    ],
    fileEvents: [
      { eventType: "FILE_CREATE", windowTitle: "deployment.yaml", url: "C:\\Projects\\api-gateway\\k8s\\deployment.yaml", timestamp: ago(12), metadata: null },
      { eventType: "FILE_CREATE", windowTitle: "test-results.json", url: "C:\\Projects\\api-gateway\\test-results.json", timestamp: ago(25), metadata: null },
      { eventType: "FILE_DELETE", windowTitle: "old-config.json", url: "C:\\Projects\\api-gateway\\old-config.json", timestamp: ago(40), metadata: null },
      { eventType: "FILE_MOVE", windowTitle: "report-Q1.xlsx", url: "C:\\Users\\jordan\\Documents\\Reports\\report-Q1.xlsx", timestamp: ago(90), metadata: null },
    ],
  },
  {
    id: "dev-2",
    hostname: "LAPTOP-SCHEN",
    platform: "win32",
    agentVersion: "0.2.0",
    status: "ONLINE" as const,
    lastSeenAt: ago(5),
    ipAddress: "192.168.1.112",
    osVersion: "Windows 11 Home 10.0.26100",
    cpuName: "Intel Core Ultra 7 155H",
    cpuCores: 16,
    ramTotalGb: 16.0,
    ramAvailGb: 5.2,
    gpuName: "Intel Arc Graphics",
    diskDrives: [
      { model: "SK Hynix P41 512GB", sizeGb: 476, type: "SSD" },
    ],
    uptimeSeconds: 172800,
    antivirusName: "Windows Defender, Malwarebytes",
    firewallStatus: { domain: true, private: true, public: true },
    defenderStatus: "enabled",
    securityGrade: "B",
    lastUpdateDate: "2026-03-15",
    pendingUpdates: [
      { title: "2026-03 Cumulative Update for Windows 11", kb: "KB5035942" },
      { title: "Microsoft Defender Antivirus Update", kb: "KB2267602" },
      { title: ".NET 8.0 Runtime Update", kb: "KB5036456" },
    ],
    updateServiceStatus: "running",
    rebootPending: true,
    bsodEvents: [],
    bsodCount: 0,
    performanceIssues: [
      { check: "Startup Programs", status: "warn", detail: "22 startup programs — may slow boot time" },
      { check: "Temp Files", status: "warn", detail: "1,247 MB of temp files — consider cleanup" },
    ],
    dnsServers: "192.168.1.1",
    networkAdapters: [
      { name: "Wi-Fi", description: "Intel Wi-Fi 6E AX211", mac: "7C:10:C9:AA:BB:CC", speed: "1.2 Gbps" },
    ],
    wifiSignal: 78,
    installedSoftware: [
      { name: "Google Chrome", version: "123.0.6312.86" },
      { name: "Microsoft 365 Apps", version: "16.0.17328" },
      { name: "Slack", version: "4.38.125" },
      { name: "Zoom", version: "6.0.11" },
      { name: "Adobe Creative Cloud", version: "6.4.0.514" },
      { name: "Photoshop", version: "25.7" },
      { name: "Illustrator", version: "28.5" },
      { name: "Figma", version: "124.5.2" },
      { name: "Canva Desktop", version: "1.82.0" },
      { name: "Notion", version: "3.14.0" },
    ],
    runningSoftware: [
      { name: "chrome", count: 22, memoryMb: 3100 },
      { name: "Photoshop", count: 1, memoryMb: 2800 },
      { name: "slack", count: 3, memoryMb: 380 },
      { name: "Figma", count: 2, memoryMb: 920 },
      { name: "Notion", count: 1, memoryMb: 340 },
      { name: "explorer", count: 1, memoryMb: 78 },
    ],
    user: { id: "u2", name: "Sarah Chen", email: "sarah@acmecorp.com" },
    _count: { commands: 1, diagnostics: 8 },
    openCves: 0,
    activeIocs: 1,
    recentActivity: [
      { eventType: "APP_SWITCH", appName: "Photoshop", windowTitle: "hero-banner-v3.psd", timestamp: ago(6), url: null },
      { eventType: "APP_SWITCH", appName: "Figma", windowTitle: "Acme Corp — Marketing Site Redesign", timestamp: ago(18), url: null },
      { eventType: "WEBSITE_VISIT", appName: "Google Chrome", windowTitle: null, timestamp: ago(25), url: "https://dribbble.com/shots/popular" },
      { eventType: "APP_SWITCH", appName: "Slack", windowTitle: "#design - Acme Corp", timestamp: ago(35), url: null },
      { eventType: "WEBSITE_VISIT", appName: "Google Chrome", windowTitle: null, timestamp: ago(50), url: "https://www.figma.com/design/acme-rebrand" },
    ],
    fileEvents: [
      { eventType: "FILE_CREATE", windowTitle: "hero-banner-v3.psd", url: "C:\\Users\\sarah\\Design\\hero-banner-v3.psd", timestamp: ago(8), metadata: null },
      { eventType: "FILE_COPY", windowTitle: "brand-assets.zip", url: "C:\\Users\\sarah\\Documents\\brand-assets.zip", timestamp: ago(30), metadata: null },
      { eventType: "FILE_DELETE", windowTitle: "hero-banner-v1.psd", url: "C:\\Users\\sarah\\Design\\hero-banner-v1.psd", timestamp: ago(55), metadata: null },
    ],
  },
  {
    id: "dev-3",
    hostname: "WS-TGARCIA",
    platform: "win32",
    agentVersion: "0.2.0",
    status: "OFFLINE" as const,
    lastSeenAt: ago(180),
    ipAddress: "192.168.1.108",
    osVersion: "Windows 10 Pro 10.0.19045",
    cpuName: "Intel Core i5-12400",
    cpuCores: 6,
    ramTotalGb: 16.0,
    ramAvailGb: 9.8,
    gpuName: "Intel UHD Graphics 730",
    diskDrives: [
      { model: "Crucial MX500 500GB", sizeGb: 465, type: "SSD" },
      { model: "Seagate Barracuda 2TB", sizeGb: 1863, type: "HDD" },
    ],
    uptimeSeconds: 604800,
    antivirusName: "Windows Defender",
    firewallStatus: { domain: true, private: true, public: false },
    defenderStatus: "enabled",
    securityGrade: "C",
    lastUpdateDate: "2026-02-28",
    pendingUpdates: [
      { title: "2026-03 Cumulative Update for Windows 10", kb: "KB5035941" },
      { title: "Security Update for .NET Framework", kb: "KB5036120" },
      { title: "Microsoft Edge Update", kb: "KB5036789" },
      { title: "Windows Malicious Software Removal Tool", kb: "KB890830" },
    ],
    updateServiceStatus: "running",
    rebootPending: true,
    bsodEvents: [
      { Date: "2026-03-10 14:23:05", Source: "BugCheck", Message: "The computer has rebooted from a bugcheck. The bugcheck was: 0x0000009f DRIVER_POWER_STATE_FAILURE" },
    ],
    bsodCount: 1,
    performanceIssues: [
      { check: "Startup Programs", status: "warn", detail: "18 startup programs — may slow boot time" },
    ],
    dnsServers: "192.168.1.1, 8.8.8.8",
    networkAdapters: [
      { name: "Ethernet", description: "Realtek PCIe GbE", mac: "D8:BB:C1:11:22:33", speed: "1 Gbps" },
    ],
    wifiSignal: null,
    installedSoftware: [
      { name: "Google Chrome", version: "123.0.6312.86" },
      { name: "Microsoft 365 Apps", version: "16.0.17328" },
      { name: "QuickBooks Desktop", version: "2024.R8" },
      { name: "Adobe Acrobat Pro", version: "24.004.20220" },
      { name: "Salesforce CLI", version: "2.35.6" },
      { name: "SAP Business One", version: "10.0.2310" },
    ],
    runningSoftware: [
      { name: "chrome", count: 8, memoryMb: 1200 },
      { name: "EXCEL", count: 1, memoryMb: 450 },
      { name: "QuickBooks", count: 1, memoryMb: 680 },
      { name: "explorer", count: 1, memoryMb: 92 },
    ],
    user: { id: "u3", name: "Tom Garcia", email: "tom@acmecorp.com" },
    _count: { commands: 0, diagnostics: 5 },
    openCves: 5,
    activeIocs: 0,
    recentActivity: [
      { eventType: "APP_SWITCH", appName: "Microsoft Excel", windowTitle: "Q1-Revenue-Forecast.xlsx", timestamp: ago(185), url: null },
      { eventType: "APP_SWITCH", appName: "QuickBooks", windowTitle: "Acme Corp — Invoices", timestamp: ago(200), url: null },
      { eventType: "WEBSITE_VISIT", appName: "Google Chrome", windowTitle: null, timestamp: ago(210), url: "https://salesforce.com/opportunities" },
    ],
    fileEvents: [
      { eventType: "FILE_CREATE", windowTitle: "invoice-march-2026.pdf", url: "C:\\Users\\tom\\Documents\\Invoices\\invoice-march-2026.pdf", timestamp: ago(190), metadata: null },
      { eventType: "FILE_COPY", windowTitle: "Q1-Revenue-Forecast.xlsx", url: "C:\\Users\\tom\\OneDrive\\Finance\\Q1-Revenue-Forecast.xlsx", timestamp: ago(195), metadata: null },
    ],
  },
  {
    id: "dev-4",
    hostname: "MACBOOK-APATEL",
    platform: "darwin",
    agentVersion: "0.2.0",
    status: "ONLINE" as const,
    lastSeenAt: ago(1),
    ipAddress: "192.168.1.120",
    osVersion: "macOS 15.3 Sequoia",
    cpuName: "Apple M3 Pro",
    cpuCores: 12,
    ramTotalGb: 36.0,
    ramAvailGb: 22.1,
    gpuName: "Apple M3 Pro (18-core GPU)",
    diskDrives: [
      { model: "Apple SSD AP1024Z", sizeGb: 1000, type: "SSD" },
    ],
    uptimeSeconds: 86400,
    antivirusName: "CrowdStrike Falcon",
    firewallStatus: { domain: true, private: true, public: true },
    defenderStatus: "N/A",
    securityGrade: "A+",
    lastUpdateDate: "2026-03-22",
    pendingUpdates: [],
    updateServiceStatus: "running",
    rebootPending: false,
    bsodEvents: [],
    bsodCount: 0,
    performanceIssues: [],
    dnsServers: "1.1.1.1, 1.0.0.1",
    networkAdapters: [
      { name: "Wi-Fi", description: "Apple Wi-Fi 6E", mac: "F8:FF:C2:DD:EE:FF", speed: "1.2 Gbps" },
    ],
    wifiSignal: 92,
    installedSoftware: [
      { name: "Google Chrome", version: "123.0.6312.86" },
      { name: "Slack", version: "4.38.125" },
      { name: "iTerm2", version: "3.5.2" },
      { name: "VS Code", version: "1.96.2" },
      { name: "Postman", version: "11.20.0" },
      { name: "Docker Desktop", version: "4.36.0" },
      { name: "Homebrew", version: "4.4.10" },
      { name: "TablePlus", version: "6.2.2" },
    ],
    runningSoftware: [
      { name: "chrome", count: 10, memoryMb: 1800 },
      { name: "Code", count: 4, memoryMb: 720 },
      { name: "iTerm2", count: 3, memoryMb: 180 },
      { name: "slack", count: 3, memoryMb: 350 },
      { name: "docker", count: 6, memoryMb: 980 },
      { name: "Postman", count: 1, memoryMb: 290 },
    ],
    user: { id: "u4", name: "Anita Patel", email: "anita@acmecorp.com" },
    _count: { commands: 2, diagnostics: 15 },
    openCves: 0,
    activeIocs: 0,
    recentActivity: [
      { eventType: "APP_SWITCH", appName: "VS Code", windowTitle: "acme-mobile — App.tsx", timestamp: ago(2), url: null },
      { eventType: "WEBSITE_VISIT", appName: "Google Chrome", windowTitle: null, timestamp: ago(10), url: "https://github.com/acmecorp/acme-mobile/pull/89" },
      { eventType: "APP_SWITCH", appName: "Postman", windowTitle: "Acme API — Users Collection", timestamp: ago(20), url: null },
      { eventType: "APP_SWITCH", appName: "iTerm2", windowTitle: "kubectl logs -f api-pod", timestamp: ago(28), url: null },
      { eventType: "APP_SWITCH", appName: "Slack", windowTitle: "#backend - Acme Corp", timestamp: ago(40), url: null },
    ],
    fileEvents: [
      { eventType: "FILE_CREATE", windowTitle: "App.tsx", url: "/Users/anita/dev/acme-mobile/src/App.tsx", timestamp: ago(5), metadata: null },
      { eventType: "FILE_CREATE", windowTitle: "api-spec.yaml", url: "/Users/anita/dev/acme-mobile/api-spec.yaml", timestamp: ago(15), metadata: null },
    ],
  },
];

// ─── Utility Functions ───────────────────────────────────────────────────────

function formatUptime(seconds: number | null) {
  if (!seconds) return "N/A";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatTimeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    ONLINE: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    OFFLINE: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    STALE: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  };
  return <Badge className={colors[status] || ""}>{status}</Badge>;
}

// ─── Nav Items ───────────────────────────────────────────────────────────────

const demoNavItems = [
  { label: "Dashboard", icon: LayoutDashboard, active: false },
  { label: "Employees", icon: Users, active: false },
  { label: "Time Tracking", icon: Clock, active: false },
  { label: "Attendance", icon: CalendarCheck, active: false },
  { label: "Activity", icon: Activity, active: false },
  { label: "Projects", icon: FolderKanban, active: false },
  { label: "Devices", icon: Monitor, active: true },
  { label: "Security", icon: Shield, active: false },
  { label: "Reports", icon: BarChart3, active: false },
  { label: "Productivity", icon: Brain, active: false },
  { label: "Settings", icon: Settings, active: false },
];

// ─── Demo Page ───────────────────────────────────────────────────────────────

export default function DemoPage() {
  const [expandedId, setExpandedId] = useState<string | null>("dev-1");
  const [activeTab, setActiveTab] = useState("overview");
  const [search, setSearch] = useState("");
  const [activeSection, setActiveSection] = useState("devices");

  const devices = mockDevices;
  const filtered = devices.filter(
    (d) =>
      d.hostname.toLowerCase().includes(search.toLowerCase()) ||
      d.user.name?.toLowerCase().includes(search.toLowerCase()) ||
      d.ipAddress?.includes(search)
  );

  const onlineCount = devices.filter((d) => d.status === "ONLINE").length;
  const totalCves = devices.reduce((sum, d) => sum + d.openCves, 0);
  const totalIocs = devices.reduce((sum, d) => sum + d.activeIocs, 0);
  const rebootNeeded = devices.filter((d) => d.rebootPending).length;

  return (
    <div className="flex min-h-screen bg-background">
      {/* Demo Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 border-r bg-sidebar">
        <div className="flex h-16 items-center border-b px-6">
          <span className="text-xl font-bold text-primary">MyDex</span>
          <Badge className="ml-2 bg-blue-100 text-blue-800 text-[10px]">DEMO</Badge>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {demoNavItems.map((item) => (
            <button
              key={item.label}
              onClick={() => setActiveSection(item.label.toLowerCase().replace(" ", "-"))}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors w-full text-left ${
                (activeSection === item.label.toLowerCase().replace(" ", "-")) || (activeSection === "devices" && item.active)
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t">
          <Link href="/register">
            <Button className="w-full">Get Started Free</Button>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:pl-64">
        {/* Demo Banner */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-3 text-center text-sm">
          You&apos;re viewing a live demo with simulated data.{" "}
          <Link href="/register" className="underline font-semibold">
            Sign up free
          </Link>{" "}
          to monitor your own devices.
        </div>

        {/* Topbar */}
        <div className="h-16 border-b flex items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3 lg:hidden">
            <span className="text-lg font-bold text-primary">MyDex</span>
            <Badge className="bg-blue-100 text-blue-800 text-[10px]">DEMO</Badge>
          </div>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Acme Corp</span>
            <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-bold">
              A
            </div>
          </div>
        </div>

        <div className="p-3 sm:p-4 lg:p-6">
          {activeSection === "dashboard" ? (
            /* ─── Dashboard View ─── */
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                <p className="text-muted-foreground">Welcome back, Admin</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[
                  { title: "Total Employees", value: 24, icon: Users, desc: "Active team members" },
                  { title: "Currently Working", value: 18, icon: Clock, desc: "Clocked in right now" },
                  { title: "Present Today", value: 21, icon: CalendarCheck, desc: "Attendance recorded" },
                  { title: "Open Alerts", value: 3, icon: Shield, desc: "Security alerts pending" },
                ].map((stat) => (
                  <Card key={stat.title}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                      <stat.icon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stat.value}</div>
                      <p className="text-xs text-muted-foreground">{stat.desc}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader><CardTitle>Recent Activity</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      { user: "Jordan Miller", action: "pushed to api-gateway", time: "3m ago" },
                      { user: "Sarah Chen", action: "exported hero-banner-v3.psd", time: "8m ago" },
                      { user: "Anita Patel", action: "opened PR #89 on acme-mobile", time: "15m ago" },
                      { user: "Tom Garcia", action: "updated Q1 Revenue Forecast", time: "3h ago" },
                    ].map((a, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm">
                        <div className="h-7 w-7 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-xs font-bold text-blue-700 dark:text-blue-300">
                          {a.user.split(" ").map(n => n[0]).join("")}
                        </div>
                        <div className="flex-1">
                          <span className="font-medium">{a.user}</span>{" "}
                          <span className="text-muted-foreground">{a.action}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{a.time}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle>Security Overview</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>Devices Online</span>
                      <Badge className="bg-green-100 text-green-800">{onlineCount}/{devices.length}</Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Open CVEs</span>
                      <Badge className="bg-orange-100 text-orange-800">{totalCves}</Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Blocked IOCs</span>
                      <Badge className="bg-red-100 text-red-800">{totalIocs}</Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Pending Reboots</span>
                      <Badge className="bg-yellow-100 text-yellow-800">{rebootNeeded}</Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Firewall Compliance</span>
                      <Badge className="bg-green-100 text-green-800">3/4</Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            /* ─── Devices View (Default) ─── */
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Monitor className="h-6 w-6" /> Devices
                  </h1>
                  <p className="text-muted-foreground text-sm">Connected agents and system health</p>
                </div>
                <Button variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" /> Refresh
                </Button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-4 pb-3">
                    <div className="text-sm text-muted-foreground">Online</div>
                    <div className="text-2xl font-bold text-green-600">{onlineCount}</div>
                    <div className="text-xs text-muted-foreground">{devices.length} total</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-3">
                    <div className="text-sm text-muted-foreground">Open CVEs</div>
                    <div className="text-2xl font-bold text-orange-600">{totalCves}</div>
                    <div className="text-xs text-muted-foreground">across all devices</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-3">
                    <div className="text-sm text-muted-foreground">Blocked IOCs</div>
                    <div className="text-2xl font-bold text-red-600">{totalIocs}</div>
                    <div className="text-xs text-muted-foreground">active threats</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-3">
                    <div className="text-sm text-muted-foreground">Reboot Pending</div>
                    <div className="text-2xl font-bold text-yellow-600">{rebootNeeded}</div>
                    <div className="text-xs text-muted-foreground">needs restart</div>
                  </CardContent>
                </Card>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-10" placeholder="Search by hostname, user, or IP..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>

              <div className="space-y-3">
                {filtered.map((device) => (
                  <Fragment key={device.id}>
                    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setExpandedId(expandedId === device.id ? null : device.id); setActiveTab("overview"); }}>
                      <CardContent className="py-4">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            {expandedId === device.id ? <ChevronDown className="h-4 w-4 flex-shrink-0 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />}
                            <Monitor className="h-5 w-5 flex-shrink-0 text-blue-500" />
                            <div className="min-w-0">
                              <div className="font-semibold truncate">{device.hostname}</div>
                              <div className="text-xs text-muted-foreground truncate">{device.user.name} &middot; {device.ipAddress} &middot; {device.platform}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0 text-sm">
                            {device.cpuName && <span className="hidden lg:flex items-center gap-1 text-muted-foreground" title={device.cpuName}><Cpu className="h-3.5 w-3.5" /> {device.cpuCores}c</span>}
                            {device.ramTotalGb && <span className="hidden lg:flex items-center gap-1 text-muted-foreground">{device.ramTotalGb}GB</span>}
                            {device.openCves > 0 && <Badge variant="outline" className="text-orange-600 border-orange-300"><Bug className="h-3 w-3 mr-1" /> {device.openCves} CVE</Badge>}
                            {device.rebootPending && <Badge variant="outline" className="text-yellow-600 border-yellow-300"><RefreshCw className="h-3 w-3 mr-1" /> Reboot</Badge>}
                            <span className="text-xs text-muted-foreground whitespace-nowrap"><Clock className="h-3 w-3 inline mr-1" />{formatTimeAgo(device.lastSeenAt)}</span>
                            <StatusBadge status={device.status} />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {expandedId === device.id && (
                      <Card className="border-l-4 border-l-blue-500">
                        <CardContent className="py-4">
                          <div className="flex gap-1 mb-4 flex-wrap">
                            {[
                              { id: "overview", label: "Overview", icon: Monitor },
                              { id: "security", label: "Security", icon: Shield },
                              { id: "software", label: "Software", icon: Package },
                              { id: "activity", label: "Activity", icon: Activity },
                              { id: "files", label: "Files", icon: FileText },
                            ].map((tab) => (
                              <Button key={tab.id} size="sm" variant={activeTab === tab.id ? "default" : "ghost"} onClick={(e) => { e.stopPropagation(); setActiveTab(tab.id); }}>
                                <tab.icon className="h-3.5 w-3.5 mr-1" /> {tab.label}
                              </Button>
                            ))}
                          </div>

                          {activeTab === "overview" && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="space-y-2">
                                <h3 className="font-semibold text-sm flex items-center gap-1"><Cpu className="h-4 w-4" /> Hardware</h3>
                                <div className="text-sm space-y-1">
                                  <div><span className="text-muted-foreground">CPU:</span> {device.cpuName}</div>
                                  <div><span className="text-muted-foreground">Cores:</span> {device.cpuCores}</div>
                                  <div><span className="text-muted-foreground">RAM:</span> {device.ramAvailGb}GB free / {device.ramTotalGb}GB total</div>
                                  <div><span className="text-muted-foreground">GPU:</span> {device.gpuName}</div>
                                  <div><span className="text-muted-foreground">Uptime:</span> {formatUptime(device.uptimeSeconds)}</div>
                                </div>
                                {device.diskDrives.length > 0 && (
                                  <div className="mt-2">
                                    <div className="text-xs font-medium text-muted-foreground mb-1">Disks</div>
                                    {device.diskDrives.map((disk, i) => (
                                      <div key={i} className="text-xs flex items-center gap-1"><HardDrive className="h-3 w-3" /> {disk.model} — {disk.sizeGb}GB ({disk.type})</div>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <div className="space-y-2">
                                <h3 className="font-semibold text-sm flex items-center gap-1"><RefreshCw className="h-4 w-4" /> Updates</h3>
                                <div className="text-sm space-y-1">
                                  <div><span className="text-muted-foreground">Last Update:</span> {device.lastUpdateDate}</div>
                                  <div><span className="text-muted-foreground">Service:</span> <span className="text-green-600">Running</span></div>
                                  <div><span className="text-muted-foreground">Reboot:</span> {device.rebootPending ? <span className="text-yellow-600">Yes</span> : <span className="text-green-600">No</span>}</div>
                                </div>
                                {device.pendingUpdates.length > 0 && (
                                  <div className="mt-2">
                                    <div className="text-xs font-medium text-yellow-600 mb-1">{device.pendingUpdates.length} Pending</div>
                                    <div className="max-h-32 overflow-y-auto space-y-1">
                                      {device.pendingUpdates.map((u, i) => (
                                        <div key={i} className="text-xs bg-yellow-50 dark:bg-yellow-900/20 p-1.5 rounded">{u.title} <span className="text-muted-foreground">({u.kb})</span></div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div className="space-y-2">
                                <h3 className="font-semibold text-sm flex items-center gap-1"><Wifi className="h-4 w-4" /> Network</h3>
                                <div className="text-sm space-y-1">
                                  <div><span className="text-muted-foreground">IP:</span> {device.ipAddress}</div>
                                  <div><span className="text-muted-foreground">DNS:</span> {device.dnsServers}</div>
                                  {device.wifiSignal != null && <div><span className="text-muted-foreground">WiFi:</span> {device.wifiSignal}%</div>}
                                </div>
                                {device.networkAdapters.map((a, i) => (
                                  <div key={i} className="text-xs text-muted-foreground">{a.name}: {a.speed}</div>
                                ))}
                                {device.bsodCount > 0 && (
                                  <div className="mt-3">
                                    <h3 className="font-semibold text-sm flex items-center gap-1 text-red-600"><AlertTriangle className="h-4 w-4" /> {device.bsodCount} BSOD</h3>
                                    {device.bsodEvents.map((e, i) => (
                                      <div key={i} className="text-xs bg-red-50 dark:bg-red-900/20 p-1.5 rounded mt-1">{e.Date} — {e.Message.slice(0, 100)}</div>
                                    ))}
                                  </div>
                                )}
                                {device.performanceIssues.length > 0 && (
                                  <div className="mt-3">
                                    <h3 className="font-semibold text-sm flex items-center gap-1 text-yellow-600"><AlertTriangle className="h-4 w-4" /> Issues</h3>
                                    {device.performanceIssues.map((issue, i) => (
                                      <div key={i} className="text-xs mt-1">{issue.check}: {issue.detail}</div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {activeTab === "security" && (
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                  <h3 className="font-semibold text-sm">Antivirus</h3>
                                  <div className="flex items-center gap-2 text-sm">
                                    {device.antivirusName ? <><CheckCircle className="h-4 w-4 text-green-500" /> {device.antivirusName}</> : <><XCircle className="h-4 w-4 text-red-500" /> No antivirus</>}
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <h3 className="font-semibold text-sm">Defender</h3>
                                  <div className="flex items-center gap-2 text-sm">
                                    {device.defenderStatus === "enabled" ? <><CheckCircle className="h-4 w-4 text-green-500" /> Real-time ON</> : <span className="text-muted-foreground">{device.defenderStatus}</span>}
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <h3 className="font-semibold text-sm">Firewall</h3>
                                  {Object.entries(device.firewallStatus).map(([p, on]) => (
                                    <div key={p} className="flex items-center gap-2 text-sm">
                                      {on ? <CheckCircle className="h-3.5 w-3.5 text-green-500" /> : <XCircle className="h-3.5 w-3.5 text-red-500" />}
                                      {p}: {on ? "ON" : "OFF"}
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                <div>
                                  <h3 className="font-semibold text-sm mb-2 flex items-center gap-1"><Bug className="h-4 w-4" /> CVEs ({device.openCves})</h3>
                                  {device.openCves > 0 ? <p className="text-sm text-orange-600">{device.openCves} unpatched vulnerabilities</p> : <p className="text-sm text-green-600">No open CVEs</p>}
                                </div>
                                <div>
                                  <h3 className="font-semibold text-sm mb-2 flex items-center gap-1"><Shield className="h-4 w-4" /> IOCs ({device.activeIocs})</h3>
                                  {device.activeIocs > 0 ? <p className="text-sm text-red-600">{device.activeIocs} active threats</p> : <p className="text-sm text-green-600">No active IOC threats</p>}
                                </div>
                              </div>
                            </div>
                          )}

                          {activeTab === "software" && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <h3 className="font-semibold text-sm mb-2 flex items-center gap-1"><Package className="h-4 w-4" /> Installed ({device.installedSoftware?.length || 0})</h3>
                                <div className="max-h-80 overflow-y-auto border rounded-md">
                                  <table className="w-full text-xs">
                                    <thead className="bg-muted/50 sticky top-0"><tr><th className="text-left p-2">Name</th><th className="text-left p-2">Version</th></tr></thead>
                                    <tbody>
                                      {(device.installedSoftware || []).map((sw, i) => (
                                        <tr key={i} className="border-t"><td className="p-2">{sw.name}</td><td className="p-2 text-muted-foreground">{sw.version}</td></tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                              <div>
                                <h3 className="font-semibold text-sm mb-2 flex items-center gap-1"><Play className="h-4 w-4" /> Running ({device.runningSoftware?.length || 0})</h3>
                                <div className="max-h-80 overflow-y-auto border rounded-md">
                                  <table className="w-full text-xs">
                                    <thead className="bg-muted/50 sticky top-0"><tr><th className="text-left p-2">Process</th><th className="text-right p-2">Count</th><th className="text-right p-2">Memory</th></tr></thead>
                                    <tbody>
                                      {(device.runningSoftware || []).map((p, i) => (
                                        <tr key={i} className="border-t"><td className="p-2">{p.name}</td><td className="p-2 text-right text-muted-foreground">{p.count}</td><td className="p-2 text-right text-muted-foreground">{p.memoryMb} MB</td></tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </div>
                          )}

                          {activeTab === "activity" && (
                            <div>
                              <h3 className="font-semibold text-sm mb-2 flex items-center gap-1"><Activity className="h-4 w-4" /> Recent Activity</h3>
                              <div className="max-h-80 overflow-y-auto border rounded-md">
                                <table className="w-full text-xs">
                                  <thead className="bg-muted/50 sticky top-0"><tr><th className="text-left p-2">Time</th><th className="text-left p-2">Type</th><th className="text-left p-2">App</th><th className="text-left p-2">Window / URL</th></tr></thead>
                                  <tbody>
                                    {device.recentActivity.map((evt, i) => (
                                      <tr key={i} className="border-t">
                                        <td className="p-2 whitespace-nowrap text-muted-foreground">{formatTimeAgo(evt.timestamp)}</td>
                                        <td className="p-2"><Badge variant="outline" className="text-[10px]">{evt.eventType}</Badge></td>
                                        <td className="p-2">{evt.appName || "—"}</td>
                                        <td className="p-2 truncate max-w-[300px]">{evt.windowTitle || evt.url || "—"}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}

                          {activeTab === "files" && (
                            <div>
                              <h3 className="font-semibold text-sm mb-2 flex items-center gap-1"><FileText className="h-4 w-4" /> File Events</h3>
                              <div className="max-h-80 overflow-y-auto border rounded-md">
                                <table className="w-full text-xs">
                                  <thead className="bg-muted/50 sticky top-0"><tr><th className="text-left p-2">Time</th><th className="text-left p-2">Action</th><th className="text-left p-2">File</th><th className="text-left p-2">Path</th></tr></thead>
                                  <tbody>
                                    {device.fileEvents.map((evt, i) => {
                                      const iconMap: Record<string, typeof FileText> = { FILE_CREATE: FileText, FILE_DELETE: Trash2, FILE_MOVE: ArrowRightLeft, FILE_COPY: Copy };
                                      const Icon = iconMap[evt.eventType] || FileText;
                                      const colorMap: Record<string, string> = { FILE_CREATE: "text-green-600", FILE_DELETE: "text-red-600", FILE_MOVE: "text-blue-600", FILE_COPY: "text-purple-600" };
                                      return (
                                        <tr key={i} className="border-t">
                                          <td className="p-2 whitespace-nowrap text-muted-foreground">{formatTimeAgo(evt.timestamp)}</td>
                                          <td className="p-2"><span className={`flex items-center gap-1 ${colorMap[evt.eventType] || ""}`}><Icon className="h-3 w-3" />{evt.eventType.replace("FILE_", "")}</span></td>
                                          <td className="p-2">{evt.windowTitle || "—"}</td>
                                          <td className="p-2 truncate max-w-[300px] text-muted-foreground">{evt.url || "—"}</td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </Fragment>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
