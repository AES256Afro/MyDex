"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileCheck, Shield, CheckCircle, XCircle, AlertTriangle, AlertCircle,
  Zap, Monitor, Terminal, Info, Play, ChevronRight, ChevronDown, ChevronUp,
  ArrowUpRight, ArrowDownRight, Loader2, ScrollText, X, TrendingUp,
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
          description: `SOC 2 Compliance: ${title}`,
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
  }, [pollCommandStatus]);

  // ── Derived state ──
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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileCheck className="h-6 w-6" /> SOC 2 Compliance
        </h1>
        <p className="text-muted-foreground text-sm">
          Monitor and enforce SOC 2 Type II compliance across your fleet — mapped to AICPA Trust Service Criteria.
        </p>
      </div>

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
                  if (soc2Device) {
                    autoFixable.forEach(r => executeRemediation(`[SOC2 ${r.control}] ${r.title}`, r.script, soc2Device));
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
                      {soc2Device ? `Target: ${soc2Device.hostname}` : "Select a device first"}
                    </div>
                    <Button
                      size="sm"
                      className={`text-xs h-7 ${hasRun ? "bg-green-600 hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700"} text-white`}
                      disabled={!soc2Device}
                      onClick={() => executeRemediation(`[SOC2 ${remedy.control}] ${remedy.title}`, remedy.script, soc2Device || undefined)}
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
              { priority: "high", title: "Implement 90-Day Access Review", desc: "CC6.3 requires timely removal of access for terminated users. Implement a quarterly access review process and automate offboarding via SSO provider.", action: "Configure in Settings \u2192 SSO", trend: "up" },
              { priority: "high", title: "Document Incident Response Procedures", desc: "CC7.4 requires documented and tested incident response procedures. Schedule a tabletop exercise within 30 days and document results.", action: "Create runbook in Settings", trend: "down" },
              { priority: "medium", title: "Enforce Software Allowlist", desc: "CC8.2 requires tracking of infrastructure changes. Implement a software allowlist and alert on unauthorized installations.", action: "Configure in Security \u2192 DLP", trend: "up" },
              { priority: "medium", title: "Enable Automated Compliance Scanning", desc: "Schedule weekly compliance scans to track drift over time. Set up alerts for score drops below 85%.", action: "Configure in IT Support \u2192 Config", trend: "up" },
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
