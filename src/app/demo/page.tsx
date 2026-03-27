"use client";

import { useState, Fragment, useMemo } from "react";
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
  Building2, Server, Globe, Flame, Upload, BarChart, PieChart, TrendingUp,
} from "lucide-react";

// ─── Mock Timestamps ─────────────────────────────────────────────────────────

const now = new Date();
const ago = (mins: number) => new Date(now.getTime() - mins * 60000).toISOString();

// ─── Mock Devices ────────────────────────────────────────────────────────────

const mockDevices = [
  {
    id: "dev-1", hostname: "DESKTOP-JMILLER", platform: "win32", agentVersion: "0.2.0",
    status: "ONLINE" as const, lastSeenAt: ago(2), ipAddress: "192.168.1.105",
    osVersion: "Windows 11 Pro 10.0.26100", cpuName: "AMD Ryzen 7 7800X3D", cpuCores: 8,
    ramTotalGb: 32.0, ramAvailGb: 18.4, gpuName: "NVIDIA RTX 4070 Ti",
    diskDrives: [{ model: "Samsung 990 Pro 2TB", sizeGb: 1863, type: "SSD" }],
    uptimeSeconds: 345600, antivirusName: "Windows Defender",
    firewallStatus: { domain: true, private: true, public: true }, defenderStatus: "enabled",
    lastUpdateDate: "2026-03-20", pendingUpdates: [{ title: "2026-03 Cumulative Update", kb: "KB5035942" }],
    rebootPending: false, bsodCount: 0,
    user: { name: "Jordan Miller", email: "jordan@acmecorp.com" },
    openCves: 2, activeIocs: 0, department: "Engineering",
    recentActivity: [
      { eventType: "APP_SWITCH", appName: "VS Code", windowTitle: "api-gateway — server.ts", timestamp: ago(3) },
      { eventType: "WEBSITE_VISIT", appName: "Chrome", windowTitle: "GitHub PR #247", timestamp: ago(8) },
      { eventType: "APP_SWITCH", appName: "Docker Desktop", windowTitle: "Containers", timestamp: ago(15) },
      { eventType: "APP_SWITCH", appName: "Slack", windowTitle: "#engineering", timestamp: ago(25) },
    ],
    installedSoftware: [
      { name: "VS Code", version: "1.96.2" }, { name: "Docker Desktop", version: "4.36.0" },
      { name: "Chrome", version: "123.0" }, { name: "Slack", version: "4.38" },
      { name: "Node.js", version: "22.12.0" }, { name: "Git", version: "2.47.1" },
    ],
  },
  {
    id: "dev-2", hostname: "LAPTOP-SCHEN", platform: "win32", agentVersion: "0.2.0",
    status: "ONLINE" as const, lastSeenAt: ago(5), ipAddress: "192.168.1.112",
    osVersion: "Windows 11 Home", cpuName: "Intel Core Ultra 7 155H", cpuCores: 16,
    ramTotalGb: 16.0, ramAvailGb: 5.2, gpuName: "Intel Arc Graphics",
    diskDrives: [{ model: "SK Hynix P41 512GB", sizeGb: 476, type: "SSD" }],
    uptimeSeconds: 172800, antivirusName: "Malwarebytes",
    firewallStatus: { domain: true, private: true, public: true }, defenderStatus: "enabled",
    lastUpdateDate: "2026-03-15", pendingUpdates: [{ title: "2026-03 Cumulative Update", kb: "KB5035942" }, { title: "Defender Update", kb: "KB2267602" }],
    rebootPending: true, bsodCount: 0,
    user: { name: "Sarah Chen", email: "sarah@acmecorp.com" },
    openCves: 0, activeIocs: 1, department: "Design",
    recentActivity: [
      { eventType: "APP_SWITCH", appName: "Photoshop", windowTitle: "hero-banner-v3.psd", timestamp: ago(6) },
      { eventType: "APP_SWITCH", appName: "Figma", windowTitle: "Marketing Redesign", timestamp: ago(18) },
      { eventType: "WEBSITE_VISIT", appName: "Chrome", windowTitle: "Dribbble", timestamp: ago(25) },
    ],
    installedSoftware: [
      { name: "Photoshop", version: "25.7" }, { name: "Figma", version: "124.5" },
      { name: "Chrome", version: "123.0" }, { name: "Slack", version: "4.38" },
      { name: "Illustrator", version: "28.5" }, { name: "Canva", version: "1.82" },
    ],
  },
  {
    id: "dev-3", hostname: "WS-TGARCIA", platform: "win32", agentVersion: "0.2.0",
    status: "OFFLINE" as const, lastSeenAt: ago(180), ipAddress: "192.168.1.108",
    osVersion: "Windows 10 Pro", cpuName: "Intel Core i5-12400", cpuCores: 6,
    ramTotalGb: 16.0, ramAvailGb: 9.8, gpuName: "Intel UHD 730",
    diskDrives: [{ model: "Crucial MX500 500GB", sizeGb: 465, type: "SSD" }, { model: "Seagate 2TB", sizeGb: 1863, type: "HDD" }],
    uptimeSeconds: 604800, antivirusName: "Windows Defender",
    firewallStatus: { domain: true, private: true, public: false }, defenderStatus: "enabled",
    lastUpdateDate: "2026-02-28", pendingUpdates: [{ title: "2026-03 Cumulative Update", kb: "KB5035941" }, { title: ".NET Security Update", kb: "KB5036120" }, { title: "Edge Update", kb: "KB5036789" }, { title: "MSRT", kb: "KB890830" }],
    rebootPending: true, bsodCount: 1,
    user: { name: "Tom Garcia", email: "tom@acmecorp.com" },
    openCves: 5, activeIocs: 0, department: "Finance",
    recentActivity: [
      { eventType: "APP_SWITCH", appName: "Excel", windowTitle: "Q1-Revenue-Forecast.xlsx", timestamp: ago(185) },
      { eventType: "APP_SWITCH", appName: "QuickBooks", windowTitle: "Invoices", timestamp: ago(200) },
    ],
    installedSoftware: [
      { name: "QuickBooks", version: "2024.R8" }, { name: "Excel", version: "16.0" },
      { name: "Adobe Acrobat", version: "24.004" }, { name: "Chrome", version: "123.0" },
    ],
  },
  {
    id: "dev-4", hostname: "MACBOOK-APATEL", platform: "darwin", agentVersion: "0.2.0",
    status: "ONLINE" as const, lastSeenAt: ago(1), ipAddress: "192.168.1.120",
    osVersion: "macOS 15.3 Sequoia", cpuName: "Apple M3 Pro", cpuCores: 12,
    ramTotalGb: 36.0, ramAvailGb: 22.1, gpuName: "M3 Pro 18-core GPU",
    diskDrives: [{ model: "Apple SSD 1TB", sizeGb: 1000, type: "SSD" }],
    uptimeSeconds: 86400, antivirusName: "CrowdStrike Falcon",
    firewallStatus: { domain: true, private: true, public: true }, defenderStatus: "N/A",
    lastUpdateDate: "2026-03-22", pendingUpdates: [],
    rebootPending: false, bsodCount: 0,
    user: { name: "Anita Patel", email: "anita@acmecorp.com" },
    openCves: 0, activeIocs: 0, department: "Engineering",
    recentActivity: [
      { eventType: "APP_SWITCH", appName: "VS Code", windowTitle: "acme-mobile — App.tsx", timestamp: ago(2) },
      { eventType: "WEBSITE_VISIT", appName: "Chrome", windowTitle: "GitHub PR #89", timestamp: ago(10) },
      { eventType: "APP_SWITCH", appName: "Postman", windowTitle: "Users Collection", timestamp: ago(20) },
      { eventType: "APP_SWITCH", appName: "iTerm2", windowTitle: "kubectl logs", timestamp: ago(28) },
    ],
    installedSoftware: [
      { name: "VS Code", version: "1.96.2" }, { name: "Docker", version: "4.36.0" },
      { name: "Postman", version: "11.20" }, { name: "iTerm2", version: "3.5.2" },
      { name: "Homebrew", version: "4.4.10" }, { name: "TablePlus", version: "6.2" },
    ],
  },
];

