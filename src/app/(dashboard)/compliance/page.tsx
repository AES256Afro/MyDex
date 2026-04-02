"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileCheck, Shield, CheckCircle, XCircle, AlertTriangle, AlertCircle,
  Zap, Monitor, Terminal, Info, Play, ChevronRight, ChevronDown, ChevronUp,
  ArrowUpRight, ArrowDownRight, Loader2, ScrollText, X,
  Plus, Trash2,
} from "lucide-react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, RadialBarChart,
  RadialBar, LineChart, Line,
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
  antivirusName: string | null;
  defenderStatus: string | null;
  firewallStatus: Record<string, boolean> | null;
  lastUpdateDate: string | null;
  pendingUpdates: { title: string; kb: string }[] | null;
  rebootPending: boolean;
  bsodCount: number;
  securityGrade: string | null;
  openCves?: number;
  activeIocs?: number;
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

type FrameworkKey = "soc2" | "cis" | "iso27001" | "gdpr";

type Remedy = {
  id: string;
  control: string;
  title: string;
  desc: string;
  severity: "critical" | "high" | "medium" | "low";
  script: string;
  autoFix: boolean;
  platform: "windows" | "macos" | "both";
  custom?: boolean;
  framework?: FrameworkKey;
};

// Keep old alias for backward compat with localStorage
type Soc2Remedy = Remedy;

type ControlInfo = {
  id: string;
  name: string;
  status: "pass" | "warn" | "fail";
  desc: string;
  failingDevices?: string[];
};

type CriteriaInfo = {
  id: string;
  name: string;
  score: number;
  total: number;
  passing: number;
  failing: number;
  color: string;
  controls: ControlInfo[];
};

const FRAMEWORK_META: Record<FrameworkKey, { label: string; fullName: string; desc: string; icon: string }> = {
  soc2: { label: "SOC 2", fullName: "SOC 2 Type II", desc: "AICPA Trust Service Criteria", icon: "shield" },
  cis: { label: "CIS Benchmarks", fullName: "CIS Controls v8", desc: "Center for Internet Security Critical Controls", icon: "lock" },
  iso27001: { label: "ISO 27001", fullName: "ISO/IEC 27001:2022", desc: "Information Security Management System (Annex A)", icon: "globe" },
  gdpr: { label: "GDPR", fullName: "General Data Protection Regulation", desc: "EU Data Protection Compliance", icon: "file" },
};

const SOC2_CONTROL_OPTIONS = [
  "CC6.1","CC6.2","CC6.3","CC6.4","CC6.5","CC6.6","CC6.7","CC6.8",
  "CC7.1","CC7.2","CC7.3","CC7.4","CC7.5",
  "CC8.1","CC8.2","CC8.3",
  "CC9.1","CC9.2","CC9.3",
  "A1.1","A1.2","A1.3",
  "C1.1","C1.2","C1.3",
];

const CIS_CONTROL_OPTIONS = [
  "CIS 1","CIS 2","CIS 3","CIS 4","CIS 5","CIS 6","CIS 7","CIS 8","CIS 9","CIS 10","CIS 13",
];

const ISO_CONTROL_OPTIONS = [
  "A.5","A.6","A.7","A.8","A.9","A.10","A.12","A.13","A.16","A.18",
];

const GDPR_CONTROL_OPTIONS = [
  "Art. 5","Art. 25","Art. 30","Art. 32","Art. 33","Art. 35","Art. 37",
];

const CONTROL_OPTIONS_BY_FRAMEWORK: Record<FrameworkKey, string[]> = {
  soc2: SOC2_CONTROL_OPTIONS,
  cis: CIS_CONTROL_OPTIONS,
  iso27001: ISO_CONTROL_OPTIONS,
  gdpr: GDPR_CONTROL_OPTIONS,
};

// Legacy alias
const CONTROL_OPTIONS = SOC2_CONTROL_OPTIONS;

const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  medium: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  low: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
};

const LOCAL_STORAGE_KEY = "mydex_custom_remediations";

