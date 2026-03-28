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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Download,
  Monitor,
  Apple,
  Terminal,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Wrench,
  Play,
  Shield,
  Server,
  Package,
  FileText,
  Globe,
  HardDrive,
  Cpu,
  Wifi,
  WifiOff,
  Clock,
  Activity,
  Settings,
  ExternalLink,
  Zap,
  Box,
  Key,
  RotateCcw,
  Search,
  ArrowRight,
  X,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface AgentDevice {
  id: string;
  hostname: string;
  platform: string;
  agentVersion: string;
  status: "ONLINE" | "OFFLINE" | "STALE";
  lastSeenAt: string;
  ipAddress: string;
  cpuName: string;
  ramTotalGb: number;
  ramAvailGb: number;
  antivirusName: string;
  defenderStatus: string;
  firewallStatus: Record<string, boolean> | null;
  rebootPending: boolean;
  pendingUpdates: unknown[];
  user?: { name: string; email: string };
}

interface AgentQuality {
  device: AgentDevice;
  score: number; // 0-100
  issues: QualityIssue[];
}

interface QualityIssue {
  id: string;
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  remediation: string;
  autoFixable: boolean;
  commandType?: string;
}

type DeployFormat = "exe" | "msi" | "pkg" | "dmg" | "deb" | "rpm" | "zip" | "docker";
type Platform = "windows" | "macos" | "linux";

// ─── Constants ──────────────────────────────────────────────────────────────

const LATEST_VERSION = "0.3.0";

const DEPLOY_FORMATS: Record<Platform, { format: DeployFormat; label: string; icon: string; desc: string; recommended?: boolean }[]> = {
  windows: [
    { format: "exe", label: "EXE Installer", icon: "setup", desc: "NSIS one-click installer. Best for individual machines.", recommended: true },
    { format: "msi", label: "MSI Package", icon: "msi", desc: "Windows Installer package. Required for GPO/SCCM/Intune deployment." },
    { format: "zip", label: "Portable ZIP", icon: "zip", desc: "No installation required. Extract and run. Good for testing." },
  ],
  macos: [
    { format: "pkg", label: "PKG Installer", icon: "pkg", desc: "Native macOS installer. Best for Jamf and manual install.", recommended: true },
    { format: "dmg", label: "DMG Image", icon: "dmg", desc: "Drag-and-drop disk image for manual installation." },
    { format: "zip", label: "Portable ZIP", icon: "zip", desc: "Universal binary. Extract and run from Terminal." },
  ],
  linux: [
    { format: "deb", label: "DEB Package", icon: "deb", desc: "For Ubuntu, Debian, and derivatives. Install with dpkg.", recommended: true },
    { format: "rpm", label: "RPM Package", icon: "rpm", desc: "For RHEL, CentOS, Fedora. Install with rpm/dnf." },
    { format: "zip", label: "Portable Binary", icon: "zip", desc: "Static binary. Works on any Linux distribution." },
    { format: "docker", label: "Docker Container", icon: "docker", desc: "Containerized agent. Good for cloud workstations." },
  ],
};