// ─── Mock Departments ────────────────────────────────────────────────────────

const mockDepartments = [
  { id: "d1", name: "Engineering", color: "#3B82F6", members: 12, hostGroups: 2, children: 2, subs: ["Frontend", "Backend"] },
  { id: "d2", name: "Design", color: "#8B5CF6", members: 5, hostGroups: 1, children: 0, subs: [] },
  { id: "d3", name: "Finance", color: "#F59E0B", members: 4, hostGroups: 1, children: 0, subs: [] },
  { id: "d4", name: "Sales", color: "#10B981", members: 8, hostGroups: 1, children: 1, subs: ["Business Development"] },
  { id: "d5", name: "HR", color: "#EC4899", members: 3, hostGroups: 0, children: 0, subs: [] },
];

// ─── Mock Host Groups & Blocklists ──────────────────────────────────────────

const mockHostGroups = [
  {
    id: "hg1", name: "Engineering Workstations", devices: 12,
    policies: [
      { type: "DOMAIN_BLOCK", name: "Gaming", action: "BLOCK", detail: "9 domains" },
      { type: "DOMAIN_BLOCK", name: "Social Media", action: "LOG", detail: "10 domains" },
      { type: "FIREWALL", name: "Block RDP Inbound", action: "BLOCK", detail: "TCP 3389 inbound" },
    ],
  },
  {
    id: "hg2", name: "Finance Workstations", devices: 4,
    policies: [
      { type: "DOMAIN_BLOCK", name: "Social Media", action: "BLOCK", detail: "10 domains" },
      { type: "DOMAIN_BLOCK", name: "Streaming", action: "BLOCK", detail: "9 domains" },
      { type: "DOMAIN_BLOCK", name: "Gaming", action: "BLOCK", detail: "9 domains" },
      { type: "FIREWALL", name: "Block outbound non-443", action: "WARN", detail: "Outbound TCP !443" },
    ],
  },
  {
    id: "hg3", name: "Remote Laptops", devices: 6,
    policies: [
      { type: "DOMAIN_BLOCK", name: "Phishing Army", action: "BLOCK", detail: "12,847 domains" },
      { type: "DOMAIN_BLOCK", name: "Feodo C2 IPs", action: "BLOCK", detail: "891 IPs" },
      { type: "FIREWALL", name: "VPN Only", action: "BLOCK", detail: "Block all non-VPN outbound" },
    ],
  },
];

const mockBlocklists = [
  { id: "bl1", name: "Social Media", category: "Social Media", entries: 10, ips: 0, active: true, groups: 2, source: "Preset" },
  { id: "bl2", name: "Gaming", category: "Gaming", entries: 9, ips: 0, active: true, groups: 2, source: "Preset" },
  { id: "bl3", name: "Streaming", category: "Entertainment", entries: 9, ips: 0, active: true, groups: 1, source: "Preset" },
  { id: "bl4", name: "StevenBlack Unified", category: "Malware & Ads", entries: 48219, ips: 0, active: true, groups: 0, source: "Public Import" },
  { id: "bl5", name: "Phishing Army", category: "Phishing", entries: 12847, ips: 0, active: true, groups: 1, source: "Public Import" },
  { id: "bl6", name: "Feodo C2 IPs", category: "C2 Servers", entries: 0, ips: 891, active: true, groups: 1, source: "Public Import" },
  { id: "bl7", name: "Emerging Threats", category: "Compromised IPs", entries: 0, ips: 2340, active: true, groups: 0, source: "Public Import" },
  { id: "bl8", name: "Ransomware Tracker", category: "Ransomware", entries: 1456, ips: 234, active: true, groups: 0, source: "Public Import" },
];