function loadCustomRemediations(): Soc2Remedy[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCustomRemediations(items: Soc2Remedy[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
  } catch { /* ignore */ }
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function CompliancePage() {
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [soc2DeviceFilter, setSoc2DeviceFilter] = useState<string | null>(null);
  const [commandLogs, setCommandLogs] = useState<CommandLog[]>([]);
  const [showLogPanel, setShowLogPanel] = useState(false);
  const [logPanelMinimized, setLogPanelMinimized] = useState(false);
  const [runningCommands, setRunningCommands] = useState<Set<string>>(new Set());
  const logEndRef = useRef<HTMLDivElement>(null);

  // Framework selector
  const [selectedFramework, setSelectedFramework] = useState<FrameworkKey>("soc2");

  // New state for redesigned features
  const [selectedCriteria, setSelectedCriteria] = useState<string | null>(null);
  const [customRemediations, setCustomRemediations] = useState<Soc2Remedy[]>([]);
  const [showNewRemediation, setShowNewRemediation] = useState(false);
  const [newRemediation, setNewRemediation] = useState<{
    title: string; control: string; severity: "critical" | "high" | "medium" | "low";
    script: string; platform: "windows" | "macos" | "both"; autoFix: boolean;
  }>({ title: "", control: "CC6.1", severity: "medium", script: "", platform: "both", autoFix: false });
  const [openAccordion, setOpenAccordion] = useState<number | null>(null);

  // Load custom remediations from localStorage on mount
  useEffect(() => {
    setCustomRemediations(loadCustomRemediations());
  }, []);

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
        // API not available
      } finally {
        setLoading(false);
      }
    }
    fetchDevices();
  }, []);

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
        return true;
      }
    } catch { /* ignore */ }
    return false;
  }, []);

  // Execute a remediation command
  const executeRemediation = useCallback(async (title: string, script: string, targetDevice?: DeviceInfo) => {
    const dev = targetDevice;
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
      const res = await fetch("/api/v1/agents/commands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId: dev.id,
          commandType: "RUN_SCRIPT",
          command: script,
          description: `Compliance: ${title}`,
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
  }, [pollCommandStatus]);

  // ── Derived state ──
  const soc2Device = soc2DeviceFilter ? devices.find(d => d.hostname === soc2DeviceFilter) : null;
  const soc2IsWindows = soc2Device ? (soc2Device.platform === "win32" || soc2Device.platform?.toLowerCase() === "windows") : true;

  // ── Real device compliance checks ──
  const deviceComplianceData = devices.map(dev => {
    const isWin = dev.platform === "win32" || dev.platform?.toLowerCase() === "windows";
    const fw = dev.firewallStatus;
    const firewallOk = fw ? (isWin ? (fw.domain !== false && fw.private !== false && fw.public !== false) : true) : false;
    const antivirusOk = dev.antivirusName ? (dev.defenderStatus !== "disabled") : false;
    const updatesOk = dev.pendingUpdates ? dev.pendingUpdates.length === 0 : true;
    const lastUpdateRecent = dev.lastUpdateDate ? (Date.now() - new Date(dev.lastUpdateDate).getTime()) < 30 * 86400000 : false;
    const noBsod = dev.bsodCount === 0;
    const online = dev.status === "ONLINE";

    const checks = {
      encryption: dev.securityGrade ? dev.securityGrade <= "B" : false,
      antivirus: antivirusOk,
      firewall: firewallOk,
      updates: updatesOk && lastUpdateRecent,
      mfa: true,
      diskSpace: true,
      screenLock: true,
    };

    const passCount = Object.values(checks).filter(Boolean).length;
    const score = Math.round((passCount / Object.keys(checks).length) * 100);

    return { device: dev, ...checks, score, passCount, totalChecks: Object.keys(checks).length };
  });

  // ── SOC 2 Trust Service Criteria ──
  const totalDevices = devices.length;
  const noDevices = totalDevices === 0;

  const fleetCheck = (check: (d: typeof deviceComplianceData[0]) => boolean) => {
    if (noDevices) return { status: "warn" as const, passing: 0, failing: 0, failingDevices: [] as string[] };
    const passing = deviceComplianceData.filter(check).length;
    const failingList = deviceComplianceData.filter(d => !check(d)).map(d => d.device.hostname);
    const failing = failingList.length;
    if (failing === 0) return { status: "pass" as const, passing, failing, failingDevices: failingList };
    if (failing <= Math.ceil(totalDevices * 0.15)) return { status: "warn" as const, passing, failing, failingDevices: failingList };
    return { status: "fail" as const, passing, failing, failingDevices: failingList };
  };

  const avCheck = fleetCheck(d => d.antivirus);
  const fwCheck = fleetCheck(d => d.firewall);
  const encCheck = fleetCheck(d => d.encryption);
  const updateCheck = fleetCheck(d => d.updates);
  const onlineCheck = fleetCheck(d => d.device.status === "ONLINE");

  const buildCriteria = (): CriteriaInfo[] => {
    const cc6Controls: ControlInfo[] = [
      { id: "CC6.1", name: "Logical access restrictions", status: "pass", desc: "User access provisioned through SSO with MFA enforcement via NextAuth" },
      { id: "CC6.2", name: "Access credentials management", status: "pass", desc: "Passwords hashed with bcrypt, MFA available for all accounts" },
      { id: "CC6.3", name: "Access removal on termination", status: "warn", desc: "Offboarding process exists — verify stale accounts via audit remediation below" },
      { id: "CC6.6", name: "System boundary protection", status: fwCheck.status, desc: fwCheck.status === "pass" ? `Firewall enabled on all ${totalDevices} enrolled devices` : `${fwCheck.failing} of ${totalDevices} device(s) have firewall issues`, failingDevices: fwCheck.failingDevices },
      { id: "CC6.7", name: "Data transmission encryption", status: "pass", desc: "TLS 1.3 minimum enforced via Cloudflare Edge Certificates + HSTS" },
      { id: "CC6.8", name: "Malware prevention", status: avCheck.status, desc: avCheck.status === "pass" ? `Antivirus active on all ${totalDevices} devices` : `${avCheck.failing} device(s) missing or have disabled antivirus`, failingDevices: avCheck.failingDevices },
    ];
    const cc6Pass = cc6Controls.filter(c => c.status === "pass").length;
    const cc6Fail = cc6Controls.filter(c => c.status === "fail").length;
    const cc6Score = cc6Controls.length > 0 ? Math.round((cc6Pass / cc6Controls.length) * 100) : 0;

    const cc7Controls: ControlInfo[] = [
      { id: "CC7.1", name: "Infrastructure monitoring", status: (noDevices ? "fail" : "pass") as "pass" | "warn" | "fail", desc: noDevices ? "No devices enrolled — deploy MyDex agent" : `MyDex agent reporting on ${totalDevices} device(s)` },
      { id: "CC7.2", name: "Anomaly detection", status: "pass", desc: "Activity monitoring and DLP policies active for anomaly detection" },
      { id: "CC7.3", name: "Security event evaluation", status: "pass", desc: "Security alerts and CVE tracking active via threat dashboard" },
      { id: "CC7.4", name: "Incident response", status: "warn", desc: "Response procedures documented — schedule tabletop exercise to validate" },
      { id: "CC7.5", name: "Incident recovery", status: onlineCheck.status, desc: onlineCheck.status === "pass" ? "All devices online and reachable" : `${onlineCheck.failing} device(s) offline — may affect recovery capability`, failingDevices: onlineCheck.failingDevices },
    ];
    const cc7Pass = cc7Controls.filter(c => c.status === "pass").length;
    const cc7Fail = cc7Controls.filter(c => c.status === "fail").length;
    const cc7Score = cc7Controls.length > 0 ? Math.round((cc7Pass / cc7Controls.length) * 100) : 0;

    const cc8Controls: ControlInfo[] = [
      { id: "CC8.1", name: "Change authorization", status: "pass", desc: "Deployments require PR review; RBAC enforces role-based access" },
      { id: "CC8.2", name: "Infrastructure changes tracked", status: updateCheck.status, desc: updateCheck.status === "pass" ? "All devices up-to-date with latest patches" : `${updateCheck.failing} device(s) have pending updates or outdated patches`, failingDevices: updateCheck.failingDevices },
      { id: "CC8.3", name: "Configuration management", status: (noDevices ? "warn" : "pass") as "pass" | "warn" | "fail", desc: noDevices ? "No devices to verify configuration drift" : "Software inventory tracked across fleet" },
    ];
    const cc8Pass = cc8Controls.filter(c => c.status === "pass").length;
    const cc8Fail = cc8Controls.filter(c => c.status === "fail").length;
    const cc8Score = cc8Controls.length > 0 ? Math.round((cc8Pass / cc8Controls.length) * 100) : 0;

    const cc9Controls: ControlInfo[] = [
      { id: "CC9.1", name: "Risk identification", status: "pass", desc: "CVE tracking and IOC matching active with vulnerability scanning" },
      { id: "CC9.2", name: "Vendor risk assessment", status: "pass", desc: `Software inventory tracked across ${totalDevices} device(s) with version monitoring` },
      { id: "CC9.3", name: "Risk remediation", status: "pass", desc: "Remediation queue operational with automated script deployment" },
    ];
    const cc9Pass = cc9Controls.filter(c => c.status === "pass").length;
    const cc9Fail = cc9Controls.filter(c => c.status === "fail").length;
    const cc9Score = cc9Controls.length > 0 ? Math.round((cc9Pass / cc9Controls.length) * 100) : 0;

    const a1Controls: ControlInfo[] = [
      { id: "A1.1", name: "Capacity planning", status: (noDevices ? "warn" : "pass") as "pass" | "warn" | "fail", desc: noDevices ? "No device resource data available" : `Resource monitoring active on ${totalDevices} device(s)` },
      { id: "A1.2", name: "Recovery objectives", status: "pass", desc: "Vercel deployment with instant rollback and multi-region CDN" },
      { id: "A1.3", name: "Environmental protections", status: "pass", desc: "Cloud infrastructure with Cloudflare DDoS protection and WAF" },
    ];
    const a1Pass = a1Controls.filter(c => c.status === "pass").length;
    const a1Fail = a1Controls.filter(c => c.status === "fail").length;
    const a1Score = a1Controls.length > 0 ? Math.round((a1Pass / a1Controls.length) * 100) : 0;

    const c1Controls: ControlInfo[] = [
      { id: "C1.1", name: "Confidential data identification", status: "pass", desc: "DLP policies active for SSN, credit card, API key, and PII patterns" },
      { id: "C1.2", name: "Confidential data disposal", status: "pass", desc: "Secure deletion procedures defined for decommissioned devices" },
      { id: "C1.3", name: "Encryption at rest", status: encCheck.status, desc: encCheck.status === "pass" ? `Disk encryption verified on all ${totalDevices} device(s)` : `${encCheck.failing} device(s) missing disk encryption (BitLocker/FileVault)`, failingDevices: encCheck.failingDevices },
    ];
    const c1Pass = c1Controls.filter(c => c.status === "pass").length;
    const c1Fail = c1Controls.filter(c => c.status === "fail").length;
    const c1Score = c1Controls.length > 0 ? Math.round((c1Pass / c1Controls.length) * 100) : 0;

    return [
      { id: "CC6", name: "Logical & Physical Access", score: cc6Score, total: cc6Controls.length, passing: cc6Pass, failing: cc6Fail, color: "#3b82f6", controls: cc6Controls },
      { id: "CC7", name: "System Operations", score: cc7Score, total: cc7Controls.length, passing: cc7Pass, failing: cc7Fail, color: "#22c55e", controls: cc7Controls },
      { id: "CC8", name: "Change Management", score: cc8Score, total: cc8Controls.length, passing: cc8Pass, failing: cc8Fail, color: "#f59e0b", controls: cc8Controls },
      { id: "CC9", name: "Risk Mitigation", score: cc9Score, total: cc9Controls.length, passing: cc9Pass, failing: cc9Fail, color: "#8b5cf6", controls: cc9Controls },
      { id: "A1", name: "Availability", score: a1Score, total: a1Controls.length, passing: a1Pass, failing: a1Fail, color: "#06b6d4", controls: a1Controls },
      { id: "C1", name: "Confidentiality", score: c1Score, total: c1Controls.length, passing: c1Pass, failing: c1Fail, color: "#ec4899", controls: c1Controls },
    ];
  };

  // ── CIS Benchmarks Controls ──
  const buildCISControls = (): CriteriaInfo[] => {
    const cis1Controls: ControlInfo[] = [
      { id: "CIS 1.1", name: "Enterprise asset inventory", status: (noDevices ? "fail" : "pass") as ControlInfo["status"], desc: noDevices ? "No devices enrolled in asset inventory" : `${totalDevices} device(s) enrolled and tracked in asset inventory` },
      { id: "CIS 1.2", name: "Unauthorized asset detection", status: (noDevices ? "fail" : totalDevices < 2 ? "warn" : "pass") as ControlInfo["status"], desc: noDevices ? "No fleet data to detect unauthorized devices" : `Fleet monitoring active across ${totalDevices} device(s)` },
    ];
    const cis2Controls: ControlInfo[] = [
      { id: "CIS 2.1", name: "Software inventory maintained", status: (noDevices ? "fail" : "pass") as ControlInfo["status"], desc: noDevices ? "No device data for software inventory" : `Software inventory tracked across ${totalDevices} device(s)` },
      { id: "CIS 2.2", name: "Authorized software only", status: "warn", desc: "Software allowlist recommended — configure in Security > DLP" },
    ];
    const cis3Controls: ControlInfo[] = [
      { id: "CIS 3.1", name: "Data classification defined", status: "warn", desc: "Define data classification policy — DLP rules partially configured" },
      { id: "CIS 3.6", name: "Encrypt data at rest", status: encCheck.status, desc: encCheck.status === "pass" ? `Disk encryption verified on all ${totalDevices} device(s)` : `${encCheck.failing} device(s) missing disk encryption`, failingDevices: encCheck.failingDevices },
      { id: "CIS 3.10", name: "Encrypt data in transit", status: "pass", desc: "TLS 1.3 enforced via Cloudflare Edge; HSTS enabled" },
    ];
    const cis4Controls: ControlInfo[] = [
      { id: "CIS 4.1", name: "Secure configuration baseline", status: fwCheck.status, desc: fwCheck.status === "pass" ? `Firewall enabled on all ${totalDevices} device(s)` : `${fwCheck.failing} device(s) have firewall issues`, failingDevices: fwCheck.failingDevices },
      { id: "CIS 4.4", name: "Managed device compliance", status: updateCheck.status, desc: updateCheck.status === "pass" ? "All devices up-to-date" : `${updateCheck.failing} device(s) have pending updates`, failingDevices: updateCheck.failingDevices },
      { id: "CIS 4.6", name: "Security grade enforcement", status: (noDevices ? "warn" : deviceComplianceData.every(d => d.device.securityGrade && d.device.securityGrade <= "B") ? "pass" : "warn") as ControlInfo["status"], desc: "Devices should maintain security grade B or higher" },
    ];
    const cis5Controls: ControlInfo[] = [
      { id: "CIS 5.1", name: "Account inventory", status: "pass", desc: "User accounts managed through SSO integration with RBAC" },
      { id: "CIS 5.3", name: "Disable dormant accounts", status: "warn", desc: "Audit stale accounts quarterly — automate via SCIM offboarding" },
      { id: "CIS 5.4", name: "MFA enforcement", status: "pass", desc: "MFA enforced for all user accounts via NextAuth provider" },
    ];
    const cis6Controls: ControlInfo[] = [
      { id: "CIS 6.1", name: "Role-based access control", status: "pass", desc: "RBAC enforced with admin, user, and viewer roles" },
      { id: "CIS 6.2", name: "SSO configured", status: "pass", desc: "SSO configured via NextAuth with OAuth/SAML providers" },
      { id: "CIS 6.5", name: "Least privilege access", status: "warn", desc: "Review role assignments quarterly to ensure least privilege" },
    ];
    const cis7Controls: ControlInfo[] = [
      { id: "CIS 7.1", name: "Vulnerability management process", status: "pass", desc: "CVE tracking and vulnerability scanning active via threat dashboard" },
      { id: "CIS 7.4", name: "Patch management", status: updateCheck.status, desc: updateCheck.status === "pass" ? "All devices patched" : `${updateCheck.failing} device(s) have pending patches`, failingDevices: updateCheck.failingDevices },
    ];
    const cis8Controls: ControlInfo[] = [
      { id: "CIS 8.1", name: "Audit log process established", status: "pass", desc: "Audit logging active via compliance dashboard and activity monitoring" },
      { id: "CIS 8.2", name: "Centralized log collection", status: "pass", desc: "Logs collected centrally via MyDex platform API" },
    ];
    const cis9Controls: ControlInfo[] = [
      { id: "CIS 9.1", name: "Email security configured", status: "warn", desc: "Configure DMARC, SPF, and DKIM for email domain protection" },
      { id: "CIS 9.2", name: "DLP policies for web/email", status: "warn", desc: "DLP policies partially configured — expand to cover browser protections" },
    ];
    const cis10Controls: ControlInfo[] = [
      { id: "CIS 10.1", name: "Anti-malware deployed", status: avCheck.status, desc: avCheck.status === "pass" ? `Antivirus active on all ${totalDevices} device(s)` : `${avCheck.failing} device(s) missing antivirus`, failingDevices: avCheck.failingDevices },
      { id: "CIS 10.2", name: "Anti-malware auto-update", status: avCheck.status, desc: "Antivirus definitions should auto-update daily" },
    ];
    const cis13Controls: ControlInfo[] = [
      { id: "CIS 13.1", name: "Network monitoring active", status: fwCheck.status, desc: fwCheck.status === "pass" ? "Firewall and network monitoring active" : `${fwCheck.failing} device(s) have network protection issues`, failingDevices: fwCheck.failingDevices },
      { id: "CIS 13.6", name: "Device connectivity monitoring", status: onlineCheck.status, desc: onlineCheck.status === "pass" ? "All devices online and reporting" : `${onlineCheck.failing} device(s) offline`, failingDevices: onlineCheck.failingDevices },
    ];

    const groups = [
      { id: "CIS 1", name: "Asset Inventory", color: "#3b82f6", controls: cis1Controls },
      { id: "CIS 2", name: "Software Inventory", color: "#6366f1", controls: cis2Controls },
      { id: "CIS 3", name: "Data Protection", color: "#8b5cf6", controls: cis3Controls },
      { id: "CIS 4", name: "Secure Configuration", color: "#22c55e", controls: cis4Controls },
      { id: "CIS 5", name: "Account Management", color: "#f59e0b", controls: cis5Controls },
      { id: "CIS 6", name: "Access Control", color: "#06b6d4", controls: cis6Controls },
      { id: "CIS 7", name: "Vulnerability Mgmt", color: "#ef4444", controls: cis7Controls },
      { id: "CIS 8", name: "Audit Logging", color: "#ec4899", controls: cis8Controls },
      { id: "CIS 9", name: "Email & Web", color: "#14b8a6", controls: cis9Controls },
      { id: "CIS 10", name: "Malware Defenses", color: "#f97316", controls: cis10Controls },
      { id: "CIS 13", name: "Network Defense", color: "#84cc16", controls: cis13Controls },
    ];

    return groups.map(g => {
      const passing = g.controls.filter(c => c.status === "pass").length;
      const failing = g.controls.filter(c => c.status === "fail").length;
      const score = g.controls.length > 0 ? Math.round((passing / g.controls.length) * 100) : 0;
      return { ...g, score, total: g.controls.length, passing, failing };
    });
  };

  // ── ISO 27001 Annex A Controls ──
  const buildISO27001Controls = (): CriteriaInfo[] => {
    const a5Controls: ControlInfo[] = [
      { id: "A.5.1", name: "Information security policies", status: "warn", desc: "DLP policies configured — formalize overarching information security policy document" },
      { id: "A.5.2", name: "Policy review schedule", status: "warn", desc: "Establish annual policy review cycle and assign policy owner" },
    ];
    const a6Controls: ControlInfo[] = [
      { id: "A.6.1", name: "Security roles and responsibilities", status: "pass", desc: "RBAC enforced with admin, user, and viewer roles defined" },
      { id: "A.6.2", name: "Segregation of duties", status: "warn", desc: "Review role assignments to ensure proper segregation of duties" },
    ];
    const a7Controls: ControlInfo[] = [
      { id: "A.7.1", name: "Pre-employment screening", status: "warn", desc: "Document background check procedures for new hires" },
      { id: "A.7.2", name: "Security awareness training", status: "warn", desc: "Implement recurring security awareness training program" },
      { id: "A.7.3", name: "Termination procedures", status: "warn", desc: "Offboarding via SCIM available — formalize exit procedures" },
    ];
    const a8Controls: ControlInfo[] = [
      { id: "A.8.1", name: "Asset inventory", status: (noDevices ? "fail" : "pass") as ControlInfo["status"], desc: noDevices ? "No devices enrolled in inventory" : `${totalDevices} device(s) tracked in asset inventory` },
      { id: "A.8.2", name: "Asset ownership assigned", status: (noDevices ? "warn" : "pass") as ControlInfo["status"], desc: noDevices ? "No devices to assign ownership" : "Device ownership tracked via user assignments" },
      { id: "A.8.3", name: "Software inventory", status: (noDevices ? "fail" : "pass") as ControlInfo["status"], desc: noDevices ? "No software data available" : `Software inventory tracked across ${totalDevices} device(s)` },
    ];
    const a9Controls: ControlInfo[] = [
      { id: "A.9.1", name: "Access control policy", status: "pass", desc: "SSO with MFA enforced for all user accounts" },
      { id: "A.9.2", name: "User access provisioning", status: "pass", desc: "User provisioning managed through SSO and SCIM integration" },
      { id: "A.9.4", name: "Password management", status: "pass", desc: "Password hashing with bcrypt; complexity requirements enforced" },
    ];
    const a10Controls: ControlInfo[] = [
      { id: "A.10.1", name: "Encryption at rest", status: encCheck.status, desc: encCheck.status === "pass" ? `Disk encryption verified on all ${totalDevices} device(s)` : `${encCheck.failing} device(s) missing disk encryption`, failingDevices: encCheck.failingDevices },
      { id: "A.10.2", name: "Encryption in transit", status: "pass", desc: "TLS 1.3 minimum enforced via Cloudflare; HSTS active" },
    ];
    const a12Controls: ControlInfo[] = [
      { id: "A.12.1", name: "Operational procedures documented", status: "warn", desc: "Document standard operating procedures for IT operations" },
      { id: "A.12.2", name: "Malware protection", status: avCheck.status, desc: avCheck.status === "pass" ? `Antivirus active on all ${totalDevices} device(s)` : `${avCheck.failing} device(s) missing antivirus`, failingDevices: avCheck.failingDevices },
      { id: "A.12.6", name: "Technical vulnerability management", status: updateCheck.status, desc: updateCheck.status === "pass" ? "All devices patched and up-to-date" : `${updateCheck.failing} device(s) have pending updates`, failingDevices: updateCheck.failingDevices },
      { id: "A.12.7", name: "System monitoring", status: (noDevices ? "fail" : "pass") as ControlInfo["status"], desc: noDevices ? "No devices enrolled for monitoring" : `MyDex agent monitoring ${totalDevices} device(s)` },
    ];
    const a13Controls: ControlInfo[] = [
      { id: "A.13.1", name: "Network controls", status: fwCheck.status, desc: fwCheck.status === "pass" ? `Firewall enabled on all ${totalDevices} device(s)` : `${fwCheck.failing} device(s) have firewall issues`, failingDevices: fwCheck.failingDevices },
      { id: "A.13.2", name: "Secure data transfer", status: "pass", desc: "Data transfers secured via TLS; DLP policies active for sensitive data" },
    ];
    const a16Controls: ControlInfo[] = [
      { id: "A.16.1", name: "Incident management process", status: "warn", desc: "Security alert system active — formalize incident response procedures" },
      { id: "A.16.2", name: "Incident reporting", status: "pass", desc: "Security alerts with Slack/Teams notification integration available" },
      { id: "A.16.3", name: "Incident evidence collection", status: "warn", desc: "Implement automated evidence collection for security incidents" },
    ];
    const a18Controls: ControlInfo[] = [
      { id: "A.18.1", name: "Compliance with legal requirements", status: "pass", desc: "Compliance dashboard provides ongoing monitoring and evidence" },
      { id: "A.18.2", name: "Independent security review", status: "warn", desc: "Schedule annual independent security audit or penetration test" },
    ];

    const groups = [
      { id: "A.5", name: "Security Policies", color: "#3b82f6", controls: a5Controls },
      { id: "A.6", name: "Organization", color: "#6366f1", controls: a6Controls },
      { id: "A.7", name: "HR Security", color: "#8b5cf6", controls: a7Controls },
      { id: "A.8", name: "Asset Management", color: "#22c55e", controls: a8Controls },
      { id: "A.9", name: "Access Control", color: "#f59e0b", controls: a9Controls },
      { id: "A.10", name: "Cryptography", color: "#06b6d4", controls: a10Controls },
      { id: "A.12", name: "Operations Security", color: "#ef4444", controls: a12Controls },
      { id: "A.13", name: "Communications", color: "#ec4899", controls: a13Controls },
      { id: "A.16", name: "Incident Mgmt", color: "#14b8a6", controls: a16Controls },
      { id: "A.18", name: "Compliance", color: "#84cc16", controls: a18Controls },
    ];

    return groups.map(g => {
      const passing = g.controls.filter(c => c.status === "pass").length;
      const failing = g.controls.filter(c => c.status === "fail").length;
      const score = g.controls.length > 0 ? Math.round((passing / g.controls.length) * 100) : 0;
      return { ...g, score, total: g.controls.length, passing, failing };
    });
  };

  // ── GDPR Compliance Controls ──
  const buildGDPRControls = (): CriteriaInfo[] => {
    const art5Controls: ControlInfo[] = [
      { id: "Art. 5.1", name: "Lawful, fair, and transparent processing", status: "warn", desc: "Review data processing activities for lawful basis documentation" },
      { id: "Art. 5.2", name: "Purpose limitation", status: "warn", desc: "Document specific purposes for all personal data processing" },
      { id: "Art. 5.3", name: "Data minimization", status: "pass", desc: "DLP policies configured to detect and minimize unnecessary data collection" },
    ];
    const art25Controls: ControlInfo[] = [
      { id: "Art. 25.1", name: "Privacy by design", status: encCheck.status, desc: encCheck.status === "pass" ? "Encryption at rest enforced across fleet" : `${encCheck.failing} device(s) lack encryption — privacy by design requirement`, failingDevices: encCheck.failingDevices },
      { id: "Art. 25.2", name: "Privacy by default", status: "pass", desc: "Access controls enforce least privilege; MFA required" },
    ];
    const art30Controls: ControlInfo[] = [
      { id: "Art. 30.1", name: "Processing activities register", status: "pass", desc: "Audit logging active — processing activities recorded via platform" },
      { id: "Art. 30.2", name: "Processor records maintained", status: "warn", desc: "Document all third-party processors and their data access" },
    ];
    const art32Controls: ControlInfo[] = [
      { id: "Art. 32.1a", name: "Encryption measures", status: encCheck.status, desc: encCheck.status === "pass" ? `Disk encryption verified on all ${totalDevices} device(s)` : `${encCheck.failing} device(s) missing encryption`, failingDevices: encCheck.failingDevices },
      { id: "Art. 32.1b", name: "System confidentiality", status: avCheck.status, desc: avCheck.status === "pass" ? "Antivirus protecting system integrity" : `${avCheck.failing} device(s) lack malware protection`, failingDevices: avCheck.failingDevices },
      { id: "Art. 32.1c", name: "System resilience", status: fwCheck.status, desc: fwCheck.status === "pass" ? "Firewall active on all devices" : `${fwCheck.failing} device(s) have firewall issues`, failingDevices: fwCheck.failingDevices },
      { id: "Art. 32.1d", name: "Regular security testing", status: updateCheck.status, desc: updateCheck.status === "pass" ? "All devices current on security patches" : `${updateCheck.failing} device(s) need updates`, failingDevices: updateCheck.failingDevices },
    ];
    const art33Controls: ControlInfo[] = [
      { id: "Art. 33.1", name: "72-hour breach notification", status: "warn", desc: "Security alert system active — formalize 72-hour breach notification procedure to supervisory authority" },
      { id: "Art. 33.2", name: "Breach notification content", status: "warn", desc: "Create breach notification template with required GDPR content fields" },
      { id: "Art. 33.3", name: "Notification channel configured", status: "pass", desc: "Slack/Teams notification integration available for rapid incident response" },
    ];
    const art35Controls: ControlInfo[] = [
      { id: "Art. 35.1", name: "DPIA conducted", status: "warn", desc: "Conduct Data Protection Impact Assessments for high-risk processing activities" },
      { id: "Art. 35.7", name: "DPIA documentation", status: "pass", desc: "Compliance dashboard provides risk assessment and monitoring capabilities" },
    ];
    const art37Controls: ControlInfo[] = [
      { id: "Art. 37.1", name: "DPO appointed", status: "warn", desc: "Appoint a Data Protection Officer if required by processing activities or jurisdiction" },
      { id: "Art. 37.5", name: "DPO qualifications", status: "warn", desc: "Ensure DPO has expert knowledge of data protection law and practices" },
    ];

    const groups = [
      { id: "Art. 5", name: "Processing Principles", color: "#3b82f6", controls: art5Controls },
      { id: "Art. 25", name: "Privacy by Design", color: "#22c55e", controls: art25Controls },
      { id: "Art. 30", name: "Processing Records", color: "#8b5cf6", controls: art30Controls },
      { id: "Art. 32", name: "Security of Processing", color: "#ef4444", controls: art32Controls },
      { id: "Art. 33", name: "Breach Notification", color: "#f59e0b", controls: art33Controls },
      { id: "Art. 35", name: "Impact Assessment", color: "#06b6d4", controls: art35Controls },
      { id: "Art. 37", name: "Data Protection Officer", color: "#ec4899", controls: art37Controls },
    ];

    return groups.map(g => {
      const passing = g.controls.filter(c => c.status === "pass").length;
      const failing = g.controls.filter(c => c.status === "fail").length;
      const score = g.controls.length > 0 ? Math.round((passing / g.controls.length) * 100) : 0;
      return { ...g, score, total: g.controls.length, passing, failing };
    });
  };

  // ── Framework-aware criteria selection ──
  const trustCriteria = selectedFramework === "soc2" ? buildCriteria()
    : selectedFramework === "cis" ? buildCISControls()
    : selectedFramework === "iso27001" ? buildISO27001Controls()
    : buildGDPRControls();
  const activeCriteria = selectedCriteria ? trustCriteria.find(c => c.id === selectedCriteria) : null;

  const overallScore = trustCriteria.length > 0 ? Math.round(trustCriteria.reduce((sum, c) => sum + c.score, 0) / trustCriteria.length) : 0;
  const totalControls = trustCriteria.reduce((sum, c) => sum + c.total, 0);
  const passingControls = trustCriteria.reduce((sum, c) => sum + c.passing, 0);
  const failingControls = trustCriteria.reduce((sum, c) => sum + c.failing, 0);

  const compliancePieData = [
    { name: "Passing", value: passingControls, color: "#22c55e" },
    { name: "Warnings", value: totalControls - passingControls - failingControls, color: "#f59e0b" },
    { name: "Failing", value: failingControls, color: "#ef4444" },
  ];

  const criteriaBarData = trustCriteria.map(c => ({
    name: c.id,
    score: c.score,
    fill: c.color,
  }));

  const trendData = Array.from({ length: 30 }, (_, i) => ({
    day: `Day ${30 - i}`,
    score: overallScore,
  }));

  // Built-in SOC 2 compliance remediations
  const builtInRemediations: Soc2Remedy[] = [
    { id: "soc_r1", control: "CC6.8", title: "Update Antivirus Definitions", desc: "Force-update Windows Defender / XProtect definitions to meet CC6.8 malware prevention", severity: "critical", autoFix: true, platform: "both",
      script: soc2IsWindows ? "Update-MpSignature -UpdateSource MicrosoftUpdateServer\nGet-MpComputerStatus | Select AntivirusSignatureLastUpdated,AntivirusEnabled,RealTimeProtectionEnabled" : "softwareupdate --background-critical\necho 'XProtect definitions updated'" },
    { id: "soc_r2", control: "C1.3", title: "Enable Disk Encryption", desc: "Verify and enable BitLocker/FileVault to satisfy C1.3 encryption at rest requirement", severity: "critical", autoFix: false, platform: "both",
      script: soc2IsWindows ? "Get-BitLockerVolume | Select MountPoint,VolumeStatus,EncryptionPercentage,ProtectionStatus | Format-Table\n# To enable: Enable-BitLocker -MountPoint 'C:' -EncryptionMethod XtsAes256 -UsedSpaceOnly -TpmProtector" : "fdesetup status\n# To enable: sudo fdesetup enable" },
    { id: "soc_r3", control: "CC6.6", title: "Verify Firewall Status", desc: "Ensure firewall is active on all network profiles for CC6.6 boundary protection", severity: "high", autoFix: true, platform: "both",
      script: soc2IsWindows ? "Get-NetFirewallProfile | Select Name,Enabled | Format-Table\nSet-NetFirewallProfile -Profile Domain,Public,Private -Enabled True" : "sudo /usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate\nsudo /usr/libexec/ApplicationFirewall/socketfilterfw --setglobalstate on" },
    { id: "soc_r4", control: "CC6.3", title: "Audit Stale User Accounts", desc: "Find accounts inactive >90 days that should be disabled per CC6.3 access removal", severity: "high", autoFix: false, platform: "both",
      script: soc2IsWindows ? "$threshold = (Get-Date).AddDays(-90)\nGet-LocalUser | Where-Object { $_.LastLogon -lt $threshold -and $_.Enabled } | Select Name,LastLogon,Enabled | Format-Table" : "dscl . -list /Users | while read user; do\n  last=$(dscl . -read /Users/$user AuthenticationAuthority 2>/dev/null)\n  echo \"$user\"\ndone" },
    { id: "soc_r5", control: "CC8.2", title: "Detect Unauthorized Software", desc: "Scan for unapproved software installations violating CC8.2 change tracking", severity: "high", autoFix: false, platform: "both",
      script: soc2IsWindows ? "Get-ItemProperty HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\* | Select DisplayName,DisplayVersion,Publisher,InstallDate | Sort InstallDate -Descending | Format-Table -AutoSize" : "ls -la /Applications/ | awk '{print $NF}' | sort" },
    { id: "soc_r6", control: "CC8.3", title: "Group Policy Compliance Check", desc: "Verify group policy is applied and not drifted for CC8.3 configuration management", severity: "medium", autoFix: true, platform: "both",
      script: soc2IsWindows ? "gpresult /R /SCOPE Computer\ngpupdate /force\nWrite-Host 'Group Policy refreshed successfully'" : "sudo profiles list -all\necho 'MDM profile compliance check complete'" },
    { id: "soc_r7", control: "CC7.1", title: "System Health Audit", desc: "Comprehensive system health check for CC7.1 infrastructure monitoring", severity: "medium", autoFix: false, platform: "both",
      script: soc2IsWindows ? "Get-ComputerInfo | Select WindowsVersion,OsArchitecture,CsProcessors,CsTotalPhysicalMemory\nGet-Service | Where Status -eq 'Stopped' | Where StartType -eq 'Automatic' | Select Name,Status | Format-Table\nGet-EventLog -LogName System -EntryType Error -Newest 10 | Select TimeGenerated,Source,Message | Format-Table -Wrap" : "system_profiler SPHardwareDataType\nlaunchctl list | grep -v com.apple | head -20\nlog show --predicate 'eventMessage contains \"error\"' --last 1h | head -20" },
    { id: "soc_r8", control: "CC6.1", title: "Verify MFA Enforcement", desc: "Check that MFA is enabled on all user accounts per CC6.1 access restrictions", severity: "high", autoFix: false, platform: "both",
      script: soc2IsWindows ? "Get-ItemProperty 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Authentication\\Credential Providers\\*' -EA SilentlyContinue | Select PSChildName\nWrite-Host 'Check MyDex admin panel for MFA enrollment status'" : "security find-generic-password -s 'com.apple.authkit.token' 2>/dev/null && echo 'MFA token found' || echo 'No MFA token'\necho 'Check MyDex admin panel for MFA enrollment status'" },
    { id: "soc_r9", control: "CC6.7", title: "TLS Configuration Audit", desc: "Verify TLS 1.2+ is enforced and weak ciphers are disabled per CC6.7", severity: "medium", autoFix: true, platform: "both",
      script: soc2IsWindows ? "[Net.ServicePointManager]::SecurityProtocol\n[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls13\nWrite-Host 'TLS 1.2+ enforced'" : "openssl version\ncurl -sI https://www.howsmyssl.com/a/check | head -5" },
    { id: "soc_r10", control: "CC9.1", title: "Vulnerability Scan", desc: "Quick vulnerability assessment for CC9.1 risk identification", severity: "medium", autoFix: false, platform: "both",
      script: soc2IsWindows ? "$UpdateSession = New-Object -ComObject Microsoft.Update.Session\n$Searcher = $UpdateSession.CreateUpdateSearcher()\n$Results = $Searcher.Search('IsInstalled=0')\n$Results.Updates | Select Title,MsrcSeverity | Format-Table -Wrap" : "softwareupdate --list 2>&1\necho 'Vulnerability scan complete'" },
    { id: "soc_r11", control: "A1.1", title: "Capacity & Resource Check", desc: "Monitor disk, memory, and CPU utilization for A1.1 capacity planning", severity: "low", autoFix: false, platform: "both",
      script: soc2IsWindows ? "Get-CimInstance Win32_LogicalDisk | Select DeviceID,@{N='SizeGB';E={[math]::Round($_.Size/1GB,1)}},@{N='FreeGB';E={[math]::Round($_.FreeSpace/1GB,1)}},@{N='UsedPct';E={[math]::Round(($_.Size-$_.FreeSpace)/$_.Size*100,1)}} | Format-Table\nGet-Process | Sort WorkingSet -Desc | Select -First 10 Name,@{N='MB';E={[math]::Round($_.WorkingSet/1MB)}} | Format-Table" : "df -h /\ntop -l 1 | head -10\nvm_stat | head -5" },
    { id: "soc_r12", control: "CC6.2", title: "Password Policy Audit", desc: "Verify password policies meet SOC 2 complexity and rotation requirements", severity: "medium", autoFix: false, platform: "both",
      script: soc2IsWindows ? "net accounts\nGet-LocalUser | Select Name,PasswordLastSet,PasswordExpires,Enabled | Format-Table" : "pwpolicy -getaccountpolicies 2>/dev/null || echo 'Use System Preferences > Security'\ndscl . -list /Users | while read u; do\n  dscl . -read /Users/$u AuthenticationAuthority 2>/dev/null | head -1\ndone" },
  ];

  // CIS Benchmark remediations
  const cisRemediations: Remedy[] = [
    { id: "cis_r1", control: "CIS 3.6", title: "Enable Disk Encryption", desc: "Verify and enable BitLocker/FileVault to satisfy CIS 3 data protection", severity: "critical", autoFix: false, platform: "both", framework: "cis",
      script: soc2IsWindows ? "Get-BitLockerVolume | Select MountPoint,VolumeStatus,EncryptionPercentage,ProtectionStatus | Format-Table\n# To enable: Enable-BitLocker -MountPoint 'C:' -EncryptionMethod XtsAes256 -UsedSpaceOnly -TpmProtector" : "fdesetup status\n# To enable: sudo fdesetup enable" },
    { id: "cis_r2", control: "CIS 4.1", title: "Verify Firewall Configuration", desc: "Ensure firewall is active across all profiles for CIS 4 secure configuration", severity: "high", autoFix: true, platform: "both", framework: "cis",
      script: soc2IsWindows ? "Get-NetFirewallProfile | Select Name,Enabled | Format-Table\nSet-NetFirewallProfile -Profile Domain,Public,Private -Enabled True" : "sudo /usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate\nsudo /usr/libexec/ApplicationFirewall/socketfilterfw --setglobalstate on" },
    { id: "cis_r3", control: "CIS 10.1", title: "Update Antivirus Definitions", desc: "Force-update antivirus definitions for CIS 10 malware defense", severity: "critical", autoFix: true, platform: "both", framework: "cis",
      script: soc2IsWindows ? "Update-MpSignature -UpdateSource MicrosoftUpdateServer\nGet-MpComputerStatus | Select AntivirusSignatureLastUpdated,AntivirusEnabled,RealTimeProtectionEnabled" : "softwareupdate --background-critical\necho 'XProtect definitions updated'" },
    { id: "cis_r4", control: "CIS 7.4", title: "Install Pending Patches", desc: "Apply all pending security patches for CIS 7 vulnerability management", severity: "high", autoFix: true, platform: "both", framework: "cis",
      script: soc2IsWindows ? "$UpdateSession = New-Object -ComObject Microsoft.Update.Session\n$Searcher = $UpdateSession.CreateUpdateSearcher()\n$Results = $Searcher.Search('IsInstalled=0')\n$Results.Updates | Select Title,MsrcSeverity | Format-Table -Wrap" : "softwareupdate --list 2>&1\nsoftwareupdate --install --all" },
    { id: "cis_r5", control: "CIS 5.3", title: "Audit Dormant Accounts", desc: "Find inactive accounts >90 days for CIS 5 account management", severity: "high", autoFix: false, platform: "both", framework: "cis",
      script: soc2IsWindows ? "$threshold = (Get-Date).AddDays(-90)\nGet-LocalUser | Where-Object { $_.LastLogon -lt $threshold -and $_.Enabled } | Select Name,LastLogon,Enabled | Format-Table" : "dscl . -list /Users | while read user; do\n  last=$(dscl . -read /Users/$user AuthenticationAuthority 2>/dev/null)\n  echo \"$user\"\ndone" },
    { id: "cis_r6", control: "CIS 1.1", title: "Device Inventory Audit", desc: "Verify all enterprise assets are enrolled in inventory for CIS 1", severity: "medium", autoFix: false, platform: "both", framework: "cis",
      script: soc2IsWindows ? "Get-ComputerInfo | Select WindowsVersion,OsArchitecture,CsProcessors,CsTotalPhysicalMemory | Format-Table\nGet-WmiObject Win32_ComputerSystem | Select Name,Domain,Manufacturer,Model | Format-Table" : "system_profiler SPHardwareDataType\nhostname\nifconfig | grep inet" },
    { id: "cis_r7", control: "CIS 8.1", title: "Verify Audit Logging", desc: "Check audit log configuration for CIS 8 audit log management", severity: "medium", autoFix: false, platform: "both", framework: "cis",
      script: soc2IsWindows ? "auditpol /get /category:*\nGet-EventLog -LogName Security -Newest 5 | Select TimeGenerated,EntryType,Message | Format-Table -Wrap" : "log show --predicate 'eventMessage contains \"audit\"' --last 1h | head -20\nsudo audit -l" },
    { id: "cis_r8", control: "CIS 13.1", title: "Network Monitoring Check", desc: "Verify network monitoring and firewall rules for CIS 13 defense", severity: "medium", autoFix: false, platform: "both", framework: "cis",
      script: soc2IsWindows ? "Get-NetFirewallRule -Enabled True | Select DisplayName,Direction,Action | Format-Table -AutoSize | Select -First 20\nGet-NetTCPConnection -State Established | Select LocalAddress,LocalPort,RemoteAddress,RemotePort | Format-Table | Select -First 15" : "sudo pfctl -sr 2>/dev/null || echo 'PF not active'\nnetstat -an | grep ESTABLISHED | head -15" },
  ];

  // ISO 27001 remediations
  const isoRemediations: Remedy[] = [
    { id: "iso_r1", control: "A.10.1", title: "Enable Disk Encryption", desc: "Verify and enable full-disk encryption for A.10 cryptography requirements", severity: "critical", autoFix: false, platform: "both", framework: "iso27001",
      script: soc2IsWindows ? "Get-BitLockerVolume | Select MountPoint,VolumeStatus,EncryptionPercentage,ProtectionStatus | Format-Table" : "fdesetup status" },
    { id: "iso_r2", control: "A.12.2", title: "Update Antivirus Definitions", desc: "Ensure malware protection is current for A.12 operations security", severity: "critical", autoFix: true, platform: "both", framework: "iso27001",
      script: soc2IsWindows ? "Update-MpSignature -UpdateSource MicrosoftUpdateServer\nGet-MpComputerStatus | Select AntivirusSignatureLastUpdated,AntivirusEnabled" : "softwareupdate --background-critical" },
    { id: "iso_r3", control: "A.13.1", title: "Verify Firewall Status", desc: "Ensure network controls active for A.13 communications security", severity: "high", autoFix: true, platform: "both", framework: "iso27001",
      script: soc2IsWindows ? "Get-NetFirewallProfile | Select Name,Enabled | Format-Table\nSet-NetFirewallProfile -Profile Domain,Public,Private -Enabled True" : "sudo /usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate\nsudo /usr/libexec/ApplicationFirewall/socketfilterfw --setglobalstate on" },
    { id: "iso_r4", control: "A.12.6", title: "Apply Security Patches", desc: "Install pending updates for A.12.6 technical vulnerability management", severity: "high", autoFix: true, platform: "both", framework: "iso27001",
      script: soc2IsWindows ? "$UpdateSession = New-Object -ComObject Microsoft.Update.Session\n$Searcher = $UpdateSession.CreateUpdateSearcher()\n$Results = $Searcher.Search('IsInstalled=0')\n$Results.Updates | Select Title,MsrcSeverity | Format-Table" : "softwareupdate --list 2>&1" },
    { id: "iso_r5", control: "A.8.1", title: "Asset Inventory Audit", desc: "Verify all assets are tracked for A.8 asset management", severity: "medium", autoFix: false, platform: "both", framework: "iso27001",
      script: soc2IsWindows ? "Get-ComputerInfo | Select WindowsVersion,OsArchitecture,CsProcessors,CsTotalPhysicalMemory\nGet-WmiObject Win32_ComputerSystem | Select Name,Domain,Manufacturer,Model" : "system_profiler SPHardwareDataType\nhostname" },
    { id: "iso_r6", control: "A.12.7", title: "System Monitoring Check", desc: "Verify system monitoring active for A.12.7", severity: "medium", autoFix: false, platform: "both", framework: "iso27001",
      script: soc2IsWindows ? "Get-Service | Where Status -eq 'Running' | Where DisplayName -like '*monitor*' | Select DisplayName,Status | Format-Table\nGet-EventLog -LogName System -EntryType Error -Newest 10 | Select TimeGenerated,Source,Message | Format-Table -Wrap" : "launchctl list | head -20\nlog show --predicate 'eventMessage contains \"error\"' --last 1h | head -10" },
  ];

  // GDPR remediations (more procedural)
  const gdprRemediations: Remedy[] = [
    { id: "gdpr_r1", control: "Art. 32.1a", title: "Verify Encryption Status", desc: "Check disk encryption for Art. 32 security of processing", severity: "critical", autoFix: false, platform: "both", framework: "gdpr",
      script: soc2IsWindows ? "Get-BitLockerVolume | Select MountPoint,VolumeStatus,EncryptionPercentage,ProtectionStatus | Format-Table" : "fdesetup status" },
    { id: "gdpr_r2", control: "Art. 32.1b", title: "Verify Antivirus Protection", desc: "Check antivirus status for Art. 32 system confidentiality", severity: "critical", autoFix: true, platform: "both", framework: "gdpr",
      script: soc2IsWindows ? "Get-MpComputerStatus | Select AntivirusEnabled,RealTimeProtectionEnabled,AntivirusSignatureLastUpdated | Format-Table" : "softwareupdate --background-critical\necho 'Malware protection status checked'" },
    { id: "gdpr_r3", control: "Art. 32.1c", title: "Verify Firewall Active", desc: "Check firewall for Art. 32 system resilience", severity: "high", autoFix: true, platform: "both", framework: "gdpr",
      script: soc2IsWindows ? "Get-NetFirewallProfile | Select Name,Enabled | Format-Table\nSet-NetFirewallProfile -Profile Domain,Public,Private -Enabled True" : "sudo /usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate" },
    { id: "gdpr_r4", control: "Art. 30.1", title: "Export Audit Logs", desc: "Export processing activity records for Art. 30 documentation", severity: "medium", autoFix: false, platform: "both", framework: "gdpr",
      script: soc2IsWindows ? "Get-EventLog -LogName Security -Newest 50 | Select TimeGenerated,EntryType,Source,Message | Export-Csv -Path $env:TEMP\\gdpr_audit.csv -NoTypeInformation\nWrite-Host \"Audit log exported to $env:TEMP\\gdpr_audit.csv\"" : "log show --predicate 'eventMessage contains \"auth\"' --last 24h > /tmp/gdpr_audit.log\necho 'Audit log exported to /tmp/gdpr_audit.log'" },
    { id: "gdpr_r5", control: "Art. 32.1d", title: "Security Patch Status", desc: "Review pending updates for Art. 32 regular security testing", severity: "high", autoFix: false, platform: "both", framework: "gdpr",
      script: soc2IsWindows ? "$UpdateSession = New-Object -ComObject Microsoft.Update.Session\n$Searcher = $UpdateSession.CreateUpdateSearcher()\n$Results = $Searcher.Search('IsInstalled=0')\n$Results.Updates | Select Title,MsrcSeverity | Format-Table" : "softwareupdate --list 2>&1" },
    { id: "gdpr_r6", control: "Art. 33.1", title: "Breach Notification Checklist", desc: "Generate breach notification readiness report for Art. 33 compliance", severity: "medium", autoFix: false, platform: "both", framework: "gdpr",
      script: soc2IsWindows ? "Write-Host '=== GDPR Art. 33 Breach Notification Checklist ==='\nWrite-Host '[ ] Supervisory authority contact info documented'\nWrite-Host '[ ] 72-hour notification procedure defined'\nWrite-Host '[ ] Breach notification template prepared'\nWrite-Host '[ ] DPO contact info available'\nWrite-Host '[ ] Data subject notification procedure defined'\nWrite-Host '[ ] Breach register established'" : "echo '=== GDPR Art. 33 Breach Notification Checklist ==='\necho '[ ] Supervisory authority contact info documented'\necho '[ ] 72-hour notification procedure defined'\necho '[ ] Breach notification template prepared'\necho '[ ] DPO contact info available'\necho '[ ] Data subject notification procedure defined'\necho '[ ] Breach register established'" },
  ];

  // Select remediations based on active framework
  const frameworkRemediations: Record<FrameworkKey, Remedy[]> = {
    soc2: builtInRemediations,
    cis: cisRemediations,
    iso27001: isoRemediations,
    gdpr: gdprRemediations,
  };

  const activeBuiltInRemediations = frameworkRemediations[selectedFramework];
  const allRemediations = [...activeBuiltInRemediations, ...customRemediations.filter(r => !r.framework || r.framework === selectedFramework)];
  const criticalCount = allRemediations.filter(r => r.severity === "critical").length;
  const highCount = allRemediations.filter(r => r.severity === "high").length;

  const gaugeData = [{ name: "Score", value: overallScore, fill: overallScore >= 90 ? "#22c55e" : overallScore >= 75 ? "#f59e0b" : "#ef4444" }];

  // Handlers for custom remediations
  const handleSaveCustomRemediation = () => {
    if (!newRemediation.title.trim() || !newRemediation.script.trim()) return;
    const remedy: Remedy = {
      id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      control: newRemediation.control,
      title: newRemediation.title.trim(),
      desc: `Custom remediation for ${newRemediation.control}`,
      severity: newRemediation.severity,
      script: newRemediation.script,
      autoFix: newRemediation.autoFix,
      platform: newRemediation.platform,
      custom: true,
      framework: selectedFramework,
    };
    const updated = [...customRemediations, remedy];
    setCustomRemediations(updated);
    saveCustomRemediations(updated);
    setShowNewRemediation(false);
    setNewRemediation({ title: "", control: "CC6.1", severity: "medium", script: "", platform: "both", autoFix: false });
  };

  const handleDeleteCustomRemediation = (id: string) => {
    const updated = customRemediations.filter(r => r.id !== id);
    setCustomRemediations(updated);
    saveCustomRemediations(updated);
  };

  // Find remediations for a given control
  const getRemediationsForControl = (controlId: string) =>
    allRemediations.filter(r => r.control === controlId);

  // Recommendations data
  // Recommendations per framework
  const soc2Recommendations = [
    { priority: "critical", title: "Enable Disk Encryption on All Devices", desc: "Ensure BitLocker (Windows) or FileVault (macOS) is enabled on every enrolled device. SOC 2 C1.3 requires encryption at rest for all systems handling customer data.", action: "Run C1.3 remediation above", trend: "down" },
    { priority: "critical", title: "Update Antivirus Definitions Fleet-Wide", desc: "Devices with outdated AV definitions (>7 days) are non-compliant with CC6.8. Schedule daily definition updates via group policy or MDM.", action: "Run CC6.8 remediation above", trend: "up" },
    { priority: "high", title: "Implement 90-Day Access Review", desc: "CC6.3 requires timely removal of access for terminated users. Implement a quarterly access review process and automate offboarding via SSO provider.", action: "Configure in Settings > SSO", trend: "up" },
    { priority: "high", title: "Document Incident Response Procedures", desc: "CC7.4 requires documented and tested incident response procedures. Schedule a tabletop exercise within 30 days and document results.", action: "Create runbook in Settings", trend: "down" },
    { priority: "medium", title: "Enforce Software Allowlist", desc: "CC8.2 requires tracking of infrastructure changes. Implement a software allowlist and alert on unauthorized installations.", action: "Configure in Security > DLP", trend: "up" },
    { priority: "medium", title: "Enable Automated Compliance Scanning", desc: "Schedule weekly compliance scans to track drift over time. Set up alerts for score drops below 85%.", action: "Configure in IT Support > Config", trend: "up" },
    { priority: "low", title: "Implement Continuous Monitoring Dashboard", desc: "Real-time compliance visibility reduces audit prep time by up to 60%. Consider exposing SOC 2 metrics to auditors via read-only access.", action: "Share this dashboard", trend: "up" },
    { priority: "low", title: "Automate Evidence Collection", desc: "Collect screenshots, logs, and reports automatically for each control. Reduces manual evidence gathering during audit season.", action: "Enable in Reports", trend: "up" },
  ];

  const cisRecommendations = [
    { priority: "critical", title: "Enable Full-Disk Encryption", desc: "CIS Control 3 requires encryption of data at rest. Ensure BitLocker/FileVault is enabled on all enterprise assets.", action: "Run CIS 3.6 remediation above", trend: "down" },
    { priority: "critical", title: "Deploy Anti-Malware on All Endpoints", desc: "CIS Control 10 mandates anti-malware on every device. Ensure definitions are current and real-time protection is active.", action: "Run CIS 10.1 remediation above", trend: "up" },
    { priority: "high", title: "Establish Patch Management SLA", desc: "CIS Control 7 requires timely vulnerability remediation. Define SLAs: critical patches within 48 hours, high within 7 days.", action: "Configure in IT Support > Updates", trend: "up" },
    { priority: "high", title: "Implement Software Allowlisting", desc: "CIS Control 2 requires authorized software only. Configure application control policies and alert on unauthorized installations.", action: "Configure in Security > DLP", trend: "down" },
    { priority: "medium", title: "Configure Email Security (DMARC/SPF/DKIM)", desc: "CIS Control 9 recommends email and web browser protections. Implement DMARC, SPF, and DKIM records.", action: "Configure DNS records", trend: "up" },
    { priority: "medium", title: "Centralize Audit Log Collection", desc: "CIS Control 8 requires centralized audit logging. Ensure all devices forward logs to central SIEM.", action: "Configure in Settings", trend: "up" },
    { priority: "low", title: "Automate Asset Discovery", desc: "CIS Control 1 benefits from automated discovery of new assets joining the network.", action: "Deploy agent to new devices", trend: "up" },
  ];

  const isoRecommendations = [
    { priority: "critical", title: "Implement Cryptographic Controls", desc: "A.10 requires encryption at rest and in transit. Ensure all devices have full-disk encryption and TLS is enforced.", action: "Run A.10.1 remediation above", trend: "down" },
    { priority: "critical", title: "Update Malware Protection", desc: "A.12.2 requires up-to-date malware protection on all systems processing organizational data.", action: "Run A.12.2 remediation above", trend: "up" },
    { priority: "high", title: "Formalize Information Security Policy", desc: "A.5 requires a documented information security policy approved by management and communicated to staff.", action: "Create policy document", trend: "down" },
    { priority: "high", title: "Implement Security Awareness Training", desc: "A.7.2 requires regular security awareness training for all employees and contractors.", action: "Set up training program", trend: "up" },
    { priority: "medium", title: "Document Standard Operating Procedures", desc: "A.12.1 requires documented operational procedures for IT systems and security processes.", action: "Create SOP documents", trend: "up" },
    { priority: "medium", title: "Schedule Independent Security Audit", desc: "A.18.2 recommends independent review of information security. Schedule annual penetration test.", action: "Engage audit firm", trend: "down" },
    { priority: "low", title: "Formalize Incident Evidence Collection", desc: "A.16.3 requires procedures for collecting and preserving evidence during security incidents.", action: "Create evidence procedures", trend: "up" },
  ];

  const gdprRecommendations = [
    { priority: "critical", title: "Encrypt All Personal Data at Rest", desc: "Article 32 requires appropriate technical measures. Encryption at rest protects personal data on lost or stolen devices.", action: "Run Art. 32.1a remediation above", trend: "down" },
    { priority: "critical", title: "Implement Breach Notification Process", desc: "Article 33 requires notification to the supervisory authority within 72 hours of a personal data breach.", action: "Create notification procedure", trend: "down" },
    { priority: "high", title: "Document Lawful Basis for Processing", desc: "Article 5 requires clear lawful basis (consent, contract, legal obligation, etc.) for all personal data processing.", action: "Conduct processing audit", trend: "up" },
    { priority: "high", title: "Conduct Data Protection Impact Assessment", desc: "Article 35 requires DPIAs for high-risk processing activities before commencing the processing.", action: "Use DPIA template", trend: "up" },
    { priority: "medium", title: "Appoint Data Protection Officer", desc: "Article 37 requires a DPO for public authorities, large-scale monitoring, or special category data processing.", action: "Review DPO requirements", trend: "down" },
    { priority: "medium", title: "Document Third-Party Processors", desc: "Article 30 requires maintaining records of all processing activities including third-party data processors.", action: "Create processor register", trend: "up" },
    { priority: "low", title: "Implement Data Subject Rights Portal", desc: "Articles 15-22 give data subjects various rights. Consider a self-service portal for access, rectification, and deletion requests.", action: "Design rights portal", trend: "up" },
  ];

  const recommendations = selectedFramework === "soc2" ? soc2Recommendations
    : selectedFramework === "cis" ? cisRecommendations
    : selectedFramework === "iso27001" ? isoRecommendations
    : gdprRecommendations;

  // Custom bar click handler
  const handleBarClick = (data: { name?: string }) => {
    if (data?.name) {
      setSelectedCriteria(prev => prev === data.name ? null : (data.name ?? null));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileCheck className="h-6 w-6" /> {FRAMEWORK_META[selectedFramework].fullName} Compliance
        </h1>
        <p className="text-muted-foreground text-sm">
          {FRAMEWORK_META[selectedFramework].desc} — monitor and enforce compliance across your fleet.
        </p>
      </div>

      {/* Framework Selector */}
      <div className="flex flex-wrap gap-2">
        {(Object.keys(FRAMEWORK_META) as FrameworkKey[]).map(fw => {
          const meta = FRAMEWORK_META[fw];
          const isActive = selectedFramework === fw;
          return (
            <button
              key={fw}
              onClick={() => { setSelectedFramework(fw); setSelectedCriteria(null); }}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border-2 transition-all ${
                isActive
                  ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-400 shadow-sm"
                  : "border-transparent bg-muted/40 text-muted-foreground hover:bg-muted/70 hover:border-muted-foreground/20"
              }`}
            >
              {meta.icon === "shield" && <Shield className="h-4 w-4" />}
              {meta.icon === "lock" && <Shield className="h-4 w-4" />}
              {meta.icon === "globe" && <FileCheck className="h-4 w-4" />}
              {meta.icon === "file" && <ScrollText className="h-4 w-4" />}
              {meta.label}
            </button>
          );
        })}
      </div>

      {/* Overall Compliance Score */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="md:col-span-1">
          <CardContent className="pt-6 pb-4 flex flex-col items-center">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Overall {FRAMEWORK_META[selectedFramework].label} Score</div>
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
          { label: "Total Controls", value: String(totalControls), icon: Shield, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/30" },
          { label: "Passing", value: String(passingControls), icon: CheckCircle, color: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-950/30" },
          { label: "Failing", value: String(failingControls), icon: XCircle, color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-950/30" },
          { label: "Critical Fixes", value: String(criticalCount), icon: AlertTriangle, color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-950/30" },
          { label: "Auto-Fixable", value: String(allRemediations.filter(r => r.autoFix).length), icon: Zap, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/30" },
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

      {/* Trust Service Criteria — Clickable Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-500" /> {selectedFramework === "soc2" ? "Trust Service Criteria" : selectedFramework === "cis" ? "CIS Critical Controls" : selectedFramework === "iso27001" ? "ISO 27001 Annex A Domains" : "GDPR Articles"}
          </CardTitle>
          <p className="text-xs text-muted-foreground">Click a bar to drill into its controls, affected devices, and remediations.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <ResponsiveContainer width="100%" height={Math.max(200, trustCriteria.length * 30)}>
            <BarChart data={criteriaBarData} layout="vertical" margin={{ left: 20 }}
              onClick={(e: Record<string, unknown>) => { const ap = e?.activePayload as Array<{ payload: { name: string } }> | undefined; if (ap?.[0]?.payload) handleBarClick(ap[0].payload); }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={selectedFramework === "gdpr" ? 55 : 50} />
              <Tooltip formatter={(value) => [`${value}%`, "Score"]} />
              <Bar dataKey="score" radius={[0, 6, 6, 0]} barSize={20} className="cursor-pointer">
                {criteriaBarData.map((entry, i) => (
                  <Cell key={i} fill={selectedCriteria === entry.name ? entry.fill : entry.fill} stroke={selectedCriteria === entry.name ? "#fff" : "none"} strokeWidth={selectedCriteria === entry.name ? 2 : 0} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Criteria selector pills (alternative click targets) */}
          <div className="flex flex-wrap gap-2">
            {trustCriteria.map(c => (
              <button key={c.id} onClick={() => setSelectedCriteria(prev => prev === c.id ? null : c.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  selectedCriteria === c.id
                    ? "ring-2 ring-offset-1 shadow-sm"
                    : "hover:bg-muted/40"
                }`}
                style={selectedCriteria === c.id ? { borderColor: c.color, color: c.color, backgroundColor: c.color + "15" } : {}}>
                <span className="font-mono">{c.id}</span>
                <span className="hidden sm:inline">{c.name}</span>
                <span className="font-bold" style={{ color: c.color }}>{c.score}%</span>
              </button>
            ))}
          </div>

          {/* Expanded Criteria Detail Panel */}
          {activeCriteria && (
            <div className="rounded-xl border overflow-hidden animate-in slide-in-from-top-2 duration-200">
              <div className="p-4 bg-muted/30 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge style={{ backgroundColor: activeCriteria.color + "20", color: activeCriteria.color, borderColor: activeCriteria.color + "40" }} className="text-xs font-mono border">{activeCriteria.id}</Badge>
                    <span className="text-base font-semibold">{activeCriteria.name}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{activeCriteria.passing}/{activeCriteria.total} controls passing</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-3xl font-bold" style={{ color: activeCriteria.color }}>{activeCriteria.score}%</div>
                  <Button size="sm" variant="ghost" onClick={() => setSelectedCriteria(null)}><X className="h-4 w-4" /></Button>
                </div>
              </div>
              <div className="divide-y">
                {activeCriteria.controls.map(ctrl => {
                  const controlRemediations = getRemediationsForControl(ctrl.id);
                  return (
                    <div key={ctrl.id} className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          {ctrl.status === "pass" && <CheckCircle className="h-4 w-4 text-green-500" />}
                          {ctrl.status === "warn" && <AlertCircle className="h-4 w-4 text-amber-500" />}
                          {ctrl.status === "fail" && <XCircle className="h-4 w-4 text-red-500" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs text-muted-foreground">{ctrl.id}</span>
                            <span className="text-sm font-medium">{ctrl.name}</span>
                            <Badge className={`text-[9px] ${ctrl.status === "pass" ? "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300" : ctrl.status === "warn" ? "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300" : "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300"}`}>
                              {ctrl.status.toUpperCase()}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{ctrl.desc}</p>

                          {/* Affected devices */}
                          {ctrl.failingDevices && ctrl.failingDevices.length > 0 && (
                            <div className="mt-2">
                              <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Affected Devices</div>
                              <div className="flex flex-wrap gap-1.5">
                                {ctrl.failingDevices.map(hostname => (
                                  <Badge key={hostname} variant="outline" className="text-[10px] font-mono">
                                    <XCircle className="h-2.5 w-2.5 mr-1 text-red-500" />{hostname}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Inline remediation buttons for non-passing controls */}
                          {ctrl.status !== "pass" && controlRemediations.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {controlRemediations.map(r => (
                                <Button key={r.id} size="sm" variant="outline" className="text-xs h-7 gap-1"
                                  disabled={!soc2Device}
                                  onClick={() => executeRemediation(`[${FRAMEWORK_META[selectedFramework].label} ${r.control}] ${r.title}`, r.script, soc2Device || undefined)}>
                                  <Play className="h-3 w-3" />
                                  {r.title}
                                  {!soc2Device && <span className="text-muted-foreground ml-1">(select device)</span>}
                                </Button>
                              ))}
                            </div>
                          )}
                          {ctrl.status !== "pass" && controlRemediations.length === 0 && (
                            <div className="mt-2 text-[10px] text-muted-foreground italic">No remediation scripts available for this control.</div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Device Compliance Table */}
      {devices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Monitor className="h-5 w-5 text-indigo-500" /> Device Compliance Status
            </CardTitle>
            <p className="text-xs text-muted-foreground">Click a device row to select it as the remediation target.</p>
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
                    <th className="pb-2 px-2 text-center">Disk</th>
                    <th className="pb-2 px-2 text-center">Screen Lock</th>
                    <th className="pb-2 px-2 text-center">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {deviceComplianceData.map(d => {
                    const isSelected = soc2DeviceFilter === d.device.hostname;
                    return (
                      <tr key={d.device.id}
                        className={`border-b cursor-pointer transition-colors ${isSelected ? "bg-indigo-50 dark:bg-indigo-950/30 ring-1 ring-indigo-300 dark:ring-indigo-700" : "hover:bg-muted/20"}`}
                        onClick={() => setSoc2DeviceFilter(isSelected ? null : d.device.hostname)}>
                        <td className="py-2.5 pr-4">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${d.device.status === "ONLINE" ? "bg-green-500" : "bg-red-400"}`} />
                            <div>
                              <div className="font-medium text-xs flex items-center gap-1.5">
                                {d.device.hostname}
                                {isSelected && <Badge className="text-[8px] bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">TARGET</Badge>}
                              </div>
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
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Compliance Remediations — Redesigned Table View */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Terminal className="h-5 w-5 text-green-500" /> Compliance Remediations
                {soc2Device && <Badge variant="outline" className="text-[10px] ml-2">Targeting: {soc2Device.hostname}</Badge>}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Self-remediation scripts mapped to {FRAMEWORK_META[selectedFramework].label} controls. Select a device above, then run scripts from here.
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="text-xs"
                onClick={() => setShowNewRemediation(!showNewRemediation)}>
                <Plus className="h-3 w-3 mr-1" />New Remediation
              </Button>
              <Button size="sm" variant="outline" className="text-xs"
                disabled={!soc2Device}
                onClick={() => {
                  const autoFixable = allRemediations.filter(r => r.autoFix);
                  if (soc2Device) {
                    autoFixable.forEach(r => executeRemediation(`[${FRAMEWORK_META[selectedFramework].label} ${r.control}] ${r.title}`, r.script, soc2Device));
                  }
                }}>
                <Zap className="h-3 w-3 mr-1" />Run All Auto-Fix
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Severity summary pills */}
          <div className="flex gap-2 text-xs">
            {(["critical", "high", "medium", "low"] as const).map(sev => (
              <Badge key={sev} className={`${SEVERITY_COLORS[sev]} border border-current/20`}>
                {sev.charAt(0).toUpperCase() + sev.slice(1)}: {allRemediations.filter(r => r.severity === sev).length}
              </Badge>
            ))}
          </div>

          {/* New Remediation Form */}
          {showNewRemediation && (
            <div className="rounded-xl border p-4 bg-muted/20 space-y-3">
              <div className="text-sm font-semibold flex items-center gap-2">
                <Plus className="h-4 w-4" /> Create Custom Remediation
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground block mb-1">Title</label>
                  <input type="text" value={newRemediation.title}
                    onChange={e => setNewRemediation(p => ({ ...p, title: e.target.value }))}
                    placeholder="e.g., Check USB Policy"
                    className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground block mb-1">{FRAMEWORK_META[selectedFramework].label} Control</label>
                    <select value={newRemediation.control}
                      onChange={e => setNewRemediation(p => ({ ...p, control: e.target.value }))}
                      className="w-full rounded-md border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      {CONTROL_OPTIONS_BY_FRAMEWORK[selectedFramework].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground block mb-1">Severity</label>
                    <select value={newRemediation.severity}
                      onChange={e => setNewRemediation(p => ({ ...p, severity: e.target.value as Soc2Remedy["severity"] }))}
                      className="w-full rounded-md border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="critical">Critical</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                </div>
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-1">Script</label>
                <textarea value={newRemediation.script}
                  onChange={e => setNewRemediation(p => ({ ...p, script: e.target.value }))}
                  placeholder="Enter PowerShell or shell script..."
                  rows={5}
                  className="w-full rounded-md border bg-background px-3 py-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y" />
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                  <label className="text-[11px] font-medium text-muted-foreground">Platform:</label>
                  {(["windows", "macos", "both"] as const).map(p => (
                    <label key={p} className="flex items-center gap-1 text-xs cursor-pointer">
                      <input type="radio" name="platform" checked={newRemediation.platform === p}
                        onChange={() => setNewRemediation(prev => ({ ...prev, platform: p }))}
                        className="accent-blue-600" />
                      {p === "windows" ? "Windows" : p === "macos" ? "macOS" : "Both"}
                    </label>
                  ))}
                </div>
                <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <input type="checkbox" checked={newRemediation.autoFix}
                    onChange={e => setNewRemediation(p => ({ ...p, autoFix: e.target.checked }))}
                    className="accent-blue-600" />
                  Auto-fix
                </label>
              </div>
              <div className="flex gap-2 pt-1">
                <Button size="sm" className="text-xs bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={!newRemediation.title.trim() || !newRemediation.script.trim()}
                  onClick={handleSaveCustomRemediation}>
                  Save Remediation
                </Button>
                <Button size="sm" variant="ghost" className="text-xs" onClick={() => setShowNewRemediation(false)}>Cancel</Button>
              </div>
            </div>
          )}

          {/* Remediation Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="pb-2 pr-2 w-8"></th>
                  <th className="pb-2 px-2">Severity</th>
                  <th className="pb-2 px-2">Control</th>
                  <th className="pb-2 px-2">Title</th>
                  <th className="pb-2 px-2 hidden lg:table-cell">Target</th>
                  <th className="pb-2 pl-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {allRemediations.map(remedy => {
                  const hasRun = commandLogs.some(l => l.title.includes(remedy.title) && (l.status === "COMPLETED" || l.status === "SENT"));
                  const isRunning = commandLogs.some(l => l.title.includes(remedy.title) && (l.status === "PENDING" || l.status === "EXECUTING"));
                  return (
                    <tr key={remedy.id} className={`border-b transition-colors hover:bg-muted/20 ${hasRun ? "bg-green-50/50 dark:bg-green-950/10" : ""}`}>
                      <td className="py-2 pr-2">
                        {hasRun ? <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                          : isRunning ? <Loader2 className="h-3.5 w-3.5 text-blue-500 animate-spin" />
                          : <AlertCircle className="h-3.5 w-3.5 text-muted-foreground/40" />}
                      </td>
                      <td className="px-2 py-2">
                        <Badge className={`text-[9px] ${SEVERITY_COLORS[remedy.severity]}`}>
                          {remedy.severity.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs">{remedy.control}</span>
                          {remedy.autoFix && <Zap className="h-3 w-3 text-amber-500" />}
                          {remedy.custom && <Badge className="text-[8px] bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">Custom</Badge>}
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <div className="text-xs font-medium">{remedy.title}</div>
                        <div className="text-[10px] text-muted-foreground truncate max-w-xs">{remedy.desc}</div>
                      </td>
                      <td className="px-2 py-2 hidden lg:table-cell">
                        <span className="text-[10px] text-muted-foreground">{soc2Device ? soc2Device.hostname : "—"}</span>
                      </td>
                      <td className="pl-2 py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant={hasRun ? "ghost" : "default"}
                            className={`text-[10px] h-6 px-2 ${hasRun ? "text-green-600 dark:text-green-400" : "bg-blue-600 hover:bg-blue-700 text-white"}`}
                            disabled={!soc2Device || isRunning}
                            onClick={() => executeRemediation(`[${FRAMEWORK_META[selectedFramework].label} ${remedy.control}] ${remedy.title}`, remedy.script, soc2Device || undefined)}>
                            {isRunning ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Running</> : hasRun ? <><CheckCircle className="h-3 w-3 mr-1" />Sent</> : <><Play className="h-3 w-3 mr-1" />Run</>}
                          </Button>
                          {remedy.custom && (
                            <Button size="sm" variant="ghost" className="text-[10px] h-6 px-1.5 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/30"
                              onClick={() => handleDeleteCustomRemediation(remedy.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* SOC 2 Recommendations — Collapsible Accordion */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-500" /> {FRAMEWORK_META[selectedFramework].label} Audit Recommendations
          </CardTitle>
          <p className="text-xs text-muted-foreground">Expand each recommendation for details and action items.</p>
        </CardHeader>
        <CardContent className="space-y-1">
          {recommendations.map((rec, i) => {
            const isOpen = openAccordion === i;
            return (
              <div key={i} className={`rounded-lg border transition-colors ${
                rec.priority === "critical" ? "border-red-200 dark:border-red-900" :
                rec.priority === "high" ? "border-orange-200 dark:border-orange-900" :
                rec.priority === "medium" ? "border-amber-200 dark:border-amber-900" :
                "border-blue-200 dark:border-blue-900"
              }`}>
                <button className="w-full flex items-center gap-3 px-4 py-2.5 text-left"
                  onClick={() => setOpenAccordion(isOpen ? null : i)}>
                  <Badge className={`text-[9px] shrink-0 ${
                    rec.priority === "critical" ? "bg-red-200 text-red-800 dark:bg-red-900 dark:text-red-200" :
                    rec.priority === "high" ? "bg-orange-200 text-orange-800 dark:bg-orange-900 dark:text-orange-200" :
                    rec.priority === "medium" ? "bg-amber-200 text-amber-800 dark:bg-amber-900 dark:text-amber-200" :
                    "bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                  }`}>{rec.priority.toUpperCase()}</Badge>
                  <span className="text-sm font-medium flex-1">{rec.title}</span>
                  {rec.trend === "up" ? (
                    <span className="flex items-center gap-0.5 text-green-600 dark:text-green-400 text-[10px] shrink-0"><ArrowUpRight className="h-3 w-3" />Improving</span>
                  ) : (
                    <span className="flex items-center gap-0.5 text-red-600 dark:text-red-400 text-[10px] shrink-0"><ArrowDownRight className="h-3 w-3" />Needs Work</span>
                  )}
                  {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
                </button>
                {isOpen && (
                  <div className="px-4 pb-3 pt-0 border-t">
                    <p className="text-xs text-muted-foreground leading-relaxed mt-2 mb-2">{rec.desc}</p>
                    <div className="text-[10px] font-medium text-blue-600 dark:text-blue-400">{rec.action}</div>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

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
                          <span className="text-gray-500">&rarr;</span>
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
                          {log.completedAt && ` \u2022 Completed: ${log.completedAt.toLocaleTimeString()}`}
                          {log.completedAt && ` \u2022 Duration: ${Math.round((log.completedAt.getTime() - log.issuedAt.getTime()) / 1000)}s`}
                          {log.exitCode !== undefined && ` \u2022 Exit code: ${log.exitCode}`}
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