const MDM_SOLUTIONS = [
  {
    id: "intune",
    name: "Microsoft Intune",
    icon: "M",
    color: "bg-blue-600",
    platforms: ["Windows", "macOS"],
    steps: [
      "Go to Microsoft Endpoint Manager > Apps > All apps > Add",
      "Select 'Line-of-business app' and upload the MSI package",
      "Set install command: msiexec /i mydex-agent.msi /qn API_KEY=\"YOUR_KEY\" SERVER_URL=\"https://antifascist.work\"",
      "Assign to device groups or all users",
      "Monitor deployment in Intune portal under Device install status",
    ],
  },
  {
    id: "sccm",
    name: "SCCM / MECM",
    icon: "S",
    color: "bg-green-700",
    platforms: ["Windows"],
    steps: [
      "Create a new Application in Software Library > Application Management",
      "Add the MSI as a deployment type with detection rule on product code",
      "Set install command: msiexec /i mydex-agent.msi /qn API_KEY=\"YOUR_KEY\" SERVER_URL=\"https://antifascist.work\"",
      "Create a Device Collection targeting your workstations",
      "Deploy the application as Required to the collection",
      "Monitor in Monitoring > Deployments",
    ],
  },
  {
    id: "jamf",
    name: "Jamf Pro",
    icon: "J",
    color: "bg-purple-700",
    platforms: ["macOS"],
    steps: [
      "Upload the PKG to Jamf Pro under Settings > Computer Management > Packages",
      "Create a Policy: Computers > Policies > New",
      "Add the MyDex Agent package to the policy",
      "Add a post-install script to configure the API key and server URL",
      "Set scope to target computer groups",
      "Set trigger to 'Enrollment Complete' or 'Recurring Check-in'",
    ],
  },
  {
    id: "gpo",
    name: "Group Policy (GPO)",
    icon: "G",
    color: "bg-amber-700",
    platforms: ["Windows"],
    steps: [
      "Copy the MSI to a network share accessible by all target machines",
      "Open Group Policy Management Console (GPMC)",
      "Create or edit a GPO linked to the target OU",
      "Navigate to Computer Configuration > Policies > Software Settings > Software Installation",
      "Right-click > New > Package and select the MSI from the network share",
      "Select 'Assigned' deployment method",
      "Run gpupdate /force on target machines or wait for policy refresh",
    ],
  },
  {
    id: "custom",
    name: "Custom MDM / Script",
    icon: "C",
    color: "bg-gray-700",
    platforms: ["Windows", "macOS", "Linux"],
    steps: [
      "Host the install script on your MyDex server (see Self-Hosted Scripts below)",
      "Use your MDM to execute the one-liner install command on target devices",
      "Windows: powershell -ep bypass -c \"irm https://antifascist.work/api/v1/agents/install?key=YOUR_KEY | iex\"",
      "macOS/Linux: curl -fsSL https://antifascist.work/api/v1/agents/install.sh?key=YOUR_KEY | sudo bash",
      "Verify device enrollment in MyDex dashboard under Devices",
    ],
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function assessAgentQuality(device: AgentDevice): AgentQuality {
  const issues: QualityIssue[] = [];
  let score = 100;

  // Connection status
  if (device.status === "OFFLINE") {
    const lastSeen = Date.now() - new Date(device.lastSeenAt).getTime();
    const hoursOffline = lastSeen / (1000 * 60 * 60);
    if (hoursOffline > 24) {
      score -= 30;
      issues.push({
        id: "offline-extended",
        severity: "critical",
        title: "Agent offline for extended period",
        description: `Device has not reported in for ${Math.floor(hoursOffline)} hours.`,
        remediation: "Check if the device is powered on and connected to the network. Verify the MyDex Agent service is running.",
        autoFixable: false,
      });
    } else {
      score -= 15;
      issues.push({
        id: "offline",
        severity: "warning",
        title: "Agent currently offline",
        description: `Last seen ${timeAgo(device.lastSeenAt)}.`,
        remediation: "The device may be powered off or disconnected. The agent will reconnect automatically.",
        autoFixable: false,
      });
    }
  } else if (device.status === "STALE") {
    score -= 20;
    issues.push({
      id: "stale",
      severity: "warning",
      title: "Agent connection is stale",
      description: "Heartbeat interval is longer than expected.",
      remediation: "The agent may be experiencing network issues. Try restarting the agent service.",
      autoFixable: true,
      commandType: "RESTART_SERVICE",
    });
  }

  // Version check
  if (device.agentVersion && device.agentVersion !== LATEST_VERSION) {
    score -= 10;
    issues.push({
      id: "outdated",
      severity: "warning",
      title: "Agent version outdated",
      description: `Running v${device.agentVersion}, latest is v${LATEST_VERSION}.`,
      remediation: "Update the agent to the latest version for security patches and new features.",
      autoFixable: true,
      commandType: "UPDATE_AGENT",
    });
  }

  // Security: Antivirus
  if (!device.antivirusName) {
    score -= 15;
    issues.push({
      id: "no-av",
      severity: "critical",
      title: "No antivirus detected",
      description: "This device does not have antivirus software installed or it is not reporting.",
      remediation: "Install and activate antivirus software (e.g., Windows Defender, Malwarebytes).",
      autoFixable: false,
    });
  }

  // Security: Firewall
  if (device.firewallStatus) {
    const fw = device.firewallStatus;
    const disabledProfiles = Object.entries(fw).filter(([, v]) => !v).map(([k]) => k);
    if (disabledProfiles.length > 0) {
      score -= 10;
      issues.push({
        id: "firewall-partial",
        severity: "warning",
        title: "Firewall partially disabled",
        description: `Disabled profiles: ${disabledProfiles.join(", ")}.`,
        remediation: "Enable all firewall profiles for complete network protection.",
        autoFixable: false,
      });
    }
  }

  // Defender status
  if (device.defenderStatus && device.defenderStatus !== "enabled") {
    score -= 10;
    issues.push({
      id: "defender-disabled",
      severity: "warning",
      title: "Windows Defender is disabled",
      description: "Real-time protection is turned off.",
      remediation: "Enable Windows Defender real-time protection in Windows Security settings.",
      autoFixable: false,
    });
  }

  // Reboot pending
  if (device.rebootPending) {
    score -= 5;
    issues.push({
      id: "reboot-pending",
      severity: "info",
      title: "Reboot pending",
      description: "A system restart is required to complete pending updates.",
      remediation: "Schedule a reboot during off-hours to apply pending system updates.",
      autoFixable: true,
      commandType: "FORCE_REBOOT",
    });
  }

  // Pending updates
  if (device.pendingUpdates && Array.isArray(device.pendingUpdates) && device.pendingUpdates.length > 0) {
    score -= 5;
    issues.push({
      id: "updates-pending",
      severity: "info",
      title: `${device.pendingUpdates.length} pending update(s)`,
      description: "System updates are available but not yet installed.",
      remediation: "Install pending updates to ensure the system is patched against known vulnerabilities.",
      autoFixable: true,
      commandType: "UPDATE_SOFTWARE",
    });
  }

  // RAM pressure
  if (device.ramTotalGb && device.ramAvailGb) {
    const usedPct = ((device.ramTotalGb - device.ramAvailGb) / device.ramTotalGb) * 100;
    if (usedPct > 90) {
      score -= 5;
      issues.push({
        id: "high-ram",
        severity: "warning",
        title: "High memory usage",
        description: `${usedPct.toFixed(0)}% RAM in use (${device.ramAvailGb.toFixed(1)}GB free of ${device.ramTotalGb}GB).`,
        remediation: "Close unused applications or consider upgrading RAM if this is persistent.",
        autoFixable: false,
      });
    }
  }

  return { device, score: Math.max(0, score), issues };
}

function qualityColor(score: number): string {
  if (score >= 90) return "text-green-600";
  if (score >= 70) return "text-yellow-600";
  if (score >= 50) return "text-orange-500";
  return "text-red-600";
}

function qualityLabel(score: number): string {
  if (score >= 90) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 50) return "Fair";
  return "Poor";
}

function qualityBg(score: number): string {
  if (score >= 90) return "bg-green-50 border-green-200";
  if (score >= 70) return "bg-yellow-50 border-yellow-200";
  if (score >= 50) return "bg-orange-50 border-orange-200";
  return "bg-red-50 border-red-200";
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function AgentSetupPage() {
  const { data: session } = useSession();
  const [devices, setDevices] = useState<AgentDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"deploy" | "quality" | "mdm" | "scripts">("deploy");
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>("windows");
  const [expandedMdm, setExpandedMdm] = useState<string | null>(null);
  const [expandedDevice, setExpandedDevice] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [serverUrl, setServerUrl] = useState("");
  const [commandLoading, setCommandLoading] = useState<string | null>(null);

  const isAdmin = session?.user?.role === "ADMIN" || session?.user?.role === "SUPER_ADMIN";
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleDownload = async (format: string) => {
    setDownloading(format);
    try {
      // Open the download URL directly — the API returns a redirect to R2/CDN
      const url = `/api/v1/agents/downloads?platform=${selectedPlatform}&format=${format}`;
      window.open(url, "_blank");
    } catch {
      alert("Failed to download. Please try again.");
    } finally {
      setTimeout(() => setDownloading(null), 2000);
    }
  };

  const [refreshing, setRefreshing] = useState(false);
  const [refreshLog, setRefreshLog] = useState<{ time: string; msg: string; type: "info" | "success" | "error" | "warn" }[]>([]);
  const [showRefreshConsole, setShowRefreshConsole] = useState(false);

  const addLog = useCallback((msg: string, type: "info" | "success" | "error" | "warn" = "info") => {
    const time = new Date().toLocaleTimeString();
    setRefreshLog(prev => [...prev, { time, msg, type }]);
  }, []);

  const fetchDevices = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
      setRefreshLog([]);
      setShowRefreshConsole(true);
      addLog("Starting fleet health check...");
    }
    try {
      if (isRefresh) addLog("Querying /api/v1/agents/devices...");
      const res = await fetch("/api/v1/agents/devices");
      if (res.ok) {
        const data = await res.json();
        const devs = data.devices || [];
        setDevices(devs);
        if (isRefresh) {
          addLog(`Received ${devs.length} device(s) from API`, "success");
          const online = devs.filter((d: AgentDevice) => d.status === "ONLINE").length;
          const offline = devs.length - online;
          addLog(`Status: ${online} online, ${offline} offline`, online > 0 ? "success" : "warn");
          devs.forEach((d: AgentDevice) => {
            const q = assessAgentQuality(d);
            const issues = q.issues.length;
            addLog(
              `${d.hostname} — Score: ${q.score}% (${qualityLabel(q.score)})${issues > 0 ? `, ${issues} issue(s)` : ""}`,
              q.score >= 70 ? "success" : q.score >= 50 ? "warn" : "error"
            );
          });
          addLog("Fleet health check complete ✓", "success");
        }
      } else {
        if (isRefresh) addLog(`API returned ${res.status} ${res.statusText}`, "error");
      }
    } catch (err) {
      console.error("Failed to fetch devices:", err);
      if (isRefresh) addLog(`Failed to fetch devices: ${err}`, "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [addLog]);

  useEffect(() => {
    fetchDevices();
    setServerUrl(window.location.origin);
  }, [fetchDevices]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const sendCommand = async (deviceId: string, commandType: string, description: string) => {
    setCommandLoading(deviceId + commandType);
    try {
      await fetch("/api/v1/agents/commands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId, commandType, description }),
      });
      // Refresh devices after command
      setTimeout(fetchDevices, 2000);
    } catch (err) {
      console.error("Failed to send command:", err);
    } finally {
      setCommandLoading(null);
    }
  };

  const agentQualities = devices.map(assessAgentQuality);
  const avgScore = agentQualities.length > 0
    ? Math.round(agentQualities.reduce((sum, q) => sum + q.score, 0) / agentQualities.length)
    : 0;

  // ─── Install Script Content ─────────────────────────────────────────────

  const psScript = `# MyDex Agent - Windows Install Script
# Usage: powershell -ep bypass -c "irm '${serverUrl}/api/v1/agents/install?key=YOUR_KEY' | iex"

$ErrorActionPreference = "Stop"
$ApiKey = "${apiKey || "YOUR_API_KEY"}"
$ServerUrl = "${serverUrl}"
$InstallDir = "$env:ProgramFiles\\MyDex"
$ServiceName = "MyDexAgent"

Write-Host "=== MyDex Agent Installer ===" -ForegroundColor Cyan
Write-Host "Server: $ServerUrl"

# Create install directory
New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null

# Download agent binary
Write-Host "[1/4] Downloading agent..." -ForegroundColor Yellow
$AgentUrl = "$ServerUrl/downloads/mydex-agent-windows-amd64.exe"
Invoke-WebRequest -Uri $AgentUrl -OutFile "$InstallDir\\mydex-agent.exe" -UseBasicParsing

# Write configuration
Write-Host "[2/4] Writing configuration..." -ForegroundColor Yellow
@{
    api_key = $ApiKey
    server_url = $ServerUrl
    heartbeat_interval = 60
    collect_processes = $true
    collect_network = $true
    collect_dns = $true
    collect_usb = $true
} | ConvertTo-Json | Set-Content "$InstallDir\\config.json"

# Install as Windows Service
Write-Host "[3/4] Installing Windows Service..." -ForegroundColor Yellow
& "$InstallDir\\mydex-agent.exe" --install
Start-Service -Name $ServiceName

# Verify
Write-Host "[4/4] Verifying..." -ForegroundColor Yellow
$svc = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($svc -and $svc.Status -eq "Running") {
    Write-Host "MyDex Agent installed and running!" -ForegroundColor Green
} else {
    Write-Host "Warning: Service may not be running. Check Event Viewer." -ForegroundColor Red
}`;

  const bashScript = `#!/bin/bash
# MyDex Agent - macOS/Linux Install Script
# Usage: curl -fsSL '${serverUrl}/api/v1/agents/install.sh?key=YOUR_KEY' | sudo bash

set -e

API_KEY="${apiKey || "YOUR_API_KEY"}"
SERVER_URL="${serverUrl}"
INSTALL_DIR="/opt/mydex"
PLATFORM="$(uname -s | tr '[:upper:]' '[:lower:]')"
ARCH="$(uname -m)"

echo "=== MyDex Agent Installer ==="
echo "Server: $SERVER_URL"
echo "Platform: $PLATFORM ($ARCH)"

# Normalize architecture
case "$ARCH" in
    x86_64|amd64) ARCH="amd64" ;;
    aarch64|arm64) ARCH="arm64" ;;
    *) echo "Unsupported architecture: $ARCH"; exit 1 ;;
esac

# Create install directory
echo "[1/4] Creating install directory..."
mkdir -p "$INSTALL_DIR"

# Download agent binary
echo "[2/4] Downloading agent..."
AGENT_URL="$SERVER_URL/downloads/mydex-agent-\${PLATFORM}-\${ARCH}"
curl -fsSL "$AGENT_URL" -o "$INSTALL_DIR/mydex-agent"
chmod +x "$INSTALL_DIR/mydex-agent"

# Write configuration
echo "[3/4] Writing configuration..."
cat > "$INSTALL_DIR/config.json" <<CONF
{
  "api_key": "$API_KEY",
  "server_url": "$SERVER_URL",
  "heartbeat_interval": 60,
  "collect_processes": true,
  "collect_network": true,
  "collect_dns": true,
  "collect_usb": true
}
CONF

# Install as service
echo "[4/4] Installing service..."
if [ "$PLATFORM" = "darwin" ]; then
    # macOS LaunchDaemon
    cat > /Library/LaunchDaemons/work.antifascist.mydex-agent.plist <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key><string>work.antifascist.mydex-agent</string>
    <key>ProgramArguments</key><array><string>$INSTALL_DIR/mydex-agent</string></array>
    <key>RunAtLoad</key><true/>
    <key>KeepAlive</key><true/>
    <key>WorkingDirectory</key><string>$INSTALL_DIR</string>
    <key>StandardOutPath</key><string>/var/log/mydex-agent.log</string>
    <key>StandardErrorPath</key><string>/var/log/mydex-agent.err</string>
</dict>
</plist>
PLIST
    launchctl load /Library/LaunchDaemons/work.antifascist.mydex-agent.plist
else
    # Linux systemd
    cat > /etc/systemd/system/mydex-agent.service <<SVC
[Unit]
Description=MyDex Monitoring Agent
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=$INSTALL_DIR/mydex-agent
WorkingDirectory=$INSTALL_DIR
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
SVC
    systemctl daemon-reload
    systemctl enable mydex-agent
    systemctl start mydex-agent
fi

echo ""
echo "MyDex Agent installed and running!"
echo "View status: $INSTALL_DIR/mydex-agent --status"`;

  const msiCommand = `msiexec /i mydex-agent-x64.msi /qn API_KEY="${apiKey || "YOUR_API_KEY"}" SERVER_URL="${serverUrl}" /l*v install.log`;

  const dockerCompose = `version: "3.8"
services:
  mydex-agent:
    image: ghcr.io/aes256afro/mydex-agent:latest
    container_name: mydex-agent
    restart: unless-stopped
    environment:
      - MYDEX_API_KEY=${apiKey || "YOUR_API_KEY"}
      - MYDEX_SERVER_URL=${serverUrl}
      - MYDEX_COLLECT_NETWORK=true
      - MYDEX_COLLECT_DNS=true
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    network_mode: host
    privileged: true`;

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Download className="h-6 w-6" />
          Agent Setup & Deployment
        </h1>
        <p className="text-muted-foreground mt-1">
          Deploy, monitor, and maintain the MyDex monitoring agent across your organization.
        </p>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-sm text-muted-foreground">Enrolled Devices</div>
            <div className="text-2xl font-bold">{devices.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-sm text-muted-foreground">Online Now</div>
            <div className="text-2xl font-bold text-green-600">
              {devices.filter(d => d.status === "ONLINE").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-sm text-muted-foreground">Avg Quality Score</div>
            <div className={`text-2xl font-bold ${qualityColor(avgScore)}`}>
              {devices.length > 0 ? `${avgScore}%` : "N/A"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-sm text-muted-foreground">Issues Found</div>
            <div className="text-2xl font-bold text-orange-500">
              {agentQualities.reduce((sum, q) => sum + q.issues.length, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-muted p-1 rounded-lg">
        {[
          { id: "deploy" as const, label: "Download & Deploy", icon: Download },
          { id: "quality" as const, label: "Agent Quality", icon: Activity },
          { id: "mdm" as const, label: "MDM Deployment", icon: Server },
          { id: "scripts" as const, label: "Self-Hosted Scripts", icon: Terminal },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors flex-1 justify-center ${
              activeTab === tab.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ═══ DEPLOY TAB ═══ */}
      {activeTab === "deploy" && (
        <div className="space-y-6">
          {/* Platform Selector */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Choose Platform</CardTitle>
              <CardDescription>Select your operating system to see available deployment formats.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                {([
                  { id: "windows" as Platform, label: "Windows", icon: Monitor, desc: "EXE / MSI / ZIP" },
                  { id: "macos" as Platform, label: "macOS", icon: Apple, desc: "PKG / DMG / ZIP" },
                  { id: "linux" as Platform, label: "Linux", icon: Terminal, desc: "DEB / RPM / Docker" },
                ]).map(p => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPlatform(p.id)}
                    className={`flex-1 p-4 rounded-lg border-2 transition-all text-left ${
                      selectedPlatform === p.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <p.icon className="h-6 w-6 mb-2" />
                    <div className="font-semibold">{p.label}</div>
                    <div className="text-xs text-muted-foreground">{p.desc}</div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Download Formats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Download Formats</CardTitle>
              <CardDescription>
                Version {LATEST_VERSION} &mdash; {selectedPlatform === "windows" ? "x64" : selectedPlatform === "macos" ? "Universal (Intel + Apple Silicon)" : "amd64 / arm64"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {DEPLOY_FORMATS[selectedPlatform].map(fmt => (
                <div
                  key={fmt.format}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    fmt.recommended ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      {fmt.format === "docker" ? (
                        <Box className="h-5 w-5" />
                      ) : fmt.format === "msi" ? (
                        <Package className="h-5 w-5" />
                      ) : fmt.format === "zip" ? (
                        <FileText className="h-5 w-5" />
                      ) : (
                        <HardDrive className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        {fmt.label}
                        {fmt.recommended && (
                          <Badge className="bg-primary/10 text-primary text-xs">Recommended</Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">{fmt.desc}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {fmt.format === "msi" && (
                      <Badge variant="outline" className="text-xs">GPO Ready</Badge>
                    )}
                    <Button size="sm" onClick={() => handleDownload(fmt.format)} disabled={downloading === fmt.format}>
                      {downloading === fmt.format ? (
                        <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4 mr-1" />
                      )}
                      {downloading === fmt.format ? "Downloading..." : `Download .${fmt.format}`}
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Quick Install Command */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Install</CardTitle>
              <CardDescription>
                One-liner install command. Paste your API key below, then copy the command.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">API Key</label>
                <Input
                  placeholder="mdx_your_api_key_here"
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  className="font-mono mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Generate API keys in <a href="/settings/agent-keys" className="text-primary underline">Settings &gt; Agent Keys</a>.
                </p>
              </div>
              <Separator />

              {selectedPlatform === "windows" && (
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">PowerShell (EXE installer)</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(
                          `powershell -ep bypass -c "irm '${serverUrl}/api/v1/agents/install?key=${apiKey || "YOUR_KEY"}' | iex"`,
                          "ps-exe"
                        )}
                      >
                        {copiedId === "ps-exe" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
                      {`powershell -ep bypass -c "irm '${serverUrl}/api/v1/agents/install?key=${apiKey || "YOUR_KEY"}' | iex"`}
                    </pre>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">MSI Silent Install</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(msiCommand, "msi-cmd")}
                      >
                        {copiedId === "msi-cmd" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
                      {msiCommand}
                    </pre>
                  </div>
                </div>
              )}

              {selectedPlatform === "macos" && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">Terminal (PKG installer)</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(
                        `curl -fsSL '${serverUrl}/api/v1/agents/install.sh?key=${apiKey || "YOUR_KEY"}' | sudo bash`,
                        "mac-sh"
                      )}
                    >
                      {copiedId === "mac-sh" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
                    {`curl -fsSL '${serverUrl}/api/v1/agents/install.sh?key=${apiKey || "YOUR_KEY"}' | sudo bash`}
                  </pre>
                </div>
              )}

              {selectedPlatform === "linux" && (
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">Shell Script</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(
                          `curl -fsSL '${serverUrl}/api/v1/agents/install.sh?key=${apiKey || "YOUR_KEY"}' | sudo bash`,
                          "linux-sh"
                        )}
                      >
                        {copiedId === "linux-sh" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
                      {`curl -fsSL '${serverUrl}/api/v1/agents/install.sh?key=${apiKey || "YOUR_KEY"}' | sudo bash`}
                    </pre>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">Docker Compose</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(dockerCompose, "docker")}
                      >
                        {copiedId === "docker" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
                      {dockerCompose}
                    </pre>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═══ AGENT QUALITY TAB ═══ */}
      {activeTab === "quality" && (
        <div className="space-y-6">
          {/* Overview */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Fleet Health Overview</CardTitle>
                  <CardDescription>
                    Quality assessment for all enrolled devices based on connectivity, security posture, and agent status.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => fetchDevices(true)} disabled={refreshing}>
                    <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? "animate-spin" : ""}`} />
                    {refreshing ? "Refreshing..." : "Refresh"}
                  </Button>
                  {refreshLog.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={() => setShowRefreshConsole(!showRefreshConsole)} className="text-xs">
                      <Terminal className="h-3.5 w-3.5 mr-1" />
                      {showRefreshConsole ? "Hide" : "Show"} Console
                    </Button>
                  )}
                </div>
              </div>

              {/* Refresh Console */}
              {showRefreshConsole && refreshLog.length > 0 && (
                <div className="mt-3 rounded-lg border bg-gray-950 text-gray-100 font-mono text-xs overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-1.5 bg-gray-900 border-b border-gray-800">
                    <div className="flex items-center gap-2">
                      <Terminal className="h-3.5 w-3.5 text-green-400" />
                      <span className="text-gray-400">Agent Health Check</span>
                    </div>
                    <button onClick={() => setShowRefreshConsole(false)} className="text-gray-500 hover:text-gray-300">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="max-h-48 overflow-y-auto p-3 space-y-0.5">
                    {refreshLog.map((log, i) => (
                      <div key={i} className="flex gap-2">
                        <span className="text-gray-500 shrink-0">[{log.time}]</span>
                        <span className={
                          log.type === "success" ? "text-green-400" :
                          log.type === "error" ? "text-red-400" :
                          log.type === "warn" ? "text-yellow-400" :
                          "text-gray-300"
                        }>{log.msg}</span>
                      </div>
                    ))}
                    {refreshing && (
                      <div className="flex gap-2 animate-pulse">
                        <span className="text-gray-500">[{new Date().toLocaleTimeString()}]</span>
                        <span className="text-blue-400">Processing...</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading devices...</div>
              ) : devices.length === 0 ? (
                <div className="text-center py-12">
                  <Monitor className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="font-semibold text-lg">No Devices Enrolled</h3>
                  <p className="text-muted-foreground mt-1 max-w-md mx-auto">
                    Deploy the MyDex agent to your workstations to start monitoring. Use the Download &amp; Deploy tab to get started.
                  </p>
                  <Button className="mt-4" onClick={() => setActiveTab("deploy")}>
                    <Download className="h-4 w-4 mr-2" />
                    Go to Deploy
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Score distribution bar */}
                  <div className="flex gap-1 h-3 rounded-full overflow-hidden">
                    {(() => {
                      const excellent = agentQualities.filter(q => q.score >= 90).length;
                      const good = agentQualities.filter(q => q.score >= 70 && q.score < 90).length;
                      const fair = agentQualities.filter(q => q.score >= 50 && q.score < 70).length;
                      const poor = agentQualities.filter(q => q.score < 50).length;
                      const total = agentQualities.length;
                      return (
                        <>
                          {excellent > 0 && <div className="bg-green-500" style={{ width: `${(excellent / total) * 100}%` }} />}
                          {good > 0 && <div className="bg-yellow-500" style={{ width: `${(good / total) * 100}%` }} />}
                          {fair > 0 && <div className="bg-orange-500" style={{ width: `${(fair / total) * 100}%` }} />}
                          {poor > 0 && <div className="bg-red-500" style={{ width: `${(poor / total) * 100}%` }} />}
                        </>
                      );
                    })()}
                  </div>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> Excellent ({agentQualities.filter(q => q.score >= 90).length})</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500" /> Good ({agentQualities.filter(q => q.score >= 70 && q.score < 90).length})</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500" /> Fair ({agentQualities.filter(q => q.score >= 50 && q.score < 70).length})</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Poor ({agentQualities.filter(q => q.score < 50).length})</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Per-Device Quality Cards */}
          {agentQualities.map(({ device, score, issues }) => (
            <Card key={device.id} className={`border ${qualityBg(score)}`}>
              <CardContent className="pt-4 pb-4">
                {/* Device Header */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setExpandedDevice(expandedDevice === device.id ? null : device.id)}
                    className="flex items-center gap-3 text-left"
                  >
                    {expandedDevice === device.id ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    <Monitor className="h-5 w-5" />
                    <div>
                      <div className="font-semibold">{device.hostname}</div>
                      <div className="text-xs text-muted-foreground">
                        {device.user?.name || "Unassigned"} &middot; {device.ipAddress} &middot; v{device.agentVersion}
                      </div>
                    </div>
                  </button>
                  <div className="flex items-center gap-3">
                    {/* Status Badge */}
                    <Badge
                      className={
                        device.status === "ONLINE"
                          ? "bg-green-100 text-green-800"
                          : device.status === "OFFLINE"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                      }
                    >
                      {device.status === "ONLINE" ? (
                        <Wifi className="h-3 w-3 mr-1" />
                      ) : (
                        <WifiOff className="h-3 w-3 mr-1" />
                      )}
                      {device.status}
                    </Badge>
                    {/* Quality Score */}
                    <div className={`text-2xl font-bold ${qualityColor(score)}`}>
                      {score}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {qualityLabel(score)}
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedDevice === device.id && (
                  <div className="mt-4 space-y-4">
                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => sendCommand(device.id, "COLLECT_LOGS", "Collect diagnostic logs")}
                        disabled={commandLoading === device.id + "COLLECT_LOGS" || device.status !== "ONLINE"}
                      >
                        <Search className="h-4 w-4 mr-1" />
                        Troubleshoot
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => sendCommand(device.id, "RESTART_SERVICE", "Restart MyDex Agent service")}
                        disabled={commandLoading === device.id + "RESTART_SERVICE" || device.status !== "ONLINE"}
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Repair Agent
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => sendCommand(device.id, "UPDATE_AGENT", "Update agent to latest version")}
                        disabled={commandLoading === device.id + "UPDATE_AGENT" || device.status !== "ONLINE"}
                      >
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Update Agent
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const cmd = device.platform?.includes("win")
                            ? `powershell -ep bypass -c "irm '${serverUrl}/api/v1/agents/install?key=${apiKey || "YOUR_KEY"}' | iex"`
                            : `curl -fsSL '${serverUrl}/api/v1/agents/install.sh?key=${apiKey || "YOUR_KEY"}' | sudo bash`;
                          copyToClipboard(cmd, "reinstall-" + device.id);
                        }}
                      >
                        <Play className="h-4 w-4 mr-1" />
                        {copiedId === "reinstall-" + device.id ? "Copied!" : "Reinstall Command"}
                      </Button>
                      {isAdmin && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => sendCommand(device.id, "FORCE_REBOOT", "Force reboot to apply pending updates")}
                          disabled={commandLoading === device.id + "FORCE_REBOOT" || device.status !== "ONLINE"}
                        >
                          <Zap className="h-4 w-4 mr-1" />
                          Force Reboot
                        </Button>
                      )}
                    </div>

                    <Separator />

                    {/* Issues List */}
                    {issues.length === 0 ? (
                      <div className="flex items-center gap-2 text-green-700 bg-green-50 rounded-lg p-3">
                        <CheckCircle className="h-5 w-5" />
                        <span className="font-medium">All checks passed. No issues detected.</span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="text-sm font-medium">
                          {issues.length} issue{issues.length !== 1 ? "s" : ""} found
                        </div>
                        {issues.map(issue => (
                          <div
                            key={issue.id}
                            className={`rounded-lg border p-3 ${
                              issue.severity === "critical"
                                ? "border-red-200 bg-red-50"
                                : issue.severity === "warning"
                                ? "border-yellow-200 bg-yellow-50"
                                : "border-blue-200 bg-blue-50"
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-2">
                                {issue.severity === "critical" ? (
                                  <XCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                                ) : issue.severity === "warning" ? (
                                  <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
                                ) : (
                                  <Activity className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                                )}
                                <div>
                                  <div className="font-medium text-sm">{issue.title}</div>
                                  <div className="text-xs text-muted-foreground mt-0.5">{issue.description}</div>
                                  <div className="text-xs mt-1.5">
                                    <span className="font-medium">Fix: </span>
                                    {issue.remediation}
                                  </div>
                                </div>
                              </div>
                              {issue.autoFixable && issue.commandType && device.status === "ONLINE" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="ml-2 shrink-0"
                                  onClick={() => sendCommand(device.id, issue.commandType!, issue.remediation)}
                                  disabled={commandLoading === device.id + issue.commandType}
                                >
                                  <Wrench className="h-3 w-3 mr-1" />
                                  Auto-Fix
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Quick Info */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div className="bg-background rounded p-2">
                        <div className="text-muted-foreground text-xs">CPU</div>
                        <div className="font-medium truncate">{device.cpuName || "N/A"}</div>
                      </div>
                      <div className="bg-background rounded p-2">
                        <div className="text-muted-foreground text-xs">RAM</div>
                        <div className="font-medium">
                          {device.ramAvailGb?.toFixed(1)}GB / {device.ramTotalGb}GB
                        </div>
                      </div>
                      <div className="bg-background rounded p-2">
                        <div className="text-muted-foreground text-xs">Last Seen</div>
                        <div className="font-medium">{timeAgo(device.lastSeenAt)}</div>
                      </div>
                      <div className="bg-background rounded p-2">
                        <div className="text-muted-foreground text-xs">Antivirus</div>
                        <div className="font-medium">{device.antivirusName || "None"}</div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ═══ MDM TAB ═══ */}
      {activeTab === "mdm" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">MDM / Enterprise Deployment</CardTitle>
              <CardDescription>
                Deploy the MyDex agent at scale using your existing device management solution.
                The MSI package supports silent installation with pre-configured API keys.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* API Key input for MDM */}
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <label className="text-sm font-medium">API Key for Deployment</label>
                <Input
                  placeholder="mdx_your_api_key_here"
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  This key will be embedded in the install commands below. Generate keys in{" "}
                  <a href="/settings/agent-keys" className="text-primary underline">Agent Keys</a>.
                </p>
              </div>

              <Separator />

              {/* MSI Properties Reference */}
              <div>
                <h3 className="font-semibold text-sm mb-2">MSI Install Properties</h3>
                <div className="bg-muted rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2 font-medium">Property</th>
                        <th className="text-left p-2 font-medium">Description</th>
                        <th className="text-left p-2 font-medium">Example</th>
                      </tr>
                    </thead>
                    <tbody className="font-mono text-xs">
                      <tr className="border-b"><td className="p-2">API_KEY</td><td className="p-2 font-sans">Agent API key</td><td className="p-2">mdx_abc123...</td></tr>
                      <tr className="border-b"><td className="p-2">SERVER_URL</td><td className="p-2 font-sans">MyDex server URL</td><td className="p-2">{serverUrl}</td></tr>
                      <tr className="border-b"><td className="p-2">INSTALL_DIR</td><td className="p-2 font-sans">Custom install path</td><td className="p-2">C:\MyDex</td></tr>
                      <tr className="border-b"><td className="p-2">START_SERVICE</td><td className="p-2 font-sans">Auto-start service</td><td className="p-2">1 (default)</td></tr>
                      <tr><td className="p-2">LOG_LEVEL</td><td className="p-2 font-sans">Logging verbosity</td><td className="p-2">info | debug | warn</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <Separator />

              {/* MDM-specific instructions */}
              {MDM_SOLUTIONS.map(mdm => (
                <div key={mdm.id} className="border rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedMdm(expandedMdm === mdm.id ? null : mdm.id)}
                    className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg ${mdm.color} text-white flex items-center justify-center font-bold text-sm`}>
                        {mdm.icon}
                      </div>
                      <div className="text-left">
                        <div className="font-semibold">{mdm.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {mdm.platforms.join(" / ")}
                        </div>
                      </div>
                    </div>
                    {expandedMdm === mdm.id ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                  {expandedMdm === mdm.id && (
                    <div className="border-t px-4 pb-4">
                      <ol className="mt-3 space-y-3">
                        {mdm.steps.map((step, i) => (
                          <li key={i} className="flex gap-3">
                            <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 text-sm font-semibold">
                              {i + 1}
                            </div>
                            <div className="text-sm pt-0.5">
                              {step.includes("msiexec") || step.includes("irm") || step.includes("curl") ? (
                                <div>
                                  <span>{step.split(":")[0]}:</span>
                                  <pre className="bg-muted p-2 rounded text-xs mt-1 overflow-x-auto">
                                    {step.includes("API_KEY")
                                      ? step.replace(/YOUR_KEY/g, apiKey || "YOUR_KEY").replace(/YOUR_API_KEY/g, apiKey || "YOUR_API_KEY")
                                      : step.substring(step.indexOf(":") + 2)}
                                  </pre>
                                </div>
                              ) : (
                                step
                              )}
                            </div>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Deployment Checklist */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Pre-Deployment Checklist</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[
                  { label: "Generate a dedicated API key for MDM deployment", link: "/settings/agent-keys" },
                  { label: "Set key expiration policy (recommended: 90 days with rotation)" },
                  { label: "Whitelist MyDex server URL in your firewall/proxy" },
                  { label: "Add device hostnames to the device allowlist (if enabled)" },
                  { label: "Test silent install on a pilot device before mass deployment" },
                  { label: "Configure agent policy for collection intervals and features" },
                  { label: "Set up monitoring alerts for agent offline events" },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <div className="w-5 h-5 rounded border border-border flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="h-3 w-3 text-muted-foreground" />
                    </div>
                    <span>
                      {item.label}
                      {item.link && (
                        <a href={item.link} className="text-primary underline ml-1 text-xs">
                          <ArrowRight className="h-3 w-3 inline" />
                        </a>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═══ SELF-HOSTED SCRIPTS TAB ═══ */}
      {activeTab === "scripts" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Self-Hosted Install Scripts</CardTitle>
              <CardDescription>
                Host these scripts on your MyDex instance for one-command agent deployment.
                The API endpoint <code className="bg-muted px-1 rounded text-xs">/api/v1/agents/install</code> serves
                these scripts dynamically with your server URL pre-configured.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <label className="text-sm font-medium">API Key</label>
                <Input
                  placeholder="mdx_your_api_key_here"
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  className="font-mono"
                />
              </div>
            </CardContent>
          </Card>

          {/* Self-hosted endpoint info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Install Script Endpoints
              </CardTitle>
              <CardDescription>
                Your MyDex server hosts install scripts that employees or MDM systems can fetch and execute.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="border rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm flex items-center gap-2">
                        <Monitor className="h-4 w-4" /> Windows (PowerShell)
                      </div>
                      <code className="text-xs text-muted-foreground">GET /api/v1/agents/install?key=&lt;API_KEY&gt;</code>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(
                        `powershell -ep bypass -c "irm '${serverUrl}/api/v1/agents/install?key=${apiKey || "YOUR_KEY"}' | iex"`,
                        "endpoint-ps"
                      )}
                    >
                      {copiedId === "endpoint-ps" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="border rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm flex items-center gap-2">
                        <Terminal className="h-4 w-4" /> macOS / Linux (Bash)
                      </div>
                      <code className="text-xs text-muted-foreground">GET /api/v1/agents/install.sh?key=&lt;API_KEY&gt;</code>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(
                        `curl -fsSL '${serverUrl}/api/v1/agents/install.sh?key=${apiKey || "YOUR_KEY"}' | sudo bash`,
                        "endpoint-sh"
                      )}
                    >
                      {copiedId === "endpoint-sh" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* PowerShell Script */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Monitor className="h-5 w-5" />
                  Windows Install Script (PowerShell)
                </CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(psScript, "ps-full")}
                >
                  {copiedId === "ps-full" ? (
                    <><Check className="h-4 w-4 mr-1" /> Copied</>
                  ) : (
                    <><Copy className="h-4 w-4 mr-1" /> Copy Script</>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto max-h-96 overflow-y-auto">
                {psScript}
              </pre>
            </CardContent>
          </Card>

          {/* Bash Script */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Terminal className="h-5 w-5" />
                  macOS / Linux Install Script (Bash)
                </CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(bashScript, "bash-full")}
                >
                  {copiedId === "bash-full" ? (
                    <><Check className="h-4 w-4 mr-1" /> Copied</>
                  ) : (
                    <><Copy className="h-4 w-4 mr-1" /> Copy Script</>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto max-h-96 overflow-y-auto">
                {bashScript}
              </pre>
            </CardContent>
          </Card>

          {/* Docker */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Box className="h-5 w-5" />
                  Docker Compose
                </CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(dockerCompose, "docker-full")}
                >
                  {copiedId === "docker-full" ? (
                    <><Check className="h-4 w-4 mr-1" /> Copied</>
                  ) : (
                    <><Copy className="h-4 w-4 mr-1" /> Copy</>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
                {dockerCompose}
              </pre>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