// ─── Mock Reports ────────────────────────────────────────────────────────────

const mockReports = [
  { name: "Weekly Security Summary", type: "Security", schedule: "Every Monday 9am", lastRun: ago(4320), format: "PDF" },
  { name: "Monthly Productivity Report", type: "Productivity", schedule: "1st of month", lastRun: ago(10080), format: "PDF" },
  { name: "Daily Attendance Report", type: "Attendance", schedule: "Daily 6pm", lastRun: ago(360), format: "CSV" },
  { name: "CVE Vulnerability Report", type: "Security", schedule: "Weekly Wed", lastRun: ago(2880), format: "PDF" },
  { name: "App Usage Analytics", type: "Activity", schedule: "Bi-weekly", lastRun: ago(7200), format: "PDF" },
];

// ─── Mock Productivity ───────────────────────────────────────────────────────

const mockProductivity = [
  { name: "Jordan Miller", dept: "Engineering", score: 87, activeHrs: 7.2, topApp: "VS Code", trend: "+5%" },
  { name: "Sarah Chen", dept: "Design", score: 82, activeHrs: 6.8, topApp: "Photoshop", trend: "+2%" },
  { name: "Anita Patel", dept: "Engineering", score: 91, activeHrs: 7.8, topApp: "VS Code", trend: "+8%" },
  { name: "Tom Garcia", dept: "Finance", score: 68, activeHrs: 5.4, topApp: "Excel", trend: "-3%" },
  { name: "Lisa Wong", dept: "Sales", score: 79, activeHrs: 6.5, topApp: "Salesforce", trend: "+1%" },
  { name: "Marcus Johnson", dept: "Engineering", score: 85, activeHrs: 7.0, topApp: "IntelliJ", trend: "+4%" },
];

// ─── Utility Functions ───────────────────────────────────────────────────────

function formatUptime(seconds: number) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  if (d > 0) return `${d}d ${h}h`;
  return `${h}h`;
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
  };
  return <Badge className={colors[status] || ""}>{status}</Badge>;
}

// ─── Nav Items ───────────────────────────────────────────────────────────────

const sections = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "devices", label: "Devices", icon: Monitor },
  { id: "departments", label: "Departments", icon: Building2 },
  { id: "host-groups", label: "Host Groups", icon: Server },
  { id: "activity", label: "Activity", icon: Activity },
  { id: "productivity", label: "Productivity", icon: Brain },
  { id: "reports", label: "Reports", icon: BarChart3 },
  { id: "security", label: "Security", icon: Shield },
];

// ─── Demo Page ───────────────────────────────────────────────────────────────

