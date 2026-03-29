"use client";

import { useState, useEffect, Fragment, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Monitor, Cpu, HardDrive, Shield, RefreshCw, ChevronDown, ChevronRight,
  Wifi, AlertTriangle, CheckCircle, XCircle, Clock, Search, FileText,
  Trash2, ArrowRightLeft, Copy, Bug, Activity, Package, Play,
  Users, CalendarCheck, LayoutDashboard, FolderKanban, BarChart3, Brain, Settings,
  Building2, Server, Globe, Flame, Upload, BarChart, PieChart, TrendingUp,
  Eye, EyeOff, UserCog, KeyRound, Lock, Unlock, Fingerprint, LogIn, LogOut,
  QrCode, ShieldCheck, ShieldAlert, LinkIcon, ToggleLeft, ToggleRight,
  Mail, UserPlus, Filter, MoreHorizontal, Check, X, Layers, Grid3X3, Plus,
  Briefcase, ClipboardList, Timer, Calendar, Coffee, Star, Download,
  UserCircle, Bell, Palette, Sun, Moon, Smartphone, Laptop,
  Phone, Pause, Wrench, Terminal, Zap, Leaf, RotateCcw, Recycle,
  ShieldOff, KeyRound as CertIcon, HardDriveDownload, CircleStop,
  Thermometer, WifiOff, PrinterIcon, FolderCog, FileCheck,
  LifeBuoy, Sparkles, BatteryCharging, Volume2, Bluetooth, MousePointer,
  Keyboard as KeyboardIcon, Info, ArrowUpRight, ArrowDownRight,
  AlertCircle, Loader2,
} from "lucide-react";
import {
  PieChart as RechartsPieChart, Pie, Cell, Tooltip as RechartsTooltip,
  ResponsiveContainer, BarChart as RechartsBarChart, Bar, XAxis, YAxis,
  CartesianGrid, RadialBarChart, RadialBar, LineChart, Line,
} from "recharts";

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

// ─── Mock Users (User Management) ────────────────────────────────────────────

const mockUsers = [
  { id: "u1", name: "Jordan Miller", email: "jordan@acmecorp.com", role: "Admin", department: "Engineering", status: "Active", lastActive: ago(2), avatar: "JM" },
  { id: "u2", name: "Sarah Chen", email: "sarah@acmecorp.com", role: "Employee", department: "Design", status: "Active", lastActive: ago(5), avatar: "SC" },
  { id: "u3", name: "Tom Garcia", email: "tom@acmecorp.com", role: "Employee", department: "Finance", status: "Inactive", lastActive: ago(180), avatar: "TG" },
  { id: "u4", name: "Anita Patel", email: "anita@acmecorp.com", role: "Manager", department: "Engineering", status: "Active", lastActive: ago(1), avatar: "AP" },
  { id: "u5", name: "Lisa Wong", email: "lisa@acmecorp.com", role: "Employee", department: "Sales", status: "Active", lastActive: ago(12), avatar: "LW" },
  { id: "u6", name: "Marcus Johnson", email: "marcus@acmecorp.com", role: "Manager", department: "Engineering", status: "Active", lastActive: ago(8), avatar: "MJ" },
  { id: "u7", name: "Rachel Kim", email: "rachel@acmecorp.com", role: "Employee", department: "HR", status: "Active", lastActive: ago(30), avatar: "RK" },
  { id: "u8", name: "David Brooks", email: "david@acmecorp.com", role: "Manager", department: "Sales", status: "Suspended", lastActive: ago(1440), avatar: "DB" },
];

// ─── Mock Login Audit (MFA & Security) ───────────────────────────────────────

const mockLoginAudit = [
  { id: "la1", user: "jordan@acmecorp.com", ip: "192.168.1.105", device: "Chrome / Windows 11", time: ago(2), success: true, mfa: true },
  { id: "la2", user: "sarah@acmecorp.com", ip: "192.168.1.112", device: "Firefox / Windows 11", time: ago(15), success: true, mfa: true },
  { id: "la3", user: "tom@acmecorp.com", ip: "45.33.21.8", device: "Safari / macOS", time: ago(60), success: false, mfa: false },
  { id: "la4", user: "anita@acmecorp.com", ip: "192.168.1.120", device: "Chrome / macOS 15", time: ago(90), success: true, mfa: true },
  { id: "la5", user: "unknown@external.com", ip: "103.45.67.89", device: "curl/7.88", time: ago(180), success: false, mfa: false },
  { id: "la6", user: "lisa@acmecorp.com", ip: "10.0.0.55", device: "Edge / Windows 11", time: ago(240), success: true, mfa: false },
  { id: "la7", user: "marcus@acmecorp.com", ip: "192.168.1.130", device: "Chrome / Linux", time: ago(480), success: true, mfa: true },
  { id: "la8", user: "rachel@acmecorp.com", ip: "192.168.1.140", device: "Safari / iOS 18", time: ago(600), success: true, mfa: true },
];

// ─── Mock SSO Providers ──────────────────────────────────────────────────────

const mockSSOProviders = [
  { id: "sso1", name: "Microsoft Entra ID", status: "Active", color: "bg-blue-500", clientIdPrefix: "a3f7c2d1-...", jit: true, lastUsed: ago(5), icon: "M" },
  { id: "sso2", name: "Okta", status: "Pending Config", color: "bg-indigo-500", clientIdPrefix: "0oa8b7c6d5...", jit: false, lastUsed: null, icon: "O" },
  { id: "sso3", name: "GitHub", status: "Active", color: "bg-gray-700", clientIdPrefix: "Iv1.a9b8c7d6...", jit: true, lastUsed: ago(60), icon: "G" },
];

// ─── Mock Module Access ──────────────────────────────────────────────────────

const mockModules = [
  { category: "Core", name: "Dashboard", description: "Overview metrics and widgets", icon: LayoutDashboard, minRole: "Employee", fixed: true },
  { category: "Core", name: "My Profile", description: "Personal settings and preferences", icon: UserCog, minRole: "Employee", fixed: true },
  { category: "Core", name: "Time Tracking", description: "Clock in/out and timesheets", icon: Timer, minRole: "Employee", fixed: false },
  { category: "Core", name: "My Tasks", description: "Personal task board and assignments", icon: ClipboardList, minRole: "Employee", fixed: false },
  { category: "Core", name: "Attendance", description: "Attendance records and leave requests", icon: Calendar, minRole: "Employee", fixed: false },
  { category: "Core", name: "Announcements", description: "Company-wide announcements", icon: Mail, minRole: "Employee", fixed: true },
  { category: "Monitoring", name: "Device List", description: "View and manage enrolled devices", icon: Monitor, minRole: "Manager", fixed: false },
  { category: "Monitoring", name: "Activity Feed", description: "Real-time user activity stream", icon: Activity, minRole: "Manager", fixed: false },
  { category: "Monitoring", name: "Productivity", description: "Productivity scores and analytics", icon: Brain, minRole: "Manager", fixed: false },
  { category: "Monitoring", name: "App Usage", description: "Application usage breakdown", icon: Package, minRole: "Manager", fixed: false },
  { category: "Monitoring", name: "Screenshots", description: "Periodic screenshot capture", icon: Eye, minRole: "Manager", fixed: false },
  { category: "Monitoring", name: "Website Tracking", description: "Browsing history and categorization", icon: Globe, minRole: "Manager", fixed: false },
  { category: "Management", name: "Departments", description: "Organization hierarchy management", icon: Building2, minRole: "Admin", fixed: false },
  { category: "Management", name: "Host Groups", description: "Device group policies and blocklists", icon: Server, minRole: "Admin", fixed: false },
  { category: "Management", name: "Reports", description: "Generate and schedule reports", icon: BarChart3, minRole: "Admin", fixed: false },
  { category: "Management", name: "User Management", description: "Create, edit, and deactivate users", icon: Users, minRole: "Admin", fixed: false },
  { category: "Security", name: "Security Center", description: "Alerts, CVEs, and threat intel", icon: Shield, minRole: "Admin", fixed: false },
  { category: "Security", name: "MFA Settings", description: "Multi-factor authentication config", icon: Fingerprint, minRole: "Admin", fixed: false },
  { category: "Security", name: "SSO Providers", description: "Single sign-on configuration", icon: LinkIcon, minRole: "Super Admin", fixed: false },
  { category: "Admin", name: "Module Access", description: "Role-based module visibility", icon: Layers, minRole: "Super Admin", fixed: false },
  { category: "Admin", name: "Audit Log", description: "Complete system audit trail", icon: FileText, minRole: "Super Admin", fixed: false },
  { category: "Admin", name: "Billing", description: "Subscription and payment management", icon: Briefcase, minRole: "Super Admin", fixed: false },
];

const roleHierarchy = ["Employee", "Manager", "Admin", "Super Admin"];

// ─── Mock Time Tracking ─────────────────────────────────────────────────────

const mockTimeLog = [
  { event: "Clock In", time: "9:02 AM", note: "" },
  { event: "Break Start", time: "12:15 PM", note: "Lunch" },
  { event: "Break End", time: "12:48 PM", note: "Lunch" },
];

const mockWeeklyTimesheet = [
  { day: "Mon 3/23", start: "9:05 AM", end: "5:32 PM", breaks: "0:33", total: "7:54", overtime: "0:00" },
  { day: "Tue 3/24", start: "8:58 AM", end: "6:15 PM", breaks: "0:45", total: "8:32", overtime: "0:32" },
  { day: "Wed 3/25", start: "9:10 AM", end: "5:45 PM", breaks: "0:30", total: "8:05", overtime: "0:05" },
  { day: "Thu 3/26", start: "9:02 AM", end: "6:48 PM", breaks: "0:33", total: "9:13", overtime: "1:13" },
  { day: "Fri 3/27", start: "9:02 AM", end: "—", breaks: "0:33", total: "—", overtime: "—" },
];

// ─── Mock Attendance ────────────────────────────────────────────────────────

const mockLeaveRequests = [
  { id: "lr1", type: "PTO", dates: "Apr 14–18, 2026", days: 5, status: "Pending", submitted: "Mar 20" },
  { id: "lr2", type: "Sick", dates: "Mar 10, 2026", days: 1, status: "Approved", submitted: "Mar 10" },
  { id: "lr3", type: "Personal", dates: "Feb 14, 2026", days: 1, status: "Approved", submitted: "Feb 10" },
  { id: "lr4", type: "PTO", dates: "Jan 2–3, 2026", days: 2, status: "Approved", submitted: "Dec 20" },
];

// ─── Mock Projects ──────────────────────────────────────────────────────────

const mockProjects = [
  {
    id: "p1", name: "API Gateway v2", status: "In Progress", progress: 68,
    dueDate: "Apr 15, 2026", team: ["JM", "AP", "MJ"],
    tasks: { total: 24, done: 16 }, color: "blue",
  },
  {
    id: "p2", name: "Marketing Redesign", status: "In Progress", progress: 42,
    dueDate: "May 1, 2026", team: ["SC", "LW"],
    tasks: { total: 18, done: 8 }, color: "purple",
  },
  {
    id: "p3", name: "Q1 Financial Close", status: "Completed", progress: 100,
    dueDate: "Mar 15, 2026", team: ["TG", "RK"],
    tasks: { total: 12, done: 12 }, color: "green",
  },
  {
    id: "p4", name: "Mobile App Beta", status: "At Risk", progress: 31,
    dueDate: "Apr 30, 2026", team: ["AP", "JM", "SC", "MJ"],
    tasks: { total: 32, done: 10 }, color: "orange",
  },
];

// ─── Mock Kanban Tasks ──────────────────────────────────────────────────────

const mockKanbanTasks: Record<string, { backlog: KanbanTask[]; todo: KanbanTask[]; inProgress: KanbanTask[]; review: KanbanTask[]; done: KanbanTask[] }> = {
  p1: {
    backlog: [
      { id: "t1", title: "WebSocket error handling", priority: "medium", assignee: "MJ", labels: ["backend"], dueDate: "Apr 12" },
      { id: "t2", title: "Add rate limit headers", priority: "low", assignee: "AP", labels: ["api"], dueDate: "Apr 14" },
    ],
    todo: [
      { id: "t3", title: "OAuth2 token refresh flow", priority: "high", assignee: "JM", labels: ["auth", "backend"], dueDate: "Apr 8" },
      { id: "t4", title: "API versioning strategy doc", priority: "medium", assignee: "MJ", labels: ["docs"], dueDate: "Apr 10" },
      { id: "t5", title: "Load testing with k6", priority: "medium", assignee: "AP", labels: ["testing"], dueDate: "Apr 11" },
    ],
    inProgress: [
      { id: "t6", title: "Migrate to gRPC for internal services", priority: "high", assignee: "JM", labels: ["backend", "infra"], dueDate: "Apr 7" },
      { id: "t7", title: "GraphQL schema for v2 endpoints", priority: "high", assignee: "AP", labels: ["api"], dueDate: "Apr 9" },
    ],
    review: [
      { id: "t8", title: "JWT rotation implementation", priority: "high", assignee: "MJ", labels: ["auth", "security"], dueDate: "Apr 6" },
    ],
    done: [
      { id: "t9", title: "Set up API Gateway infrastructure", priority: "high", assignee: "JM", labels: ["infra"], dueDate: "Mar 28" },
      { id: "t10", title: "Database connection pooling", priority: "medium", assignee: "AP", labels: ["backend"], dueDate: "Mar 30" },
      { id: "t11", title: "Swagger/OpenAPI spec generation", priority: "medium", assignee: "MJ", labels: ["docs", "api"], dueDate: "Apr 1" },
      { id: "t12", title: "CI/CD pipeline for gateway", priority: "high", assignee: "JM", labels: ["devops"], dueDate: "Apr 2" },
    ],
  },
  p2: {
    backlog: [
      { id: "t20", title: "Accessibility audit", priority: "high", assignee: "SC", labels: ["a11y"], dueDate: "Apr 28" },
      { id: "t21", title: "Dark mode color tokens", priority: "medium", assignee: "LW", labels: ["design"], dueDate: "Apr 30" },
    ],
    todo: [
      { id: "t22", title: "Hero section redesign", priority: "high", assignee: "SC", labels: ["design", "frontend"], dueDate: "Apr 15" },
      { id: "t23", title: "Mobile responsive nav", priority: "high", assignee: "LW", labels: ["frontend"], dueDate: "Apr 18" },
    ],
    inProgress: [
      { id: "t24", title: "New brand color system", priority: "high", assignee: "SC", labels: ["design"], dueDate: "Apr 12" },
      { id: "t25", title: "Landing page copy rewrite", priority: "medium", assignee: "LW", labels: ["content"], dueDate: "Apr 14" },
    ],
    review: [
      { id: "t26", title: "Figma component library v2", priority: "medium", assignee: "SC", labels: ["design"], dueDate: "Apr 10" },
    ],
    done: [
      { id: "t27", title: "Competitor analysis report", priority: "low", assignee: "LW", labels: ["research"], dueDate: "Mar 25" },
      { id: "t28", title: "User interviews (10 users)", priority: "high", assignee: "SC", labels: ["research"], dueDate: "Mar 30" },
      { id: "t29", title: "Wireframes for key pages", priority: "high", assignee: "SC", labels: ["design"], dueDate: "Apr 3" },
    ],
  },
  p3: {
    backlog: [],
    todo: [],
    inProgress: [],
    review: [],
    done: [
      { id: "t30", title: "Revenue reconciliation", priority: "high", assignee: "TG", labels: ["finance"], dueDate: "Mar 10" },
      { id: "t31", title: "AP/AR balance verification", priority: "high", assignee: "RK", labels: ["finance"], dueDate: "Mar 11" },
      { id: "t32", title: "Tax provision calculation", priority: "high", assignee: "TG", labels: ["tax"], dueDate: "Mar 12" },
      { id: "t33", title: "Intercompany eliminations", priority: "medium", assignee: "RK", labels: ["finance"], dueDate: "Mar 13" },
      { id: "t34", title: "Final P&L review", priority: "high", assignee: "TG", labels: ["reporting"], dueDate: "Mar 14" },
      { id: "t35", title: "Board presentation prep", priority: "medium", assignee: "RK", labels: ["reporting"], dueDate: "Mar 15" },
    ],
  },
  p4: {
    backlog: [
      { id: "t40", title: "Push notification system", priority: "high", assignee: "AP", labels: ["mobile", "backend"], dueDate: "Apr 25" },
      { id: "t41", title: "Offline mode sync", priority: "high", assignee: "JM", labels: ["mobile"], dueDate: "Apr 28" },
      { id: "t42", title: "App Store metadata", priority: "low", assignee: "SC", labels: ["marketing"], dueDate: "Apr 30" },
      { id: "t43", title: "Biometric auth integration", priority: "medium", assignee: "MJ", labels: ["security", "mobile"], dueDate: "Apr 26" },
    ],
    todo: [
      { id: "t44", title: "Camera module for document scan", priority: "medium", assignee: "AP", labels: ["mobile"], dueDate: "Apr 20" },
      { id: "t45", title: "Performance profiling", priority: "high", assignee: "JM", labels: ["mobile", "testing"], dueDate: "Apr 18" },
      { id: "t46", title: "Deep linking setup", priority: "medium", assignee: "MJ", labels: ["mobile"], dueDate: "Apr 22" },
    ],
    inProgress: [
      { id: "t47", title: "User onboarding flow", priority: "high", assignee: "SC", labels: ["design", "mobile"], dueDate: "Apr 15" },
      { id: "t48", title: "API integration layer", priority: "high", assignee: "JM", labels: ["mobile", "api"], dueDate: "Apr 16" },
    ],
    review: [
      { id: "t49", title: "Login / signup screens", priority: "high", assignee: "AP", labels: ["mobile", "frontend"], dueDate: "Apr 12" },
    ],
    done: [
      { id: "t50", title: "React Native project setup", priority: "high", assignee: "JM", labels: ["mobile", "infra"], dueDate: "Mar 20" },
      { id: "t51", title: "Navigation architecture", priority: "high", assignee: "AP", labels: ["mobile"], dueDate: "Mar 25" },
      { id: "t52", title: "Design system for mobile", priority: "medium", assignee: "SC", labels: ["design"], dueDate: "Mar 28" },
    ],
  },
};

interface KanbanTask {
  id: string;
  title: string;
  priority: "high" | "medium" | "low";
  assignee: string;
  labels: string[];
  dueDate: string;
}

// ─── Mock Employees ─────────────────────────────────────────────────────────

const mockEmployees = [
  { id: "e1", name: "Jordan Miller", email: "jordan@acmecorp.com", dept: "Engineering", role: "Senior Developer", status: "Active", phone: "x4201", avatar: "JM" },
  { id: "e2", name: "Sarah Chen", email: "sarah@acmecorp.com", dept: "Design", role: "Lead Designer", status: "Active", phone: "x4302", avatar: "SC" },
  { id: "e3", name: "Tom Garcia", email: "tom@acmecorp.com", dept: "Finance", role: "Financial Analyst", status: "On Leave", phone: "x4103", avatar: "TG" },
  { id: "e4", name: "Anita Patel", email: "anita@acmecorp.com", dept: "Engineering", role: "Staff Engineer", status: "Active", phone: "x4204", avatar: "AP" },
  { id: "e5", name: "Lisa Wong", email: "lisa@acmecorp.com", dept: "Sales", role: "Account Executive", status: "Active", phone: "x4505", avatar: "LW" },
  { id: "e6", name: "Marcus Johnson", email: "marcus@acmecorp.com", dept: "Engineering", role: "Tech Lead", status: "Active", phone: "x4206", avatar: "MJ" },
  { id: "e7", name: "Rachel Kim", email: "rachel@acmecorp.com", dept: "HR", role: "HR Specialist", status: "Active", phone: "x4607", avatar: "RK" },
  { id: "e8", name: "David Brooks", email: "david@acmecorp.com", dept: "Sales", role: "Sales Manager", status: "Suspended", phone: "x4508", avatar: "DB" },
];

// ─── Mock Software Inventory ────────────────────────────────────────────────

const mockSoftwareInventory = [
  { category: "Development", items: [
    { name: "VS Code", version: "1.96.2", installs: 3, devices: ["DESKTOP-JMILLER", "MACBOOK-APATEL", "LAPTOP-SCHEN"] },
    { name: "Docker Desktop", version: "4.36.0", installs: 2, devices: ["DESKTOP-JMILLER", "MACBOOK-APATEL"] },
    { name: "Node.js", version: "22.12.0", installs: 1, devices: ["DESKTOP-JMILLER"] },
    { name: "Git", version: "2.47.1", installs: 1, devices: ["DESKTOP-JMILLER"] },
    { name: "Postman", version: "11.20", installs: 1, devices: ["MACBOOK-APATEL"] },
    { name: "IntelliJ IDEA", version: "2024.3", installs: 1, devices: ["WS-TGARCIA"] },
  ]},
  { category: "Design", items: [
    { name: "Photoshop", version: "25.7", installs: 1, devices: ["LAPTOP-SCHEN"] },
    { name: "Figma", version: "124.5", installs: 1, devices: ["LAPTOP-SCHEN"] },
    { name: "Illustrator", version: "28.5", installs: 1, devices: ["LAPTOP-SCHEN"] },
    { name: "Canva", version: "1.82", installs: 1, devices: ["LAPTOP-SCHEN"] },
  ]},
  { category: "Productivity", items: [
    { name: "Chrome", version: "123.0", installs: 4, devices: ["DESKTOP-JMILLER", "LAPTOP-SCHEN", "WS-TGARCIA", "MACBOOK-APATEL"] },
    { name: "Slack", version: "4.38", installs: 3, devices: ["DESKTOP-JMILLER", "LAPTOP-SCHEN", "WS-TGARCIA"] },
    { name: "Excel", version: "16.0", installs: 1, devices: ["WS-TGARCIA"] },
    { name: "Adobe Acrobat", version: "24.004", installs: 1, devices: ["WS-TGARCIA"] },
  ]},
  { category: "System & Utilities", items: [
    { name: "Homebrew", version: "4.4.10", installs: 1, devices: ["MACBOOK-APATEL"] },
    { name: "iTerm2", version: "3.5.2", installs: 1, devices: ["MACBOOK-APATEL"] },
    { name: "TablePlus", version: "6.2", installs: 1, devices: ["MACBOOK-APATEL"] },
    { name: "QuickBooks", version: "2024.R8", installs: 1, devices: ["WS-TGARCIA"] },
  ]},
];

// ─── Mock Support Tickets ───────────────────────────────────────────────────

const mockTickets = [
  { id: "TKT-1042", user: "Jordan Miller", device: "DESKTOP-JMILLER", subject: "System is slow", category: "performance", status: "open" as const, priority: "high" as const, created: ago(15), stockReason: "System is slow", assignedTo: "IT Support", networkInfo: null, appName: null },
  { id: "TKT-1041", user: "Sarah Chen", device: "LAPTOP-SCHEN", subject: "Can't access Figma", category: "access", status: "open" as const, priority: "medium" as const, created: ago(45), stockReason: "Unable to access SaaS/cloud app", assignedTo: "IT Support", networkInfo: { ip: "192.168.1.112", dns: "8.8.8.8", gateway: "192.168.1.1", ssid: "AcmeCorp-5G", signal: "72%", latency: "145ms" }, appName: "Figma" },
  { id: "TKT-1040", user: "Tom Garcia", device: "WS-TGARCIA", subject: "QuickBooks freezing", category: "app-issue", status: "in-progress" as const, priority: "high" as const, created: ago(120), stockReason: "App is slow", assignedTo: "admin@acme.com", networkInfo: null, appName: "QuickBooks" },
  { id: "TKT-1039", user: "Anita Patel", device: "MACBOOK-APATEL", subject: "VPN won't connect", category: "network", status: "in-progress" as const, priority: "medium" as const, created: ago(180), stockReason: "Unable to access SaaS/cloud app", assignedTo: "admin@acme.com", networkInfo: { ip: "192.168.1.120", dns: "8.8.8.8", gateway: "192.168.1.1", ssid: "AcmeCorp-5G", signal: "89%", latency: "12ms" }, appName: null },
  { id: "TKT-1038", user: "Jordan Miller", device: "DESKTOP-JMILLER", subject: "Docker not starting", category: "app-issue", status: "resolved" as const, priority: "low" as const, created: ago(360), stockReason: "App is slow", assignedTo: "IT Support", networkInfo: null, appName: "Docker Desktop" },
  { id: "TKT-1037", user: "Sarah Chen", device: "LAPTOP-SCHEN", subject: "Printer not working", category: "hardware", status: "resolved" as const, priority: "low" as const, created: ago(1440), stockReason: "Other", assignedTo: "IT Support", networkInfo: null, appName: null },
];

const mockStockReasons = [
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

// App paths by OS for troubleshooting
const appPaths: Record<string, { win?: string; mac?: string }> = {
  "VS Code": { win: "C:\\Users\\%USER%\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe", mac: "/Applications/Visual Studio Code.app" },
  "Chrome": { win: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", mac: "/Applications/Google Chrome.app" },
  "Slack": { win: "C:\\Users\\%USER%\\AppData\\Local\\slack\\slack.exe", mac: "/Applications/Slack.app" },
  "Docker Desktop": { win: "C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe", mac: "/Applications/Docker.app" },
  "Photoshop": { win: "C:\\Program Files\\Adobe\\Adobe Photoshop 2025\\Photoshop.exe", mac: "/Applications/Adobe Photoshop 2025/Adobe Photoshop 2025.app" },
  "Figma": { win: "C:\\Users\\%USER%\\AppData\\Local\\Figma\\Figma.exe", mac: "/Applications/Figma.app" },
  "Excel": { win: "C:\\Program Files\\Microsoft Office\\root\\Office16\\EXCEL.EXE", mac: "/Applications/Microsoft Excel.app" },
  "QuickBooks": { win: "C:\\Program Files (x86)\\Intuit\\QuickBooks 2024\\QBW32.EXE" },
  "Postman": { win: "C:\\Users\\%USER%\\AppData\\Local\\Postman\\Postman.exe", mac: "/Applications/Postman.app" },
  "iTerm2": { mac: "/Applications/iTerm.app" },
  "Node.js": { win: "C:\\Program Files\\nodejs\\node.exe", mac: "/usr/local/bin/node" },
  "Git": { win: "C:\\Program Files\\Git\\bin\\git.exe", mac: "/usr/bin/git" },
  "Illustrator": { win: "C:\\Program Files\\Adobe\\Adobe Illustrator 2025\\Support Files\\Contents\\Windows\\Illustrator.exe", mac: "/Applications/Adobe Illustrator 2025/Adobe Illustrator.app" },
  "Adobe Acrobat": { win: "C:\\Program Files\\Adobe\\Acrobat DC\\Acrobat\\Acrobat.exe", mac: "/Applications/Adobe Acrobat DC/Adobe Acrobat.app" },
  "TablePlus": { mac: "/Applications/TablePlus.app" },
  "Homebrew": { mac: "/opt/homebrew/bin/brew" },
  "Canva": { win: "C:\\Users\\%USER%\\AppData\\Local\\Programs\\Canva\\Canva.exe", mac: "/Applications/Canva.app" },
};

// Remediation groups assignable to host groups
const mockRemediationGroups = [
  { id: "rg1", name: "Standard IT Maintenance", os: "all", enabled: true, remediations: ["Disk Cleanup", "Network Reset", "Time Sync", "Process Management", "Service Management"], hostGroups: ["Engineering Workstations", "All Devices"] },
  { id: "rg2", name: "Windows Security Hardening", os: "windows", enabled: true, remediations: ["Group Policy Refresh", "System File Repair", "Windows Update Reset", "WMI Repair"], hostGroups: ["Engineering Workstations", "Finance Desktops"] },
  { id: "rg3", name: "macOS Compliance", os: "macos", enabled: true, remediations: ["FileVault Verification", "TCC Permission Reset", "Spotlight Re-index", "DNS Flush"], hostGroups: ["Mac Fleet"] },
  { id: "rg4", name: "Developer Workstations", os: "all", enabled: false, remediations: ["Docker Reset", "Node Cache Clear", "Git Credential Refresh", "Homebrew Update"], hostGroups: ["Engineering Workstations"] },
  { id: "rg5", name: "Print & Peripheral Fix", os: "windows", enabled: true, remediations: ["Clear Print Spooler", "USB Driver Reset", "Explorer Restart"], hostGroups: ["Finance Desktops"] },
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

const sectionGroups = [
  {
    category: "",
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "time-tracking", label: "Time Tracking", icon: Timer },
      { id: "attendance", label: "Attendance", icon: CalendarCheck },
      { id: "projects", label: "Projects", icon: FolderKanban },
      { id: "my-account", label: "My Account", icon: UserCircle },
    ],
  },
  {
    category: "MONITORING",
    items: [
      { id: "activity", label: "Activity", icon: Activity },
      { id: "productivity", label: "Productivity", icon: Brain },
      { id: "fleet-health", label: "Fleet Health & DEX", icon: Activity },
    ],
  },
  {
    category: "MANAGEMENT",
    items: [
      { id: "employees", label: "Employees", icon: Users },
      { id: "user-management", label: "User Management", icon: UserCog },
      { id: "departments", label: "Departments", icon: Building2 },
      { id: "reports", label: "Reports", icon: BarChart3 },
    ],
  },
  {
    category: "SECURITY",
    items: [
      { id: "devices", label: "Devices", icon: Monitor },
      { id: "software-inventory", label: "Software Inventory", icon: Package },
      { id: "host-groups", label: "Host Groups", icon: Server },
      { id: "security", label: "Security", icon: Shield },
      { id: "dlp", label: "DLP Policies", icon: ShieldCheck },
    ],
  },
  {
    category: "COMPLIANCE",
    items: [
      { id: "compliance", label: "SOC 2 Compliance", icon: FileCheck },
    ],
  },
  {
    category: "IT SUPPORT",
    items: [
      { id: "support", label: "IT Support", icon: LifeBuoy },
      { id: "it-support", label: "IT Admin Portal", icon: Wrench },
    ],
  },
  {
    category: "ADMINISTRATION",
    items: [
      { id: "settings", label: "Settings", icon: Settings },
      { id: "mdm-integration", label: "MDM Integration", icon: Smartphone },
      { id: "branding", label: "Branding", icon: Palette },
      { id: "mfa-security", label: "MFA & Security", icon: Fingerprint },
      { id: "sso-providers", label: "SSO Providers", icon: LinkIcon },
      { id: "module-access", label: "Module Access", icon: Layers },
      { id: "agent-setup", label: "Agent Setup", icon: Download },
      { id: "alert-thresholds", label: "Alert Thresholds", icon: Bell },
    ],
  },
  {
    category: "INSIGHTS",
    items: [
      { id: "cost-optimization", label: "Cost Optimization", icon: TrendingUp },
      { id: "sustainability", label: "Sustainability", icon: Leaf },
    ],
  },
];

// Flat list for compatibility
const sections = sectionGroups.flatMap((g) => g.items);

// ─── Demo Page ───────────────────────────────────────────────────────────────

export default function DemoPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>}>
      <DemoPage />
    </Suspense>
  );
}