export default function DemoPage() {
  const [activeSection, setActiveSection] = useState("dashboard");
  const [expandedDevice, setExpandedDevice] = useState<string | null>("dev-1");
  const [deviceTab, setDeviceTab] = useState("overview");
  const [expandedGroup, setExpandedGroup] = useState<string | null>("hg1");
  const [search, setSearch] = useState("");

  const onlineCount = mockDevices.filter((d) => d.status === "ONLINE").length;
  const totalCves = mockDevices.reduce((s, d) => s + d.openCves, 0);
  const totalIocs = mockDevices.reduce((s, d) => s + d.activeIocs, 0);
  const totalBlockedDomains = mockBlocklists.reduce((s, b) => s + b.entries, 0);
  const totalBlockedIPs = mockBlocklists.reduce((s, b) => s + b.ips, 0);

  // Hourly heatmap mock data
  const hourlyData = [0,0,0,0,0,0,0,12,45,78,92,88,65,82,95,87,73,58,32,15,8,3,0,0];
  const maxHour = Math.max(...hourlyData);

  const filteredDevices = mockDevices.filter((d) =>
    d.hostname.toLowerCase().includes(search.toLowerCase()) ||
    d.user.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 border-r bg-sidebar">
        <div className="flex h-16 items-center border-b px-6">
          <span className="text-xl font-bold text-primary">MyDex</span>
          <Badge className="ml-2 bg-blue-100 text-blue-800 text-[10px]">DEMO</Badge>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {sections.map((s) => (
            <button key={s.id} onClick={() => setActiveSection(s.id)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors w-full text-left ${
                activeSection === s.id ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent/50"
              }`}
            >
              <s.icon className="h-4 w-4" /> {s.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t">
          <Link href="/register"><Button className="w-full">Get Started Free</Button></Link>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 lg:pl-64">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-3 text-center text-sm">
          Live demo with simulated data.{" "}
          <Link href="/register" className="underline font-semibold">Sign up free</Link> to monitor your own devices.
        </div>
        <div className="h-16 border-b flex items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3 lg:hidden">
            <span className="text-lg font-bold text-primary">MyDex</span>
            <Badge className="bg-blue-100 text-blue-800 text-[10px]">DEMO</Badge>
          </div>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Acme Corp</span>
            <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-bold">A</div>
          </div>
        </div>

        <div className="p-3 sm:p-4 lg:p-6">

          {/* ═══ DASHBOARD ═══ */}
          {activeSection === "dashboard" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                <p className="text-muted-foreground">Welcome back, Admin</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[
                  { title: "Employees", value: 32, icon: Users, desc: "Active team members" },
                  { title: "Devices Online", value: `${onlineCount}/${mockDevices.length}`, icon: Monitor, desc: "Connected agents" },
                  { title: "Open Alerts", value: 3, icon: Shield, desc: "Security alerts pending" },
                  { title: "Blocked Domains", value: totalBlockedDomains.toLocaleString(), icon: Globe, desc: `+ ${totalBlockedIPs} IPs` },
                ].map((s) => (
                  <Card key={s.title}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium">{s.title}</CardTitle>
                      <s.icon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{s.value}</div>
                      <p className="text-xs text-muted-foreground">{s.desc}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Hourly Activity Heatmap */}
              <Card>
                <CardHeader><CardTitle className="text-lg">Today&apos;s Activity Heatmap</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex items-end gap-1" style={{ height: 100 }}>
                    {hourlyData.map((v, h) => {
                      const pct = (v / maxHour) * 100;
                      const clr = v === 0 ? "bg-muted" : pct > 75 ? "bg-blue-600" : pct > 50 ? "bg-blue-500" : pct > 25 ? "bg-blue-400" : "bg-blue-300";
                      return <div key={h} className="flex-1" title={`${h}:00 — ${v}%`}><div className={`w-full rounded-t ${clr}`} style={{ height: `${Math.max(pct, 3)}%` }} /></div>;
                    })}
                  </div>
                  <div className="flex gap-1 mt-1">{hourlyData.map((_, h) => <div key={h} className="flex-1 text-center text-[9px] text-muted-foreground">{h % 3 === 0 ? h : ""}</div>)}</div>
                </CardContent>
              </Card>

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
                          {a.user.split(" ").map((n) => n[0]).join("")}
                        </div>
                        <div className="flex-1"><span className="font-medium">{a.user}</span> <span className="text-muted-foreground">{a.action}</span></div>
                        <span className="text-xs text-muted-foreground">{a.time}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle>Security Overview</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      { label: "Devices Online", value: `${onlineCount}/${mockDevices.length}`, color: "green" },
                      { label: "Open CVEs", value: totalCves, color: "orange" },
                      { label: "Blocked IOCs", value: totalIocs, color: "red" },
                      { label: "Active Blocklists", value: mockBlocklists.filter((b) => b.active).length, color: "blue" },
                      { label: "Host Groups", value: mockHostGroups.length, color: "purple" },
                      { label: "Departments", value: mockDepartments.length, color: "indigo" },
                    ].map((s) => (
                      <div key={s.label} className="flex justify-between text-sm">
                        <span>{s.label}</span>
                        <Badge className={`bg-${s.color}-100 text-${s.color}-800`}>{s.value}</Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* ═══ DEVICES ═══ */}
          {activeSection === "devices" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div><h1 className="text-2xl font-bold flex items-center gap-2"><Monitor className="h-6 w-6" /> Devices</h1>
                <p className="text-muted-foreground text-sm">Connected agents and system health</p></div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Online", value: onlineCount, color: "text-green-600", sub: `${mockDevices.length} total` },
                  { label: "Open CVEs", value: totalCves, color: "text-orange-600", sub: "across all devices" },
                  { label: "Blocked IOCs", value: totalIocs, color: "text-red-600", sub: "active threats" },
                  { label: "Reboot Pending", value: mockDevices.filter((d) => d.rebootPending).length, color: "text-yellow-600", sub: "needs restart" },
                ].map((s) => (
                  <Card key={s.label}><CardContent className="pt-4 pb-3">
                    <div className="text-sm text-muted-foreground">{s.label}</div>
                    <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                    <div className="text-xs text-muted-foreground">{s.sub}</div>
                  </CardContent></Card>
                ))}
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-10" placeholder="Search by hostname or user..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <div className="space-y-3">
                {filteredDevices.map((d) => (
                  <Fragment key={d.id}>
                    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setExpandedDevice(expandedDevice === d.id ? null : d.id); setDeviceTab("overview"); }}>
                      <CardContent className="py-4">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            {expandedDevice === d.id ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                            <Monitor className="h-5 w-5 text-blue-500" />
                            <div className="min-w-0">
                              <div className="font-semibold truncate">{d.hostname}</div>
                              <div className="text-xs text-muted-foreground truncate">{d.user.name} &middot; {d.ipAddress} &middot; {d.department}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0 text-sm">
                            <span className="hidden lg:flex items-center gap-1 text-muted-foreground"><Cpu className="h-3.5 w-3.5" /> {d.cpuCores}c</span>
                            <span className="hidden lg:flex items-center gap-1 text-muted-foreground">{d.ramTotalGb}GB</span>
                            {d.openCves > 0 && <Badge variant="outline" className="text-orange-600 border-orange-300"><Bug className="h-3 w-3 mr-1" /> {d.openCves}</Badge>}
                            {d.rebootPending && <Badge variant="outline" className="text-yellow-600 border-yellow-300"><RefreshCw className="h-3 w-3 mr-1" /> Reboot</Badge>}
                            <span className="text-xs text-muted-foreground whitespace-nowrap"><Clock className="h-3 w-3 inline mr-1" />{formatTimeAgo(d.lastSeenAt)}</span>
                            <StatusBadge status={d.status} />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    {expandedDevice === d.id && (
                      <Card className="border-l-4 border-l-blue-500">
                        <CardContent className="py-4">
                          <div className="flex gap-1 mb-4 flex-wrap">
                            {[{ id: "overview", label: "Overview", icon: Monitor }, { id: "security", label: "Security", icon: Shield }, { id: "software", label: "Software", icon: Package }, { id: "activity", label: "Activity", icon: Activity }].map((t) => (
                              <Button key={t.id} size="sm" variant={deviceTab === t.id ? "default" : "ghost"} onClick={(e) => { e.stopPropagation(); setDeviceTab(t.id); }}>
                                <t.icon className="h-3.5 w-3.5 mr-1" /> {t.label}
                              </Button>
                            ))}
                          </div>
                          {deviceTab === "overview" && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="space-y-2"><h3 className="font-semibold text-sm flex items-center gap-1"><Cpu className="h-4 w-4" /> Hardware</h3>
                                <div className="text-sm space-y-1">
                                  <div><span className="text-muted-foreground">CPU:</span> {d.cpuName}</div>
                                  <div><span className="text-muted-foreground">RAM:</span> {d.ramAvailGb}GB / {d.ramTotalGb}GB</div>
                                  <div><span className="text-muted-foreground">GPU:</span> {d.gpuName}</div>
                                  <div><span className="text-muted-foreground">Uptime:</span> {formatUptime(d.uptimeSeconds)}</div>
                                </div>
                                {d.diskDrives.map((disk, i) => <div key={i} className="text-xs flex items-center gap-1"><HardDrive className="h-3 w-3" /> {disk.model} ({disk.type})</div>)}
                              </div>
                              <div className="space-y-2"><h3 className="font-semibold text-sm flex items-center gap-1"><RefreshCw className="h-4 w-4" /> Updates</h3>
                                <div className="text-sm space-y-1">
                                  <div><span className="text-muted-foreground">Last:</span> {d.lastUpdateDate}</div>
                                  <div><span className="text-muted-foreground">Reboot:</span> {d.rebootPending ? <span className="text-yellow-600">Yes</span> : <span className="text-green-600">No</span>}</div>
                                </div>
                                {d.pendingUpdates.length > 0 && <div className="text-xs font-medium text-yellow-600">{d.pendingUpdates.length} Pending</div>}
                                {d.pendingUpdates.map((u, i) => <div key={i} className="text-xs bg-yellow-50 dark:bg-yellow-900/20 p-1.5 rounded">{u.title} ({u.kb})</div>)}
                              </div>
                              <div className="space-y-2"><h3 className="font-semibold text-sm flex items-center gap-1"><Wifi className="h-4 w-4" /> Network</h3>
                                <div className="text-sm"><span className="text-muted-foreground">IP:</span> {d.ipAddress}</div>
                                {d.bsodCount > 0 && <div className="mt-2"><span className="text-sm text-red-600 flex items-center gap-1"><AlertTriangle className="h-4 w-4" /> {d.bsodCount} BSOD Event</span></div>}
                              </div>
                            </div>
                          )}
                          {deviceTab === "security" && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div><h3 className="font-semibold text-sm mb-1">Antivirus</h3><div className="flex items-center gap-2 text-sm"><CheckCircle className="h-4 w-4 text-green-500" /> {d.antivirusName}</div></div>
                              <div><h3 className="font-semibold text-sm mb-1">Defender</h3><div className="flex items-center gap-2 text-sm">{d.defenderStatus === "enabled" ? <><CheckCircle className="h-4 w-4 text-green-500" /> ON</> : <span className="text-muted-foreground">{d.defenderStatus}</span>}</div></div>
                              <div><h3 className="font-semibold text-sm mb-1">Firewall</h3>{Object.entries(d.firewallStatus).map(([p, on]) => <div key={p} className="flex items-center gap-2 text-sm">{on ? <CheckCircle className="h-3.5 w-3.5 text-green-500" /> : <XCircle className="h-3.5 w-3.5 text-red-500" />} {p}</div>)}</div>
                            </div>
                          )}
                          {deviceTab === "software" && (
                            <div className="max-h-60 overflow-y-auto border rounded-md">
                              <table className="w-full text-xs"><thead className="bg-muted/50 sticky top-0"><tr><th className="text-left p-2">Name</th><th className="text-left p-2">Version</th></tr></thead>
                                <tbody>{d.installedSoftware.map((s, i) => <tr key={i} className="border-t"><td className="p-2">{s.name}</td><td className="p-2 text-muted-foreground">{s.version}</td></tr>)}</tbody>
                              </table>
                            </div>
                          )}
                          {deviceTab === "activity" && (
                            <div className="max-h-60 overflow-y-auto border rounded-md">
                              <table className="w-full text-xs"><thead className="bg-muted/50 sticky top-0"><tr><th className="text-left p-2">Time</th><th className="text-left p-2">Type</th><th className="text-left p-2">App</th><th className="text-left p-2">Window</th></tr></thead>
                                <tbody>{d.recentActivity.map((e, i) => <tr key={i} className="border-t"><td className="p-2 text-muted-foreground">{formatTimeAgo(e.timestamp)}</td><td className="p-2"><Badge variant="outline" className="text-[10px]">{e.eventType}</Badge></td><td className="p-2">{e.appName}</td><td className="p-2 truncate max-w-[200px]">{e.windowTitle}</td></tr>)}</tbody>
                              </table>
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

          {/* ═══ DEPARTMENTS ═══ */}
          {activeSection === "departments" && (
            <div className="space-y-6">
              <div><h1 className="text-2xl font-bold flex items-center gap-2"><Building2 className="h-6 w-6" /> Departments</h1>
              <p className="text-muted-foreground text-sm">Organization structure with hierarchy</p></div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card><CardContent className="pt-4 pb-3"><div className="text-sm text-muted-foreground">Departments</div><div className="text-2xl font-bold">{mockDepartments.length}</div></CardContent></Card>
                <Card><CardContent className="pt-4 pb-3"><div className="text-sm text-muted-foreground">Total Members</div><div className="text-2xl font-bold">{mockDepartments.reduce((s, d) => s + d.members, 0)}</div></CardContent></Card>
                <Card><CardContent className="pt-4 pb-3"><div className="text-sm text-muted-foreground">With Host Groups</div><div className="text-2xl font-bold">{mockDepartments.filter((d) => d.hostGroups > 0).length}</div></CardContent></Card>
                <Card><CardContent className="pt-4 pb-3"><div className="text-sm text-muted-foreground">Sub-Departments</div><div className="text-2xl font-bold">{mockDepartments.reduce((s, d) => s + d.children, 0)}</div></CardContent></Card>
              </div>
              {mockDepartments.map((dept) => (
                <Card key={dept.id}>
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: dept.color }} />
                        <div>
                          <div className="font-semibold">{dept.name}</div>
                          {dept.subs.length > 0 && <div className="flex gap-1 mt-0.5">{dept.subs.map((s) => <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>)}</div>}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {dept.members}</span>
                        {dept.hostGroups > 0 && <span className="flex items-center gap-1"><Shield className="h-3.5 w-3.5" /> {dept.hostGroups}</span>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* ═══ HOST GROUPS ═══ */}
          {activeSection === "host-groups" && (
            <div className="space-y-6">
              <div><h1 className="text-2xl font-bold flex items-center gap-2"><Shield className="h-6 w-6" /> Host Groups & Blocklists</h1>
              <p className="text-muted-foreground text-sm">Device groups with domain blocklists and firewall rules</p></div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                <Card><CardContent className="pt-4 pb-3"><div className="text-2xl font-bold">{mockHostGroups.length}</div><div className="text-xs text-muted-foreground">Host Groups</div></CardContent></Card>
                <Card><CardContent className="pt-4 pb-3"><div className="text-2xl font-bold">{mockBlocklists.length}</div><div className="text-xs text-muted-foreground">Blocklists</div></CardContent></Card>
                <Card><CardContent className="pt-4 pb-3"><div className="text-2xl font-bold">{totalBlockedDomains.toLocaleString()}</div><div className="text-xs text-muted-foreground">Blocked Domains</div></CardContent></Card>
                <Card><CardContent className="pt-4 pb-3"><div className="text-2xl font-bold text-red-600">{totalBlockedIPs.toLocaleString()}</div><div className="text-xs text-muted-foreground">Blocked IPs</div></CardContent></Card>
                <Card><CardContent className="pt-4 pb-3"><div className="text-2xl font-bold text-orange-600">{mockHostGroups.reduce((s, g) => s + g.policies.length, 0)}</div><div className="text-xs text-muted-foreground">Active Policies</div></CardContent></Card>
              </div>

              {/* Host Groups */}
              <h2 className="text-lg font-semibold flex items-center gap-2"><Server className="h-5 w-5" /> Host Groups</h2>
              {mockHostGroups.map((g) => (
                <Card key={g.id}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpandedGroup(expandedGroup === g.id ? null : g.id)}>
                      <div className="flex items-center gap-3">
                        {expandedGroup === g.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        <Server className="h-5 w-5 text-blue-500" />
                        <div><div className="font-semibold">{g.name}</div></div>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="outline"><Monitor className="h-3 w-3 mr-1" /> {g.devices}</Badge>
                        <Badge variant="outline"><Shield className="h-3 w-3 mr-1" /> {g.policies.length}</Badge>
                      </div>
                    </div>
                    {expandedGroup === g.id && (
                      <div className="mt-4 border-t pt-4 space-y-2">
                        {g.policies.map((p, i) => (
                          <div key={i} className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
                            <div className="flex items-center gap-3">
                              {p.type === "DOMAIN_BLOCK" ? <Globe className="h-4 w-4 text-orange-500" /> : <Flame className="h-4 w-4 text-red-500" />}
                              <div>
                                <div className="text-sm font-medium flex items-center gap-2">
                                  {p.name}
                                  <Badge className={p.action === "BLOCK" ? "bg-red-100 text-red-800" : p.action === "WARN" ? "bg-yellow-100 text-yellow-800" : "bg-blue-100 text-blue-800"}>{p.action}</Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">{p.detail}</p>
                              </div>
                            </div>
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}

              {/* Blocklists */}
              <h2 className="text-lg font-semibold flex items-center gap-2 mt-6"><Globe className="h-5 w-5" /> Domain & IP Blocklists</h2>
              {mockBlocklists.map((bl) => (
                <Card key={bl.id}>
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Globe className="h-5 w-5 text-orange-500" />
                        <div>
                          <div className="font-semibold flex items-center gap-2">
                            {bl.name}
                            <Badge variant="outline" className="text-[10px]">{bl.category}</Badge>
                            <Badge variant="outline" className="text-[10px] text-muted-foreground">{bl.source}</Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {bl.entries > 0 && <Badge variant="outline" className="text-xs"><Globe className="h-3 w-3 mr-1" /> {bl.entries.toLocaleString()}</Badge>}
                        {bl.ips > 0 && <Badge variant="outline" className="text-xs text-red-600 border-red-300">{bl.ips} IPs</Badge>}
                        {bl.groups > 0 && <Badge variant="outline" className="text-xs"><Shield className="h-3 w-3 mr-1" /> {bl.groups} groups</Badge>}
                        <Badge className={bl.active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}>{bl.active ? "Active" : "Disabled"}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* ═══ ACTIVITY ═══ */}
          {activeSection === "activity" && (
            <div className="space-y-6">
              <div><h1 className="text-2xl font-bold flex items-center gap-2"><Activity className="h-6 w-6" /> Activity Dashboard</h1></div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card><CardContent className="pt-6"><p className="text-sm font-medium text-muted-foreground">Total Active</p><p className="text-2xl font-bold mt-1">6h 42m</p></CardContent></Card>
                <Card><CardContent className="pt-6"><p className="text-sm font-medium text-muted-foreground">Sites Visited</p><p className="text-2xl font-bold mt-1">47</p></CardContent></Card>
                <Card><CardContent className="pt-6"><p className="text-sm font-medium text-muted-foreground">Apps Used</p><p className="text-2xl font-bold mt-1">12</p></CardContent></Card>
                <Card><CardContent className="pt-6"><p className="text-sm font-medium text-muted-foreground">File Operations</p><p className="text-2xl font-bold mt-1">23</p></CardContent></Card>
              </div>
              {/* Hourly */}
              <Card><CardHeader><CardTitle className="text-lg">Hourly Activity</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex items-end gap-1" style={{ height: 100 }}>
                    {hourlyData.map((v, h) => { const pct = (v / maxHour) * 100; const clr = v === 0 ? "bg-muted" : pct > 75 ? "bg-blue-600" : pct > 50 ? "bg-blue-500" : pct > 25 ? "bg-blue-400" : "bg-blue-300"; return <div key={h} className="flex-1"><div className={`w-full rounded-t ${clr}`} style={{ height: `${Math.max(pct, 3)}%` }} /></div>; })}
                  </div>
                  <div className="flex gap-1 mt-1">{hourlyData.map((_, h) => <div key={h} className="flex-1 text-center text-[9px] text-muted-foreground">{h % 3 === 0 ? h : ""}</div>)}</div>
                </CardContent>
              </Card>
              {/* App Usage */}
              <Card><CardHeader><CardTitle className="text-lg">App Usage</CardTitle></CardHeader>
                <CardContent>
                  {[
                    { name: "VS Code", mins: 142 }, { name: "Chrome", mins: 98 }, { name: "Slack", mins: 67 },
                    { name: "Photoshop", mins: 54 }, { name: "Docker", mins: 38 }, { name: "Terminal", mins: 28 },
                  ].map((app, i) => {
                    const colors = ["bg-blue-500", "bg-emerald-500", "bg-violet-500", "bg-amber-500", "bg-rose-500", "bg-cyan-500"];
                    return (
                      <div key={app.name} className="flex items-center gap-3 mb-2">
                        <span className="text-xs w-24 text-right text-muted-foreground">{app.name}</span>
                        <div className="flex-1 h-6 bg-muted rounded overflow-hidden"><div className={`h-full ${colors[i]} rounded`} style={{ width: `${(app.mins / 142) * 100}%` }} /></div>
                        <span className="text-xs w-16 text-muted-foreground">{Math.floor(app.mins / 60)}h {app.mins % 60}m</span>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          )}

          {/* ═══ PRODUCTIVITY ═══ */}
          {activeSection === "productivity" && (
            <div className="space-y-6">
              <div><h1 className="text-2xl font-bold flex items-center gap-2"><Brain className="h-6 w-6" /> Productivity Insights</h1></div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card><CardContent className="pt-4 pb-3"><div className="text-sm text-muted-foreground">Avg Score</div><div className="text-2xl font-bold">82%</div></CardContent></Card>
                <Card><CardContent className="pt-4 pb-3"><div className="text-sm text-muted-foreground">Avg Active Hours</div><div className="text-2xl font-bold">6.8h</div></CardContent></Card>
                <Card><CardContent className="pt-4 pb-3"><div className="text-sm text-muted-foreground">Top Performer</div><div className="text-2xl font-bold text-green-600">Anita P.</div></CardContent></Card>
                <Card><CardContent className="pt-4 pb-3"><div className="text-sm text-muted-foreground">Needs Attention</div><div className="text-2xl font-bold text-yellow-600">1</div></CardContent></Card>
              </div>
              <Card>
                <CardHeader><CardTitle>Team Productivity</CardTitle></CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b"><th className="text-left pb-3">Employee</th><th className="text-left pb-3">Department</th><th className="text-center pb-3">Score</th><th className="text-center pb-3">Active Hrs</th><th className="text-left pb-3">Top App</th><th className="text-right pb-3">Trend</th></tr></thead>
                      <tbody>
                        {mockProductivity.sort((a, b) => b.score - a.score).map((p) => (
                          <tr key={p.name} className="border-b last:border-0 hover:bg-muted/50">
                            <td className="py-3 font-medium">{p.name}</td>
                            <td className="py-3 text-muted-foreground">{p.dept}</td>
                            <td className="py-3 text-center"><Badge variant={p.score >= 80 ? "success" : p.score >= 70 ? "warning" : "destructive"}>{p.score}%</Badge></td>
                            <td className="py-3 text-center text-muted-foreground">{p.activeHrs}h</td>
                            <td className="py-3">{p.topApp}</td>
                            <td className={`py-3 text-right ${p.trend.startsWith("+") ? "text-green-600" : "text-red-600"}`}>{p.trend}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ═══ REPORTS ═══ */}
          {activeSection === "reports" && (
            <div className="space-y-6">
              <div><h1 className="text-2xl font-bold flex items-center gap-2"><BarChart3 className="h-6 w-6" /> Reports</h1>
              <p className="text-muted-foreground text-sm">Scheduled and on-demand reports</p></div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card><CardContent className="pt-4 pb-3"><div className="text-sm text-muted-foreground">Scheduled Reports</div><div className="text-2xl font-bold">{mockReports.length}</div></CardContent></Card>
                <Card><CardContent className="pt-4 pb-3"><div className="text-sm text-muted-foreground">Generated This Week</div><div className="text-2xl font-bold">8</div></CardContent></Card>
                <Card><CardContent className="pt-4 pb-3"><div className="text-sm text-muted-foreground">PDF Reports</div><div className="text-2xl font-bold">{mockReports.filter((r) => r.format === "PDF").length}</div></CardContent></Card>
                <Card><CardContent className="pt-4 pb-3"><div className="text-sm text-muted-foreground">CSV Exports</div><div className="text-2xl font-bold">{mockReports.filter((r) => r.format === "CSV").length}</div></CardContent></Card>
              </div>
              <Card>
                <CardHeader><CardTitle>Scheduled Reports</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {mockReports.map((r) => (
                      <div key={r.name} className="flex items-center justify-between border rounded-lg p-3">
                        <div className="flex items-center gap-3">
                          <BarChart className="h-5 w-5 text-blue-500" />
                          <div>
                            <div className="font-medium text-sm">{r.name}</div>
                            <div className="text-xs text-muted-foreground">{r.schedule} &middot; Last run: {formatTimeAgo(r.lastRun)}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">{r.type}</Badge>
                          <Badge className="bg-blue-100 text-blue-800 text-[10px]">{r.format}</Badge>
                          <Button size="sm" variant="outline">Download</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              {/* Sample Report Preview */}
              <Card>
                <CardHeader><CardTitle>Report Preview: Weekly Security Summary</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center"><div className="text-2xl font-bold text-green-600">{onlineCount}</div><div className="text-xs text-muted-foreground">Devices Online</div></div>
                    <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 text-center"><div className="text-2xl font-bold text-orange-600">{totalCves}</div><div className="text-xs text-muted-foreground">Open CVEs</div></div>
                    <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 text-center"><div className="text-2xl font-bold text-red-600">{totalIocs}</div><div className="text-xs text-muted-foreground">IOC Matches</div></div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center"><div className="text-2xl font-bold text-blue-600">{mockBlocklists.length}</div><div className="text-xs text-muted-foreground">Active Blocklists</div></div>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Compliance Status by Department</h4>
                    {mockDepartments.map((dept) => {
                      const score = 60 + Math.floor(Math.random() * 35);
                      return (
                        <div key={dept.id} className="flex items-center gap-3 mb-2">
                          <span className="text-xs w-24 text-right text-muted-foreground">{dept.name}</span>
                          <div className="flex-1 h-5 bg-muted rounded overflow-hidden">
                            <div className={`h-full rounded ${score >= 85 ? "bg-green-500" : score >= 70 ? "bg-yellow-500" : "bg-red-500"}`} style={{ width: `${score}%` }} />
                          </div>
                          <span className="text-xs w-10 text-muted-foreground">{score}%</span>
                        </div>
                      );
                    })}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Threat Blocks This Week</h4>
                    <div className="flex items-end gap-1" style={{ height: 80 }}>
                      {[12, 8, 15, 22, 18, 9, 5].map((v, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center">
                          <div className="w-full bg-red-400 rounded-t" style={{ height: `${(v / 22) * 100}%` }} />
                          <span className="text-[9px] text-muted-foreground mt-1">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ═══ SECURITY ═══ */}
          {activeSection === "security" && (
            <div className="space-y-6">
              <div><h1 className="text-2xl font-bold flex items-center gap-2"><Shield className="h-6 w-6" /> Security Center</h1></div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card><CardContent className="pt-4 pb-3"><div className="text-sm text-muted-foreground">Open Alerts</div><div className="text-2xl font-bold text-red-600">3</div></CardContent></Card>
                <Card><CardContent className="pt-4 pb-3"><div className="text-sm text-muted-foreground">CVEs Detected</div><div className="text-2xl font-bold text-orange-600">{totalCves}</div></CardContent></Card>
                <Card><CardContent className="pt-4 pb-3"><div className="text-sm text-muted-foreground">IOC Matches</div><div className="text-2xl font-bold">{totalIocs}</div></CardContent></Card>
                <Card><CardContent className="pt-4 pb-3"><div className="text-sm text-muted-foreground">Firewall Compliance</div><div className="text-2xl font-bold text-green-600">75%</div></CardContent></Card>
              </div>
              <Card>
                <CardHeader><CardTitle>Recent Security Alerts</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { severity: "HIGH", type: "UNAUTHORIZED_APP", title: "Unauthorized P2P application detected", device: "WS-TGARCIA", time: ago(120) },
                    { severity: "MEDIUM", type: "POLICY_VIOLATION", title: "Blocked domain access attempt: gambling-site.com", device: "LAPTOP-SCHEN", time: ago(360) },
                    { severity: "LOW", type: "LOGIN_ANOMALY", title: "Login from new IP address 45.33.21.8", device: "MACBOOK-APATEL", time: ago(720) },
                  ].map((alert, i) => (
                    <div key={i} className="flex items-center justify-between border rounded-lg p-3">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className={`h-5 w-5 ${alert.severity === "HIGH" ? "text-red-500" : alert.severity === "MEDIUM" ? "text-orange-500" : "text-yellow-500"}`} />
                        <div>
                          <div className="text-sm font-medium">{alert.title}</div>
                          <div className="text-xs text-muted-foreground">{alert.device} &middot; {formatTimeAgo(alert.time)}</div>
                        </div>
                      </div>
                      <Badge className={alert.severity === "HIGH" ? "bg-red-100 text-red-800" : alert.severity === "MEDIUM" ? "bg-orange-100 text-orange-800" : "bg-yellow-100 text-yellow-800"}>{alert.severity}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Device Security Posture</CardTitle></CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b"><th className="text-left pb-3">Device</th><th className="text-center pb-3">AV</th><th className="text-center pb-3">Firewall</th><th className="text-center pb-3">Updates</th><th className="text-center pb-3">CVEs</th><th className="text-center pb-3">Status</th></tr></thead>
                      <tbody>
                        {mockDevices.map((d) => (
                          <tr key={d.id} className="border-b last:border-0">
                            <td className="py-3 font-medium">{d.hostname}</td>
                            <td className="py-3 text-center"><CheckCircle className="h-4 w-4 text-green-500 mx-auto" /></td>
                            <td className="py-3 text-center">{Object.values(d.firewallStatus).every(Boolean) ? <CheckCircle className="h-4 w-4 text-green-500 mx-auto" /> : <AlertTriangle className="h-4 w-4 text-yellow-500 mx-auto" />}</td>
                            <td className="py-3 text-center">{d.pendingUpdates.length === 0 ? <CheckCircle className="h-4 w-4 text-green-500 mx-auto" /> : <Badge variant="outline" className="text-yellow-600">{d.pendingUpdates.length}</Badge>}</td>
                            <td className="py-3 text-center">{d.openCves > 0 ? <Badge variant="outline" className="text-orange-600">{d.openCves}</Badge> : <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />}</td>
                            <td className="py-3 text-center"><StatusBadge status={d.status} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