function DemoPage() {
  const searchParams = useSearchParams();
  const [activeSection, setActiveSection] = useState(searchParams.get("section") || "dashboard");

  useEffect(() => {
    const section = searchParams.get("section");
    if (section && sections.some((s) => s.id === section)) {
      setActiveSection(section);
    }
  }, [searchParams]);
  const [expandedDevice, setExpandedDevice] = useState<string | null>("dev-1");
  const [deviceTab, setDeviceTab] = useState("overview");
  const [expandedGroup, setExpandedGroup] = useState<string | null>("hg1");
  const [search, setSearch] = useState("");
  const [employeeViewMode, setEmployeeViewMode] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [userSearch, setUserSearch] = useState("");
  // IT Support state
  const [itSubTab, setItSubTab] = useState<"queue" | "tickets" | "submit" | "selfservice" | "config">("queue");
  const [selfServiceFilter, setSelfServiceFilter] = useState<"all" | "performance" | "network" | "display" | "apps" | "security" | "peripherals">("all");
  const [soc2DeviceFilter, setSoc2DeviceFilter] = useState<string | null>(null);
  const [ranSelfRemediations, setRanSelfRemediations] = useState<Set<string>>(new Set());
  const [selectedDemoResetApp, setSelectedDemoResetApp] = useState<string | null>(null);
  const [demoAppSearch, setDemoAppSearch] = useState("");
  const [selectedTicketDevice, setSelectedTicketDevice] = useState<string | null>(null);
  const [selectedTicketApp, setSelectedTicketApp] = useState<string | null>(null);
  const [ticketDescription, setTicketDescription] = useState("");
  const [selectedStockReason, setSelectedStockReason] = useState<string | null>(null);
  const [stockReasons, setStockReasons] = useState(mockStockReasons);
  const [remediationGroups, setRemediationGroups] = useState(mockRemediationGroups);
  const [editingNewReason, setEditingNewReason] = useState(false);
  const [newReasonLabel, setNewReasonLabel] = useState("");
  const [supportTab, setSupportTab] = useState<"mydevice" | "selfservice" | "submit" | "tickets">("mydevice");
  const [viewingBoard, setViewingBoard] = useState<string | null>(null);
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);
  const [expandedPolicy, setExpandedPolicy] = useState<string | null>(null);

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

  const filteredUsers = mockUsers.filter((u) =>
    u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const toggleAllUsers = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map((u) => u.id));
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "Admin": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "Manager": return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "Employee": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "Active": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "Inactive": return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300";
      case "Suspended": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getModulesForRole = (role: string) => {
    const roleIdx = roleHierarchy.indexOf(role);
    return mockModules.filter((m) => roleHierarchy.indexOf(m.minRole) <= roleIdx);
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 border-r bg-sidebar">
        <div className="flex h-16 items-center border-b px-6">
          <span className="text-xl font-bold text-primary">MyDex</span>
          <Badge className="ml-2 bg-blue-100 text-blue-800 text-[10px]">DEMO</Badge>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {sectionGroups.map((group) => (
            <Fragment key={group.category || "core"}>
              {group.category && (
                <div className="px-3 pt-4 pb-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                  {group.category}
                </div>
              )}
              {group.items.map((s) => (
                <button key={s.id} onClick={() => setActiveSection(s.id)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors w-full text-left ${
                    activeSection === s.id ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                  }`}
                >
                  <s.icon className="h-4 w-4" /> {s.label}
                </button>
              ))}
            </Fragment>
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

          {/* ═══ TIME TRACKING ═══ */}
          {activeSection === "time-tracking" && (
            <div className="space-y-6">
              <div><h1 className="text-2xl font-bold flex items-center gap-2"><Timer className="h-6 w-6" /> Time Tracking</h1>
              <p className="text-muted-foreground text-sm">Clock in/out and weekly timesheet</p></div>

              {/* Clock In/Out Card */}
              <Card className="border-l-4 border-l-green-500">
                <CardContent className="py-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-14 w-14 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                        <Timer className="h-7 w-7 text-green-600" />
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Current Status</div>
                        <div className="text-2xl font-bold text-green-600">Clocked In</div>
                        <div className="text-sm text-muted-foreground">Since 9:02 AM &middot; 7h 23m today</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" className="border-yellow-300 text-yellow-700 hover:bg-yellow-50"><Pause className="h-4 w-4 mr-2" /> Break</Button>
                      <Button className="bg-red-600 hover:bg-red-700 text-white"><LogOut className="h-4 w-4 mr-2" /> Clock Out</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Today's Log */}
              <Card>
                <CardHeader><CardTitle className="text-lg">Today&apos;s Log &mdash; Fri, Mar 27</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {mockTimeLog.map((entry, i) => (
                      <div key={i} className="flex items-center gap-4 text-sm">
                        <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
                        <span className="font-mono w-20">{entry.time}</span>
                        <span className="font-medium">{entry.event}</span>
                        {entry.note && <Badge variant="outline" className="text-xs">{entry.note}</Badge>}
                      </div>
                    ))}
                    <div className="flex items-center gap-4 text-sm">
                      <div className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" />
                      <span className="font-mono w-20">Now</span>
                      <span className="font-medium text-green-600">Working...</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Weekly Timesheet */}
              <Card>
                <CardHeader><CardTitle className="text-lg">Weekly Timesheet</CardTitle></CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b bg-muted/30"><th className="text-left p-3">Day</th><th className="text-left p-3">Start</th><th className="text-left p-3">End</th><th className="text-left p-3">Breaks</th><th className="text-left p-3">Total</th><th className="text-right p-3">Overtime</th></tr></thead>
                      <tbody>
                        {mockWeeklyTimesheet.map((row) => (
                          <tr key={row.day} className="border-b last:border-0 hover:bg-muted/30">
                            <td className="p-3 font-medium">{row.day}</td>
                            <td className="p-3 text-muted-foreground">{row.start}</td>
                            <td className="p-3 text-muted-foreground">{row.end}</td>
                            <td className="p-3 text-muted-foreground">{row.breaks}</td>
                            <td className="p-3 font-medium">{row.total}</td>
                            <td className={`p-3 text-right ${row.overtime !== "0:00" && row.overtime !== "—" ? "text-orange-600 font-medium" : "text-muted-foreground"}`}>{row.overtime}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Overtime Summary */}
              <div className="grid gap-4 md:grid-cols-3">
                <Card><CardContent className="pt-4 pb-3"><div className="text-sm text-muted-foreground">Hours This Week</div><div className="text-2xl font-bold">33:44</div><div className="text-xs text-muted-foreground">of 40h target</div></CardContent></Card>
                <Card><CardContent className="pt-4 pb-3"><div className="text-sm text-muted-foreground">Overtime This Week</div><div className="text-2xl font-bold text-orange-600">1:50</div><div className="text-xs text-muted-foreground">Thu: 1h13m, Wed: 5m, Tue: 32m</div></CardContent></Card>
                <Card><CardContent className="pt-4 pb-3"><div className="text-sm text-muted-foreground">Overtime This Month</div><div className="text-2xl font-bold text-orange-600">6:15</div><div className="text-xs text-muted-foreground">Avg 1.6h/week</div></CardContent></Card>
              </div>
            </div>
          )}

          {/* ═══ ATTENDANCE ═══ */}
          {activeSection === "attendance" && (
            <div className="space-y-6">
              <div><h1 className="text-2xl font-bold flex items-center gap-2"><CalendarCheck className="h-6 w-6" /> Attendance</h1>
              <p className="text-muted-foreground text-sm">Attendance calendar, leave balances, and requests</p></div>

              {/* Leave Balances */}
              <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-l-4 border-l-blue-500">
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-muted-foreground">PTO</div>
                        <div className="text-2xl font-bold">12 <span className="text-sm font-normal text-muted-foreground">/ 20 days</span></div>
                        <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden"><div className="h-full bg-blue-500 rounded-full" style={{ width: "60%" }} /></div>
                      </div>
                      <Calendar className="h-8 w-8 text-blue-400" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-red-500">
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-muted-foreground">Sick Leave</div>
                        <div className="text-2xl font-bold">3 <span className="text-sm font-normal text-muted-foreground">/ 10 days</span></div>
                        <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden"><div className="h-full bg-red-500 rounded-full" style={{ width: "30%" }} /></div>
                      </div>
                      <AlertTriangle className="h-8 w-8 text-red-400" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-purple-500">
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-muted-foreground">Personal</div>
                        <div className="text-2xl font-bold">1 <span className="text-sm font-normal text-muted-foreground">/ 3 days</span></div>
                        <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden"><div className="h-full bg-purple-500 rounded-full" style={{ width: "33%" }} /></div>
                      </div>
                      <Star className="h-8 w-8 text-purple-400" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* March 2026 Calendar Grid */}
              <Card>
                <CardHeader><CardTitle className="text-lg">March 2026</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-7 gap-1 text-center text-xs">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                      <div key={d} className="font-semibold text-muted-foreground py-2">{d}</div>
                    ))}
                    {/* March 2026 starts on Sunday */}
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
                      const isWeekend = new Date(2026, 2, day).getDay() === 0 || new Date(2026, 2, day).getDay() === 6;
                      const isSick = day === 10;
                      const isToday = day === 27;
                      const isPast = day < 27 && !isWeekend && !isSick;
                      return (
                        <div key={day} className={`py-2 rounded-lg text-sm ${isToday ? "bg-blue-600 text-white font-bold" : isSick ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300" : isWeekend ? "text-muted-foreground/50" : isPast ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300" : ""}`}>
                          {day}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-4 mt-4 text-xs">
                    <div className="flex items-center gap-1"><div className="h-3 w-3 rounded bg-green-50 dark:bg-green-900/20 border border-green-200" /> Present</div>
                    <div className="flex items-center gap-1"><div className="h-3 w-3 rounded bg-red-100 dark:bg-red-900/30 border border-red-200" /> Sick</div>
                    <div className="flex items-center gap-1"><div className="h-3 w-3 rounded bg-blue-600" /> Today</div>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Leave Requests */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">Leave Requests</CardTitle>
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700">Request Leave</Button>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b bg-muted/30"><th className="text-left p-3">Type</th><th className="text-left p-3">Dates</th><th className="text-center p-3">Days</th><th className="text-left p-3">Submitted</th><th className="text-center p-3">Status</th></tr></thead>
                      <tbody>
                        {mockLeaveRequests.map((lr) => (
                          <tr key={lr.id} className="border-b last:border-0 hover:bg-muted/30">
                            <td className="p-3 font-medium">{lr.type}</td>
                            <td className="p-3 text-muted-foreground">{lr.dates}</td>
                            <td className="p-3 text-center">{lr.days}</td>
                            <td className="p-3 text-muted-foreground text-xs">{lr.submitted}</td>
                            <td className="p-3 text-center">
                              <Badge className={lr.status === "Approved" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>{lr.status}</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ═══ PROJECTS ═══ */}
          {activeSection === "projects" && (() => {
            const statusColors: Record<string, string> = {
              "In Progress": "bg-blue-100 text-blue-800",
              "Completed": "bg-green-100 text-green-800",
              "At Risk": "bg-orange-100 text-orange-800",
            };
            const barColors: Record<string, string> = {
              blue: "bg-blue-500", purple: "bg-purple-500", green: "bg-green-500", orange: "bg-orange-500",
            };
            const priorityColors: Record<string, string> = {
              high: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
              medium: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
              low: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
            };
            const labelColors = ["bg-blue-100 text-blue-700", "bg-purple-100 text-purple-700", "bg-emerald-100 text-emerald-700", "bg-pink-100 text-pink-700", "bg-cyan-100 text-cyan-700", "bg-amber-100 text-amber-700", "bg-indigo-100 text-indigo-700", "bg-rose-100 text-rose-700"];
            const getLabelColor = (label: string) => labelColors[Math.abs(label.split("").reduce((a, c) => a + c.charCodeAt(0), 0)) % labelColors.length];

            const boardProject = viewingBoard ? mockProjects.find(p => p.id === viewingBoard) : null;
            const boardTasks = viewingBoard ? mockKanbanTasks[viewingBoard] : null;

            const columns = boardTasks ? [
              { key: "backlog", label: "Backlog", color: "border-t-gray-400", tasks: boardTasks.backlog },
              { key: "todo", label: "To Do", color: "border-t-blue-400", tasks: boardTasks.todo },
              { key: "inProgress", label: "In Progress", color: "border-t-amber-400", tasks: boardTasks.inProgress },
              { key: "review", label: "In Review", color: "border-t-purple-400", tasks: boardTasks.review },
              { key: "done", label: "Done", color: "border-t-green-400", tasks: boardTasks.done },
            ] : [];

            return (
            <div className="space-y-6">
              {/* Breadcrumbs */}
              <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <button onClick={() => { setActiveSection("dashboard"); setViewingBoard(null); }} className="hover:text-foreground transition-colors">Dashboard</button>
                <ChevronRight className="h-3.5 w-3.5" />
                <button onClick={() => setViewingBoard(null)} className="hover:text-foreground transition-colors">Projects</button>
                {boardProject && (
                  <>
                    <ChevronRight className="h-3.5 w-3.5" />
                    <span className="text-foreground font-medium">{boardProject.name}</span>
                  </>
                )}
              </nav>

              {/* ── PROJECT LIST VIEW ─── */}
              {!viewingBoard && (<>
                <div className="flex items-center justify-between">
                  <div><h1 className="text-2xl font-bold flex items-center gap-2"><FolderKanban className="h-6 w-6" /> Projects</h1>
                  <p className="text-muted-foreground text-sm">Active projects and task progress</p></div>
                  <Button className="bg-blue-600 hover:bg-blue-700"><FolderKanban className="h-4 w-4 mr-2" /> New Project</Button>
                </div>

                <div className="grid gap-4 md:grid-cols-4">
                  <Card><CardContent className="pt-4 pb-3"><div className="text-sm text-muted-foreground">Active Projects</div><div className="text-2xl font-bold">3</div></CardContent></Card>
                  <Card><CardContent className="pt-4 pb-3"><div className="text-sm text-muted-foreground">Completed</div><div className="text-2xl font-bold text-green-600">1</div></CardContent></Card>
                  <Card><CardContent className="pt-4 pb-3"><div className="text-sm text-muted-foreground">At Risk</div><div className="text-2xl font-bold text-orange-600">1</div></CardContent></Card>
                  <Card><CardContent className="pt-4 pb-3"><div className="text-sm text-muted-foreground">Total Tasks</div><div className="text-2xl font-bold">86</div></CardContent></Card>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {mockProjects.map((project) => (
                    <Card key={project.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="pt-6 pb-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-lg">{project.name}</h3>
                            <div className="text-xs text-muted-foreground mt-0.5">Due: {project.dueDate}</div>
                          </div>
                          <Badge className={statusColors[project.status] || ""}>{project.status}</Badge>
                        </div>
                        <div className="mb-3">
                          <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>{project.tasks.done}/{project.tasks.total} tasks</span>
                            <span>{project.progress}%</span>
                          </div>
                          <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${barColors[project.color]}`} style={{ width: `${project.progress}%` }} />
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex -space-x-2">
                            {project.team.map((initials) => (
                              <div key={initials} className="h-7 w-7 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-[10px] font-bold border-2 border-background">
                                {initials}
                              </div>
                            ))}
                          </div>
                          <Button size="sm" variant="outline" onClick={() => setViewingBoard(project.id)}>View Board</Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>)}

              {/* ── KANBAN BOARD VIEW ─── */}
              {viewingBoard && boardProject && boardTasks && (<>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <h1 className="text-2xl font-bold">{boardProject.name}</h1>
                      <Badge className={statusColors[boardProject.status] || ""}>{boardProject.status}</Badge>
                    </div>
                    <p className="text-muted-foreground text-sm mt-0.5">
                      Due: {boardProject.dueDate} &bull; {boardProject.tasks.done}/{boardProject.tasks.total} tasks complete &bull; {boardProject.progress}%
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2 mr-2">
                      {boardProject.team.map((initials) => (
                        <div key={initials} className="h-7 w-7 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-[10px] font-bold border-2 border-background">
                          {initials}
                        </div>
                      ))}
                    </div>
                    <Button size="sm" variant="outline" onClick={() => setViewingBoard(null)}>
                      <ChevronRight className="h-3.5 w-3.5 mr-1 rotate-180" /> Back to Projects
                    </Button>
                  </div>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>{boardProject.tasks.done}/{boardProject.tasks.total} tasks</span>
                    <span>{boardProject.progress}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${barColors[boardProject.color]}`} style={{ width: `${boardProject.progress}%` }} />
                  </div>
                </div>

                {/* Kanban columns */}
                <div className="grid grid-cols-5 gap-3" style={{ minHeight: 500 }}>
                  {columns.map((col) => (
                    <div key={col.key} className={`rounded-xl border-t-4 ${col.color} bg-muted/30 p-2 space-y-2`}>
                      <div className="flex items-center justify-between px-1 py-1">
                        <h3 className="text-sm font-semibold">{col.label}</h3>
                        <Badge variant="outline" className="text-[10px] h-5 px-1.5">{col.tasks.length}</Badge>
                      </div>

                      {col.tasks.map((task) => (
                        <div key={task.id} className="rounded-lg border bg-background p-3 space-y-2 hover:shadow-sm transition-shadow cursor-pointer">
                          <div className="flex items-start justify-between gap-1">
                            <p className="text-sm font-medium leading-snug">{task.title}</p>
                          </div>
                          <div className="flex items-center gap-1 flex-wrap">
                            {task.labels.map((label) => (
                              <span key={label} className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${getLabelColor(label)}`}>
                                {label}
                              </span>
                            ))}
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge className={`text-[9px] px-1.5 ${priorityColors[task.priority]}`}>
                                {task.priority === "high" ? "!" : task.priority === "medium" ? "!!" : "..."} {task.priority}
                              </Badge>
                              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                <Calendar className="h-2.5 w-2.5" /> {task.dueDate}
                              </span>
                            </div>
                            <div className="h-6 w-6 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-[8px] font-bold">
                              {task.assignee}
                            </div>
                          </div>
                        </div>
                      ))}

                      {col.tasks.length === 0 && (
                        <div className="rounded-lg border border-dashed p-4 text-center">
                          <p className="text-[11px] text-muted-foreground">No tasks</p>
                        </div>
                      )}

                      <button className="w-full rounded-lg border border-dashed p-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors flex items-center justify-center gap-1">
                        <Plus className="h-3 w-3" /> Add Task
                      </button>
                    </div>
                  ))}
                </div>
              </>)}
            </div>
            );
          })()}

          {/* ═══ MY ACCOUNT ═══ */}
          {activeSection === "my-account" && (
            <div className="space-y-6">
              <div><h1 className="text-2xl font-bold flex items-center gap-2"><UserCircle className="h-6 w-6" /> My Account</h1>
              <p className="text-muted-foreground text-sm">Profile, security, and preferences</p></div>

              <div className="grid gap-6 md:grid-cols-2">
                {/* Profile Info */}
                <Card>
                  <CardHeader><CardTitle className="text-lg flex items-center gap-2"><UserCircle className="h-5 w-5" /> Profile</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-xl font-bold">JM</div>
                      <div>
                        <div className="text-lg font-semibold">Jordan Miller</div>
                        <div className="text-sm text-muted-foreground">jordan@acmecorp.com</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div><span className="text-muted-foreground">Department</span><div className="font-medium">Engineering</div></div>
                      <div><span className="text-muted-foreground">Role</span><div className="font-medium">Admin</div></div>
                      <div><span className="text-muted-foreground">Location</span><div className="font-medium">San Francisco, CA</div></div>
                      <div><span className="text-muted-foreground">Joined</span><div className="font-medium">Jan 15, 2024</div></div>
                    </div>
                    <Button size="sm" variant="outline">Edit Profile</Button>
                  </CardContent>
                </Card>

                {/* MFA Status */}
                <Card>
                  <CardHeader><CardTitle className="text-lg flex items-center gap-2"><ShieldCheck className="h-5 w-5" /> Security</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-3">
                        <Fingerprint className="h-5 w-5 text-green-500" />
                        <div>
                          <div className="text-sm font-medium">Two-Factor Authentication</div>
                          <div className="text-xs text-muted-foreground">TOTP via authenticator app</div>
                        </div>
                      </div>
                      <Badge variant="success">Enabled</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-3">
                        <KeyRound className="h-5 w-5 text-blue-500" />
                        <div>
                          <div className="text-sm font-medium">Password</div>
                          <div className="text-xs text-muted-foreground">Last changed 14 days ago</div>
                        </div>
                      </div>
                      <Button size="sm" variant="outline">Change</Button>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-3">
                        <Smartphone className="h-5 w-5 text-purple-500" />
                        <div>
                          <div className="text-sm font-medium">Active Sessions</div>
                          <div className="text-xs text-muted-foreground">2 devices logged in</div>
                        </div>
                      </div>
                      <Badge variant="outline">2</Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Notification Preferences */}
              <Card>
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Bell className="h-5 w-5" /> Notification Preferences</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { label: "Email Notifications", desc: "Receive email for important alerts", enabled: true },
                      { label: "Security Alerts", desc: "Login attempts, password changes", enabled: true },
                      { label: "Task Assignments", desc: "When you are assigned new tasks", enabled: true },
                      { label: "Weekly Summary", desc: "Weekly productivity and activity report", enabled: false },
                      { label: "Marketing Updates", desc: "Product news and feature announcements", enabled: false },
                    ].map((pref, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium">{pref.label}</div>
                          <div className="text-xs text-muted-foreground">{pref.desc}</div>
                        </div>
                        <div className={`w-11 h-6 rounded-full flex items-center px-0.5 cursor-pointer transition-colors ${pref.enabled ? "bg-green-500 justify-end" : "bg-gray-300 dark:bg-gray-600 justify-start"}`}>
                          <div className="h-5 w-5 rounded-full bg-white shadow-sm" />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Theme Selector */}
              <Card>
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Palette className="h-5 w-5" /> Theme</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex gap-4">
                    {[
                      { label: "Light", icon: Sun, active: true },
                      { label: "Dark", icon: Moon, active: false },
                      { label: "System", icon: Laptop, active: false },
                    ].map((theme) => (
                      <div key={theme.label} className={`flex-1 p-4 rounded-lg border-2 text-center cursor-pointer transition-colors ${theme.active ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20" : "border-muted hover:border-muted-foreground/30"}`}>
                        <theme.icon className={`h-6 w-6 mx-auto mb-2 ${theme.active ? "text-blue-600" : "text-muted-foreground"}`} />
                        <div className={`text-sm font-medium ${theme.active ? "text-blue-600" : "text-muted-foreground"}`}>{theme.label}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
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
                            {[{ id: "overview", label: "Overview", icon: Monitor }, { id: "security", label: "Security", icon: Shield }, { id: "software", label: "Software", icon: Package }, { id: "activity", label: "Activity", icon: Activity }, { id: "remediation", label: "Remediation", icon: Wrench }, { id: "compliance", label: "Compliance", icon: FileCheck }].map((t) => (
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
                          {deviceTab === "remediation" && (() => {
                            const isWindows = d.platform === "win32" || d.platform?.toLowerCase() === "windows";
                            const remediations: { id: string; severity: "critical" | "high" | "medium" | "low"; category: string; title: string; desc: string; script: string }[] = [];

                            if (d.pendingUpdates && d.pendingUpdates.length > 0) {
                              remediations.push({ id: "updates", severity: "critical", category: "Updates", title: `Install ${d.pendingUpdates.length} Pending Update(s)`, desc: d.pendingUpdates.slice(0, 2).map((u: { title: string }) => u.title).join(", "), script: isWindows ? "Install-Module PSWindowsUpdate -Force\nGet-WindowsUpdate -Install -AcceptAll -AutoReboot" : "softwareupdate --install --all" });
                            }
                            if (d.rebootPending) {
                              remediations.push({ id: "reboot", severity: "high", category: "System", title: "Reboot Required", desc: "System needs a reboot — patches may not be applied.", script: isWindows ? 'shutdown /r /t 300 /c "Scheduled reboot in 5 minutes"' : "sudo shutdown -r +5" });
                            }
                            if (d.bsodCount > 0) {
                              remediations.push({ id: "bsod", severity: "critical", category: "Stability", title: `Diagnose ${d.bsodCount} BSOD Event(s)`, desc: "Blue screen crashes detected — run system diagnostics.", script: isWindows ? "sfc /scannow\nDISM /Online /Cleanup-Image /RestoreHealth\nmdsched.exe" : "sudo fsck -fy" });
                              remediations.push({ id: "drivers", severity: "high", category: "Stability", title: "Update Drivers (BSOD Prevention)", desc: "Outdated drivers are the #1 cause of BSODs.", script: isWindows ? "pnputil /scan-devices\ndriverquery /v /fo csv > $env:TEMP\\drivers.csv" : "softwareupdate --list" });
                            }
                            if (!Object.values(d.firewallStatus || {}).every(Boolean)) {
                              const disabled = Object.entries(d.firewallStatus || {}).filter(([, v]) => !v).map(([k]) => k);
                              remediations.push({ id: "firewall", severity: "high", category: "Security", title: "Enable Firewall Profiles", desc: `Disabled: ${disabled.join(", ")}`, script: isWindows ? `Set-NetFirewallProfile -Profile ${disabled.join(",")} -Enabled True` : "sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setglobalstate on" });
                            }

                            const sevColors = { critical: "bg-red-100 text-red-800", high: "bg-orange-100 text-orange-800", medium: "bg-yellow-100 text-yellow-800", low: "bg-blue-100 text-blue-800" };

                            return (
                              <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <h3 className="font-semibold text-sm flex items-center gap-2"><Wrench className="h-4 w-4" /> Device Remediations</h3>
                                    <p className="text-xs text-muted-foreground mt-0.5">{remediations.length} actionable fix{remediations.length !== 1 ? "es" : ""} for {d.hostname}</p>
                                  </div>
                                  {remediations.length > 0 && (
                                    <div className="flex gap-1.5">
                                      {(["critical", "high", "medium", "low"] as const).map(s => {
                                        const count = remediations.filter(r => r.severity === s).length;
                                        return count > 0 ? <Badge key={s} className={`text-[10px] ${sevColors[s]}`}>{count} {s}</Badge> : null;
                                      })}
                                    </div>
                                  )}
                                </div>
                                {remediations.length === 0 ? (
                                  <div className="text-center py-8 rounded-lg border border-green-200 bg-green-50/50">
                                    <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                                    <p className="text-sm font-medium text-green-800">No issues detected</p>
                                    <p className="text-xs text-muted-foreground mt-1">This device is healthy.</p>
                                  </div>
                                ) : (
                                  <div className="space-y-3">
                                    {remediations.map(r => (
                                      <div key={r.id} className="rounded-lg border overflow-hidden">
                                        <div className="flex items-center justify-between p-3 bg-muted/30">
                                          <div className="flex items-center gap-3">
                                            <Badge className={`text-[10px] ${sevColors[r.severity]}`}>{r.severity}</Badge>
                                            <div>
                                              <span className="text-sm font-medium">{r.title}</span>
                                              <p className="text-xs text-muted-foreground mt-0.5">{r.desc}</p>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="text-[10px]">{r.category}</Badge>
                                            <Button size="sm" variant="default" className="h-7 text-xs" onClick={(e) => e.stopPropagation()}>
                                              <Zap className="h-3 w-3 mr-1" /> Run Fix (Demo)
                                            </Button>
                                          </div>
                                        </div>
                                        <div className="bg-gray-950 text-green-400 p-3 font-mono text-[11px] overflow-x-auto">
                                          <pre className="whitespace-pre-wrap">{r.script}</pre>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                          {deviceTab === "compliance" && (() => {
                            const isWindows = d.platform === "win32" || d.platform?.toLowerCase() === "windows";
                            const hasAv = !!d.antivirusName;
                            const allFwOn = Object.values(d.firewallStatus || {}).every(Boolean);
                            const noUpdates = !d.pendingUpdates || d.pendingUpdates.length === 0;
                            const noReboot = !d.rebootPending;
                            const noBsod = !d.bsodCount || d.bsodCount === 0;
                            const hasSoftware = d.installedSoftware && d.installedSoftware.length > 0;
                            const isOnline = d.status === "ONLINE";

                            const checks = [
                              { id: "av", label: "Antivirus Active", control: "CC6.8", pass: hasAv, desc: hasAv ? d.antivirusName : "No antivirus detected", icon: Shield },
                              { id: "fw", label: "Firewall Enabled", control: "CC6.6", pass: allFwOn, desc: allFwOn ? "All firewall profiles active" : "One or more firewall profiles disabled", icon: Shield },
                              { id: "updates", label: "Updates Current", control: "CC7.1", pass: noUpdates, desc: noUpdates ? "All patches applied" : `${d.pendingUpdates.length} pending update(s)`, icon: RefreshCw },
                              { id: "reboot", label: "No Pending Reboot", control: "CC7.5", pass: noReboot, desc: noReboot ? "No reboot required" : "Reboot pending — system may be unpatched", icon: RefreshCw },
                              { id: "bsod", label: "System Stability", control: "CC7.5", pass: noBsod, desc: noBsod ? "No crash events" : `${d.bsodCount} BSOD event(s) detected`, icon: AlertTriangle },
                              { id: "software", label: "Software Inventory", control: "CC8.2", pass: hasSoftware, desc: hasSoftware ? `${d.installedSoftware.length} apps tracked` : "No software inventory", icon: Package },
                              { id: "agent", label: "Agent Reporting", control: "CC7.1", pass: isOnline, desc: isOnline ? "Agent online" : "Agent offline", icon: Monitor },
                            ];

                            const passCount = checks.filter(c => c.pass).length;
                            const score = Math.round((passCount / checks.length) * 100);
                            const failingChecks = checks.filter(c => !c.pass);

                            return (
                              <div className="space-y-4">
                                {/* Score bar */}
                                <div className="flex items-center gap-4">
                                  <div className="flex-1">
                                    <div className="flex justify-between text-sm mb-1">
                                      <span className="font-medium">SOC 2 Compliance Score</span>
                                      <span className={cn("font-bold", score >= 80 ? "text-green-600" : score >= 50 ? "text-yellow-600" : "text-red-600")}>{score}%</span>
                                    </div>
                                    <div className="w-full bg-muted rounded-full h-2.5">
                                      <div className={cn("h-2.5 rounded-full transition-all", score >= 80 ? "bg-green-500" : score >= 50 ? "bg-yellow-500" : "bg-red-500")} style={{ width: `${score}%` }} />
                                    </div>
                                  </div>
                                  <Badge variant={score >= 80 ? "default" : "destructive"} className="text-xs">{passCount}/{checks.length} controls</Badge>
                                </div>

                                {/* Control checks grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                  {checks.map((check) => (
                                    <div key={check.id} className={cn("flex items-start gap-2 p-2 rounded-md border text-xs", check.pass ? "border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-800" : "border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800")}>
                                      {check.pass ? <CheckCircle className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" /> : <XCircle className="h-3.5 w-3.5 text-red-500 mt-0.5 shrink-0" />}
                                      <div>
                                        <div className="font-medium">{check.label} <span className="text-muted-foreground">({check.control})</span></div>
                                        <div className="text-muted-foreground">{check.desc}</div>
                                      </div>
                                    </div>
                                  ))}
                                </div>

                                {/* Quick-fix remediations for failing controls */}
                                {failingChecks.length > 0 && (
                                  <div className="space-y-2">
                                    <h4 className="text-sm font-semibold flex items-center gap-1"><Zap className="h-4 w-4 text-yellow-500" /> Quick-Fix Remediations</h4>
                                    {failingChecks.map((check) => {
                                      const scripts: Record<string, { label: string; script: string }> = {
                                        av: { label: "Enable Windows Defender", script: isWindows ? "Set-MpPreference -DisableRealtimeMonitoring $false" : "# macOS: Install antivirus from IT portal" },
                                        fw: { label: "Enable Firewall", script: isWindows ? "Set-NetFirewallProfile -Profile Domain,Public,Private -Enabled True" : "sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setglobalstate on" },
                                        updates: { label: "Install Updates", script: isWindows ? "Install-WindowsUpdate -AcceptAll -AutoReboot" : "sudo softwareupdate -ia" },
                                        reboot: { label: "Reboot System", script: isWindows ? "Restart-Computer -Force" : "sudo shutdown -r now" },
                                        bsod: { label: "Run System Diagnostics", script: isWindows ? "sfc /scannow && DISM /Online /Cleanup-Image /RestoreHealth" : "sudo fsck -fy" },
                                        software: { label: "Sync Software Inventory", script: "# Restart MyDex agent to trigger inventory sync" },
                                        agent: { label: "Restart Agent", script: isWindows ? "Restart-Service MyDexAgent" : "sudo launchctl kickstart -k system/com.mydex.agent" },
                                      };
                                      const fix = scripts[check.id];
                                      if (!fix) return null;
                                      return (
                                        <div key={check.id} className="border rounded-md p-2">
                                          <div className="flex items-center justify-between mb-1">
                                            <span className="text-xs font-medium flex items-center gap-1"><Terminal className="h-3 w-3" /> {fix.label}</span>
                                            <Badge variant="outline" className="text-[10px]">{check.control}</Badge>
                                          </div>
                                          <pre className="text-[11px] bg-muted/50 p-1.5 rounded font-mono overflow-x-auto">{fix.script}</pre>
                                          <Button size="sm" variant="outline" className="mt-1 h-6 text-[10px]" onClick={(e) => { e.stopPropagation(); }}>
                                            <Zap className="h-3 w-3 mr-1" /> Run Fix (Demo)
                                          </Button>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}

                                {failingChecks.length === 0 && (
                                  <div className="text-center py-4 bg-green-50 dark:bg-green-900/10 rounded-md">
                                    <CheckCircle className="h-6 w-6 text-green-500 mx-auto mb-2" />
                                    <p className="text-sm font-medium text-green-800 dark:text-green-300">All SOC 2 controls passing</p>
                                    <p className="text-xs text-muted-foreground mt-1">This device meets all compliance requirements.</p>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
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
                        {[...mockProductivity].sort((a, b) => b.score - a.score).map((p) => (
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

          {/* ═══ FLEET HEALTH & DIGITAL FRICTION ═══ */}
          {activeSection === "fleet-health" && (
            <div className="space-y-6">
              {/* Header */}
              <div>
                <div className="text-xs text-muted-foreground mb-1">Dashboard &gt; Fleet Health</div>
                <h1 className="text-2xl font-bold flex items-center gap-2"><Activity className="h-6 w-6" /> Fleet Health &amp; Digital Friction</h1>
                <p className="text-muted-foreground text-sm mt-1">Aggregate device health and friction scores across the fleet</p>
              </div>

              {/* KPI Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-4 pb-3">
                    <div className="text-sm text-muted-foreground">Digital Friction Score</div>
                    <div className="text-2xl font-bold text-green-600">82<span className="text-sm font-normal text-muted-foreground">/100</span></div>
                    <div className="text-xs text-muted-foreground mt-1">Lower is better. Measures delays, hangs, and blockers across the fleet</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-3">
                    <div className="text-sm text-muted-foreground">Fleet Health</div>
                    <div className="text-2xl font-bold text-green-600">94%</div>
                    <div className="text-xs text-muted-foreground mt-1">Devices meeting health baseline</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-3">
                    <div className="text-sm text-muted-foreground">Avg Boot Time</div>
                    <div className="text-2xl font-bold">28s</div>
                    <div className="text-xs text-muted-foreground mt-1">Fleet-wide average cold boot duration</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-3">
                    <div className="text-sm text-muted-foreground">Critical Devices</div>
                    <div className="text-2xl font-bold text-orange-500">1<span className="text-sm font-normal text-muted-foreground"> / 4</span></div>
                    <div className="text-xs text-muted-foreground mt-1">Devices with friction score &gt; 70 or health &lt; 70%</div>
                  </CardContent>
                </Card>
              </div>

              {/* Digital Friction Breakdown */}
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Zap className="h-5 w-5 text-yellow-500" /> Digital Friction Breakdown</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { category: "Slow Boot (>60s)", count: "1 device", score: 12, color: "bg-orange-500" },
                      { category: "App Hangs (per day)", count: "3 events", score: 18, color: "bg-red-500" },
                      { category: "Network Latency (>100ms)", count: "0 devices", score: 0, color: "bg-green-500" },
                      { category: "Pending Updates", count: "7 updates", score: 15, color: "bg-yellow-500" },
                      { category: "Disk Pressure (>85%)", count: "0 devices", score: 0, color: "bg-green-500" },
                      { category: "BSOD Events (30d)", count: "2 events", score: 22, color: "bg-red-600" },
                      { category: "Login Failures (30d)", count: "5 events", score: 8, color: "bg-yellow-500" },
                      { category: "Stale Agent (>24h)", count: "1 device", score: 7, color: "bg-orange-400" },
                    ].map((item) => (
                      <div key={item.category} className="flex items-center gap-3">
                        <div className="w-44 text-sm font-medium truncate">{item.category}</div>
                        <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.score * 4}%` }} />
                        </div>
                        <div className="w-16 text-right text-sm text-muted-foreground">{item.count}</div>
                        <div className="w-12 text-right text-sm font-semibold">{item.score}</div>
                      </div>
                    ))}
                    <div className="flex items-center gap-3 pt-2 border-t mt-2">
                      <div className="w-44 text-sm font-bold">Total Friction</div>
                      <div className="flex-1" />
                      <div className="w-16" />
                      <div className="w-12 text-right text-lg font-bold text-orange-600">82<span className="text-sm font-normal text-muted-foreground">/100</span></div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Fleet Health Grid */}
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Monitor className="h-5 w-5" /> Fleet Health Grid</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {mockDevices.map((d) => {
                      const avOn = d.antivirusName !== "None";
                      const fwOn = d.firewallStatus.domain && d.firewallStatus.private && d.firewallStatus.public;
                      const noUpdates = d.pendingUpdates.length === 0;
                      const noBsod = d.bsodCount === 0;
                      const online = d.status === "ONLINE";
                      const noCves = d.openCves === 0;
                      const healthScore = (avOn ? 20 : 0) + (fwOn ? 20 : 0) + (noUpdates ? 15 : 0) + (noBsod ? 15 : 0) + (online ? 15 : 0) + (noCves ? 15 : 0);
                      const scoreColor = healthScore > 90 ? "text-green-600" : healthScore >= 70 ? "text-yellow-600" : "text-red-600";
                      const scoreBg = healthScore > 90 ? "bg-green-50 border-green-200" : healthScore >= 70 ? "bg-yellow-50 border-yellow-200" : "bg-red-50 border-red-200";
                      return (
                        <div key={d.id} className={`p-4 rounded-lg border ${scoreBg}`}>
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <div className="font-semibold text-sm">{d.hostname}</div>
                              <div className="text-xs text-muted-foreground">{d.user.name} &middot; {d.department}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={d.status === "ONLINE" ? "default" : "secondary"} className={d.status === "ONLINE" ? "bg-green-600" : "bg-gray-400"}>{d.status}</Badge>
                              <div className={`text-xl font-bold ${scoreColor}`}>{healthScore}</div>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            <Badge variant="outline" className={avOn ? "border-green-300 text-green-700 bg-green-50" : "border-red-300 text-red-700 bg-red-50"}>
                              {avOn ? <CheckCircle className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />} AV
                            </Badge>
                            <Badge variant="outline" className={fwOn ? "border-green-300 text-green-700 bg-green-50" : "border-red-300 text-red-700 bg-red-50"}>
                              {fwOn ? <CheckCircle className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />} FW
                            </Badge>
                            <Badge variant="outline" className={noUpdates ? "border-green-300 text-green-700 bg-green-50" : "border-yellow-300 text-yellow-700 bg-yellow-50"}>
                              {noUpdates ? <CheckCircle className="h-3 w-3 mr-1" /> : <AlertTriangle className="h-3 w-3 mr-1" />} {d.pendingUpdates.length} Updates
                            </Badge>
                            <Badge variant="outline" className={noBsod ? "border-green-300 text-green-700 bg-green-50" : "border-red-300 text-red-700 bg-red-50"}>
                              {noBsod ? <CheckCircle className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />} Stability
                            </Badge>
                            <Badge variant="outline" className={noCves ? "border-green-300 text-green-700 bg-green-50" : "border-red-300 text-red-700 bg-red-50"}>
                              {noCves ? <CheckCircle className="h-3 w-3 mr-1" /> : <AlertTriangle className="h-3 w-3 mr-1" />} {d.openCves} CVEs
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Telemetry Overview */}
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Cpu className="h-5 w-5" /> Telemetry Overview</CardTitle></CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left pb-3 text-muted-foreground font-medium">Category</th>
                          <th className="text-left pb-3 text-muted-foreground font-medium">Metric</th>
                          <th className="text-left pb-3 text-muted-foreground font-medium">Value</th>
                          <th className="text-center pb-3 text-muted-foreground font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { cat: "System", metric: "Boot Duration", value: "28s avg", status: "green" },
                          { cat: "System", metric: "Shutdown Reason", value: "Clean (3/4 devices)", status: "green" },
                          { cat: "System", metric: "Thermal Throttling", value: "0 events", status: "green" },
                          { cat: "System", metric: "Battery Wear", value: "8% (1 laptop)", status: "green" },
                          { cat: "Network", metric: "Gateway Latency", value: "4ms", status: "green" },
                          { cat: "Network", metric: "DNS Resolution", value: "12ms avg", status: "green" },
                          { cat: "Network", metric: "Wi-Fi RSSI", value: "-52 dBm", status: "amber" },
                          { cat: "Application", metric: "Hang Rate", value: "3/day fleet-wide", status: "amber" },
                          { cat: "Application", metric: "Crash Logs", value: "1 in 7d", status: "green" },
                          { cat: "Application", metric: "Focus Time", value: "5.2h avg/user", status: "green" },
                          { cat: "Hardware", metric: "Disk I/O", value: "45 MB/s avg", status: "green" },
                          { cat: "Hardware", metric: "S.M.A.R.T. Status", value: "All Healthy", status: "green" },
                          { cat: "Hardware", metric: "RAM Pressure", value: "62% avg", status: "amber" },
                        ].map((row, i) => (
                          <tr key={i} className="border-b last:border-0 hover:bg-muted/50">
                            <td className="py-2.5 font-medium text-muted-foreground">{row.cat}</td>
                            <td className="py-2.5">{row.metric}</td>
                            <td className="py-2.5 font-mono text-xs">{row.value}</td>
                            <td className="py-2.5 text-center">
                              {row.status === "green" && <CheckCircle className="h-4 w-4 text-green-500 inline-block" />}
                              {row.status === "amber" && <AlertTriangle className="h-4 w-4 text-yellow-500 inline-block" />}
                              {row.status === "red" && <XCircle className="h-4 w-4 text-red-500 inline-block" />}
                            </td>
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
                    {mockDepartments.map((dept, idx) => {
                      const scores = [92, 85, 71, 88, 78];
                      const score = scores[idx] || 80;
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

          {/* ═══ DLP POLICIES ═══ */}
          {activeSection === "dlp" && (() => {
            const dlpTemplates = [
              { name: "Social Security Numbers", icon: FileText, color: "text-red-600", bg: "bg-red-50", category: "PII", severity: "high", desc: "Detects SSN patterns (XXX-XX-XXXX) in documents, emails, and file transfers.", rules: "Pattern: \\b\\d{3}-\\d{2}-\\d{4}\\b\nScope: All outbound transfers\nAction: Block + Alert" },
              { name: "Credit Card Numbers", icon: Globe, color: "text-amber-600", bg: "bg-amber-50", category: "Financial", severity: "high", desc: "Identifies credit card numbers using Luhn validation across all file types.", rules: "Pattern: \\b(?:\\d{4}[- ]?){3}\\d{4}\\b\nValidation: Luhn checksum\nAction: Block + Alert" },
              { name: "API Keys & Secrets", icon: KeyRound, color: "text-purple-600", bg: "bg-purple-50", category: "Credentials", severity: "high", desc: "Catches exposed API keys, tokens, and private keys in file transfers and messages.", rules: "Patterns: AKIA[0-9A-Z]{16}, ghp_[a-zA-Z0-9]{36}, sk-[a-zA-Z0-9]{48}\nScope: Code repos, file uploads\nAction: Block + Alert" },
              { name: "Source Code & IP Theft", icon: HardDrive, color: "text-blue-600", bg: "bg-blue-50", category: "IP Protection", severity: "medium", desc: "Prevents unauthorized transfer of proprietary source code and design documents.", rules: "File types: .py, .ts, .java, .cpp, .figma, .sketch\nScope: External transfers\nAction: Alert + Log" },
            ];

            const dlpPolicies = [
              { id: "dlp1", name: "Sensitive Data Exfiltration", status: "Active", desc: "Blocks SSN, credit card, and PII patterns from leaving the organization", created: "2026-02-15", rules: "Patterns: SSN (\\d{3}-\\d{2}-\\d{4}), CC (Luhn-validated 16-digit), Email+Name combos\nChannels: Email attachments, Cloud uploads, USB transfers\nAction: Block transfer, Alert SOC team, Log event" },
              { id: "dlp2", name: "API Key Leak Prevention", status: "Active", desc: "Detects exposed API keys, tokens, and private keys in file transfers", created: "2026-03-01", rules: "Patterns: AWS keys (AKIA...), GitHub tokens (ghp_...), OpenAI keys (sk-...)\nChannels: Git push, File sharing, Chat messages\nAction: Block transfer, Notify developer, Auto-rotate if possible" },
            ];

            // expandedTemplate and expandedPolicy state moved to top level

            return (
            <div className="space-y-6">
              {/* Breadcrumbs */}
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <span className="cursor-pointer hover:text-foreground" onClick={() => setActiveSection("dashboard")}>Dashboard</span>
                <ChevronRight className="h-3 w-3" />
                <span className="cursor-pointer hover:text-foreground" onClick={() => setActiveSection("security")}>Security</span>
                <ChevronRight className="h-3 w-3" />
                <span className="text-foreground font-medium">DLP Policies</span>
              </div>

              {/* Header */}
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <ShieldCheck className="h-6 w-6 text-blue-600" /> DLP Policies
                </h1>
                <p className="text-muted-foreground text-sm">Define and manage Data Loss Prevention policies to protect sensitive information from unauthorized access and exfiltration.</p>
              </div>

              {/* How DLP Works */}
              <Card className="bg-blue-50/60 border-blue-200">
                <CardContent className="pt-5 pb-4">
                  <div className="text-sm font-semibold text-blue-800 mb-3 flex items-center gap-2"><Info className="h-4 w-4" /> How DLP Policies Work</div>
                  <div className="grid md:grid-cols-3 gap-4">
                    {[
                      { step: "1", title: "Define Rules", desc: "Create pattern-matching rules for sensitive data types like SSNs, credit cards, API keys, and source code." },
                      { step: "2", title: "Monitor Activity", desc: "Policies continuously scan file transfers, emails, cloud uploads, and messaging channels." },
                      { step: "3", title: "Alert or Block", desc: "When a match is found, the policy can alert the SOC team, block the transfer, or log the event." },
                    ].map(s => (
                      <div key={s.step} className="flex gap-3">
                        <div className="flex-shrink-0 h-7 w-7 rounded-full bg-blue-600 text-white text-sm font-bold flex items-center justify-center">{s.step}</div>
                        <div>
                          <div className="text-sm font-semibold text-blue-900">{s.title}</div>
                          <p className="text-xs text-blue-700/80">{s.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Template Gallery */}
              <Card>
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Layers className="h-5 w-5 text-purple-500" /> Policy Templates</CardTitle><p className="text-sm text-muted-foreground">Pre-built templates for common data protection scenarios. Click &quot;Use Template&quot; to create a policy.</p></CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    {dlpTemplates.map((t, i) => (
                      <div key={i} className="border rounded-xl p-4 space-y-3 hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3">
                          <div className={`p-2.5 rounded-lg ${t.bg}`}><t.icon className={`h-5 w-5 ${t.color}`} /></div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold">{t.name}</div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <Badge variant="outline" className="text-[10px] px-1.5">{t.category}</Badge>
                              <Badge className={`text-[10px] px-1.5 ${t.severity === "high" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>{t.severity}</Badge>
                            </div>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">{t.desc}</p>
                        <button onClick={() => setExpandedTemplate(expandedTemplate === t.name ? null : t.name)} className="text-[11px] text-blue-600 hover:underline flex items-center gap-1">
                          {expandedTemplate === t.name ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />} Rule Preview
                        </button>
                        {expandedTemplate === t.name && (
                          <pre className="text-[10px] bg-muted/50 p-2 rounded-md whitespace-pre-wrap font-mono">{t.rules}</pre>
                        )}
                        <Button size="sm" variant="outline" className="w-full gap-1.5"><Play className="h-3.5 w-3.5" /> Use Template</Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Active Policies */}
              <Card>
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-green-500" /> Active Policies</CardTitle><p className="text-sm text-muted-foreground">Currently enforced DLP policies across your organization.</p></CardHeader>
                <CardContent className="space-y-4">
                  {dlpPolicies.map(p => (
                    <div key={p.id} className="border rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <ShieldCheck className="h-5 w-5 text-green-500" />
                          <div>
                            <div className="text-sm font-semibold">{p.name}</div>
                            <p className="text-xs text-muted-foreground">{p.desc}</p>
                          </div>
                        </div>
                        <Badge className="bg-green-100 text-green-700">{p.status}</Badge>
                      </div>
                      <div className="text-[10px] text-muted-foreground">Created: {p.created}</div>
                      <button onClick={() => setExpandedPolicy(expandedPolicy === p.id ? null : p.id)} className="text-[11px] text-blue-600 hover:underline flex items-center gap-1">
                        {expandedPolicy === p.id ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />} View rules
                      </button>
                      {expandedPolicy === p.id && (
                        <pre className="text-[10px] bg-muted/50 p-2 rounded-md whitespace-pre-wrap font-mono">{p.rules}</pre>
                      )}
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="text-xs gap-1"><Pause className="h-3 w-3" /> Disable</Button>
                        <Button size="sm" variant="outline" className="text-xs gap-1"><Settings className="h-3 w-3" /> Edit</Button>
                        <Button size="sm" variant="outline" className="text-xs gap-1 text-red-600 hover:text-red-700"><Trash2 className="h-3 w-3" /> Delete</Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          ); })()}

          {/* ═══ SOFTWARE INVENTORY ═══ */}
          {activeSection === "software-inventory" && (
            <div className="space-y-6">
              <div><h1 className="text-2xl font-bold flex items-center gap-2"><Package className="h-6 w-6" /> Software Inventory</h1>
              <p className="text-muted-foreground text-sm">Software detected across all enrolled devices</p></div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card><CardContent className="pt-4 pb-3"><div className="text-sm text-muted-foreground">Total Software</div><div className="text-2xl font-bold">{mockSoftwareInventory.reduce((s, c) => s + c.items.length, 0)}</div></CardContent></Card>
                <Card><CardContent className="pt-4 pb-3"><div className="text-sm text-muted-foreground">Categories</div><div className="text-2xl font-bold">{mockSoftwareInventory.length}</div></CardContent></Card>
                <Card><CardContent className="pt-4 pb-3"><div className="text-sm text-muted-foreground">Most Installed</div><div className="text-2xl font-bold text-blue-600">Chrome</div><div className="text-xs text-muted-foreground">4 devices</div></CardContent></Card>
                <Card><CardContent className="pt-4 pb-3"><div className="text-sm text-muted-foreground">Devices Scanned</div><div className="text-2xl font-bold">{mockDevices.length}</div></CardContent></Card>
              </div>

              {mockSoftwareInventory.map((category) => (
                <Card key={category.category}>
                  <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Package className="h-5 w-5" /> {category.category} <Badge variant="outline" className="ml-2 text-xs">{category.items.length}</Badge></CardTitle></CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead><tr className="border-b bg-muted/30"><th className="text-left p-3">Software</th><th className="text-left p-3">Version</th><th className="text-center p-3">Installs</th><th className="text-left p-3">Devices</th></tr></thead>
                        <tbody>
                          {category.items.map((sw) => (
                            <tr key={sw.name} className="border-b last:border-0 hover:bg-muted/30">
                              <td className="p-3 font-medium">{sw.name}</td>
                              <td className="p-3 font-mono text-xs text-muted-foreground">{sw.version}</td>
                              <td className="p-3 text-center"><Badge variant="outline">{sw.installs}</Badge></td>
                              <td className="p-3">
                                <div className="flex flex-wrap gap-1">
                                  {sw.devices.map((d) => <Badge key={d} variant="outline" className="text-[10px] font-mono">{d}</Badge>)}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* ═══ EMPLOYEE VIEW ═══ */}
          {activeSection === "employee-view" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold flex items-center gap-2"><Eye className="h-6 w-6" /> Employee View</h1>
                  <p className="text-muted-foreground text-sm">Preview what employees see when they log in</p>
                </div>
                <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
                  <button
                    onClick={() => setEmployeeViewMode(false)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${!employeeViewMode ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    <Shield className="h-3.5 w-3.5 inline mr-1" /> Admin View
                  </button>
                  <button
                    onClick={() => setEmployeeViewMode(true)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${employeeViewMode ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    <Eye className="h-3.5 w-3.5 inline mr-1" /> Employee View
                  </button>
                </div>
              </div>

              {!employeeViewMode ? (
                <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
                  <CardContent className="py-6">
                    <div className="flex items-center gap-3">
                      <Shield className="h-8 w-8 text-blue-500" />
                      <div>
                        <h3 className="font-semibold text-lg">Admin View Active</h3>
                        <p className="text-sm text-muted-foreground">You are viewing the full admin dashboard. Toggle to &quot;Employee View&quot; to see the simplified employee experience.</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* MFA Setup Banner */}
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
                        <Fingerprint className="h-5 w-5 text-amber-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm">Secure Your Account</h3>
                        <p className="text-xs text-muted-foreground">Enable two-factor authentication for added security</p>
                      </div>
                    </div>
                    <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white">Enable 2FA</Button>
                  </div>

                  {/* Employee Stats */}
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card className="border-l-4 border-l-green-500">
                      <CardContent className="pt-4 pb-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm text-muted-foreground">Clock Status</div>
                            <div className="text-lg font-bold text-green-600">Clocked In</div>
                            <div className="text-xs text-muted-foreground">Since 9:02 AM</div>
                          </div>
                          <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                            <Timer className="h-5 w-5 text-green-600" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-blue-500">
                      <CardContent className="pt-4 pb-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm text-muted-foreground">Today&apos;s Attendance</div>
                            <div className="text-lg font-bold">Present</div>
                            <div className="text-xs text-muted-foreground">On time</div>
                          </div>
                          <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                            <CalendarCheck className="h-5 w-5 text-blue-600" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-purple-500">
                      <CardContent className="pt-4 pb-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm text-muted-foreground">Open Tasks</div>
                            <div className="text-lg font-bold">4</div>
                            <div className="text-xs text-muted-foreground">2 due today</div>
                          </div>
                          <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                            <ClipboardList className="h-5 w-5 text-purple-600" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-amber-500">
                      <CardContent className="pt-4 pb-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm text-muted-foreground">Pending Leave</div>
                            <div className="text-lg font-bold">1</div>
                            <div className="text-xs text-muted-foreground">Apr 14-18</div>
                          </div>
                          <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
                            <Calendar className="h-5 w-5 text-amber-600" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Quick Actions */}
                  <div className="grid gap-4 md:grid-cols-3">
                    <Card className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="pt-6 pb-4 flex flex-col items-center text-center gap-3">
                        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                          <Timer className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold">Time Tracking</h3>
                          <p className="text-xs text-muted-foreground mt-1">View timesheet, clock in/out, log hours</p>
                        </div>
                        <Badge variant="success">7h 23m today</Badge>
                      </CardContent>
                    </Card>
                    <Card className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="pt-6 pb-4 flex flex-col items-center text-center gap-3">
                        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                          <FolderKanban className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold">My Projects</h3>
                          <p className="text-xs text-muted-foreground mt-1">Active projects and task assignments</p>
                        </div>
                        <Badge variant="outline">3 active</Badge>
                      </CardContent>
                    </Card>
                    <Card className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="pt-6 pb-4 flex flex-col items-center text-center gap-3">
                        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-gray-500 to-gray-600 flex items-center justify-center">
                          <Settings className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold">My Account</h3>
                          <p className="text-xs text-muted-foreground mt-1">Profile, password, and preferences</p>
                        </div>
                        <Badge variant="warning">2FA off</Badge>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Employee Sidebar Preview */}
                  <Card>
                    <CardHeader><CardTitle className="text-lg flex items-center gap-2"><LayoutDashboard className="h-5 w-5" /> Employee Sidebar Preview</CardTitle></CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">Employees see a simplified navigation with only the modules visible to their role.</p>
                      <div className="bg-muted/50 rounded-lg p-4 max-w-xs">
                        {[
                          { icon: LayoutDashboard, label: "Dashboard", active: true },
                          { icon: Timer, label: "Time Tracking", active: false },
                          { icon: ClipboardList, label: "My Tasks", active: false },
                          { icon: Calendar, label: "Attendance", active: false },
                          { icon: Mail, label: "Announcements", active: false },
                          { icon: Settings, label: "My Account", active: false },
                        ].map((item, idx) => (
                          <div key={idx} className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${item.active ? "bg-background shadow-sm font-medium" : "text-muted-foreground"}`}>
                            <item.icon className="h-4 w-4" /> {item.label}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          )}

          {/* ═══ EMPLOYEES ═══ */}
          {activeSection === "employees" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div><h1 className="text-2xl font-bold flex items-center gap-2"><Users className="h-6 w-6" /> Employees</h1>
                <p className="text-muted-foreground text-sm">Employee directory and contact information</p></div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm"><Filter className="h-3.5 w-3.5 mr-1" /> Filter</Button>
                  <Button className="bg-blue-600 hover:bg-blue-700"><UserPlus className="h-4 w-4 mr-2" /> Add Employee</Button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card><CardContent className="pt-4 pb-3"><div className="text-sm text-muted-foreground">Total Employees</div><div className="text-2xl font-bold">{mockEmployees.length}</div></CardContent></Card>
                <Card><CardContent className="pt-4 pb-3"><div className="text-sm text-muted-foreground">Active</div><div className="text-2xl font-bold text-green-600">{mockEmployees.filter((e) => e.status === "Active").length}</div></CardContent></Card>
                <Card><CardContent className="pt-4 pb-3"><div className="text-sm text-muted-foreground">On Leave</div><div className="text-2xl font-bold text-yellow-600">{mockEmployees.filter((e) => e.status === "On Leave").length}</div></CardContent></Card>
                <Card><CardContent className="pt-4 pb-3"><div className="text-sm text-muted-foreground">Departments</div><div className="text-2xl font-bold">{mockDepartments.length}</div></CardContent></Card>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {mockEmployees.map((emp) => {
                  const statusColor = emp.status === "Active" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : emp.status === "On Leave" ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
                  const deptColors: Record<string, string> = { Engineering: "border-l-blue-500", Design: "border-l-purple-500", Finance: "border-l-yellow-500", Sales: "border-l-green-500", HR: "border-l-pink-500" };
                  return (
                    <Card key={emp.id} className={`border-l-4 ${deptColors[emp.dept] || "border-l-gray-500"} hover:shadow-md transition-shadow`}>
                      <CardContent className="pt-5 pb-4">
                        <div className="flex items-start gap-3">
                          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold flex-shrink-0">{emp.avatar}</div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <div className="font-semibold truncate">{emp.name}</div>
                              <Badge className={statusColor}>{emp.status}</Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">{emp.role}</div>
                            <div className="text-xs text-muted-foreground mt-1">{emp.dept}</div>
                            <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {emp.email}</span>
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {emp.phone}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* ═══ USER MANAGEMENT ═══ */}
          {activeSection === "user-management" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="h-6 w-6" /> User Management</h1>
                  <p className="text-muted-foreground text-sm">Manage team members, roles, and permissions</p>
                </div>
                <Button className="bg-blue-600 hover:bg-blue-700"><UserPlus className="h-4 w-4 mr-2" /> Add User</Button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card><CardContent className="pt-4 pb-3">
                  <div className="text-sm text-muted-foreground">Total Users</div>
                  <div className="text-2xl font-bold">32</div>
                  <div className="text-xs text-muted-foreground">Across all departments</div>
                </CardContent></Card>
                <Card><CardContent className="pt-4 pb-3">
                  <div className="text-sm text-muted-foreground">Active</div>
                  <div className="text-2xl font-bold text-green-600">28</div>
                  <div className="text-xs text-muted-foreground">Currently enabled</div>
                </CardContent></Card>
                <Card><CardContent className="pt-4 pb-3">
                  <div className="text-sm text-muted-foreground">Managers</div>
                  <div className="text-2xl font-bold text-purple-600">3</div>
                  <div className="text-xs text-muted-foreground">Team leads</div>
                </CardContent></Card>
                <Card><CardContent className="pt-4 pb-3">
                  <div className="text-sm text-muted-foreground">Admins</div>
                  <div className="text-2xl font-bold text-red-600">1</div>
                  <div className="text-xs text-muted-foreground">Full access</div>
                </CardContent></Card>
              </div>

              {/* Search & Filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-10" placeholder="Search users by name or email..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)} />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm"><Filter className="h-3.5 w-3.5 mr-1" /> Role</Button>
                  <Button variant="outline" size="sm"><Building2 className="h-3.5 w-3.5 mr-1" /> Department</Button>
                  <Button variant="outline" size="sm"><Activity className="h-3.5 w-3.5 mr-1" /> Status</Button>
                </div>
              </div>

              {/* Bulk Actions Toolbar */}
              {selectedUsers.length >= 2 && (
                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-800 dark:text-blue-200">{selectedUsers.length} users selected</span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-300"><UserCog className="h-3.5 w-3.5 mr-1" /> Assign Role</Button>
                    <Button size="sm" variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-300"><Building2 className="h-3.5 w-3.5 mr-1" /> Assign Department</Button>
                    <Button size="sm" variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-300"><Activity className="h-3.5 w-3.5 mr-1" /> Change Status</Button>
                  </div>
                </div>
              )}

              {/* Users Table */}
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/30">
                          <th className="text-left p-3 w-10">
                            <input
                              type="checkbox"
                              className="rounded border-gray-300"
                              checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                              onChange={toggleAllUsers}
                            />
                          </th>
                          <th className="text-left p-3">User</th>
                          <th className="text-left p-3">Role</th>
                          <th className="text-left p-3">Department</th>
                          <th className="text-left p-3">Status</th>
                          <th className="text-left p-3">Last Active</th>
                          <th className="text-right p-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map((user) => (
                          <tr key={user.id} className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${selectedUsers.includes(user.id) ? "bg-blue-50/50 dark:bg-blue-950/20" : ""}`}>
                            <td className="p-3">
                              <input
                                type="checkbox"
                                className="rounded border-gray-300"
                                checked={selectedUsers.includes(user.id)}
                                onChange={() => toggleUserSelection(user.id)}
                              />
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold">{user.avatar}</div>
                                <div>
                                  <div className="font-medium">{user.name}</div>
                                  <div className="text-xs text-muted-foreground">{user.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="p-3"><Badge className={getRoleBadgeColor(user.role)}>{user.role}</Badge></td>
                            <td className="p-3"><span className="text-muted-foreground">{user.department}</span></td>
                            <td className="p-3"><Badge className={getStatusBadgeColor(user.status)}>{user.status}</Badge></td>
                            <td className="p-3 text-muted-foreground text-xs">{formatTimeAgo(user.lastActive)}</td>
                            <td className="p-3 text-right">
                              <Button size="sm" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ═══ MFA & SECURITY ═══ */}
          {activeSection === "mfa-security" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2"><Fingerprint className="h-6 w-6" /> MFA & Security</h1>
                <p className="text-muted-foreground text-sm">Multi-factor authentication setup and login audit trail</p>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {/* MFA Status */}
                <Card>
                  <CardHeader><CardTitle className="text-lg flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-green-500" /> MFA Status</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Two-Factor Authentication</span>
                      <Badge variant="success">Enabled</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Authentication Method</span>
                      <span className="text-sm font-medium">TOTP (Authenticator App)</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Backup Codes Remaining</span>
                      <Badge variant="outline">8 of 10</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Last Verified</span>
                      <span className="text-sm text-muted-foreground">2 minutes ago</span>
                    </div>
                    <div className="pt-2 flex gap-2">
                      <Button size="sm" variant="outline">Regenerate Codes</Button>
                      <Button size="sm" variant="outline" className="text-red-600 border-red-300 hover:bg-red-50">Disable MFA</Button>
                    </div>
                  </CardContent>
                </Card>

                {/* QR Code Setup */}
                <Card>
                  <CardHeader><CardTitle className="text-lg flex items-center gap-2"><QrCode className="h-5 w-5" /> Setup Wizard</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">Scan this QR code with your authenticator app (Google Authenticator, Authy, or 1Password).</p>
                    {/* QR Code Placeholder */}
                    <div className="flex justify-center">
                      <div className="w-40 h-40 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl flex items-center justify-center bg-white dark:bg-gray-900">
                        <div className="grid grid-cols-8 grid-rows-8 gap-0.5 w-28 h-28">
                          {Array.from({ length: 64 }).map((_, i) => {
                            const isCorner = (i < 3 || (i >= 5 && i < 8)) && (Math.floor(i / 8) < 3 || Math.floor(i / 8) >= 5);
                            const isDark = (i + Math.floor(i / 8)) % 3 === 0 || isCorner;
                            return <div key={i} className={`rounded-sm ${isDark ? "bg-gray-900 dark:bg-white" : "bg-gray-100 dark:bg-gray-800"}`} />;
                          })}
                        </div>
                      </div>
                    </div>
                    {/* Verification Input */}
                    <div>
                      <label className="text-sm font-medium block mb-2">Enter 6-digit verification code</label>
                      <div className="flex gap-2 justify-center">
                        {[0,1,2,3,4,5].map((i) => (
                          <input
                            key={i}
                            type="text"
                            maxLength={1}
                            className="w-10 h-12 text-center text-lg font-bold border rounded-lg bg-background focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                            placeholder="-"
                            readOnly
                          />
                        ))}
                      </div>
                    </div>
                    <Button className="w-full bg-blue-600 hover:bg-blue-700">Verify & Activate</Button>
                  </CardContent>
                </Card>
              </div>

              {/* Backup Codes */}
              <Card>
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><KeyRound className="h-5 w-5" /> Backup Codes</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">Store these codes in a safe place. Each code can only be used once.</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {["A1B2-C3D4", "E5F6-G7H8", "J9K0-L1M2", "N3P4-Q5R6", "S7T8-U9V0", "W1X2-Y3Z4", "B5C6-D7E8", "F9G0-H1J2"].map((code, i) => (
                      <div key={i} className={`font-mono text-sm px-3 py-2 rounded-lg text-center border ${i < 8 ? "bg-muted/50" : "bg-red-50 dark:bg-red-950/20 line-through text-muted-foreground"}`}>
                        {code}
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" variant="outline"><Copy className="h-3.5 w-3.5 mr-1" /> Copy All</Button>
                    <Button size="sm" variant="outline"><FileText className="h-3.5 w-3.5 mr-1" /> Download</Button>
                  </div>
                </CardContent>
              </Card>

              {/* Security Checklist */}
              <Card>
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><ShieldCheck className="h-5 w-5" /> Security Checklist</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { label: "Two-Factor Authentication", done: true, desc: "TOTP authenticator configured" },
                      { label: "Strong Password", done: true, desc: "Last changed 14 days ago" },
                      { label: "SSO Connection", done: false, desc: "No SSO provider linked" },
                      { label: "IP Allowlist", done: false, desc: "Not configured" },
                      { label: "Audit Logging", done: true, desc: "All login events recorded" },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                        {item.done ? <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" /> : <XCircle className="h-5 w-5 text-red-400 flex-shrink-0" />}
                        <div className="flex-1">
                          <div className="text-sm font-medium">{item.label}</div>
                          <div className="text-xs text-muted-foreground">{item.desc}</div>
                        </div>
                        {item.done ? <Badge variant="success">Complete</Badge> : <Button size="sm" variant="outline">Configure</Button>}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Login Activity */}
              <Card>
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><LogIn className="h-5 w-5" /> Login Activity</CardTitle></CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/30">
                          <th className="text-left p-3">User</th>
                          <th className="text-left p-3">IP Address</th>
                          <th className="text-left p-3">Device</th>
                          <th className="text-left p-3">Time</th>
                          <th className="text-center p-3">Result</th>
                          <th className="text-center p-3">MFA</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mockLoginAudit.map((entry) => (
                          <tr key={entry.id} className="border-b last:border-0 hover:bg-muted/30">
                            <td className="p-3 font-medium text-xs">{entry.user}</td>
                            <td className="p-3 font-mono text-xs text-muted-foreground">{entry.ip}</td>
                            <td className="p-3 text-xs text-muted-foreground">{entry.device}</td>
                            <td className="p-3 text-xs text-muted-foreground">{formatTimeAgo(entry.time)}</td>
                            <td className="p-3 text-center">
                              {entry.success
                                ? <Badge variant="success">Success</Badge>
                                : <Badge variant="destructive">Failed</Badge>
                              }
                            </td>
                            <td className="p-3 text-center">
                              {entry.mfa
                                ? <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">MFA</Badge>
                                : <Badge variant="outline" className="text-muted-foreground">None</Badge>
                              }
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ═══ SSO PROVIDERS ═══ */}
          {activeSection === "sso-providers" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold flex items-center gap-2"><LinkIcon className="h-6 w-6" /> SSO Providers</h1>
                  <p className="text-muted-foreground text-sm">Configure single sign-on identity providers</p>
                </div>
                <Button className="bg-blue-600 hover:bg-blue-700"><UserPlus className="h-4 w-4 mr-2" /> Add Provider</Button>
              </div>

              {/* Callback URL */}
              <Card className="border-dashed">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium mb-1">Callback URL</div>
                      <code className="text-xs bg-muted px-2 py-1 rounded font-mono">https://app.mydex.io/api/auth/callback/sso</code>
                    </div>
                    <Button size="sm" variant="outline"><Copy className="h-3.5 w-3.5 mr-1" /> Copy</Button>
                  </div>
                </CardContent>
              </Card>

              {/* Provider Cards */}
              <div className="grid gap-4 md:grid-cols-3">
                {mockSSOProviders.map((provider) => (
                  <Card key={provider.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-6 pb-4">
                      <div className="flex items-start justify-between mb-4">
                        <div className={`h-12 w-12 rounded-xl ${provider.color} flex items-center justify-center text-white text-xl font-bold`}>
                          {provider.icon}
                        </div>
                        <Badge className={
                          provider.status === "Active"
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                        }>{provider.status}</Badge>
                      </div>
                      <h3 className="font-semibold text-lg mb-1">{provider.name}</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Client ID</span>
                          <span className="font-mono text-xs">{provider.clientIdPrefix}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">JIT Provisioning</span>
                          <Badge variant={provider.jit ? "success" : "outline"} className={!provider.jit ? "text-muted-foreground" : ""}>
                            {provider.jit ? "Enabled" : "Disabled"}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Last Used</span>
                          <span className="text-xs text-muted-foreground">{provider.lastUsed ? formatTimeAgo(provider.lastUsed) : "Never"}</span>
                        </div>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <Button size="sm" variant="outline" className="flex-1">Configure</Button>
                        <Button size="sm" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Setup Guide */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5" /> Setup Guide: Microsoft Entra ID
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { step: 1, title: "Register MyDex in Azure Portal", desc: "Navigate to Azure Active Directory > App Registrations > New Registration. Set the redirect URI to your callback URL." },
                      { step: 2, title: "Configure Client Credentials", desc: "Copy the Application (client) ID and create a new client secret. Enter both values in MyDex SSO settings." },
                      { step: 3, title: "Set API Permissions", desc: "Grant 'openid', 'profile', and 'email' delegated permissions under Microsoft Graph. Admin consent may be required." },
                      { step: 4, title: "Enable JIT Provisioning (Optional)", desc: "Toggle on Just-In-Time provisioning to auto-create user accounts on first SSO login." },
                      { step: 5, title: "Test & Activate", desc: "Use the 'Test Connection' button to verify the configuration, then activate the provider." },
                    ].map((s) => (
                      <div key={s.step} className="flex gap-4">
                        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 text-sm font-bold">{s.step}</div>
                        <div>
                          <h4 className="font-semibold text-sm">{s.title}</h4>
                          <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-xs text-blue-800 dark:text-blue-200">
                      <strong>Tip:</strong> For production environments, use certificate-based credentials instead of client secrets for enhanced security.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ═══ MODULE ACCESS ═══ */}
          {activeSection === "module-access" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2"><Layers className="h-6 w-6" /> Module Access</h1>
                <p className="text-muted-foreground text-sm">Configure which roles can see which platform modules</p>
              </div>

              {/* Role Visibility Cards */}
              <div className="grid gap-4 md:grid-cols-4">
                {[
                  { role: "Employee", count: getModulesForRole("Employee").length, color: "from-blue-500 to-blue-600", total: mockModules.length },
                  { role: "Manager", count: getModulesForRole("Manager").length, color: "from-purple-500 to-purple-600", total: mockModules.length },
                  { role: "Admin", count: getModulesForRole("Admin").length, color: "from-orange-500 to-orange-600", total: mockModules.length },
                  { role: "Super Admin", count: getModulesForRole("Super Admin").length, color: "from-red-500 to-red-600", total: mockModules.length },
                ].map((r) => (
                  <Card key={r.role} className="overflow-hidden">
                    <div className={`h-1.5 bg-gradient-to-r ${r.color}`} />
                    <CardContent className="pt-4 pb-3">
                      <div className="text-sm font-semibold">{r.role}</div>
                      <div className="text-2xl font-bold mt-1">{r.count} <span className="text-sm font-normal text-muted-foreground">/ {r.total} modules</span></div>
                      <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full rounded-full bg-gradient-to-r ${r.color}`} style={{ width: `${(r.count / r.total) * 100}%` }} />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Module List by Category */}
              {["Core", "Monitoring", "Management", "Security", "Admin"].map((category) => {
                const categoryModules = mockModules.filter((m) => m.category === category);
                const categoryColors: Record<string, string> = {
                  Core: "text-blue-600",
                  Monitoring: "text-green-600",
                  Management: "text-purple-600",
                  Security: "text-red-600",
                  Admin: "text-orange-600",
                };
                return (
                  <Card key={category}>
                    <CardHeader>
                      <CardTitle className={`text-lg flex items-center gap-2 ${categoryColors[category]}`}>
                        <Grid3X3 className="h-5 w-5" /> {category}
                        <Badge variant="outline" className="ml-2 text-xs">{categoryModules.length} modules</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {categoryModules.map((mod) => {
                          const ModIcon = mod.icon;
                          return (
                            <div key={mod.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-lg bg-background border flex items-center justify-center">
                                  <ModIcon className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <div>
                                  <div className="text-sm font-medium flex items-center gap-2">
                                    {mod.name}
                                    {mod.fixed && <Badge variant="outline" className="text-[10px] text-muted-foreground">Always Visible</Badge>}
                                  </div>
                                  <div className="text-xs text-muted-foreground">{mod.description}</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="text-xs text-muted-foreground hidden sm:block">Min Role:</div>
                                <Badge className={getRoleBadgeColor(mod.minRole)}>{mod.minRole}</Badge>
                                <div className="w-10 h-6 rounded-full bg-green-500 flex items-center justify-end px-0.5 cursor-pointer">
                                  <div className="h-5 w-5 rounded-full bg-white shadow-sm" />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* ═══ SETTINGS ═══ */}
          {activeSection === "settings" && (
            <div className="space-y-6">
              <div><h1 className="text-2xl font-bold flex items-center gap-2"><Settings className="h-6 w-6" /> Settings</h1>
              <p className="text-muted-foreground text-sm">Organization settings and configuration</p></div>

              {/* Org Info */}
              <Card>
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Building2 className="h-5 w-5" /> Organization</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium block mb-1.5">Company Name</label>
                      <Input defaultValue="Acme Corp" />
                    </div>
                    <div>
                      <label className="text-sm font-medium block mb-1.5">Timezone</label>
                      <Input defaultValue="America/Los_Angeles (PST)" />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1.5">Company Logo</label>
                    <div className="border-2 border-dashed rounded-lg p-8 text-center">
                      <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">Drag & drop or click to upload</p>
                      <p className="text-xs text-muted-foreground mt-1">PNG, SVG, or JPG (max 2MB)</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Agent Reporting Toggle - PROMINENT */}
              <Card className="border-2 border-blue-200 dark:border-blue-800">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Activity className="h-5 w-5 text-blue-500" /> Agent Reporting
                    <Badge className="bg-blue-100 text-blue-800 ml-2">Privacy Control</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                        <Activity className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-semibold">Agent Activity Reporting</div>
                        <p className="text-sm text-muted-foreground">When enabled, the desktop agent reports app usage, website visits, and activity data. When disabled, the agent only reports device health and security data.</p>
                      </div>
                    </div>
                    <div className="w-14 h-7 rounded-full bg-green-500 flex items-center justify-end px-0.5 cursor-pointer flex-shrink-0">
                      <div className="h-6 w-6 rounded-full bg-white shadow-sm" />
                    </div>
                  </div>
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                    <p className="text-xs text-amber-800 dark:text-amber-200">
                      <strong>Privacy Note:</strong> Disabling agent reporting stops all activity monitoring (screenshots, app tracking, website logging). Security features like CVE scanning, firewall status, and update checks remain active regardless of this setting.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Data Retention */}
              <Card>
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Clock className="h-5 w-5" /> Data Retention</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium">Activity Data Retention</label>
                      <span className="text-sm font-bold text-blue-600">90 days</span>
                    </div>
                    <div className="relative">
                      <div className="h-2 bg-muted rounded-full">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: "60%" }} />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>30 days</span>
                        <span>90 days</span>
                        <span>180 days</span>
                        <span>365 days</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium">Security Logs Retention</label>
                      <span className="text-sm font-bold text-blue-600">365 days</span>
                    </div>
                    <div className="relative">
                      <div className="h-2 bg-muted rounded-full">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: "100%" }} />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Notification Settings */}
              <Card>
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Bell className="h-5 w-5" /> Org Notification Preferences</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { label: "Security Alert Emails", desc: "Send email to admins on critical security events", enabled: true },
                      { label: "Weekly Digest", desc: "Automated weekly summary to all managers", enabled: true },
                      { label: "New Device Alerts", desc: "Notify when a new device enrolls", enabled: true },
                      { label: "CVE Notifications", desc: "Alert when new CVEs affect enrolled devices", enabled: false },
                    ].map((pref, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium">{pref.label}</div>
                          <div className="text-xs text-muted-foreground">{pref.desc}</div>
                        </div>
                        <div className={`w-11 h-6 rounded-full flex items-center px-0.5 cursor-pointer transition-colors ${pref.enabled ? "bg-green-500 justify-end" : "bg-gray-300 dark:bg-gray-600 justify-start"}`}>
                          <div className="h-5 w-5 rounded-full bg-white shadow-sm" />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button className="bg-blue-600 hover:bg-blue-700">Save Settings</Button>
              </div>
            </div>
          )}

          {/* ═══ AGENT SETUP ═══ */}
          {activeSection === "agent-setup" && (
            <div className="space-y-6">
              <div><h1 className="text-2xl font-bold flex items-center gap-2"><Download className="h-6 w-6" /> Agent Setup</h1>
              <p className="text-muted-foreground text-sm">Download and deploy the MyDex agent to your devices</p></div>

              {/* Platform Tabs */}
              <Card>
                <CardHeader><CardTitle className="text-lg">Download Agent</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    {/* Windows */}
                    <div className="border-2 border-blue-200 dark:border-blue-800 rounded-lg p-5 text-center bg-blue-50/50 dark:bg-blue-950/20">
                      <Laptop className="h-10 w-10 mx-auto text-blue-600 mb-3" />
                      <h3 className="font-semibold text-lg mb-1">Windows</h3>
                      <p className="text-xs text-muted-foreground mb-4">Windows 10/11, x64</p>
                      <div className="space-y-2">
                        <Button className="w-full bg-blue-600 hover:bg-blue-700"><Download className="h-4 w-4 mr-2" /> EXE Installer</Button>
                        <Button variant="outline" className="w-full"><Download className="h-4 w-4 mr-2" /> MSI Package</Button>
                      </div>
                    </div>
                    {/* macOS */}
                    <div className="border rounded-lg p-5 text-center">
                      <Laptop className="h-10 w-10 mx-auto text-gray-600 mb-3" />
                      <h3 className="font-semibold text-lg mb-1">macOS</h3>
                      <p className="text-xs text-muted-foreground mb-4">macOS 13+, Apple Silicon & Intel</p>
                      <div className="space-y-2">
                        <Button variant="outline" className="w-full"><Download className="h-4 w-4 mr-2" /> PKG Installer</Button>
                        <Button variant="outline" className="w-full"><Download className="h-4 w-4 mr-2" /> DMG Image</Button>
                      </div>
                    </div>
                    {/* Linux */}
                    <div className="border rounded-lg p-5 text-center">
                      <Monitor className="h-10 w-10 mx-auto text-gray-600 mb-3" />
                      <h3 className="font-semibold text-lg mb-1">Linux</h3>
                      <p className="text-xs text-muted-foreground mb-4">Ubuntu 20+, Debian, RHEL 8+</p>
                      <div className="space-y-2">
                        <Button variant="outline" className="w-full"><Download className="h-4 w-4 mr-2" /> DEB Package</Button>
                        <Button variant="outline" className="w-full"><Download className="h-4 w-4 mr-2" /> RPM Package</Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Install Command */}
              <Card>
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><FileText className="h-5 w-5" /> Quick Install Command</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">Run this command on target machines to install and register the agent automatically:</p>
                  <div className="bg-gray-900 text-green-400 rounded-lg p-4 font-mono text-sm overflow-x-auto">
                    <div className="flex items-center justify-between">
                      <code>curl -sSL https://agent.mydex.io/install.sh | sudo bash -s -- --token=eyJhb...demo_token</code>
                      <Button size="sm" variant="ghost" className="text-green-400 hover:text-green-300 ml-4 flex-shrink-0"><Copy className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">The install script detects your OS and architecture automatically. The token links the agent to your organization.</p>
                </CardContent>
              </Card>

              {/* MDM Deployment */}
              <Card>
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Server className="h-5 w-5" /> MDM / Mass Deployment</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">Deploy the agent through your MDM or systems management platform:</p>
                  <div className="grid gap-3 md:grid-cols-2">
                    {[
                      { name: "Microsoft Intune", desc: "Deploy via Win32 app or LOB app" },
                      { name: "Jamf Pro", desc: "Deploy PKG via policy or Smart Group" },
                      { name: "SCCM / MECM", desc: "Distribute MSI via application catalog" },
                      { name: "Ansible / Puppet", desc: "Use our official playbook/module" },
                    ].map((mdm) => (
                      <div key={mdm.name} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors cursor-pointer">
                        <div>
                          <div className="text-sm font-medium">{mdm.name}</div>
                          <div className="text-xs text-muted-foreground">{mdm.desc}</div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Enrollment Status */}
              <Card>
                <CardHeader><CardTitle className="text-lg">Enrollment Status</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg"><div className="text-2xl font-bold text-green-600">{mockDevices.filter((d) => d.status === "ONLINE").length}</div><div className="text-xs text-muted-foreground">Online</div></div>
                    <div className="text-center p-4 bg-gray-50 dark:bg-gray-900/20 rounded-lg"><div className="text-2xl font-bold">{mockDevices.filter((d) => d.status === "OFFLINE").length}</div><div className="text-xs text-muted-foreground">Offline</div></div>
                    <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg"><div className="text-2xl font-bold text-blue-600">{mockDevices.length}</div><div className="text-xs text-muted-foreground">Total Enrolled</div></div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── MDM INTEGRATION ──────────────────────────────────────────── */}
          {activeSection === "mdm-integration" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2"><Smartphone className="h-6 w-6" /> MDM Integration</h1>
                <p className="text-muted-foreground text-sm">Connect your MDM provider to auto-assign devices and manage your fleet</p>
              </div>

              {/* Provider Cards */}
              <div className="grid gap-4 md:grid-cols-3">
                {[
                  { name: "Microsoft Intune", type: "MICROSOFT_INTUNE", color: "blue", icon: "🔷", status: "connected", devices: 28, lastSync: "2 min ago" },
                  { name: "Jamf Pro", type: "JAMF_PRO", color: "purple", icon: "🟣", status: "not_configured", devices: 0, lastSync: null },
                  { name: "Kandji", type: "KANDJI", color: "green", icon: "🟢", status: "not_configured", devices: 0, lastSync: null },
                ].map((provider) => (
                  <Card key={provider.type} className={provider.status === "connected" ? "border-2 border-blue-300 dark:border-blue-700" : ""}>
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{provider.icon}</span>
                          <h3 className="font-semibold">{provider.name}</h3>
                        </div>
                        <Badge className={provider.status === "connected" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}>
                          {provider.status === "connected" ? "Connected" : "Not Configured"}
                        </Badge>
                      </div>
                      {provider.status === "connected" ? (
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between"><span className="text-muted-foreground">Devices synced</span><span className="font-medium">{provider.devices}</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">Last sync</span><span className="font-medium">{provider.lastSync}</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">Auto-assign</span><Badge className="bg-green-100 text-green-700 text-[10px]">Enabled</Badge></div>
                          <div className="flex gap-2 mt-3">
                            <Button size="sm" variant="outline" className="flex-1"><RefreshCw className="h-3.5 w-3.5 mr-1" /> Sync Now</Button>
                            <Button size="sm" variant="outline"><Settings className="h-3.5 w-3.5" /></Button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2">
                          <p className="text-xs text-muted-foreground mb-3">Connect your {provider.name} instance to start syncing devices.</p>
                          <Button size="sm" className="w-full"><Plus className="h-3.5 w-3.5 mr-1" /> Configure</Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Intune Configuration */}
              <Card>
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Settings className="h-5 w-5" /> Microsoft Intune — Configuration</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground">Tenant ID</Label>
                      <Input value="a1b2c3d4-e5f6-7890-abcd-ef1234567890" readOnly className="mt-1 bg-muted/50 font-mono text-xs" />
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground">Client ID</Label>
                      <Input value="12345678-abcd-ef01-2345-678901234567" readOnly className="mt-1 bg-muted/50 font-mono text-xs" />
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground">Client Secret</Label>
                      <Input value="••••••••••••••••••••••••••••••••••" readOnly className="mt-1 bg-muted/50" type="password" />
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground">Sync Interval</Label>
                      <div className="mt-1 flex h-10 items-center rounded-md border bg-muted/50 px-3 text-sm">Every 15 minutes</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm"><CheckCircle className="h-4 w-4 mr-1 text-green-500" /> Test Connection</Button>
                    <Button size="sm">Save Changes</Button>
                  </div>
                </CardContent>
              </Card>

              {/* Synced Devices */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Synced MDM Devices</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">28 devices</Badge>
                      <Badge className="bg-green-100 text-green-700 text-xs">24 compliant</Badge>
                      <Badge className="bg-red-100 text-red-700 text-xs">4 non-compliant</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {[
                      { name: "DESKTOP-JMILLER", user: "Jordan Miller", platform: "Windows 11", enrollment: "Enrolled", compliance: "Compliant", lastCheckin: "2 min ago", matched: true },
                      { name: "LAPTOP-SCHEN", user: "Sarah Chen", platform: "Windows 11", enrollment: "Enrolled", compliance: "Non-Compliant", lastCheckin: "5 min ago", matched: true },
                      { name: "MACBOOK-APATEL", user: "Anita Patel", platform: "macOS 15.3", enrollment: "Enrolled", compliance: "Compliant", lastCheckin: "1 min ago", matched: true },
                      { name: "WS-TGARCIA", user: "Tom Garcia", platform: "Windows 10", enrollment: "Enrolled", compliance: "Non-Compliant", lastCheckin: "3 hrs ago", matched: false },
                      { name: "IPHONE-JMILLER", user: "Jordan Miller", platform: "iOS 18.3", enrollment: "Enrolled", compliance: "Compliant", lastCheckin: "10 min ago", matched: false },
                      { name: "PIXEL-SCHEN", user: "Sarah Chen", platform: "Android 15", enrollment: "Enrolled", compliance: "Compliant", lastCheckin: "25 min ago", matched: false },
                    ].map((device) => (
                      <div key={device.name} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-3">
                          {device.platform.includes("iOS") || device.platform.includes("Android") ? <Phone className="h-5 w-5 text-muted-foreground" /> : <Monitor className="h-5 w-5 text-muted-foreground" />}
                          <div>
                            <div className="text-sm font-medium">{device.name}</div>
                            <div className="text-xs text-muted-foreground">{device.user} &middot; {device.platform}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {device.matched ? (
                            <Badge className="bg-blue-100 text-blue-700 text-[10px]">MyDex Matched</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px]">MDM Only</Badge>
                          )}
                          <Badge className={device.compliance === "Compliant" ? "bg-green-100 text-green-700 text-[10px]" : "bg-red-100 text-red-700 text-[10px]"}>{device.compliance}</Badge>
                          <span className="text-xs text-muted-foreground">{device.lastCheckin}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* MDM Actions */}
              <Card>
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Zap className="h-5 w-5" /> Quick Actions</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {[
                      { icon: Lock, label: "Lock Device", desc: "Remotely lock a managed device", color: "text-amber-600" },
                      { icon: RefreshCw, label: "Restart Device", desc: "Send restart command via MDM", color: "text-blue-600" },
                      { icon: RotateCcw, label: "Sync Device", desc: "Force MDM policy check-in", color: "text-green-600" },
                      { icon: Download, label: "Deploy App", desc: "Push an application to devices", color: "text-purple-600" },
                      { icon: ShieldOff, label: "Retire Device", desc: "Remove corporate data only", color: "text-orange-600" },
                      { icon: Trash2, label: "Wipe Device", desc: "Factory reset — all data erased", color: "text-red-600" },
                    ].map((action) => (
                      <div key={action.label} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors cursor-pointer">
                        <action.icon className={`h-5 w-5 ${action.color}`} />
                        <div>
                          <div className="text-sm font-medium">{action.label}</div>
                          <div className="text-xs text-muted-foreground">{action.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Recent MDM Actions Log */}
              <Card>
                <CardHeader><CardTitle className="text-lg">Recent Actions</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {[
                      { action: "Sync Device", device: "DESKTOP-JMILLER", user: "Admin", status: "Completed", time: "2 min ago" },
                      { action: "Lock Device", device: "LAPTOP-SCHEN", user: "Admin", status: "Completed", time: "1 hr ago" },
                      { action: "Deploy App", device: "MACBOOK-APATEL", user: "Admin", status: "Completed", time: "3 hrs ago" },
                      { action: "Restart Device", device: "WS-TGARCIA", user: "Admin", status: "Failed", time: "5 hrs ago" },
                    ].map((log, i) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded border text-sm">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">{log.action}</Badge>
                          <span className="font-medium">{log.device}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={log.status === "Completed" ? "bg-green-100 text-green-700 text-[10px]" : "bg-red-100 text-red-700 text-[10px]"}>{log.status}</Badge>
                          <span className="text-xs text-muted-foreground">{log.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── BRANDING ──────────────────────────────────────────────────── */}
          {activeSection === "branding" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2"><Palette className="h-6 w-6" /> Branding</h1>
                <p className="text-muted-foreground text-sm">Customize the look and feel of your MyDex instance</p>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                {/* Branding Settings */}
                <div className="space-y-6">
                  {/* Company Info */}
                  <Card>
                    <CardHeader><CardTitle className="text-lg">Company Branding</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">Company Name</Label>
                        <Input value="Acme Corp" readOnly className="mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">Logo URL</Label>
                        <Input value="https://acme.com/logo.png" readOnly className="mt-1 font-mono text-xs" />
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">Primary Color</Label>
                        <div className="mt-1 flex items-center gap-3">
                          <div className="h-10 w-10 rounded-md border" style={{ backgroundColor: "#3B82F6" }} />
                          <Input value="#3B82F6" readOnly className="font-mono" />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">Accent Color</Label>
                        <div className="mt-1 flex items-center gap-3">
                          <div className="h-10 w-10 rounded-md border" style={{ backgroundColor: "#10B981" }} />
                          <Input value="#10B981" readOnly className="font-mono" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Display Mode */}
                  <Card>
                    <CardHeader><CardTitle className="text-lg">Display Mode</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground">Choose how your branding appears in the sidebar and navigation.</p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-lg border-2 border-primary p-4 cursor-pointer bg-primary/5">
                          <div className="text-sm font-semibold mb-2">Replace MyDex</div>
                          <div className="rounded-md bg-background border p-3">
                            <span className="text-lg font-bold" style={{ color: "#3B82F6" }}>Acme Corp</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">Show only your company name</p>
                        </div>
                        <div className="rounded-lg border p-4 cursor-pointer hover:bg-muted/30">
                          <div className="text-sm font-semibold mb-2">Alongside MyDex</div>
                          <div className="rounded-md bg-background border p-3">
                            <span className="text-lg font-bold text-primary">MyDex</span>
                            <span className="text-sm text-muted-foreground ml-1">| Acme Corp</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">Show both MyDex and your company</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Live Preview */}
                <Card className="h-fit">
                  <CardHeader><CardTitle className="text-lg">Live Preview</CardTitle></CardHeader>
                  <CardContent>
                    <div className="rounded-lg border bg-background overflow-hidden">
                      {/* Fake sidebar preview */}
                      <div className="flex">
                        <div className="w-56 border-r bg-card p-4 space-y-4">
                          <div className="flex items-center gap-2 pb-3 border-b">
                            <div className="h-8 w-8 rounded bg-blue-500 flex items-center justify-center text-white text-xs font-bold">A</div>
                            <span className="text-lg font-bold" style={{ color: "#3B82F6" }}>Acme Corp</span>
                          </div>
                          <div className="space-y-1">
                            {["Dashboard", "Employees", "Devices", "IT Support", "Settings"].map((item, i) => (
                              <div key={item} className={`text-sm px-3 py-2 rounded-md ${i === 0 ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground"}`}>{item}</div>
                            ))}
                          </div>
                        </div>
                        <div className="flex-1 p-4">
                          <div className="h-4 bg-muted rounded w-48 mb-3" />
                          <div className="h-3 bg-muted rounded w-64 mb-6" />
                          <div className="grid grid-cols-3 gap-3">
                            <div className="h-20 bg-muted/50 rounded-lg border" />
                            <div className="h-20 bg-muted/50 rounded-lg border" />
                            <div className="h-20 bg-muted/50 rounded-lg border" />
                          </div>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-3 text-center">Preview updates as you change settings</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* ── USER IT SUPPORT ──────────────────────────────────────────── */}
          {activeSection === "support" && (() => {
            const myDevice = mockDevices[0];
            const enabledReasons = stockReasons.filter(r => r.enabled);

            type SelfRemedy = { id: string; title: string; desc: string; icon: React.ElementType; category: string; risk: "safe" | "low" | "medium"; os: "all" | "windows" | "macos"; steps: string[]; time: string };
            const quickRemediations: SelfRemedy[] = [
              { id: "sf1", title: "Clear Temporary Files", desc: "Free up disk space by removing cached and temp files", icon: Trash2, category: "performance", risk: "safe", os: "all", steps: ["Closes running temp file handles", "Deletes user-level temp files", "Reports space recovered"], time: "~30s" },
              { id: "sf2", title: "Close Background Apps", desc: "Shut down heavy background processes eating memory", icon: CircleStop, category: "performance", risk: "safe", os: "all", steps: ["Scans for high-memory background processes", "Shows list before terminating", "Keeps essential services running"], time: "~10s" },
              { id: "sf3", title: "Restart Explorer / Finder", desc: "Fix frozen desktop, taskbar, or file browser", icon: RefreshCw, category: "performance", risk: "safe", os: "all", steps: ["Gracefully restarts the shell", "Taskbar/Dock refreshes automatically"], time: "~5s" },
              { id: "sf4", title: "Free Up RAM", desc: "Purge inactive memory and clear system caches", icon: BatteryCharging, category: "performance", risk: "safe", os: "all", steps: ["Flushes standby memory pages", "Clears file system cache"], time: "~15s" },
              { id: "sf5", title: "Fix Internet Connection", desc: "Reset DNS cache and renew IP address", icon: Wifi, category: "network", risk: "safe", os: "all", steps: ["Flushes DNS resolver cache", "Releases and renews DHCP lease", "Tests connectivity"], time: "~20s" },
              { id: "sf6", title: "Reset Wi-Fi Adapter", desc: "Turn Wi-Fi off and back on to fix connectivity issues", icon: WifiOff, category: "network", risk: "safe", os: "all", steps: ["Disables the Wi-Fi adapter", "Waits 5 seconds", "Re-enables and reconnects"], time: "~15s" },
            ];

            return (
            <div className="space-y-6">
              {/* Breadcrumbs */}
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <span className="cursor-pointer hover:text-foreground" onClick={() => setActiveSection("dashboard")}>Dashboard</span>
                <ChevronRight className="h-3 w-3" />
                <span className="text-foreground font-medium">IT Support</span>
              </div>

              {/* Header */}
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <LifeBuoy className="h-6 w-6 text-emerald-500" /> IT Support
                </h1>
                <p className="text-muted-foreground text-sm">View your device, fix common issues, and submit support tickets.</p>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 bg-muted/50 p-1 rounded-lg w-fit">
                {([
                  { id: "mydevice" as const, label: "My Device", icon: Monitor },
                  { id: "selfservice" as const, label: "Self-Service Fix", icon: Zap },
                  { id: "submit" as const, label: "Submit Ticket", icon: ClipboardList },
                  { id: "tickets" as const, label: "My Tickets", icon: FileText },
                ] as const).map(tab => (
                  <button key={tab.id} onClick={() => setSupportTab(tab.id)} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors", supportTab === tab.id ? "bg-white shadow text-foreground" : "text-muted-foreground hover:text-foreground")}>
                    <tab.icon className="h-4 w-4" />{tab.label}
                  </button>
                ))}
              </div>

              {/* ── My Device Tab ─────────────────────────── */}
              {supportTab === "mydevice" && (
                <div className="space-y-6">
                  {/* Device Overview */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2"><Monitor className="h-5 w-5 text-blue-500" /> Your Device</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <div className="space-y-1">
                          <div className="text-xs text-muted-foreground">Hostname</div>
                          <div className="text-sm font-semibold">{myDevice.hostname}</div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs text-muted-foreground">Platform</div>
                          <div className="text-sm font-semibold">{myDevice.platform === "win32" ? "Windows" : "macOS"}</div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs text-muted-foreground">IP Address</div>
                          <div className="text-sm font-semibold">{myDevice.ipAddress}</div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs text-muted-foreground">Status</div>
                          <Badge className={myDevice.status === "ONLINE" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>{myDevice.status}</Badge>
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs text-muted-foreground">CPU</div>
                          <div className="text-sm">{myDevice.cpuName}</div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs text-muted-foreground">RAM</div>
                          <div className="text-sm">{myDevice.ramAvailGb.toFixed(1)} / {myDevice.ramTotalGb.toFixed(1)} GB available</div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs text-muted-foreground">Uptime</div>
                          <div className="text-sm">{Math.floor(myDevice.uptimeSeconds / 86400)}d {Math.floor((myDevice.uptimeSeconds % 86400) / 3600)}h</div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs text-muted-foreground">Installed Software</div>
                          <div className="text-sm">{myDevice.installedSoftware?.length ?? 0} apps</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Health Status */}
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card className="border-l-4 border-l-green-500">
                      <CardContent className="pt-4 pb-3">
                        <div className="flex items-center gap-2 mb-1"><Shield className="h-4 w-4 text-green-500" /><span className="text-sm font-semibold">Antivirus</span></div>
                        <Badge className="bg-green-100 text-green-700 text-xs">{myDevice.antivirusName || "Active"}</Badge>
                        <p className="text-[10px] text-muted-foreground mt-1">{myDevice.defenderStatus === "enabled" ? "Real-time protection enabled" : "Check status"}</p>
                      </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-green-500">
                      <CardContent className="pt-4 pb-3">
                        <div className="flex items-center gap-2 mb-1"><Flame className="h-4 w-4 text-green-500" /><span className="text-sm font-semibold">Firewall</span></div>
                        <Badge className="bg-green-100 text-green-700 text-xs">Active</Badge>
                        <p className="text-[10px] text-muted-foreground mt-1">Domain, Private & Public profiles enabled</p>
                      </CardContent>
                    </Card>
                    <Card className={`border-l-4 ${(myDevice.pendingUpdates?.length ?? 0) > 0 ? "border-l-amber-500" : "border-l-green-500"}`}>
                      <CardContent className="pt-4 pb-3">
                        <div className="flex items-center gap-2 mb-1"><RefreshCw className="h-4 w-4 text-amber-500" /><span className="text-sm font-semibold">Updates</span></div>
                        <Badge className={(myDevice.pendingUpdates?.length ?? 0) > 0 ? "bg-amber-100 text-amber-700 text-xs" : "bg-green-100 text-green-700 text-xs"}>{(myDevice.pendingUpdates?.length ?? 0) > 0 ? `${myDevice.pendingUpdates?.length} pending` : "Up to date"}</Badge>
                        <p className="text-[10px] text-muted-foreground mt-1">Last checked: {myDevice.lastUpdateDate}</p>
                      </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-green-500">
                      <CardContent className="pt-4 pb-3">
                        <div className="flex items-center gap-2 mb-1"><Activity className="h-4 w-4 text-green-500" /><span className="text-sm font-semibold">Stability</span></div>
                        <Badge className="bg-green-100 text-green-700 text-xs">Stable</Badge>
                        <p className="text-[10px] text-muted-foreground mt-1">No crashes in the last 7 days</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Quick Actions */}
                  <Card>
                    <CardHeader><CardTitle className="text-lg">Quick Actions</CardTitle></CardHeader>
                    <CardContent className="flex gap-3">
                      <Button variant="outline" onClick={() => setSupportTab("selfservice")} className="gap-2"><Zap className="h-4 w-4" /> Fix an Issue</Button>
                      <Button variant="outline" onClick={() => setSupportTab("submit")} className="gap-2"><ClipboardList className="h-4 w-4" /> Submit a Ticket</Button>
                    </CardContent>
                  </Card>

                  {/* Remediation History */}
                  <Card>
                    <CardHeader><CardTitle className="text-lg flex items-center gap-2"><RotateCcw className="h-5 w-5 text-muted-foreground" /> Remediation History</CardTitle></CardHeader>
                    <CardContent>
                      <div className="text-center py-8 text-muted-foreground">
                        <RotateCcw className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">No remediations yet</p>
                        <p className="text-xs">Self-service fixes you run will appear here.</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* ── Self-Service Fix Tab ──────────────────── */}
              {supportTab === "selfservice" && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {quickRemediations.map(r => (
                    <Card key={r.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="pt-5 pb-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-lg bg-emerald-50"><r.icon className="h-5 w-5 text-emerald-600" /></div>
                          <div>
                            <div className="text-sm font-semibold">{r.title}</div>
                            <div className="text-[10px] text-muted-foreground">{r.time} &middot; {r.risk === "safe" ? "Safe" : r.risk === "low" ? "Low risk" : "Medium risk"}</div>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">{r.desc}</p>
                        <div className="space-y-1">
                          {r.steps.map((s, i) => (
                            <div key={i} className="text-[10px] flex items-start gap-1.5"><CheckCircle className="h-3 w-3 text-green-400 mt-0.5 shrink-0" /><span>{s}</span></div>
                          ))}
                        </div>
                        <Button size="sm" className="w-full gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"><Play className="h-3.5 w-3.5" /> Run Fix</Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* ── Submit Ticket Tab ─────────────────────── */}
              {supportTab === "submit" && (
                <Card>
                  <CardHeader><CardTitle className="text-lg flex items-center gap-2"><ClipboardList className="h-5 w-5 text-blue-500" /> Submit a Support Ticket</CardTitle></CardHeader>
                  <CardContent className="space-y-6">
                    {/* Auto-detected device */}
                    <div>
                      <div className="text-sm font-medium mb-2">Your Device</div>
                      <Badge variant="outline" className="gap-1.5 py-1.5 px-3"><Monitor className="h-3.5 w-3.5" /> {myDevice.hostname} &mdash; {myDevice.platform === "win32" ? "Windows" : "macOS"}</Badge>
                    </div>

                    {/* Reason grid */}
                    <div>
                      <div className="text-sm font-medium mb-2">What&apos;s the issue?</div>
                      <div className="grid gap-2 grid-cols-2 md:grid-cols-3">
                        {enabledReasons.map(r => (
                          <button key={r.id} onClick={() => setSelectedStockReason(selectedStockReason === r.id ? null : r.id)}
                            className={cn("text-left p-3 rounded-lg border text-sm transition-colors", selectedStockReason === r.id ? "border-blue-500 bg-blue-50 text-blue-700" : "hover:border-foreground/20")}>
                            <span className="mr-1.5">{r.icon}</span>{r.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <div className="text-sm font-medium mb-2">Description <span className="text-muted-foreground font-normal">(optional)</span></div>
                      <textarea className="w-full min-h-[100px] rounded-lg border p-3 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Describe the issue in more detail..." value={ticketDescription} onChange={e => setTicketDescription(e.target.value)} />
                    </div>

                    <Button className="gap-2" disabled={!selectedStockReason}><Upload className="h-4 w-4" /> Submit Ticket</Button>
                  </CardContent>
                </Card>
              )}

              {/* ── My Tickets Tab ────────────────────────── */}
              {supportTab === "tickets" && (
                <Card>
                  <CardHeader><CardTitle className="text-lg flex items-center gap-2"><FileText className="h-5 w-5 text-muted-foreground" /> My Tickets</CardTitle></CardHeader>
                  <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No tickets yet</p>
                      <p className="text-xs mb-3">Tickets you submit will appear here.</p>
                      <Button variant="outline" size="sm" onClick={() => setSupportTab("submit")} className="gap-1.5"><ClipboardList className="h-3.5 w-3.5" /> Submit a Ticket</Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ); })()}

          {/* ── IT ADMIN PORTAL ─────────────────────────────────────────────── */}
          {activeSection === "it-support" && (() => {
            const selectedDevice = selectedTicketDevice ? mockDevices.find(d => d.hostname === selectedTicketDevice) : null;
            const deviceApps = selectedDevice?.installedSoftware || [];
            const isWindows = selectedDevice?.platform === "win32";
            const isMac = selectedDevice?.platform === "darwin";
            const osLabel = isWindows ? "Windows" : isMac ? "macOS" : "Unknown";
            const osFilteredRemediations = (os: string) => os === "all" || (os === "windows" && isWindows) || (os === "macos" && isMac);

            return (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Wrench className="h-6 w-6" /> IT Support &amp; Remediation
                  </h1>
                  <p className="text-muted-foreground text-sm">
                    Resolve digital friction, enforce compliance, and maintain fleet health — remotely and at scale.
                  </p>
                </div>
              </div>

              {/* ── KPI Stats ────────────────────────────────────────────── */}
              <div className="grid gap-4 md:grid-cols-5">
                {[
                  { label: "Remediations Today", value: "47", icon: Wrench, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-900/20" },
                  { label: "Auto-Resolved", value: "34", icon: Zap, color: "text-green-600", bg: "bg-green-50 dark:bg-green-900/20" },
                  { label: "Open Tickets", value: String(mockTickets.filter(t => t.status !== "resolved").length), icon: ClipboardList, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-900/20" },
                  { label: "Compliance Score", value: "96%", icon: ShieldCheck, color: "text-indigo-600", bg: "bg-indigo-50 dark:bg-indigo-900/20" },
                  { label: "Avg Resolution", value: "< 2m", icon: Timer, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-900/20" },
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

              {/* ── Sub-Tab Navigation ──────────────────────────────────── */}
              <div className="flex gap-1 bg-muted/50 p-1 rounded-lg w-fit">
                {([
                  { id: "queue" as const, label: "Remediation Queue", icon: Activity },
                  { id: "tickets" as const, label: "Support Tickets", icon: ClipboardList },
                  { id: "submit" as const, label: "Submit Ticket", icon: UserPlus },
                  { id: "selfservice" as const, label: "Self-Service Fix", icon: LifeBuoy },
                  { id: "config" as const, label: "Configuration", icon: Settings },
                ] as const).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setItSubTab(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${itSubTab === tab.id ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    <tab.icon className="h-3.5 w-3.5" />{tab.label}
                  </button>
                ))}
              </div>

              {/* ══════════════════════════════════════════════════════════ */}
              {/* ── TAB: REMEDIATION QUEUE ──────────────────────────────── */}
              {/* ══════════════════════════════════════════════════════════ */}
              {itSubTab === "queue" && (<>

              {/* Advanced Capabilities */}
              <Card>
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Zap className="h-5 w-5 text-amber-500" /> Advanced Capabilities</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {[
                      { title: "Offline Remediation", icon: WifiOff, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30", desc: "Execute scripts even when disconnected. Commands queue and execute on reconnect.", status: "Active", sc: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
                      { title: "Compliance Drift Monitoring", icon: ShieldAlert, color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/30", desc: "Detect and auto-correct unauthorized registry changes, file modifications, or disabled security tools.", status: "3 Drifts Detected", sc: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
                      { title: "Zero-Day Patching", icon: Bug, color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-950/30", desc: "Rapid patch deployment across the entire fleet within minutes of a threat announcement.", status: "Ready", sc: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
                      { title: "Resource Reclamation", icon: Recycle, color: "text-teal-600", bg: "bg-teal-50 dark:bg-teal-950/30", desc: "Auto-uninstall unused licenses and kill zombie processes to reclaim resources.", status: "12 Freed", sc: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200" },
                      { title: "Ransomware Rollback", icon: RotateCcw, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950/30", desc: "Detect anomalous encryption and auto-revert via VSS / Time Machine.", status: "Monitoring", sc: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
                      { title: "Carbon Reporting", icon: Leaf, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/30", desc: "Track power consumption and device age to optimize refresh cycles.", status: "38 tCO\u2082", sc: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
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
                  <div>
                    <label className="text-sm font-medium mb-2 block">Select a device to see OS-specific remediations:</label>
                    <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
                      {mockDevices.map((dev) => (
                        <button key={dev.id} onClick={() => setSelectedTicketDevice(selectedTicketDevice === dev.hostname ? null : dev.hostname)}
                          className={`p-3 rounded-lg border text-left transition-all ${selectedTicketDevice === dev.hostname ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 ring-1 ring-indigo-500" : "hover:bg-muted/30"}`}>
                          <div className="flex items-center gap-2 mb-1">
                            <div className={`w-2 h-2 rounded-full ${dev.status === "ONLINE" ? "bg-green-500" : "bg-red-400"}`} />
                            <span className="text-sm font-medium truncate">{dev.hostname}</span>
                          </div>
                          <div className="text-[11px] text-muted-foreground">{dev.user.name}</div>
                          <div className="text-[11px] text-muted-foreground">{dev.platform === "win32" ? "🪟 Windows" : "🍎 macOS"} &bull; {dev.ipAddress}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {selectedDevice && (
                    <div className="space-y-4 pt-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Badge variant="outline">{isWindows ? "🪟 Windows" : "🍎 macOS"}</Badge>
                        <span className="font-medium">{selectedDevice.hostname}</span>
                        <span className="text-muted-foreground">({selectedDevice.user.name})</span>
                        <span className="text-muted-foreground">&bull; {selectedDevice.osVersion}</span>
                      </div>

                      {/* OS-Specific Quick Actions */}
                      <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                        {/* Cross-platform always shown */}
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
                        {/* Windows-only */}
                        {isWindows && [
                          { title: "SFC / DISM Repair", icon: HardDrive, code: "sfc /scannow\nDISM /Online /Cleanup-Image /RestoreHealth" },
                          { title: "GP Update", icon: RefreshCw, code: "gpupdate /force" },
                          { title: "Print Spooler Reset", icon: PrinterIcon, code: "Stop-Service Spooler -Force\nRemove-Item \"$env:SystemRoot\\System32\\spool\\PRINTERS\\*\" -Force\nStart-Service Spooler" },
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
                        {/* macOS-only */}
                        {isMac && [
                          { title: "Reset TCC Permissions", icon: Lock, code: "tccutil reset All com.tinyspeck.slackmacgap" },
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

                      {/* Security Remediations for selected device */}
                      <div className="grid gap-2 md:grid-cols-2">
                        {[
                          { title: "Certificate Injection", icon: CertIcon, desc: "Push missing certs to system store", status: "2 pending", sc: "text-amber-600" },
                          { title: "Agent Health Recovery", icon: ShieldCheck, desc: "Restart EDR/AV agent on this device", status: selectedDevice.antivirusName + " healthy", sc: "text-green-600" },
                          { title: "Local Admin Removal", icon: ShieldOff, desc: "Strip unauthorized admin privileges", status: "Compliant", sc: "text-green-600" },
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
                </CardContent>
              </Card>

              {/* Remediation Queue */}
              <Card>
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Activity className="h-5 w-5 text-green-500" /> Live Remediation Queue</CardTitle></CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b text-muted-foreground text-xs uppercase tracking-wider">
                        <th className="text-left pb-2 font-medium">Device</th><th className="text-left pb-2 font-medium">Remediation</th><th className="text-left pb-2 font-medium">Type</th><th className="text-left pb-2 font-medium">Status</th><th className="text-left pb-2 font-medium">Triggered</th><th className="text-right pb-2 font-medium">Action</th>
                      </tr></thead>
                      <tbody className="divide-y">
                        {[
                          { device: "DESKTOP-JMILLER", rem: "Clear Print Spooler", type: "Windows", status: "completed", time: "2m ago", auto: true },
                          { device: "LAPTOP-SCHEN", rem: "Flush DNS Cache", type: "Windows", status: "completed", time: "5m ago", auto: true },
                          { device: "DESKTOP-JMILLER", rem: "System File Repair (SFC)", type: "Windows", status: "running", time: "8m ago", auto: false },
                          { device: "MACBOOK-APATEL", rem: "Spotlight Re-index", type: "macOS", status: "running", time: "15m ago", auto: false },
                          { device: "DESKTOP-JMILLER", rem: "Group Policy Refresh", type: "Windows", status: "queued", time: "1m ago", auto: true },
                          { device: "WS-TGARCIA", rem: "Kill Zombie Processes (3)", type: "Cross-Platform", status: "completed", time: "30m ago", auto: true },
                        ].map((item, i) => (
                          <tr key={i} className="hover:bg-muted/30">
                            <td className="py-2.5 font-medium">{item.device}</td>
                            <td className="py-2.5">{item.rem}</td>
                            <td className="py-2.5"><Badge variant="outline" className="text-[10px]">{item.type === "Windows" ? "🪟" : item.type === "macOS" ? "🍎" : "🌐"} {item.type}</Badge></td>
                            <td className="py-2.5">
                              {item.status === "completed" && <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-[10px]"><CheckCircle className="h-3 w-3 mr-1" />Complete</Badge>}
                              {item.status === "running" && <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-[10px]"><RefreshCw className="h-3 w-3 mr-1 animate-spin" />Running</Badge>}
                              {item.status === "queued" && <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 text-[10px]"><Clock className="h-3 w-3 mr-1" />Queued</Badge>}
                            </td>
                            <td className="py-2.5 text-muted-foreground text-xs">{item.time}</td>
                            <td className="py-2.5 text-right">{item.auto ? <Badge variant="outline" className="text-[10px] text-green-600 border-green-300"><Zap className="h-3 w-3 mr-1" />Auto</Badge> : <Badge variant="outline" className="text-[10px]">Manual</Badge>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Remediation History */}
              <Card>
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><FileText className="h-5 w-5 text-indigo-500" /> Remediation History</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {[
                      { time: "Today 14:32", device: "DESKTOP-JMILLER", action: "Print Spooler cleared", user: "Auto-Trigger", result: "success" },
                      { time: "Today 14:28", device: "LAPTOP-SCHEN", action: "DNS cache flushed", user: "Auto-Trigger", result: "success" },
                      { time: "Today 14:15", device: "DESKTOP-JMILLER", action: "SFC scan started", user: "admin@acme.com", result: "running" },
                      { time: "Today 13:55", device: "WS-TGARCIA", action: "Temp files cleaned (2.4 GB freed)", user: "Auto-Trigger", result: "success" },
                      { time: "Today 13:40", device: "MACBOOK-APATEL", action: "TCC permissions reset for Slack", user: "admin@acme.com", result: "success" },
                      { time: "Today 11:45", device: "DESKTOP-JMILLER", action: "Group Policy refreshed", user: "Auto-Trigger", result: "success" },
                      { time: "Yesterday 16:22", device: "LAPTOP-SCHEN", action: "Unauthorized admin removed", user: "Compliance Monitor", result: "success" },
                      { time: "Yesterday 15:00", device: "DESKTOP-JMILLER", action: "Windows Update services reset", user: "admin@acme.com", result: "success" },
                    ].map((entry, i) => (
                      <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/30 text-sm">
                        <div className="w-24 shrink-0 text-xs text-muted-foreground">{entry.time}</div>
                        <div className="w-36 shrink-0 font-medium text-xs">{entry.device}</div>
                        <div className="flex-1 min-w-0 truncate">{entry.action}</div>
                        <div className="text-xs text-muted-foreground w-28 shrink-0 truncate">{entry.user}</div>
                        {entry.result === "success" ? <CheckCircle className="h-4 w-4 text-green-500 shrink-0" /> : <RefreshCw className="h-4 w-4 text-blue-500 shrink-0 animate-spin" />}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              </>)}

              {/* ══════════════════════════════════════════════════════════ */}
              {/* ── TAB: SUPPORT TICKETS ────────────────────────────────── */}
              {/* ══════════════════════════════════════════════════════════ */}
              {itSubTab === "tickets" && (<>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2"><ClipboardList className="h-5 w-5 text-amber-500" /> Active Support Tickets</CardTitle>
                    <div className="flex gap-2">
                      <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 text-xs">{mockTickets.filter(t => t.status === "open").length} Open</Badge>
                      <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs">{mockTickets.filter(t => t.status === "in-progress").length} In Progress</Badge>
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs">{mockTickets.filter(t => t.status === "resolved").length} Resolved</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {mockTickets.map((ticket) => {
                      const dev = mockDevices.find(d => d.hostname === ticket.device);
                      return (
                        <div key={ticket.id} className="rounded-lg border overflow-hidden">
                          <div className="flex items-center justify-between p-3 hover:bg-muted/20">
                            <div className="flex items-center gap-3">
                              <div className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${ticket.status === "open" ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" : ticket.status === "in-progress" ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"}`}>{ticket.id}</div>
                              <div>
                                <div className="text-sm font-medium">{ticket.subject}</div>
                                <div className="text-xs text-muted-foreground">{ticket.user} &bull; {ticket.device} &bull; {dev?.platform === "win32" ? "🪟" : "🍎"} {formatTimeAgo(ticket.created)}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className={`text-[10px] ${ticket.priority === "high" ? "border-red-300 text-red-600" : ticket.priority === "medium" ? "border-amber-300 text-amber-600" : "border-gray-300 text-gray-600"}`}>
                                {ticket.priority}
                              </Badge>
                              <Badge variant="outline" className="text-[10px]">{ticket.stockReason}</Badge>
                              {ticket.assignedTo !== "IT Support" && <span className="text-xs text-muted-foreground">Assigned: {ticket.assignedTo}</span>}
                            </div>
                          </div>
                          {/* Network info if available */}
                          {ticket.networkInfo && (
                            <div className="px-3 pb-3 border-t bg-muted/10">
                              <div className="text-xs font-medium text-muted-foreground mt-2 mb-1">Network Information (auto-captured)</div>
                              <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-xs">
                                <div><span className="text-muted-foreground">IP:</span> {ticket.networkInfo.ip}</div>
                                <div><span className="text-muted-foreground">DNS:</span> {ticket.networkInfo.dns}</div>
                                <div><span className="text-muted-foreground">Gateway:</span> {ticket.networkInfo.gateway}</div>
                                <div><span className="text-muted-foreground">SSID:</span> {ticket.networkInfo.ssid}</div>
                                <div><span className="text-muted-foreground">Signal:</span> {ticket.networkInfo.signal}</div>
                                <div><span className="text-muted-foreground">Latency:</span> <span className={parseInt(ticket.networkInfo.latency) > 100 ? "text-red-600 font-medium" : ""}>{ticket.networkInfo.latency}</span></div>
                              </div>
                            </div>
                          )}
                          {/* App info if available */}
                          {ticket.appName && dev && (
                            <div className="px-3 pb-3 border-t bg-muted/10">
                              <div className="text-xs font-medium text-muted-foreground mt-2 mb-1">Application Details</div>
                              <div className="flex items-center gap-4 text-xs">
                                <div><span className="text-muted-foreground">App:</span> <span className="font-medium">{ticket.appName}</span></div>
                                <div><span className="text-muted-foreground">Version:</span> {dev.installedSoftware.find(s => s.name === ticket.appName)?.version || "Unknown"}</div>
                                <div className="text-muted-foreground truncate max-w-xs">Path: {(dev.platform === "win32" ? appPaths[ticket.appName]?.win : appPaths[ticket.appName]?.mac) || "Unknown"}</div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
              </>)}

              {/* ══════════════════════════════════════════════════════════ */}
              {/* ── TAB: SUBMIT TICKET (User-Facing) ───────────────────── */}
              {/* ══════════════════════════════════════════════════════════ */}
              {itSubTab === "submit" && (<>
              <Card>
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><UserPlus className="h-5 w-5 text-blue-500" /> Submit a Support Ticket</CardTitle></CardHeader>
                <CardContent className="space-y-5">

                  {/* Step 1: Select device */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">1. Select your device</label>
                    <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
                      {mockDevices.map((dev) => (
                        <button key={dev.id} onClick={() => { setSelectedTicketDevice(selectedTicketDevice === dev.hostname ? null : dev.hostname); setSelectedTicketApp(null); }}
                          className={`p-3 rounded-lg border text-left transition-all ${selectedTicketDevice === dev.hostname ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30 ring-1 ring-blue-500" : "hover:bg-muted/30"}`}>
                          <div className="flex items-center gap-2 mb-1">
                            <div className={`w-2 h-2 rounded-full ${dev.status === "ONLINE" ? "bg-green-500" : "bg-red-400"}`} />
                            <span className="text-sm font-medium">{dev.hostname}</span>
                          </div>
                          <div className="text-[11px] text-muted-foreground">{dev.platform === "win32" ? "🪟 " : "🍎 "}{dev.osVersion}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Step 2: Quick reason (stock responses) */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">2. What&apos;s the issue?</label>
                    <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                      {stockReasons.filter(r => r.enabled).map((reason) => (
                        <button key={reason.id} onClick={() => setSelectedStockReason(selectedStockReason === reason.id ? null : reason.id)}
                          className={`flex items-center gap-2.5 p-3 rounded-lg border text-left transition-all text-sm ${selectedStockReason === reason.id ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30 ring-1 ring-blue-500" : "hover:bg-muted/30"}`}>
                          <span className="text-lg">{reason.icon}</span>
                          <span>{reason.label}</span>
                          {reason.common && <Badge className="ml-auto text-[9px] bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">Common</Badge>}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Step 3: App selector (if app-related) */}
                  {selectedDevice && (selectedStockReason === "sr2" || selectedStockReason === "sr3") && (
                    <div>
                      <label className="text-sm font-medium mb-2 block">3. Which application? <span className="text-muted-foreground font-normal">(installed on {selectedDevice.hostname})</span></label>
                      <div className="grid gap-2 md:grid-cols-3 lg:grid-cols-4">
                        {deviceApps.map((app) => {
                          const path = isWindows ? appPaths[app.name]?.win : appPaths[app.name]?.mac;
                          return (
                            <button key={app.name} onClick={() => setSelectedTicketApp(selectedTicketApp === app.name ? null : app.name)}
                              className={`p-2.5 rounded-lg border text-left transition-all ${selectedTicketApp === app.name ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30 ring-1 ring-blue-500" : "hover:bg-muted/30"}`}>
                              <div className="text-sm font-medium">{app.name}</div>
                              <div className="text-[10px] text-muted-foreground">v{app.version}</div>
                              {path && <div className="text-[10px] text-muted-foreground mt-0.5 font-mono truncate">{path}</div>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Network info auto-captured for network issues */}
                  {selectedDevice && (selectedStockReason === "sr3" || selectedStockReason === "sr4") && (
                    <div className="rounded-lg border bg-muted/20 p-4">
                      <div className="text-sm font-medium mb-2 flex items-center gap-2"><Wifi className="h-4 w-4 text-blue-500" /> Network Information <Badge className="text-[9px] bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Auto-captured</Badge></div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div><span className="text-muted-foreground text-xs">IP Address</span><div className="font-medium">{selectedDevice.ipAddress}</div></div>
                        <div><span className="text-muted-foreground text-xs">DNS Server</span><div className="font-medium">8.8.8.8</div></div>
                        <div><span className="text-muted-foreground text-xs">Gateway</span><div className="font-medium">192.168.1.1</div></div>
                        <div><span className="text-muted-foreground text-xs">Wi-Fi SSID</span><div className="font-medium">AcmeCorp-5G</div></div>
                        <div><span className="text-muted-foreground text-xs">Signal Strength</span><div className="font-medium">85%</div></div>
                        <div><span className="text-muted-foreground text-xs">Latency</span><div className="font-medium">12ms</div></div>
                        <div><span className="text-muted-foreground text-xs">MAC Address</span><div className="font-medium font-mono text-xs">A4:83:E7:2F:9B:C1</div></div>
                        <div><span className="text-muted-foreground text-xs">Adapter</span><div className="font-medium">{isWindows ? "Intel Wi-Fi 6E AX211" : "Wi-Fi (en0)"}</div></div>
                      </div>
                    </div>
                  )}

                  {/* Step 4: Description */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">{selectedStockReason === "sr2" || selectedStockReason === "sr3" ? "4" : "3"}. Additional details <span className="text-muted-foreground font-normal">(optional)</span></label>
                    <textarea value={ticketDescription} onChange={(e) => setTicketDescription(e.target.value)} placeholder="Describe the issue in more detail..." className="w-full h-24 rounded-lg border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>

                  {/* Submit */}
                  <div className="flex items-center justify-between pt-2">
                    <div className="text-xs text-muted-foreground">
                      {selectedTicketDevice && <span className="mr-3">Device: <strong>{selectedTicketDevice}</strong></span>}
                      {selectedStockReason && <span className="mr-3">Issue: <strong>{stockReasons.find(r => r.id === selectedStockReason)?.label}</strong></span>}
                      {selectedTicketApp && <span>App: <strong>{selectedTicketApp}</strong></span>}
                    </div>
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white"><ClipboardList className="h-4 w-4 mr-2" />Submit Ticket</Button>
                  </div>
                </CardContent>
              </Card>
              </>)}

              {/* ══════════════════════════════════════════════════════════ */}
              {/* ── TAB: SELF-SERVICE FIX ─────────────────────────────────── */}
              {/* ══════════════════════════════════════════════════════════ */}
              {itSubTab === "selfservice" && (() => {
                const selfDevice = selectedTicketDevice ? mockDevices.find(d => d.id === selectedTicketDevice) : null;
                const selfIsWindows = selfDevice ? selfDevice.platform === "win32" : true;

                type SelfRemedy = { id: string; title: string; desc: string; icon: React.ElementType; category: string; risk: "safe" | "low" | "medium"; os: "all" | "windows" | "macos"; steps: string[]; script?: string; time: string };
                const selfRemediations: SelfRemedy[] = [
                  { id: "sf1", title: "Clear Temporary Files", desc: "Free up disk space by removing cached and temp files", icon: Trash2, category: "performance", risk: "safe", os: "all", steps: ["Closes running temp file handles", "Deletes user-level temp files", "Reports space recovered"], script: selfIsWindows ? "Remove-Item -Path \"$env:TEMP\\*\" -Recurse -Force -EA SilentlyContinue" : "rm -rf ~/Library/Caches/* ~/Library/Logs/*", time: "~30s" },
                  { id: "sf2", title: "Close Background Apps", desc: "Shut down heavy background processes eating memory", icon: CircleStop, category: "performance", risk: "safe", os: "all", steps: ["Scans for high-memory background processes", "Shows list before terminating", "Keeps essential services running"], script: selfIsWindows ? "Get-Process | Where {$_.WorkingSet -gt 500MB -and $_.MainWindowHandle -eq 0} | Select Name,@{N='MB';E={[math]::Round($_.WorkingSet/1MB)}}" : "ps aux | awk '$6 > 500000 {print $11, $6/1024 \" MB\"}' | head -10", time: "~10s" },
                  { id: "sf3", title: "Restart Explorer / Finder", desc: "Fix frozen desktop, taskbar, or file browser", icon: RefreshCw, category: "performance", risk: "safe", os: "all", steps: ["Gracefully restarts the shell", "Taskbar/Dock refreshes automatically"], script: selfIsWindows ? "Stop-Process -Name explorer -Force; Start-Sleep 2; Start-Process explorer" : "killall Finder", time: "~5s" },
                  { id: "sf4", title: "Free Up RAM", desc: "Purge inactive memory and clear system caches", icon: BatteryCharging, category: "performance", risk: "safe", os: "all", steps: ["Flushes standby memory pages", "Clears file system cache"], script: selfIsWindows ? "Get-Process | Where {$_.WorkingSet -gt 1GB} | ForEach { $_.MinWorkingSet = 1MB }" : "sudo purge", time: "~15s" },
                  { id: "sf5", title: "Fix Internet Connection", desc: "Reset DNS cache and renew IP address", icon: Wifi, category: "network", risk: "safe", os: "all", steps: ["Flushes DNS resolver cache", "Releases and renews DHCP lease", "Tests connectivity"], script: selfIsWindows ? "ipconfig /flushdns\nipconfig /release\nipconfig /renew" : "sudo dscacheutil -flushcache\nsudo killall -HUP mDNSResponder", time: "~20s" },
                  { id: "sf6", title: "Reset Wi-Fi Adapter", desc: "Turn Wi-Fi off and back on to fix connectivity issues", icon: WifiOff, category: "network", risk: "safe", os: "all", steps: ["Disables the Wi-Fi adapter", "Waits 5 seconds", "Re-enables and reconnects"], script: selfIsWindows ? "Disable-NetAdapter -Name 'Wi-Fi' -Confirm:$false\nStart-Sleep 5\nEnable-NetAdapter -Name 'Wi-Fi'" : "networksetup -setairportpower en0 off\nsleep 5\nnetworksetup -setairportpower en0 on", time: "~15s" },
                  { id: "sf7", title: "Test VPN Connectivity", desc: "Check if VPN tunnel is active", icon: Globe, category: "network", risk: "safe", os: "all", steps: ["Checks VPN adapter status", "Tests internal DNS resolution"], script: selfIsWindows ? "Get-VpnConnection | Format-Table Name,ServerAddress,ConnectionStatus" : "ifconfig | grep -A 5 utun", time: "~10s" },
                  { id: "sf8", title: "Fix Display Scaling", desc: "Reset DPI and display scaling to defaults", icon: Eye, category: "display", risk: "low", os: "all", steps: ["Resets display scaling to recommended", "Refreshes desktop rendering"], script: selfIsWindows ? "Set-ItemProperty -Path 'HKCU:\\Control Panel\\Desktop' -Name LogPixels -Value 96" : "defaults delete NSGlobalDomain AppleDisplayScaleFactor 2>/dev/null\nkillall Dock", time: "~5s" },
                  { id: "sf9", title: "Clear Browser Cache", desc: "Remove cached data from Chrome, Edge, or Firefox", icon: Globe, category: "apps", risk: "safe", os: "all", steps: ["Closes browser processes safely", "Clears cache and session storage", "Preserves bookmarks and passwords"], script: selfIsWindows ? "Stop-Process -Name chrome,msedge -Force -EA SilentlyContinue\nRemove-Item \"$env:LOCALAPPDATA\\Google\\Chrome\\User Data\\Default\\Cache\\*\" -Recurse -Force -EA SilentlyContinue" : "rm -rf ~/Library/Caches/Google/Chrome/Default/Cache/*", time: "~15s" },
                  { id: "sf10", title: "Reset Stuck Application", desc: "Force-quit and relaunch a frozen application", icon: Zap, category: "apps", risk: "safe", os: "all", steps: ["Select the frozen application below", "Force terminates the process"], script: selectedDemoResetApp ? (selfIsWindows ? `Stop-Process -Name "${selectedDemoResetApp}" -Force -EA SilentlyContinue\nWrite-Host 'Terminated: ${selectedDemoResetApp}'` : `killall "${selectedDemoResetApp}" 2>/dev/null\necho 'Terminated: ${selectedDemoResetApp}'`) : undefined, time: "~5s" },
                  { id: "sf11", title: "Repair Microsoft Office", desc: "Run the built-in Office repair tool", icon: FileText, category: "apps", risk: "low", os: "windows", steps: ["Launches Office Click-to-Run repair", "Verifies Office file integrity"], script: "& \"C:\\Program Files\\Common Files\\Microsoft Shared\\ClickToRun\\OfficeC2RClient.exe\" /update user", time: "~5min" },
                  { id: "sf12", title: "Fix Teams/Slack Issues", desc: "Clear app cache and reset for fresh login", icon: RefreshCw, category: "apps", risk: "low", os: "all", steps: ["Stops the application", "Clears local cache"], script: selfIsWindows ? "Stop-Process -Name Teams,slack -Force -EA SilentlyContinue\nRemove-Item \"$env:APPDATA\\Microsoft\\Teams\\Cache\\*\" -Recurse -Force -EA SilentlyContinue" : "killall Teams Slack 2>/dev/null\nrm -rf ~/Library/Application\\ Support/Microsoft/Teams/Cache/*", time: "~15s" },
                  { id: "sf13", title: "Check for Malware", desc: "Run a quick scan with built-in security tools", icon: Shield, category: "security", risk: "safe", os: "all", steps: ["Initiates a quick system scan", "Reports findings immediately"], script: selfIsWindows ? "Start-MpScan -ScanType QuickScan" : "echo 'XProtect is active and monitoring'", time: "~2min" },
                  { id: "sf14", title: "Update Security Definitions", desc: "Force-update antivirus/malware definitions", icon: ShieldCheck, category: "security", risk: "safe", os: "all", steps: ["Downloads latest threat definitions", "Verifies update"], script: selfIsWindows ? "Update-MpSignature -UpdateSource MicrosoftUpdateServer" : "softwareupdate --background-critical", time: "~1min" },
                  { id: "sf15", title: "Check Disk Encryption", desc: "Verify BitLocker or FileVault is enabled", icon: Lock, category: "security", risk: "safe", os: "all", steps: ["Checks encryption status on all drives", "Alerts if encryption is off"], script: selfIsWindows ? "Get-BitLockerVolume | Select MountPoint,VolumeStatus,EncryptionPercentage" : "fdesetup status", time: "~5s" },
                  { id: "sf16", title: "Fix Audio Issues", desc: "Reset audio service and default output device", icon: Volume2, category: "peripherals", risk: "safe", os: "all", steps: ["Restarts the audio service", "Resets default playback device"], script: selfIsWindows ? "Restart-Service AudioSrv -Force\nRestart-Service AudioEndpointBuilder -Force" : "sudo killall coreaudiod", time: "~10s" },
                  { id: "sf17", title: "Fix Bluetooth Devices", desc: "Reset Bluetooth adapter and re-pair devices", icon: Bluetooth, category: "peripherals", risk: "safe", os: "all", steps: ["Restarts Bluetooth service", "Device will need to re-pair"], script: selfIsWindows ? "Restart-Service bthserv -Force" : "sudo pkill bluetoothd", time: "~10s" },
                  { id: "sf18", title: "Fix Mouse/Trackpad", desc: "Reset pointer settings and drivers", icon: MousePointer, category: "peripherals", risk: "safe", os: "all", steps: ["Resets pointer acceleration", "Restores default sensitivity"], script: selfIsWindows ? "Set-ItemProperty -Path 'HKCU:\\Control Panel\\Mouse' -Name MouseSpeed -Value 1" : "defaults write .GlobalPreferences com.apple.mouse.scaling -1", time: "~5s" },
                  { id: "sf19", title: "Fix Keyboard Input", desc: "Reset keyboard layout and input method", icon: KeyboardIcon, category: "peripherals", risk: "safe", os: "all", steps: ["Resets keyboard layout to default", "Fixes dead key issues"], script: selfIsWindows ? "Set-ItemProperty -Path 'HKCU:\\Control Panel\\Accessibility\\StickyKeys' -Name Flags -Value 506" : "defaults delete com.apple.HIToolbox 2>/dev/null", time: "~5s" },
                  { id: "sf20", title: "Fix Printer Issues", desc: "Clear print queue and restart spooler", icon: PrinterIcon, category: "peripherals", risk: "safe", os: "all", steps: ["Stops the print spooler", "Clears all stuck print jobs", "Restarts the service"], script: selfIsWindows ? "Stop-Service Spooler -Force\nRemove-Item \"$env:SystemRoot\\System32\\spool\\PRINTERS\\*\" -Force -EA SilentlyContinue\nStart-Service Spooler" : "cancel -a\ncupsctl", time: "~10s" },
                ];

                const filteredRemediations = selfServiceFilter === "all" ? selfRemediations : selfRemediations.filter(r => r.category === selfServiceFilter);
                const displayRemediations = selfDevice ? filteredRemediations.filter(r => r.os === "all" || (selfIsWindows && r.os === "windows") || (!selfIsWindows && r.os === "macos")) : filteredRemediations;

                const categories = [
                  { id: "all" as const, label: "All", icon: Sparkles, count: selfRemediations.length },
                  { id: "performance" as const, label: "Performance", icon: Zap, count: selfRemediations.filter(r => r.category === "performance").length },
                  { id: "network" as const, label: "Network", icon: Wifi, count: selfRemediations.filter(r => r.category === "network").length },
                  { id: "display" as const, label: "Display", icon: Monitor, count: selfRemediations.filter(r => r.category === "display").length },
                  { id: "apps" as const, label: "Applications", icon: Globe, count: selfRemediations.filter(r => r.category === "apps").length },
                  { id: "security" as const, label: "Security", icon: Shield, count: selfRemediations.filter(r => r.category === "security").length },
                  { id: "peripherals" as const, label: "Peripherals", icon: MousePointer, count: selfRemediations.filter(r => r.category === "peripherals").length },
                ];

                return (<>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2"><LifeBuoy className="h-5 w-5 text-emerald-500" /> Self-Service Remediation</CardTitle>
                    <p className="text-sm text-muted-foreground">Fix common issues on your own device — no IT ticket needed. Safe, pre-approved actions.</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Device Selector */}
                    <div>
                      <label className="text-sm font-medium mb-2 block">Select your device:</label>
                      <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
                        {mockDevices.map((dev) => (
                          <button key={dev.id} onClick={() => setSelectedTicketDevice(selectedTicketDevice === dev.id ? null : dev.id)}
                            className={`p-3 rounded-lg border text-left transition-all ${selectedTicketDevice === dev.id ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 ring-1 ring-emerald-500" : "hover:bg-muted/30"}`}>
                            <div className="flex items-center gap-2 mb-1">
                              <div className={`w-2 h-2 rounded-full ${dev.status === "ONLINE" ? "bg-green-500" : "bg-red-400"}`} />
                              <span className="text-sm font-medium">{dev.hostname}</span>
                            </div>
                            <div className="text-[11px] text-muted-foreground">{dev.platform === "win32" ? "🪟 Windows" : "🍎 macOS"} &bull; {dev.ipAddress}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Category Filter */}
                    <div className="flex gap-1.5 flex-wrap">
                      {categories.map((cat) => (
                        <button key={cat.id} onClick={() => setSelfServiceFilter(cat.id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${selfServiceFilter === cat.id ? "bg-emerald-100 border-emerald-400 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300" : "border-transparent bg-muted/40 text-muted-foreground hover:bg-muted/60"}`}>
                          <cat.icon className="h-3 w-3" />
                          {cat.label}
                          <span className="text-[10px] opacity-70">({cat.count})</span>
                        </button>
                      ))}
                    </div>

                    {/* Remediation Grid */}
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                      {displayRemediations.map((remedy) => {
                        const hasRun = ranSelfRemediations.has(remedy.id);
                        return (
                          <div key={remedy.id} className={`rounded-xl border overflow-hidden transition-all ${hasRun ? "border-green-300 bg-green-50/50 dark:bg-green-950/20" : "hover:border-emerald-300 hover:shadow-sm"}`}>
                            <div className="p-4 space-y-2">
                              <div className="flex items-center gap-2">
                                <div className={`p-1.5 rounded-lg ${remedy.risk === "safe" ? "bg-green-100" : "bg-amber-100"}`}>
                                  <remedy.icon className={`h-4 w-4 ${remedy.risk === "safe" ? "text-green-600" : "text-amber-600"}`} />
                                </div>
                                <div>
                                  <div className="text-sm font-semibold">{remedy.title}</div>
                                  <div className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                                    <Badge variant="outline" className={`text-[9px] px-1 ${remedy.risk === "safe" ? "text-green-700 border-green-300" : "text-amber-700 border-amber-300"}`}>
                                      {remedy.risk === "safe" ? "✓ Safe" : "⚡ Low Risk"}
                                    </Badge>
                                    <Badge variant="outline" className="text-[9px] px-1">{remedy.os === "all" ? "🌐 All" : remedy.os === "windows" ? "🪟 Win" : "🍎 Mac"}</Badge>
                                    <span><Clock className="h-2.5 w-2.5 inline mr-0.5" />{remedy.time}</span>
                                  </div>
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground">{remedy.desc}</p>
                              <ul className="space-y-0.5">
                                {remedy.steps.map((step, i) => (
                                  <li key={i} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                                    <span className="text-emerald-500 mt-0.5 shrink-0">{hasRun ? "✓" : `${i + 1}.`}</span>{step}
                                  </li>
                                ))}
                              </ul>

                              {/* App picker for Reset Stuck Application */}
                              {remedy.id === "sf10" && selfDevice && selfDevice.installedSoftware.length > 0 && (
                                <div className="mt-2 space-y-1.5">
                                  <div className="relative">
                                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                                    <Input
                                      placeholder="Search applications..."
                                      value={demoAppSearch}
                                      onChange={(e) => setDemoAppSearch(e.target.value)}
                                      className="pl-7 h-7 text-xs"
                                    />
                                  </div>
                                  <div className="max-h-32 overflow-y-auto rounded-lg border bg-muted/20 divide-y">
                                    {selfDevice.installedSoftware
                                      .filter((a: { name: string }) => !demoAppSearch || a.name.toLowerCase().includes(demoAppSearch.toLowerCase()))
                                      .slice(0, 30)
                                      .map((app: { name: string; version: string }, idx: number) => (
                                        <button
                                          key={`${app.name}-${idx}`}
                                          onClick={() => setSelectedDemoResetApp(selectedDemoResetApp === app.name ? null : app.name)}
                                          className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-left transition-colors text-xs ${
                                            selectedDemoResetApp === app.name
                                              ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200"
                                              : "hover:bg-muted/50"
                                          }`}
                                        >
                                          <Package className="h-3 w-3 shrink-0 text-muted-foreground" />
                                          <span className="font-medium truncate">{app.name}</span>
                                          <span className="text-[10px] text-muted-foreground ml-auto shrink-0">v{app.version}</span>
                                          {selectedDemoResetApp === app.name && <CheckCircle className="h-3 w-3 text-emerald-600 shrink-0" />}
                                        </button>
                                      ))}
                                  </div>
                                  {selectedDemoResetApp && (
                                    <div className="text-[11px] text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                                      <CheckCircle className="h-3 w-3" /> Selected: <strong>{selectedDemoResetApp}</strong>
                                    </div>
                                  )}
                                  {!selectedDemoResetApp && (
                                    <div className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                      <AlertTriangle className="h-3 w-3" /> Select an application above to continue
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                            {remedy.script && selfDevice && (
                              <div className="border-t">
                                <details className="group">
                                  <summary className="px-4 py-2 text-[11px] text-muted-foreground cursor-pointer hover:text-foreground flex items-center gap-1">
                                    <ChevronRight className="h-3 w-3 transition-transform group-open:rotate-90" />Preview script
                                  </summary>
                                  <div className="bg-gray-950 text-green-400 px-4 py-2 font-mono text-[10px] overflow-x-auto max-h-32"><pre className="whitespace-pre-wrap">{remedy.script}</pre></div>
                                </details>
                              </div>
                            )}
                            <div className="px-4 py-2.5 bg-muted/20 border-t">
                              <Button size="sm" className={`w-full text-xs h-8 ${hasRun ? "bg-green-600 hover:bg-green-700" : "bg-emerald-600 hover:bg-emerald-700"} text-white`}
                                disabled={remedy.id === "sf10" && !selectedDemoResetApp}
                                onClick={() => setRanSelfRemediations(prev => new Set(prev).add(remedy.id))}>
                                {hasRun ? <><CheckCircle className="h-3 w-3 mr-1.5" />Completed</> :
                                 remedy.id === "sf10" && !selectedDemoResetApp ? <><AlertTriangle className="h-3 w-3 mr-1.5" />Select App First</> :
                                 <><Play className="h-3 w-3 mr-1.5" />Run Fix</>}
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="rounded-lg border border-dashed p-4 text-center bg-muted/10">
                      <p className="text-sm font-medium">Still having issues?</p>
                      <p className="text-xs text-muted-foreground mt-1">Submit a ticket and IT will help.</p>
                      <Button size="sm" variant="outline" className="mt-3" onClick={() => setItSubTab("submit")}><ClipboardList className="h-3.5 w-3.5 mr-1.5" />Submit a Ticket</Button>
                    </div>
                  </CardContent>
                </Card>
                </>);
              })()}


              {/* ══════════════════════════════════════════════════════════ */}
              {/* ── TAB: CONFIGURATION ──────────────────────────────────── */}
              {/* ══════════════════════════════════════════════════════════ */}
              {itSubTab === "config" && (<>

              {/* Stock Response Management */}
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
                          <div className="text-xs text-muted-foreground">Category: {reason.category} {reason.common && " • Common"}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setStockReasons(stockReasons.map(r => r.id === reason.id ? { ...r, enabled: !r.enabled } : r))}
                          className={`relative w-10 h-5 rounded-full transition-colors ${reason.enabled ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"}`}>
                          <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${reason.enabled ? "translate-x-5" : ""}`} />
                        </button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Remediation Group Configuration */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2"><Server className="h-5 w-5 text-purple-500" /> Remediation Groups &amp; Host Group Assignment</CardTitle>
                    <Button size="sm" variant="outline"><UserPlus className="h-3.5 w-3.5 mr-1" />Create Group</Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-muted-foreground">Assign sets of remediations to host groups. Toggle groups on/off to enable or disable for the assigned devices. Build custom remediation sets per OS.</p>
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
                        {group.remediations.map((r) => (
                          <Badge key={r} variant="outline" className="text-[10px]">{r}</Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Custom Remediation Builder */}
              <Card>
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Terminal className="h-5 w-5 text-green-500" /> Custom Remediation Builder</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-xs text-muted-foreground">Create custom remediation scripts and assign them to remediation groups or host groups. Specify OS target and risk level.</p>
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
                          {["Engineering Workstations", "Finance Desktops", "Mac Fleet", "All Devices"].map(hg => (
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
              </>)}
            </div>
          ); })()}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* COMPLIANCE — SOC 2                                                 */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeSection === "compliance" && (() => {
          const soc2Device = soc2DeviceFilter ? mockDevices.find(d => d.id === soc2DeviceFilter) : null;
          const soc2IsWindows = soc2Device ? soc2Device.platform === "win32" : true;

          const trustCriteria = [
            { id: "CC6", name: "Logical & Physical Access", score: 82, total: 11, passing: 9, failing: 2, color: "#3b82f6",
              controls: [
                { id: "CC6.1", name: "Logical access restrictions", status: "pass" as const, desc: "User access provisioned through SSO with MFA enforcement" },
                { id: "CC6.2", name: "Access credentials management", status: "pass" as const, desc: "Passwords hashed with bcrypt, MFA available" },
                { id: "CC6.3", name: "Access removal on termination", status: "warn" as const, desc: "2 accounts with stale access >90 days" },
                { id: "CC6.6", name: "System boundary protection", status: "pass" as const, desc: "Firewall enabled on all enrolled devices" },
                { id: "CC6.7", name: "Data transmission encryption", status: "pass" as const, desc: "All API communications use TLS 1.3" },
                { id: "CC6.8", name: "Malware prevention", status: "fail" as const, desc: "1 device has outdated AV definitions (>14 days)" },
              ] },
            { id: "CC7", name: "System Operations", score: 91, total: 8, passing: 7, failing: 1, color: "#22c55e",
              controls: [
                { id: "CC7.1", name: "Infrastructure monitoring", status: "pass" as const, desc: "Agent reporting device health and software inventory" },
                { id: "CC7.2", name: "Anomaly detection", status: "pass" as const, desc: "Activity monitoring detects unusual access patterns" },
                { id: "CC7.3", name: "Security event evaluation", status: "pass" as const, desc: "Security alerts triaged via threat dashboard" },
                { id: "CC7.4", name: "Incident response", status: "warn" as const, desc: "Procedures documented but not tested in 90 days" },
                { id: "CC7.5", name: "Incident recovery", status: "pass" as const, desc: "Ransomware rollback and backup systems operational" },
              ] },
            { id: "CC8", name: "Change Management", score: 75, total: 6, passing: 4, failing: 2, color: "#f59e0b",
              controls: [
                { id: "CC8.1", name: "Change authorization", status: "pass" as const, desc: "Deployments require PR review and approval" },
                { id: "CC8.2", name: "Infrastructure changes tracked", status: "fail" as const, desc: "3 devices have unauthorized software" },
                { id: "CC8.3", name: "Configuration management", status: "warn" as const, desc: "GP compliance at 87% — 2 devices drifted" },
              ] },
            { id: "CC9", name: "Risk Mitigation", score: 88, total: 5, passing: 4, failing: 1, color: "#8b5cf6",
              controls: [
                { id: "CC9.1", name: "Risk identification", status: "pass" as const, desc: "CVE tracking with automated vulnerability scanning" },
                { id: "CC9.2", name: "Vendor risk assessment", status: "pass" as const, desc: "Third-party software with version monitoring" },
                { id: "CC9.3", name: "Risk remediation", status: "pass" as const, desc: "Remediation queue with automated deployment" },
              ] },
            { id: "A1", name: "Availability", score: 95, total: 4, passing: 4, failing: 0, color: "#06b6d4",
              controls: [
                { id: "A1.1", name: "Capacity planning", status: "pass" as const, desc: "Device resource monitoring with alerts" },
                { id: "A1.2", name: "Recovery objectives", status: "pass" as const, desc: "Backup/restore procedures tested" },
                { id: "A1.3", name: "Environmental protections", status: "pass" as const, desc: "Cloud infra with multi-region availability" },
              ] },
            { id: "C1", name: "Confidentiality", score: 79, total: 5, passing: 4, failing: 1, color: "#ec4899",
              controls: [
                { id: "C1.1", name: "Confidential data identification", status: "pass" as const, desc: "DLP policies active for sensitive data patterns" },
                { id: "C1.2", name: "Confidential data disposal", status: "pass" as const, desc: "Secure deletion for decommissioned devices" },
                { id: "C1.3", name: "Encryption at rest", status: "fail" as const, desc: "1 device missing disk encryption" },
              ] },
          ];

          const overallScore = Math.round(trustCriteria.reduce((sum, c) => sum + c.score, 0) / trustCriteria.length);
          const totalControls = trustCriteria.reduce((sum, c) => sum + c.total, 0);
          const passingControls = trustCriteria.reduce((sum, c) => sum + c.passing, 0);
          const failingControls = trustCriteria.reduce((sum, c) => sum + c.failing, 0);
          const compliancePieData = [
            { name: "Passing", value: passingControls, color: "#22c55e" },
            { name: "Warnings", value: totalControls - passingControls - failingControls, color: "#f59e0b" },
            { name: "Failing", value: failingControls, color: "#ef4444" },
          ];
          const criteriaBarData = trustCriteria.map(c => ({ name: c.id, score: c.score, fill: c.color }));
          const trendData = Array.from({ length: 30 }, (_, i) => ({ day: `Day ${30 - i}`, score: Math.min(100, 78 + Math.floor(i / 3) + Math.floor(Math.random() * 5)) }));
          const deviceComplianceData = mockDevices.map((dev, idx) => ({
            device: dev, encryption: idx !== 2, antivirus: idx !== 3, firewall: true,
            updates: idx !== 1, mfa: idx !== 2, diskSpace: true, screenLock: idx !== 4,
            score: [92, 78, 65, 85, 71][idx] || 80,
          }));
          const complianceRemediations = [
            { id: "sr1", control: "CC6.8", title: "Update Antivirus Definitions", desc: "Force-update Defender/XProtect for CC6.8", severity: "critical" as const, autoFix: true, script: soc2IsWindows ? "Update-MpSignature -UpdateSource MicrosoftUpdateServer" : "softwareupdate --background-critical" },
            { id: "sr2", control: "C1.3", title: "Enable Disk Encryption", desc: "Verify BitLocker/FileVault for C1.3", severity: "critical" as const, autoFix: false, script: soc2IsWindows ? "Get-BitLockerVolume | Select MountPoint,VolumeStatus,EncryptionPercentage" : "fdesetup status" },
            { id: "sr3", control: "CC6.6", title: "Verify Firewall Status", desc: "Ensure firewall active for CC6.6", severity: "high" as const, autoFix: true, script: soc2IsWindows ? "Get-NetFirewallProfile | Select Name,Enabled\nSet-NetFirewallProfile -Profile Domain,Public,Private -Enabled True" : "sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setglobalstate on" },
            { id: "sr4", control: "CC6.3", title: "Audit Stale User Accounts", desc: "Find accounts inactive >90 days per CC6.3", severity: "high" as const, autoFix: false, script: soc2IsWindows ? "Get-LocalUser | Where { $_.LastLogon -lt (Get-Date).AddDays(-90) -and $_.Enabled } | Select Name,LastLogon" : "dscl . -list /Users" },
            { id: "sr5", control: "CC8.2", title: "Detect Unauthorized Software", desc: "Scan for unapproved installs per CC8.2", severity: "high" as const, autoFix: false, script: soc2IsWindows ? "Get-ItemProperty HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\* | Select DisplayName,Publisher | Format-Table" : "ls -la /Applications/" },
            { id: "sr6", control: "CC8.3", title: "Group Policy Compliance", desc: "Verify GP applied for CC8.3", severity: "medium" as const, autoFix: true, script: soc2IsWindows ? "gpresult /R /SCOPE Computer\ngpupdate /force" : "sudo profiles list -all" },
            { id: "sr7", control: "CC7.1", title: "System Health Audit", desc: "Health check for CC7.1 monitoring", severity: "medium" as const, autoFix: false, script: soc2IsWindows ? "Get-Service | Where {$_.Status -eq 'Stopped' -and $_.StartType -eq 'Automatic'} | Select Name,Status" : "launchctl list | head -20" },
            { id: "sr8", control: "CC6.1", title: "Verify MFA Enforcement", desc: "Check MFA on accounts per CC6.1", severity: "high" as const, autoFix: false, script: "Write-Host 'Check MyDex admin panel for MFA enrollment status'" },
          ];
          const criticalCount = complianceRemediations.filter(r => r.severity === "critical").length;
          const gaugeData = [{ name: "Score", value: overallScore, fill: overallScore >= 90 ? "#22c55e" : overallScore >= 75 ? "#f59e0b" : "#ef4444" }];

          return (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-2"><FileCheck className="h-6 w-6" /> SOC 2 Compliance</h2>
                <p className="text-muted-foreground text-sm">Compliance health, trust criteria, device audits, and self-remediation scripts mapped to SOC 2 controls.</p>
              </div>

              {/* Overall Score + Charts */}
              <div className="grid gap-4 md:grid-cols-4">
                <Card className="md:col-span-1">
                  <CardContent className="pt-6 pb-4 flex flex-col items-center">
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Overall SOC 2 Score</div>
                    <ResponsiveContainer width={160} height={160}>
                      <RadialBarChart cx="50%" cy="50%" innerRadius="70%" outerRadius="100%" barSize={14} data={gaugeData} startAngle={90} endAngle={-270}>
                        <RadialBar background={{ fill: "hsl(var(--muted))" }} dataKey="value" cornerRadius={10} />
                      </RadialBarChart>
                    </ResponsiveContainer>
                    <div className="text-4xl font-bold -mt-24 mb-16" style={{ color: overallScore >= 90 ? "#22c55e" : overallScore >= 75 ? "#f59e0b" : "#ef4444" }}>{overallScore}%</div>
                    <div className="text-xs text-muted-foreground">{overallScore >= 90 ? "Audit Ready" : overallScore >= 75 ? "Needs Attention" : "At Risk"}</div>
                  </CardContent>
                </Card>
                <Card className="md:col-span-1">
                  <CardContent className="pt-6">
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Control Status</div>
                    <ResponsiveContainer width="100%" height={140}>
                      <RechartsPieChart>
                        <Pie data={compliancePieData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={3} dataKey="value">
                          {compliancePieData.map((entry, i) => (<Cell key={i} fill={entry.color} />))}
                        </Pie>
                        <RechartsTooltip formatter={(value) => [`${value} controls`, ""]} />
                      </RechartsPieChart>
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
                        <RechartsTooltip formatter={(value) => [`${value}%`, "Score"]} />
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

              {/* Trust Service Criteria */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2"><Shield className="h-5 w-5 text-blue-500" /> Trust Service Criteria</CardTitle>
                  <p className="text-xs text-muted-foreground">SOC 2 Type II mapped to AICPA Trust Service Criteria</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ResponsiveContainer width="100%" height={200}>
                    <RechartsBarChart data={criteriaBarData} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                      <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={40} />
                      <RechartsTooltip formatter={(value) => [`${value}%`, "Score"]} />
                      <Bar dataKey="score" radius={[0, 6, 6, 0]} barSize={20}>
                        {criteriaBarData.map((entry, i) => (<Cell key={i} fill={entry.fill} />))}
                      </Bar>
                    </RechartsBarChart>
                  </ResponsiveContainer>
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {trustCriteria.map(criteria => (
                      <div key={criteria.id} className="rounded-xl border overflow-hidden">
                        <div className="p-3 bg-muted/30 flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge style={{ backgroundColor: criteria.color + "20", color: criteria.color, borderColor: criteria.color + "40" }} className="text-[10px] font-mono border">{criteria.id}</Badge>
                              <span className="text-sm font-semibold">{criteria.name}</span>
                            </div>
                            <div className="text-[10px] text-muted-foreground mt-0.5">{criteria.passing}/{criteria.total} passing</div>
                          </div>
                          <div className="text-2xl font-bold" style={{ color: criteria.color }}>{criteria.score}%</div>
                        </div>
                        <div className="p-2 space-y-1">
                          {criteria.controls.map(ctrl => (
                            <div key={ctrl.id} className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/20">
                              {ctrl.status === "pass" && <CheckCircle className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />}
                              {ctrl.status === "warn" && <AlertCircle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />}
                              {ctrl.status === "fail" && <XCircle className="h-3.5 w-3.5 text-red-500 mt-0.5 shrink-0" />}
                              <div className="min-w-0">
                                <div className="text-[11px] font-medium"><span className="font-mono text-muted-foreground mr-1">{ctrl.id}</span>{ctrl.name}</div>
                                <div className="text-[10px] text-muted-foreground">{ctrl.desc}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Device Compliance */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2"><Monitor className="h-5 w-5 text-indigo-500" /> Device Compliance Status</CardTitle>
                </CardHeader>
                <CardContent>
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
                          <th className="pb-2 px-2 text-center">Lock</th>
                          <th className="pb-2 px-2 text-center">Score</th>
                          <th className="pb-2 pl-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {deviceComplianceData.map(d => (
                          <tr key={d.device.id} className={`border-b hover:bg-muted/20 ${soc2DeviceFilter === d.device.id ? "bg-indigo-50 dark:bg-indigo-950/20" : ""}`}>
                            <td className="py-2.5 pr-4">
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${d.device.status === "ONLINE" ? "bg-green-500" : "bg-red-400"}`} />
                                <div>
                                  <div className="font-medium text-xs">{d.device.hostname}</div>
                                  <div className="text-[10px] text-muted-foreground">{d.device.platform === "win32" ? "Windows" : "macOS"}</div>
                                </div>
                              </div>
                            </td>
                            {[d.encryption, d.antivirus, d.firewall, d.updates, d.mfa, d.screenLock].map((check, i) => (
                              <td key={i} className="px-2 text-center">
                                {check ? <CheckCircle className="h-3.5 w-3.5 text-green-500 mx-auto" /> : <XCircle className="h-3.5 w-3.5 text-red-500 mx-auto" />}
                              </td>
                            ))}
                            <td className="px-2 text-center">
                              <Badge className={`text-[10px] ${d.score >= 90 ? "bg-green-100 text-green-800" : d.score >= 75 ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800"}`}>{d.score}%</Badge>
                            </td>
                            <td className="pl-2">
                              <Button size="sm" variant="outline" className="text-[10px] h-6"
                                onClick={() => setSoc2DeviceFilter(soc2DeviceFilter === d.device.id ? null : d.device.id)}>
                                {soc2DeviceFilter === d.device.id ? "Deselect" : "Fix"}
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Compliance Remediations */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2"><Terminal className="h-5 w-5 text-green-500" /> Compliance Remediations</CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">Self-remediation scripts mapped to SOC 2 controls.</p>
                    </div>
                    <Button size="sm" variant="outline" className="text-xs"><Zap className="h-3 w-3 mr-1" />Run All Auto-Fix</Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 md:grid-cols-2">
                    {complianceRemediations.map(remedy => (
                      <div key={remedy.id} className="rounded-xl border overflow-hidden">
                        <div className="p-4 space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge className={`text-[9px] font-mono ${remedy.severity === "critical" ? "bg-red-100 text-red-800" : remedy.severity === "high" ? "bg-orange-100 text-orange-800" : "bg-amber-100 text-amber-800"}`}>{remedy.severity.toUpperCase()}</Badge>
                            <Badge variant="outline" className="text-[9px] font-mono">{remedy.control}</Badge>
                            {remedy.autoFix && <Badge className="text-[9px] bg-green-100 text-green-800">Auto-Fix</Badge>}
                          </div>
                          <div className="text-sm font-semibold">{remedy.title}</div>
                          <p className="text-xs text-muted-foreground">{remedy.desc}</p>
                        </div>
                        <div className="border-t">
                          <details className="group">
                            <summary className="px-4 py-2 text-[11px] text-muted-foreground cursor-pointer hover:text-foreground flex items-center gap-1">
                              <ChevronRight className="h-3 w-3 transition-transform group-open:rotate-90" />Script
                            </summary>
                            <div className="bg-gray-950 text-green-400 px-4 py-2 font-mono text-[10px] overflow-x-auto max-h-40"><pre className="whitespace-pre-wrap">{remedy.script}</pre></div>
                          </details>
                        </div>
                        <div className="px-4 py-2.5 bg-muted/20 border-t flex items-center justify-between">
                          <div className="text-[10px] text-muted-foreground">{soc2Device ? `Target: ${soc2Device.hostname}` : "Select a device"}</div>
                          <Button size="sm" className="text-xs h-7 bg-blue-600 hover:bg-blue-700 text-white"><Play className="h-3 w-3 mr-1" />Run</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Audit Recommendations */}
              <Card>
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Info className="h-5 w-5 text-blue-500" /> SOC 2 Audit Recommendations</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid gap-3 md:grid-cols-2">
                    {[
                      { priority: "critical", title: "Enable Disk Encryption on All Devices", desc: "SOC 2 C1.3 requires encryption at rest for all systems.", action: "Run C1.3 remediation", trend: "down" },
                      { priority: "critical", title: "Update Antivirus Definitions Fleet-Wide", desc: "Devices with outdated AV (>7 days) violate CC6.8.", action: "Run CC6.8 remediation", trend: "up" },
                      { priority: "high", title: "Implement 90-Day Access Review", desc: "CC6.3 requires timely removal of stale access.", action: "Configure in Settings → SSO", trend: "up" },
                      { priority: "high", title: "Document Incident Response", desc: "CC7.4 requires tested IR procedures.", action: "Create runbook", trend: "down" },
                      { priority: "medium", title: "Enforce Software Allowlist", desc: "CC8.2 requires change tracking.", action: "Configure in Security → DLP", trend: "up" },
                      { priority: "medium", title: "Automated Compliance Scanning", desc: "Weekly scans with alerts on score drops.", action: "Configure schedule", trend: "up" },
                      { priority: "low", title: "Continuous Monitoring Dashboard", desc: "Real-time visibility reduces audit prep by 60%.", action: "Share this dashboard", trend: "up" },
                      { priority: "low", title: "Automate Evidence Collection", desc: "Auto-collect logs and reports per control.", action: "Enable in Reports", trend: "up" },
                    ].map((rec, i) => (
                      <div key={i} className={`p-4 rounded-xl border ${rec.priority === "critical" ? "border-red-200 bg-red-50/50" : rec.priority === "high" ? "border-orange-200 bg-orange-50/50" : rec.priority === "medium" ? "border-amber-200 bg-amber-50/50" : "border-blue-200 bg-blue-50/50"}`}>
                        <div className="flex items-center justify-between mb-2">
                          <Badge className={`text-[9px] ${rec.priority === "critical" ? "bg-red-200 text-red-800" : rec.priority === "high" ? "bg-orange-200 text-orange-800" : rec.priority === "medium" ? "bg-amber-200 text-amber-800" : "bg-blue-200 text-blue-800"}`}>{rec.priority.toUpperCase()}</Badge>
                          {rec.trend === "up" ? <div className="flex items-center gap-0.5 text-green-600 text-[10px]"><ArrowUpRight className="h-3 w-3" />Improving</div> : <div className="flex items-center gap-0.5 text-red-600 text-[10px]"><ArrowDownRight className="h-3 w-3" />Needs Work</div>}
                        </div>
                        <div className="text-sm font-semibold mb-1">{rec.title}</div>
                        <p className="text-xs text-muted-foreground mb-2">{rec.desc}</p>
                        <div className="text-[10px] font-medium text-blue-600">{rec.action}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        })()}

        {/* Alert Thresholds */}
        {activeSection === "alert-thresholds" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Alert Thresholds</h2>
              <p className="text-muted-foreground">Customize alert thresholds and workflows to proactively identify issues</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-4">
              {[
                { label: "Active Rules", value: "10", color: "text-primary" },
                { label: "Email Alerts", value: "5", color: "text-blue-600" },
                { label: "Auto-Remediate", value: "3", color: "text-yellow-600" },
                { label: "Critical Rules", value: "4", color: "text-red-600" },
              ].map((s) => (
                <Card key={s.label}>
                  <CardContent className="pt-6">
                    <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                    <div className="text-xs text-muted-foreground">{s.label}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {[
              { name: "DEX Score Drop", desc: "Alert when device DEX score falls below threshold", threshold: "50", unit: "score", severity: "HIGH", auto: true },
              { name: "Device Offline Duration", desc: "Alert when managed device hasn't checked in", threshold: "24", unit: "hours", severity: "MEDIUM", auto: false },
              { name: "BSOD Frequency", desc: "Blue screen crashes exceeding limit in 30 days", threshold: "3", unit: "crashes", severity: "CRITICAL", auto: true },
              { name: "Update Non-Compliance", desc: "Pending updates exceeding allowed duration", threshold: "14", unit: "days", severity: "MEDIUM", auto: true },
              { name: "Unauthorized Application", desc: "Blacklisted application detected on device", threshold: "1", unit: "occurrence", severity: "HIGH", auto: false },
              { name: "Missing Antivirus", desc: "No antivirus or Defender disabled", threshold: "1", unit: "detection", severity: "CRITICAL", auto: false },
            ].map((rule) => (
              <Card key={rule.name}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{rule.name}</span>
                        <Badge variant={rule.severity === "CRITICAL" ? "destructive" : rule.severity === "HIGH" ? "warning" : "secondary"}>{rule.severity}</Badge>
                        {rule.auto && <Badge variant="outline" className="text-[10px]"><Zap className="h-3 w-3 mr-0.5" />Auto-fix</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{rule.desc}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-mono bg-muted px-2 py-1 rounded">{rule.threshold} {rule.unit}</span>
                      <div className="w-9 h-5 bg-primary rounded-full relative">
                        <div className="absolute top-[2px] right-[2px] bg-white border border-gray-300 rounded-full h-4 w-4" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Cost Optimization */}
        {activeSection === "cost-optimization" && (() => {
          const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          const budgetData = [80, 82, 85, 88, 87, 90, 92, 94, 95, 97, 98, 100];
          const forecastData = [null, null, null, null, null, null, null, 94, 96, 98, 99, 101];
          const itSpend = [20, 21, 22, 21.5, 22, 23, 22.5, 24, 23.5, 25, 24, 26];
          const revenue = [22, 23, 22.5, 24, 24.5, 25, 24, 25.5, 26, 25, 26, 26.5];
          const ticketVol = [240, 280, 320, 350, 310, 290, 260, 300, 340, 280, 250, 220];
          const resEff = [55, 52, 48, 45, 50, 55, 60, 58, 54, 62, 65, 70];
          return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">IT Analytics & Cost Optimization</h2>
              <p className="text-muted-foreground">From compliance, costs, and tickets to performance, security, and SLAs — analytics drives excellence across IT.</p>
            </div>

            {/* Service Intelligence */}
            <Card>
              <CardHeader><CardTitle className="text-lg">Service Intelligence</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-3 sm:grid-cols-5">
                  {[
                    { label: "Technician to ticket ratio", value: "1:40", sub: "Last quarter: 1:25", color: "text-blue-600" },
                    { label: "Ticket resolution efficiency", value: "65%", sub: "Last quarter: 60%", color: "text-green-500" },
                    { label: "IT spend per employee", value: "$2,400", sub: "Last quarter: $2,000", color: "text-orange-500" },
                    { label: "Cost per incident", value: "$16", sub: "Last quarter: $18", color: "text-green-600" },
                    { label: "Happiness index", value: "82%", sub: "Last quarter: 81%", color: "text-pink-500" },
                  ].map((kpi) => (
                    <div key={kpi.label} className="rounded-xl border p-4 text-center">
                      <div className="text-[11px] font-medium text-muted-foreground mb-2">{kpi.label}</div>
                      <div className={`text-3xl font-bold ${kpi.color}`}>{kpi.value}</div>
                      <div className="text-[10px] text-muted-foreground mt-1">{kpi.sub}</div>
                    </div>
                  ))}
                </div>
                <div className="grid gap-6 lg:grid-cols-2">
                  {/* Ticket volume vs efficiency chart */}
                  <div className="rounded-xl border p-4">
                    <div className="text-sm font-semibold mb-1">Effect of ticket volume on efficiency</div>
                    <div className="flex gap-4 text-[10px] text-muted-foreground mb-3">
                      <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-green-400 inline-block" /> Resolution efficiency (%)</span>
                      <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-blue-400 inline-block" /> Ticket volume</span>
                    </div>
                    <div className="flex items-end gap-[3px] h-40">
                      {months.map((m, i) => (
                        <div key={m} className="flex-1 flex flex-col items-center gap-0.5" title={`${m}: ${ticketVol[i]} tickets, ${resEff[i]}% eff`}>
                          <div className="w-full flex gap-[1px]">
                            <div className="flex-1 bg-blue-400 rounded-t" style={{ height: `${(ticketVol[i] / 400) * 140}px` }} />
                            <div className="flex-1 bg-green-400 rounded-t" style={{ height: `${(resEff[i] / 100) * 140}px` }} />
                          </div>
                          <span className="text-[8px] text-muted-foreground">{m}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* IT spend vs productivity */}
                  <div className="rounded-xl border p-4">
                    <div className="text-sm font-semibold mb-1">IT spend vs productivity</div>
                    <div className="flex gap-4 text-[10px] text-muted-foreground mb-3">
                      <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-blue-400 inline-block" /> IT spend (%)</span>
                      <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-pink-400 inline-block" /> Productivity (%)</span>
                    </div>
                    <div className="relative h-40">
                      <svg viewBox="0 0 480 160" className="w-full h-full" preserveAspectRatio="none">
                        <polyline fill="none" stroke="#60a5fa" strokeWidth="2" points={months.map((_, i) => `${i * (480 / 11)},${160 - (itSpend[i] - 18) * 18}`).join(" ")} />
                        <polyline fill="none" stroke="#f472b6" strokeWidth="2" points={months.map((_, i) => `${i * (480 / 11)},${160 - (revenue[i] - 18) * 18}`).join(" ")} />
                        {itSpend.map((v, i) => <circle key={`s${i}`} cx={i * (480 / 11)} cy={160 - (v - 18) * 18} r="3" fill="#60a5fa" />)}
                        {revenue.map((v, i) => <circle key={`r${i}`} cx={i * (480 / 11)} cy={160 - (v - 18) * 18} r="3" fill="#f472b6" />)}
                      </svg>
                      <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[8px] text-muted-foreground px-1">
                        {months.map((m) => <span key={m}>{m}</span>)}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* IT Financial Analytics */}
            <Card>
              <CardHeader><CardTitle className="text-lg">IT Financial Analytics</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-3 sm:grid-cols-5">
                  {[
                    { label: "Predicted budget overshoot", value: "-$27K", sub: "YTD Last year: -$16.4K", color: "text-red-500" },
                    { label: "IT spend rate", value: "$226/day", sub: "Last quarter: $214/day", color: "text-orange-500" },
                    { label: "IT spend to value ratio", value: "1:3", sub: "Last quarter: 1:2", color: "text-green-500" },
                    { label: "Infra replacement frequency", value: "3 years", sub: "", color: "text-blue-600" },
                    { label: "ROI index", value: "7.6", sub: "Last quarter: 6.4", color: "text-green-600" },
                  ].map((kpi) => (
                    <div key={kpi.label} className="rounded-xl border p-4 text-center">
                      <div className="text-[11px] font-medium text-muted-foreground mb-2">{kpi.label}</div>
                      <div className={`text-3xl font-bold ${kpi.color}`}>{kpi.value}</div>
                      {kpi.sub && <div className="text-[10px] text-muted-foreground mt-1">{kpi.sub}</div>}
                    </div>
                  ))}
                </div>
                <div className="grid gap-6 lg:grid-cols-2">
                  {/* Budget usage forecast */}
                  <div className="rounded-xl border p-4">
                    <div className="text-sm font-semibold mb-1">IT budget usage forecast</div>
                    <div className="flex gap-4 text-[10px] text-muted-foreground mb-3">
                      <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-indigo-400 inline-block" /> Total IT budget usage</span>
                      <span className="flex items-center gap-1"><span className="h-[1px] w-3 bg-blue-300 inline-block" /> Forecasted usage</span>
                    </div>
                    <div className="relative h-40">
                      <svg viewBox="0 0 480 160" className="w-full h-full" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="budgetFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#818cf8" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="#818cf8" stopOpacity="0.05" />
                          </linearGradient>
                        </defs>
                        <polygon fill="url(#budgetFill)" points={`0,160 ${budgetData.map((v, i) => `${i * (480 / 11)},${160 - (v - 75) * 5.5}`).join(" ")} ${11 * (480 / 11)},160`} />
                        <polyline fill="none" stroke="#818cf8" strokeWidth="2.5" points={budgetData.map((v, i) => `${i * (480 / 11)},${160 - (v - 75) * 5.5}`).join(" ")} />
                        <polyline fill="none" stroke="#93c5fd" strokeWidth="1.5" strokeDasharray="4,3" points={forecastData.map((v, i) => v !== null ? `${i * (480 / 11)},${160 - (v - 75) * 5.5}` : "").filter(Boolean).join(" ")} />
                        {budgetData.map((v, i) => <circle key={i} cx={i * (480 / 11)} cy={160 - (v - 75) * 5.5} r="2.5" fill="#818cf8" />)}
                      </svg>
                      <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[8px] text-muted-foreground px-1">
                        {months.map((m) => <span key={m}>{m}</span>)}
                      </div>
                      <div className="absolute left-0 top-0 bottom-4 flex flex-col justify-between text-[8px] text-muted-foreground">
                        <span>$100K</span><span>$90K</span><span>$80K</span>
                      </div>
                    </div>
                  </div>
                  {/* IT spend vs revenue per employee */}
                  <div className="rounded-xl border p-4">
                    <div className="text-sm font-semibold mb-1">IT spend vs revenue per employee</div>
                    <div className="flex gap-4 text-[10px] text-muted-foreground mb-3">
                      <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-pink-400 inline-block" /> IT spend ($)</span>
                      <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-green-400 inline-block" /> Revenue per employee ($)</span>
                    </div>
                    <div className="relative h-40">
                      <svg viewBox="0 0 480 160" className="w-full h-full" preserveAspectRatio="none">
                        <polyline fill="none" stroke="#f472b6" strokeWidth="2" points={itSpend.map((v, i) => `${i * (480 / 11)},${160 - (v - 18) * 18}`).join(" ")} />
                        <polyline fill="none" stroke="#4ade80" strokeWidth="2" points={revenue.map((v, i) => `${i * (480 / 11)},${160 - (v - 18) * 18}`).join(" ")} />
                        {itSpend.map((v, i) => <circle key={`s${i}`} cx={i * (480 / 11)} cy={160 - (v - 18) * 18} r="3" fill="#f472b6" />)}
                        {revenue.map((v, i) => <circle key={`r${i}`} cx={i * (480 / 11)} cy={160 - (v - 18) * 18} r="3" fill="#4ade80" />)}
                      </svg>
                      <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[8px] text-muted-foreground px-1">
                        {months.map((m) => <span key={m}>{m}</span>)}
                      </div>
                      <div className="absolute left-0 top-0 bottom-4 flex flex-col justify-between text-[8px] text-muted-foreground">
                        <span>$26K</span><span>$22K</span><span>$18K</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* License Optimization */}
            <Card>
              <CardHeader><CardTitle className="text-lg">Software License Optimization</CardTitle></CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-4 mb-6">
                  {[
                    { label: "Total license spend", value: "$14.2K/mo", sub: "Last quarter: $12.8K/mo", color: "text-blue-600" },
                    { label: "Unused licenses", value: "47", sub: "Across 12 applications", color: "text-red-500" },
                    { label: "Potential monthly savings", value: "$860", sub: "$10,320/year", color: "text-green-600" },
                    { label: "License utilization", value: "78%", sub: "Last quarter: 74%", color: "text-orange-500" },
                  ].map((kpi) => (
                    <div key={kpi.label} className="rounded-xl border p-4 text-center">
                      <div className="text-[11px] font-medium text-muted-foreground mb-2">{kpi.label}</div>
                      <div className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</div>
                      <div className="text-[10px] text-muted-foreground mt-1">{kpi.sub}</div>
                    </div>
                  ))}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left p-3 font-medium text-muted-foreground">Application</th>
                        <th className="text-center p-3 font-medium text-muted-foreground">Total</th>
                        <th className="text-center p-3 font-medium text-muted-foreground">Used</th>
                        <th className="text-center p-3 font-medium text-muted-foreground">Unused</th>
                        <th className="text-center p-3 font-medium text-muted-foreground">Utilization</th>
                        <th className="text-right p-3 font-medium text-muted-foreground">Cost/seat</th>
                        <th className="text-right p-3 font-medium text-muted-foreground">Savings/mo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { app: "Microsoft 365 E5", total: 35, used: 28, cost: 38 },
                        { app: "Adobe Creative Cloud", total: 15, used: 9, cost: 55 },
                        { app: "Slack Business+", total: 40, used: 32, cost: 12.5 },
                        { app: "Zoom Business", total: 25, used: 18, cost: 20 },
                        { app: "Jira Software", total: 30, used: 27, cost: 8 },
                        { app: "Figma Organization", total: 12, used: 10, cost: 45 },
                      ].map((lic) => {
                        const unused = lic.total - lic.used;
                        const util = Math.round((lic.used / lic.total) * 100);
                        return (
                          <tr key={lic.app} className="border-b last:border-0 hover:bg-muted/50">
                            <td className="p-3 font-medium">{lic.app}</td>
                            <td className="p-3 text-center">{lic.total}</td>
                            <td className="p-3 text-center text-green-600">{lic.used}</td>
                            <td className="p-3 text-center text-red-500">{unused}</td>
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <div className="w-16 bg-muted rounded-full h-1.5">
                                  <div className={`h-1.5 rounded-full ${util >= 80 ? "bg-green-500" : util >= 60 ? "bg-yellow-500" : "bg-red-500"}`} style={{ width: `${util}%` }} />
                                </div>
                                <span className="text-xs">{util}%</span>
                              </div>
                            </td>
                            <td className="p-3 text-right">${lic.cost}</td>
                            <td className="p-3 text-right font-medium text-green-600">${unused * lic.cost}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Hardware Lifecycle */}
            <Card>
              <CardHeader><CardTitle className="text-lg">Hardware Lifecycle & Replacement</CardTitle></CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-4 mb-6">
                  {[
                    { label: "Avg device age", value: "2.1 yrs", sub: "Last year: 1.8 yrs", color: "text-blue-600" },
                    { label: "Devices due for refresh", value: "5", sub: "Within 6 months", color: "text-orange-500" },
                    { label: "Replacement budget", value: "$18K", sub: "Estimated annual", color: "text-red-500" },
                    { label: "Fleet health score", value: "84%", sub: "Last quarter: 81%", color: "text-green-600" },
                  ].map((kpi) => (
                    <div key={kpi.label} className="rounded-xl border p-4 text-center">
                      <div className="text-[11px] font-medium text-muted-foreground mb-2">{kpi.label}</div>
                      <div className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</div>
                      <div className="text-[10px] text-muted-foreground mt-1">{kpi.sub}</div>
                    </div>
                  ))}
                </div>
                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="rounded-xl border p-4">
                    <div className="text-sm font-semibold mb-4">Device age distribution</div>
                    <div className="space-y-3">
                      {[
                        { age: "0-1 years", count: 12, pct: 30, color: "bg-green-500" },
                        { age: "1-2 years", count: 15, pct: 38, color: "bg-blue-500" },
                        { age: "2-3 years", count: 8, pct: 20, color: "bg-yellow-500" },
                        { age: "3-4 years", count: 3, pct: 8, color: "bg-orange-500" },
                        { age: "4+ years", count: 2, pct: 5, color: "bg-red-500" },
                      ].map((item) => (
                        <div key={item.age} className="flex items-center gap-3">
                          <span className="text-sm w-20 text-muted-foreground">{item.age}</span>
                          <div className="flex-1 bg-muted rounded-full h-4">
                            <div className={`h-4 rounded-full ${item.color} flex items-center justify-end pr-2`} style={{ width: `${Math.max(item.pct, 10)}%` }}>
                              {item.pct > 15 && <span className="text-[9px] text-white font-medium">{item.count}</span>}
                            </div>
                          </div>
                          <span className="text-sm w-10 text-right font-medium">{item.pct}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl border p-4">
                    <div className="text-sm font-semibold mb-4">Replacement forecast (next 12 months)</div>
                    <div className="flex items-end gap-1 h-36">
                      {[2, 1, 0, 3, 1, 2, 0, 1, 4, 2, 1, 0].map((v, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                          {v > 0 && <span className="text-[9px] font-medium">{v}</span>}
                          <div className="w-full bg-orange-400 rounded-t" style={{ height: `${Math.max(v * 25, 2)}px` }} />
                          <span className="text-[8px] text-muted-foreground">{months[i]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          );
        })()}

        {/* Sustainability */}
        {activeSection === "sustainability" && (() => {
          const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          const co2Data = [3.2, 3.0, 2.9, 2.8, 2.7, 2.6, 2.5, 2.5, 2.4, 2.4, 2.3, 2.2];
          const energyData = [3200, 3100, 3050, 2980, 2900, 2850, 2800, 2780, 2730, 2700, 2680, 2650];
          return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Sustainability & Green IT</h2>
              <p className="text-muted-foreground">Drive sustainability through and within IT — leverage smart technology and data-driven insights to reduce environmental impact</p>
            </div>

            {/* Top KPIs */}
            <div className="grid gap-3 sm:grid-cols-5">
              {[
                { label: "Carbon footprint", value: "2.4t", sub: "CO₂e this quarter", color: "text-green-600" },
                { label: "Energy reduction", value: "18%", sub: "vs last quarter", color: "text-green-500" },
                { label: "Power cost savings", value: "$4.2K", sub: "YTD: $3.1K last year", color: "text-blue-600" },
                { label: "Sleep mode compliance", value: "89%", sub: "Last quarter: 82%", color: "text-green-600" },
                { label: "Green IT score", value: "B+", sub: "Last quarter: B", color: "text-green-500" },
              ].map((kpi) => (
                <div key={kpi.label} className="rounded-xl border p-4 text-center">
                  <div className="text-[11px] font-medium text-muted-foreground mb-2">{kpi.label}</div>
                  <div className={`text-3xl font-bold ${kpi.color}`}>{kpi.value}</div>
                  <div className="text-[10px] text-muted-foreground mt-1">{kpi.sub}</div>
                </div>
              ))}
            </div>

            {/* Charts */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* CO2 trend */}
              <Card>
                <CardHeader><CardTitle className="text-base">Carbon emissions trend (tCO₂e)</CardTitle></CardHeader>
                <CardContent>
                  <div className="relative h-44">
                    <svg viewBox="0 0 480 160" className="w-full h-full" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="co2Fill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#4ade80" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="#4ade80" stopOpacity="0.02" />
                        </linearGradient>
                      </defs>
                      <polygon fill="url(#co2Fill)" points={`0,160 ${co2Data.map((v, i) => `${i * (480 / 11)},${160 - (v - 2) * 120}`).join(" ")} ${11 * (480 / 11)},160`} />
                      <polyline fill="none" stroke="#4ade80" strokeWidth="2.5" points={co2Data.map((v, i) => `${i * (480 / 11)},${160 - (v - 2) * 120}`).join(" ")} />
                      {co2Data.map((v, i) => <circle key={i} cx={i * (480 / 11)} cy={160 - (v - 2) * 120} r="3" fill="#4ade80" />)}
                    </svg>
                    <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[8px] text-muted-foreground px-1">
                      {months.map((m) => <span key={m}>{m}</span>)}
                    </div>
                    <div className="absolute left-0 top-0 bottom-4 flex flex-col justify-between text-[8px] text-muted-foreground">
                      <span>3.2t</span><span>2.6t</span><span>2.0t</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Energy consumption trend */}
              <Card>
                <CardHeader><CardTitle className="text-base">Monthly energy consumption (kWh)</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex items-end gap-[3px] h-44">
                    {months.map((m, i) => (
                      <div key={m} className="flex-1 flex flex-col items-center gap-0.5">
                        <span className="text-[8px] text-muted-foreground">{energyData[i]}</span>
                        <div className="w-full bg-blue-400 rounded-t" style={{ height: `${((energyData[i] - 2400) / 900) * 140}px` }} />
                        <span className="text-[8px] text-muted-foreground">{m}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Energy breakdown + recommendations */}
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader><CardTitle className="text-base">Energy by device category</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex gap-6">
                    {/* Donut chart mockup */}
                    <div className="flex-shrink-0">
                      <svg viewBox="0 0 120 120" className="w-28 h-28">
                        <circle cx="60" cy="60" r="50" fill="none" stroke="#e5e7eb" strokeWidth="20" />
                        <circle cx="60" cy="60" r="50" fill="none" stroke="#3b82f6" strokeWidth="20" strokeDasharray="141 314" strokeDashoffset="0" className="origin-center -rotate-90" />
                        <circle cx="60" cy="60" r="50" fill="none" stroke="#22c55e" strokeWidth="20" strokeDasharray="79 314" strokeDashoffset="-141" className="origin-center -rotate-90" />
                        <circle cx="60" cy="60" r="50" fill="none" stroke="#eab308" strokeWidth="20" strokeDasharray="60 314" strokeDashoffset="-220" className="origin-center -rotate-90" />
                        <circle cx="60" cy="60" r="50" fill="none" stroke="#a855f7" strokeWidth="20" strokeDasharray="22 314" strokeDashoffset="-280" className="origin-center -rotate-90" />
                        <text x="60" y="56" textAnchor="middle" className="text-[11px] font-bold fill-foreground">2,730</text>
                        <text x="60" y="70" textAnchor="middle" className="text-[8px] fill-muted-foreground">kWh/mo</text>
                      </svg>
                    </div>
                    <div className="flex-1 space-y-2">
                      {[
                        { label: "Desktops", value: "1,240 kWh", pct: "45%", color: "bg-blue-500" },
                        { label: "Laptops", value: "680 kWh", pct: "25%", color: "bg-green-500" },
                        { label: "Monitors", value: "520 kWh", pct: "19%", color: "bg-yellow-500" },
                        { label: "Peripherals", value: "180 kWh", pct: "7%", color: "bg-purple-500" },
                        { label: "Networking", value: "110 kWh", pct: "4%", color: "bg-gray-400" },
                      ].map((item) => (
                        <div key={item.label} className="flex items-center gap-2 text-sm">
                          <span className={`h-3 w-3 rounded-sm ${item.color} flex-shrink-0`} />
                          <span className="flex-1">{item.label}</span>
                          <span className="text-muted-foreground">{item.value}</span>
                          <span className="font-medium w-8 text-right">{item.pct}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Sustainability actions</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { action: "Enable power management policies", impact: "High", savings: "~320 kWh/mo", color: "text-red-500" },
                      { action: "Schedule after-hours sleep mode", impact: "High", savings: "~280 kWh/mo", color: "text-red-500" },
                      { action: "Consolidate underused devices", impact: "Medium", savings: "~150 kWh/mo", color: "text-orange-500" },
                      { action: "Optimize display brightness", impact: "Low", savings: "~60 kWh/mo", color: "text-yellow-600" },
                      { action: "Enable USB auto-suspend", impact: "Low", savings: "~30 kWh/mo", color: "text-yellow-600" },
                    ].map((rec) => (
                      <div key={rec.action} className="flex items-center gap-3 py-2 border-b last:border-0">
                        <div className="flex-1">
                          <div className="text-sm font-medium">{rec.action}</div>
                          <div className="text-xs text-muted-foreground">Est. savings: {rec.savings}</div>
                        </div>
                        <Badge variant="outline" className={`${rec.color} border-current`}>{rec.impact}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Awareness */}
            <Card>
              <CardHeader><CardTitle className="text-base">Digital Workplace Awareness</CardTitle></CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    { label: "Employee nudges sent", value: "234", sub: "This month", color: "text-green-600", icon: "Automated tips about energy-saving practices" },
                    { label: "Top department", value: "Engineering", sub: "Score: 92/100", color: "text-blue-600", icon: "Gamified sustainability leaderboard" },
                    { label: "Environmental equivalent", value: "12 trees", sub: "CO₂ offset this quarter", color: "text-green-600", icon: "Real impact of your IT decisions" },
                  ].map((item) => (
                    <div key={item.label} className="rounded-xl border p-4 text-center bg-green-50/30 dark:bg-green-950/10">
                      <div className="text-[11px] font-medium text-muted-foreground mb-2">{item.icon}</div>
                      <div className={`text-2xl font-bold ${item.color}`}>{item.value}</div>
                      <div className="text-xs font-medium mt-1">{item.label}</div>
                      <div className="text-[10px] text-muted-foreground">{item.sub}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          );
        })()}

        </div>
      </main>
    </div>
  );
}
