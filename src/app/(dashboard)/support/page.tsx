"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  LifeBuoy, Monitor, Wifi, WifiOff, Globe, Shield, ShieldCheck,
  Play, CheckCircle, RefreshCw, Search, Lock, Trash2, Clock,
  CircleStop, Zap, FileText, XCircle, Terminal, ChevronRight,
  Sparkles, BatteryCharging, Volume2, Bluetooth, MousePointer,
  Keyboard, Eye, Loader2, ClipboardList, UserPlus, PrinterCheck,
  AlertTriangle, ChevronDown, ChevronUp, X, ScrollText, Bug,
  Package, HardDrive, Cpu, Activity, Wrench, MessageCircle, Send, ArrowLeft, Star, ThumbsUp,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface DeviceInfo {
  id: string;
  hostname: string;
  platform: string;
  status: string;
  ipAddress: string;
  osVersion: string;
  cpuName: string | null;
  cpuCores: number | null;
  ramTotalGb: number | null;
  ramAvailGb: number | null;
  gpuName: string | null;
  uptimeSeconds: number | null;
  antivirusName: string | null;
  defenderStatus: string | null;
  firewallStatus: Record<string, boolean> | null;
  pendingUpdates: Array<{ title: string; kb: string }> | null;
  rebootPending: boolean;
  bsodCount: number;
  openCves: number;
  activeIocs: number;
  installedSoftware: { name: string; version: string }[];
  user: { id: string; name: string; email: string };
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
  satisfactionComment?: string | null;
  submitter: { id: string; name: string; email: string };
  assignee?: { id: string; name: string; email: string } | null;
  device?: { id: string; hostname: string; platform: string } | null;
  messages?: { user: { name: string }; createdAt: string }[];
  _count?: { messages: number };
}

interface TicketMessageData {
  id: string;
  message: string;
  isInternal: boolean;
  createdAt: string;
  user: { id: string; name: string; email: string; image?: string; role: string };
}

// Stock ticket reasons (enabled ones only, no admin config)
const stockReasons = [
  { id: "sr1", label: "System is slow", category: "performance", icon: "🐌", common: true },
  { id: "sr2", label: "App is slow or crashing", category: "app-issue", icon: "💥", common: true },
  { id: "sr3", label: "Unable to access SaaS/cloud app or site", category: "access", icon: "🌐", common: true },
  { id: "sr4", label: "VPN/Network connectivity issues", category: "network", icon: "📡", common: true },
  { id: "sr5", label: "Printer not working", category: "hardware", icon: "🖨️", common: true },
  { id: "sr6", label: "Can't login / password issue", category: "access", icon: "🔑", common: true },
  { id: "sr7", label: "Blue screen / system crash", category: "performance", icon: "🔵", common: false },
  { id: "sr8", label: "Software installation request", category: "app-issue", icon: "📦", common: false },
  { id: "sr9", label: "Email not syncing", category: "app-issue", icon: "📧", common: false },
  { id: "sr10", label: "Monitor/display issue", category: "hardware", icon: "🖥️", common: false },
  { id: "sr13", label: "File access / permissions issue", category: "access", icon: "📂", common: false },
  { id: "sr14", label: "Security alert on my device", category: "security", icon: "🛡️", common: false },
  { id: "sr15", label: "Other", category: "other", icon: "💬", common: false },
];

// App install paths by OS
const appPaths: Record<string, { win?: string; mac?: string }> = {
  "VS Code": { win: "C:\\Users\\%USER%\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe", mac: "/Applications/Visual Studio Code.app" },
  "Chrome": { win: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", mac: "/Applications/Google Chrome.app" },
  "Slack": { win: "C:\\Users\\%USER%\\AppData\\Local\\slack\\slack.exe", mac: "/Applications/Slack.app" },
  "Docker Desktop": { win: "C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe", mac: "/Applications/Docker.app" },
  "Teams": { win: "C:\\Users\\%USER%\\AppData\\Local\\Microsoft\\Teams\\Update.exe", mac: "/Applications/Microsoft Teams.app" },
  "Zoom": { win: "C:\\Users\\%USER%\\AppData\\Roaming\\Zoom\\bin\\Zoom.exe", mac: "/Applications/zoom.us.app" },
};

function formatUptime(seconds: number | null) {
  if (!seconds) return "N/A";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function SupportPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<"mydevice" | "selfservice" | "submit" | "tickets">("mydevice");
  const [selfServiceFilter, setSelfServiceFilter] = useState<"all" | "performance" | "network" | "display" | "apps" | "security" | "peripherals">("all");
  const [ranRemediations, setRanRemediations] = useState<Set<string>>(new Set());
  const [myDevice, setMyDevice] = useState<DeviceInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [selectedApp, setSelectedApp] = useState<string | null>(null);
  const [ticketDescription, setTicketDescription] = useState("");
  const [commandLogs, setCommandLogs] = useState<CommandLog[]>([]);
  const [showLogPanel, setShowLogPanel] = useState(false);
  const [logPanelMinimized, setLogPanelMinimized] = useState(false);
  const [runningCommands, setRunningCommands] = useState<Set<string>>(new Set());
  const [selectedResetApp, setSelectedResetApp] = useState<string | null>(null);
  const [appSearchQuery, setAppSearchQuery] = useState("");
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [submittingTicket, setSubmittingTicket] = useState(false);
  const [viewingTicket, setViewingTicket] = useState<string | null>(null);
  const [ticketMessages, setTicketMessages] = useState<TicketMessageData[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [ratingStars, setRatingStars] = useState(0);
  const [ratingHover, setRatingHover] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const [submittingRating, setSubmittingRating] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch the current user's device automatically
  useEffect(() => {
    async function fetchMyDevice() {
      try {
        const res = await fetch("/api/v1/agents/devices");
        if (res.ok) {
          const data = await res.json();
          const devices = data.devices || [];
          // Find device belonging to the current user
          const userId = session?.user?.id;
          const userDevice = devices.find((d: DeviceInfo) => d.user?.id === userId);
          // Fallback: if only one device, use it
          setMyDevice(userDevice || (devices.length === 1 ? devices[0] : null));
        }
      } catch {
        // API not available
      } finally {
        setLoading(false);
      }
    }
    if (session?.user) fetchMyDevice();
  }, [session]);

  const isWindows = myDevice?.platform === "win32" || myDevice?.platform?.toLowerCase() === "windows";
  const isMac = myDevice?.platform === "darwin" || myDevice?.platform?.toLowerCase() === "macos";
  const deviceApps = myDevice?.installedSoftware || [];

  // Auto-scroll log panel
  useEffect(() => {
    if (logEndRef.current && showLogPanel && !logPanelMinimized) {
      logEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [commandLogs, showLogPanel, logPanelMinimized]);

  // Poll for command status
  const pollCommandStatus = useCallback(async (logId: string, commandId: string) => {
    try {
      const res = await fetch(`/api/v1/agents/commands?status=COMPLETED&status=FAILED`);
      if (!res.ok) return false;
      const data = await res.json();
      const cmd = data.commands?.find((c: { id: string }) => c.id === commandId);
      if (cmd && (cmd.status === "COMPLETED" || cmd.status === "FAILED")) {
        setCommandLogs(prev => prev.map(l =>
          l.id === logId ? {
            ...l,
            status: cmd.status,
            result: cmd.result || (cmd.status === "COMPLETED" ? "Command executed successfully." : "Command execution failed."),
            completedAt: new Date(),
          } : l
        ));
        setRunningCommands(prev => { const s = new Set(prev); s.delete(logId); return s; });
        return true;
      }
    } catch { /* ignore */ }
    return false;
  }, []);

  // Execute a remediation
  const executeRemediation = useCallback(async (title: string, script: string) => {
    if (!myDevice) return;

    const logId = `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newLog: CommandLog = {
      id: logId,
      title,
      script,
      deviceId: myDevice.id,
      deviceName: myDevice.hostname,
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
          deviceId: myDevice.id,
          commandType: "RUN_SCRIPT",
          command: script,
          description: `Self-Service: ${title}`,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        setCommandLogs(prev => prev.map(l =>
          l.id === logId ? { ...l, status: "FAILED" as const, result: `Failed: ${err.error || res.statusText}`, completedAt: new Date() } : l
        ));
        setRunningCommands(prev => { const s = new Set(prev); s.delete(logId); return s; });
        return;
      }

      const cmdData = await res.json();
      setCommandLogs(prev => prev.map(l =>
        l.id === logId ? { ...l, status: "SENT" as const, commandId: cmdData.id } : l
      ));

      // Poll for completion
      let attempts = 0;
      const interval = setInterval(async () => {
        attempts++;
        const done = await pollCommandStatus(logId, cmdData.id);
        if (done || attempts > 30) clearInterval(interval);
      }, 2000);
    } catch {
      setCommandLogs(prev => prev.map(l =>
        l.id === logId ? { ...l, status: "FAILED" as const, result: "Network error", completedAt: new Date() } : l
      ));
      setRunningCommands(prev => { const s = new Set(prev); s.delete(logId); return s; });
    }
  }, [myDevice, pollCommandStatus]);

  // Fetch user's tickets
  const fetchTickets = useCallback(async () => {
    setTicketsLoading(true);
    try {
      const res = await fetch("/api/v1/tickets?mine=true");
      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets || []);
      }
    } catch { /* ignore */ } finally {
      setTicketsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "tickets") fetchTickets();
  }, [activeTab, fetchTickets]);

  // Submit a ticket
  // Auto-populate ticket subject based on selected issue + app
  const getTicketSubject = () => {
    const reason = stockReasons.find(r => r.id === selectedReason);
    if (!reason) return "Support Request";
    let subject = reason.label;
    if (selectedApp) subject += ` — ${selectedApp}`;
    if (myDevice) subject += ` (${myDevice.hostname})`;
    return subject;
  };

  // Auto-populate description based on issue type
  const getAutoDescription = () => {
    const reason = stockReasons.find(r => r.id === selectedReason);
    if (!reason) return "";
    const lines: string[] = [];
    lines.push(`Issue: ${reason.label}`);
    if (myDevice) {
      lines.push(`Device: ${myDevice.hostname} (${isWindows ? "Windows" : isMac ? "macOS" : "Linux"})`);
      lines.push(`IP: ${myDevice.ipAddress}`);
      if (myDevice.osVersion) lines.push(`OS: ${myDevice.osVersion}`);
      if (myDevice.cpuName) lines.push(`CPU: ${myDevice.cpuName}`);
      if (myDevice.ramTotalGb) lines.push(`RAM: ${myDevice.ramTotalGb}GB`);
    }
    if (selectedApp) {
      lines.push(`Application: ${selectedApp}`);
      const appVersion = deviceApps.find(a => a.name === selectedApp)?.version;
      if (appVersion) lines.push(`App Version: ${appVersion}`);
    }
    return lines.join("\n");
  };

  const submitTicket = async () => {
    if (!selectedReason) return;
    setSubmittingTicket(true);
    try {
      const reason = stockReasons.find(r => r.id === selectedReason);
      const autoDesc = getAutoDescription();
      const fullDescription = ticketDescription
        ? `${ticketDescription}\n\n--- Auto-captured Info ---\n${autoDesc}`
        : autoDesc;

      const res = await fetch("/api/v1/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: getTicketSubject(),
          category: reason?.category || "other",
          reason: reason?.label,
          appName: selectedApp || undefined,
          description: fullDescription,
          deviceId: myDevice?.id,
          deviceInfo: myDevice ? {
            hostname: myDevice.hostname,
            platform: myDevice.platform,
            osVersion: myDevice.osVersion,
            ipAddress: myDevice.ipAddress,
            cpuName: myDevice.cpuName,
            ramTotalGb: myDevice.ramTotalGb,
          } : undefined,
          networkInfo: myDevice && (selectedReason === "sr3" || selectedReason === "sr4") ? {
            ipAddress: myDevice.ipAddress,
            platform: myDevice.platform,
          } : undefined,
        }),
      });

      if (res.ok) {
        setSelectedReason(null);
        setSelectedApp(null);
        setTicketDescription("");
        setActiveTab("tickets");
        fetchTickets();
      } else {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        alert(`Failed to submit ticket: ${err.error || res.statusText}`);
      }
    } catch (error) {
      alert(`Network error submitting ticket: ${error instanceof Error ? error.message : "Unknown error"}`);
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
        body: JSON.stringify({ message: newMessage.trim() }),
      });
      if (res.ok) {
        setNewMessage("");
        fetchMessages(viewingTicket);
        fetchTickets();
      }
    } catch { /* ignore */ } finally {
      setSendingMessage(false);
    }
  };

  // Submit satisfaction rating
  const submitRating = async (ticketId: string) => {
    if (!ratingStars) return;
    setSubmittingRating(true);
    try {
      await fetch("/api/v1/tickets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: ticketId,
          satisfactionRating: ratingStars,
          satisfactionComment: ratingComment || undefined,
        }),
      });
      fetchTickets();
      setRatingStars(0);
      setRatingComment("");
    } catch { /* ignore */ } finally {
      setSubmittingRating(false);
    }
  };

  // Confirm issue resolved (user closes ticket)
  const confirmResolved = async (ticketId: string) => {
    try {
      await fetch("/api/v1/tickets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: ticketId, confirmResolved: true }),
      });
      fetchTickets();
    } catch { /* ignore */ }
  };

  // Scroll messages to bottom
  useEffect(() => {
    if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [ticketMessages]);

  // Self-service remediations
  type SelfRemedy = { id: string; title: string; desc: string; icon: React.ElementType; category: string; risk: "safe" | "low" | "medium"; os: "all" | "windows" | "macos"; steps: string[]; script?: string; time: string };
  const selfRemediations: SelfRemedy[] = [
    // Performance
    { id: "sf1", title: "Clear Temporary Files", desc: "Free up disk space by removing cached and temp files", icon: Trash2, category: "performance", risk: "safe", os: "all", steps: ["Closes running temp file handles", "Deletes user-level temp files", "Reports space recovered"], script: isWindows ? "Remove-Item -Path \"$env:TEMP\\*\" -Recurse -Force -EA SilentlyContinue\nWrite-Host \"Temp files cleared\"" : "rm -rf ~/Library/Caches/* ~/Library/Logs/* /tmp/$USER-*\necho 'Temp files cleared'", time: "~30s" },
    { id: "sf2", title: "Close Background Apps", desc: "Shut down heavy background processes eating memory and CPU", icon: CircleStop, category: "performance", risk: "safe", os: "all", steps: ["Scans for high-memory background processes", "Shows a list before terminating", "Keeps essential system services running"], script: isWindows ? "Get-Process | Where-Object {$_.WorkingSet -gt 500MB -and $_.MainWindowHandle -eq 0} | Select-Object Name,@{N='MB';E={[math]::Round($_.WorkingSet/1MB)}} | Format-Table" : "ps aux | awk '$6 > 500000 {print $11, $6/1024 \" MB\"}' | head -10", time: "~10s" },
    { id: "sf3", title: "Restart Explorer / Finder", desc: "Fix frozen desktop, taskbar, or file browser", icon: RefreshCw, category: "performance", risk: "safe", os: "all", steps: ["Gracefully restarts the shell process", "Taskbar/Dock refreshes automatically", "Open windows may briefly disappear"], script: isWindows ? "Stop-Process -Name explorer -Force; Start-Sleep 2; Start-Process explorer" : "killall Finder", time: "~5s" },
    { id: "sf4", title: "Free Up RAM", desc: "Purge inactive memory and clear system caches", icon: BatteryCharging, category: "performance", risk: "safe", os: "all", steps: ["Flushes standby memory pages", "Clears file system cache", "No apps are closed"], script: isWindows ? "Get-Process | Where {$_.WorkingSet -gt 1GB} | ForEach { $_.MinWorkingSet = 1MB }" : "sudo purge\necho 'Memory cache purged'", time: "~15s" },

    // Network
    { id: "sf5", title: "Fix Internet Connection", desc: "Reset DNS cache and renew IP address", icon: Wifi, category: "network", risk: "safe", os: "all", steps: ["Flushes DNS resolver cache", "Releases and renews DHCP lease", "Tests connectivity after"], script: isWindows ? "ipconfig /flushdns\nipconfig /release\nipconfig /renew\nTest-NetConnection google.com -Port 443" : "sudo dscacheutil -flushcache\nsudo killall -HUP mDNSResponder\nping -c 3 google.com", time: "~20s" },
    { id: "sf6", title: "Reset Wi-Fi Adapter", desc: "Turn Wi-Fi off and back on to fix connectivity issues", icon: WifiOff, category: "network", risk: "safe", os: "all", steps: ["Disables the Wi-Fi adapter", "Waits 5 seconds", "Re-enables and reconnects"], script: isWindows ? "Disable-NetAdapter -Name 'Wi-Fi' -Confirm:$false\nStart-Sleep 5\nEnable-NetAdapter -Name 'Wi-Fi'" : "networksetup -setairportpower en0 off\nsleep 5\nnetworksetup -setairportpower en0 on", time: "~15s" },
    { id: "sf7", title: "Test VPN Connectivity", desc: "Check if VPN tunnel is active and route traffic correctly", icon: Globe, category: "network", risk: "safe", os: "all", steps: ["Checks VPN adapter status", "Tests internal DNS resolution", "Verifies tunnel routing"], script: isWindows ? "Get-VpnConnection | Format-Table Name,ServerAddress,ConnectionStatus\nTest-NetConnection internal.corp.com -Port 443" : "ifconfig | grep -A 5 utun\nping -c 2 internal.corp.com", time: "~10s" },

    // Display
    { id: "sf8", title: "Fix Display Scaling", desc: "Reset DPI and display scaling to defaults", icon: Eye, category: "display", risk: "low", os: "all", steps: ["Resets display scaling to recommended", "Refreshes desktop rendering", "May require re-login for full effect"], script: isWindows ? "Set-ItemProperty -Path 'HKCU:\\Control Panel\\Desktop' -Name LogPixels -Value 96\nWrite-Host 'Display scaling reset. Log off to apply.'" : "defaults delete NSGlobalDomain AppleDisplayScaleFactor 2>/dev/null\nkillall Dock\necho 'Display settings reset'", time: "~5s" },
    { id: "sf9", title: "Fix Black/Blank Screen", desc: "Reset graphics driver without rebooting", icon: Monitor, category: "display", risk: "low", os: "windows", steps: ["Sends Win+Ctrl+Shift+B shortcut", "Restarts the graphics driver", "Screen may flicker briefly"], script: "Write-Host 'Press Win+Ctrl+Shift+B to reset graphics driver'\nWrite-Host 'Screen will flicker — this is normal'", time: "~3s" },

    // Apps
    { id: "sf10", title: "Clear Browser Cache", desc: "Remove cached data from Chrome, Edge, or Firefox", icon: Globe, category: "apps", risk: "safe", os: "all", steps: ["Closes browser processes safely", "Clears cache and session storage", "Preserves bookmarks and passwords"], script: isWindows ? "Stop-Process -Name chrome,msedge,firefox -Force -EA SilentlyContinue\nRemove-Item \"$env:LOCALAPPDATA\\Google\\Chrome\\User Data\\Default\\Cache\\*\" -Recurse -Force -EA SilentlyContinue\nWrite-Host 'Browser cache cleared'" : "rm -rf ~/Library/Caches/Google/Chrome/Default/Cache/*\necho 'Browser cache cleared'", time: "~15s" },
    { id: "sf11", title: "Reset Stuck Application", desc: "Force-quit and relaunch a frozen application", icon: Zap, category: "apps", risk: "safe", os: "all", steps: ["Select the frozen application below", "Force terminates the process", "Relaunches from install path"], script: selectedResetApp ? (isWindows ? `Stop-Process -Name "${selectedResetApp}" -Force -EA SilentlyContinue\nStart-Sleep 2\nWrite-Host 'Terminated: ${selectedResetApp}'` : `killall "${selectedResetApp}" 2>/dev/null\nsleep 2\necho 'Terminated: ${selectedResetApp}'`) : undefined, time: "~5s" },
    { id: "sf12", title: "Repair Microsoft Office", desc: "Run the built-in Office repair tool", icon: FileText, category: "apps", risk: "low", os: "windows", steps: ["Launches Office Click-to-Run repair", "Verifies Office file integrity", "May take several minutes"], script: "& \"C:\\Program Files\\Common Files\\Microsoft Shared\\ClickToRun\\OfficeC2RClient.exe\" /update user displaylevel=false", time: "~5min" },
    { id: "sf13", title: "Fix Teams/Slack Issues", desc: "Clear app cache and reset for fresh login", icon: RefreshCw, category: "apps", risk: "low", os: "all", steps: ["Stops the application", "Clears local cache and storage", "Relaunches with fresh state"], script: isWindows ? "Stop-Process -Name Teams,slack -Force -EA SilentlyContinue\nRemove-Item \"$env:APPDATA\\Microsoft\\Teams\\Cache\\*\" -Recurse -Force -EA SilentlyContinue\nWrite-Host 'App cache cleared.'" : "killall Teams Slack 2>/dev/null\nrm -rf ~/Library/Application\\ Support/Microsoft/Teams/Cache/*\necho 'App cache cleared.'", time: "~15s" },

    // Security
    { id: "sf14", title: "Check for Malware", desc: "Run a quick scan with built-in security tools", icon: Shield, category: "security", risk: "safe", os: "all", steps: ["Initiates a quick system scan", "Checks running processes against known threats", "Reports findings immediately"], script: isWindows ? "Start-MpScan -ScanType QuickScan\nGet-MpThreatDetection | Format-Table -AutoSize" : "spctl --assess --type execute /Applications/*.app 2>&1 | head -20\necho 'XProtect is active'", time: "~2min" },
    { id: "sf15", title: "Update Security Definitions", desc: "Force-update antivirus/malware definitions", icon: ShieldCheck, category: "security", risk: "safe", os: "all", steps: ["Downloads latest threat definitions", "Updates local signature database", "Verifies update was applied"], script: isWindows ? "Update-MpSignature -UpdateSource MicrosoftUpdateServer\nGet-MpComputerStatus | Select AntivirusSignatureLastUpdated" : "softwareupdate --background-critical\necho 'Security definitions update initiated'", time: "~1min" },
    { id: "sf16", title: "Check Disk Encryption", desc: "Verify BitLocker or FileVault is enabled", icon: Lock, category: "security", risk: "safe", os: "all", steps: ["Checks encryption status on all drives", "Reports protection percentage", "Alerts if encryption is off"], script: isWindows ? "Get-BitLockerVolume | Select MountPoint,VolumeStatus,EncryptionPercentage,ProtectionStatus | Format-Table" : "fdesetup status", time: "~5s" },

    // Peripherals
    { id: "sf17", title: "Fix Audio Issues", desc: "Reset audio service and default output device", icon: Volume2, category: "peripherals", risk: "safe", os: "all", steps: ["Restarts the audio service", "Resets default playback device", "Tests audio output"], script: isWindows ? "Restart-Service AudioSrv -Force\nRestart-Service AudioEndpointBuilder -Force\nWrite-Host 'Audio services restarted'" : "sudo killall coreaudiod\necho 'CoreAudio daemon restarted'", time: "~10s" },
    { id: "sf18", title: "Fix Bluetooth Devices", desc: "Reset Bluetooth adapter and re-pair devices", icon: Bluetooth, category: "peripherals", risk: "safe", os: "all", steps: ["Restarts Bluetooth service", "Clears pairing cache", "Device will need to re-pair"], script: isWindows ? "Restart-Service bthserv -Force\nWrite-Host 'Bluetooth service restarted.'" : "sudo pkill bluetoothd\necho 'Bluetooth daemon restarted.'", time: "~10s" },
    { id: "sf19", title: "Fix Mouse/Trackpad", desc: "Reset pointer settings and drivers", icon: MousePointer, category: "peripherals", risk: "safe", os: "all", steps: ["Resets pointer acceleration", "Refreshes HID driver", "Restores default sensitivity"], script: isWindows ? "Set-ItemProperty -Path 'HKCU:\\Control Panel\\Mouse' -Name MouseSpeed -Value 1\nWrite-Host 'Mouse settings reset'" : "defaults write .GlobalPreferences com.apple.mouse.scaling -1\necho 'Mouse acceleration reset'", time: "~5s" },
    { id: "sf20", title: "Fix Keyboard Input", desc: "Reset keyboard layout and input method", icon: Keyboard, category: "peripherals", risk: "safe", os: "all", steps: ["Resets keyboard layout to default", "Clears stuck modifier keys", "Fixes dead key issues"], script: isWindows ? "Set-ItemProperty -Path 'HKCU:\\Control Panel\\Accessibility\\StickyKeys' -Name Flags -Value 506\nWrite-Host 'Keyboard settings reset'" : "defaults delete com.apple.HIToolbox 2>/dev/null\necho 'Keyboard input method reset'", time: "~5s" },
    { id: "sf21", title: "Fix Printer Issues", desc: "Clear print queue and restart spooler", icon: PrinterCheck, category: "peripherals", risk: "safe", os: "all", steps: ["Stops the print spooler", "Clears all stuck print jobs", "Restarts the spooler service"], script: isWindows ? "Stop-Service Spooler -Force\nRemove-Item \"$env:SystemRoot\\System32\\spool\\PRINTERS\\*\" -Force -EA SilentlyContinue\nStart-Service Spooler\nWrite-Host 'Print spooler cleared'" : "cancel -a\ncupsctl\necho 'Print queue cleared'", time: "~10s" },
  ];

  const filteredRemediations = selfServiceFilter === "all" ? selfRemediations : selfRemediations.filter(r => r.category === selfServiceFilter);
  const displayRemediations = myDevice ? filteredRemediations.filter(r => r.os === "all" || (isWindows && r.os === "windows") || (isMac && r.os === "macos")) : filteredRemediations;

  const categories = [
    { id: "all" as const, label: "All", icon: Sparkles, count: selfRemediations.length },
    { id: "performance" as const, label: "Performance", icon: Zap, count: selfRemediations.filter(r => r.category === "performance").length },
    { id: "network" as const, label: "Network", icon: Wifi, count: selfRemediations.filter(r => r.category === "network").length },
    { id: "display" as const, label: "Display", icon: Monitor, count: selfRemediations.filter(r => r.category === "display").length },
    { id: "apps" as const, label: "Applications", icon: Globe, count: selfRemediations.filter(r => r.category === "apps").length },
    { id: "security" as const, label: "Security", icon: Shield, count: selfRemediations.filter(r => r.category === "security").length },
    { id: "peripherals" as const, label: "Peripherals", icon: MousePointer, count: selfRemediations.filter(r => r.category === "peripherals").length },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <LifeBuoy className="h-6 w-6 text-emerald-500" /> IT Support
        </h1>
        <p className="text-muted-foreground mt-1">
          View your device, fix common issues, and submit support tickets.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 flex-wrap border-b pb-2">
        {[
          { id: "mydevice" as const, label: "My Device", icon: Monitor },
          { id: "selfservice" as const, label: "Self-Service Fix", icon: Wrench },
          { id: "submit" as const, label: "Submit Ticket", icon: UserPlus },
          { id: "tickets" as const, label: "My Tickets", icon: ClipboardList },
        ].map((tab) => (
          <Button
            key={tab.id}
            size="sm"
            variant={activeTab === tab.id ? "default" : "ghost"}
            onClick={() => setActiveTab(tab.id)}
          >
            <tab.icon className="h-3.5 w-3.5 mr-1.5" /> {tab.label}
          </Button>
        ))}
      </div>

      {/* ═══ MY DEVICE TAB ═══ */}
      {activeTab === "mydevice" && (
        <>
          {!myDevice ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Monitor className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm font-medium">No device detected</p>
                <p className="text-xs text-muted-foreground mt-1">
                  The MyDex agent hasn&apos;t been installed on your machine yet, or it&apos;s not linked to your account.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Contact your IT administrator to get the agent set up.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Device overview card */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                        <Monitor className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{myDevice.hostname}</CardTitle>
                        <p className="text-xs text-muted-foreground">
                          {isWindows ? "Windows" : isMac ? "macOS" : "Linux"} &bull; {myDevice.ipAddress} &bull; {myDevice.osVersion}
                        </p>
                      </div>
                    </div>
                    <Badge className={`${myDevice.status === "ONLINE" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                      {myDevice.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground flex items-center gap-1"><Cpu className="h-3 w-3" /> CPU</div>
                      <div className="text-sm font-medium">{myDevice.cpuName || "Unknown"}</div>
                      <div className="text-xs text-muted-foreground">{myDevice.cpuCores} cores</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground flex items-center gap-1"><Activity className="h-3 w-3" /> Memory</div>
                      <div className="text-sm font-medium">{myDevice.ramAvailGb?.toFixed(1) || "?"} GB free</div>
                      <div className="text-xs text-muted-foreground">of {myDevice.ramTotalGb?.toFixed(1) || "?"} GB total</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Uptime</div>
                      <div className="text-sm font-medium">{formatUptime(myDevice.uptimeSeconds)}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground flex items-center gap-1"><Package className="h-3 w-3" /> Software</div>
                      <div className="text-sm font-medium">{myDevice.installedSoftware?.length || 0} apps</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Health status */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card className={`${myDevice.antivirusName && myDevice.defenderStatus === "enabled" ? "border-green-200" : "border-red-200"}`}>
                  <CardContent className="py-3 flex items-center gap-3">
                    {myDevice.antivirusName ? <CheckCircle className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-red-500" />}
                    <div>
                      <div className="text-xs font-medium">Antivirus</div>
                      <div className="text-[11px] text-muted-foreground">{myDevice.antivirusName || "Not detected"}</div>
                    </div>
                  </CardContent>
                </Card>
                <Card className={`${myDevice.firewallStatus && Object.values(myDevice.firewallStatus).every(Boolean) ? "border-green-200" : "border-red-200"}`}>
                  <CardContent className="py-3 flex items-center gap-3">
                    {myDevice.firewallStatus && Object.values(myDevice.firewallStatus).every(Boolean) ? <CheckCircle className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-red-500" />}
                    <div>
                      <div className="text-xs font-medium">Firewall</div>
                      <div className="text-[11px] text-muted-foreground">{myDevice.firewallStatus && Object.values(myDevice.firewallStatus).every(Boolean) ? "All profiles on" : "Check needed"}</div>
                    </div>
                  </CardContent>
                </Card>
                <Card className={`${!myDevice.pendingUpdates?.length ? "border-green-200" : "border-amber-200"}`}>
                  <CardContent className="py-3 flex items-center gap-3">
                    {!myDevice.pendingUpdates?.length ? <CheckCircle className="h-5 w-5 text-green-500" /> : <AlertTriangle className="h-5 w-5 text-amber-500" />}
                    <div>
                      <div className="text-xs font-medium">Updates</div>
                      <div className="text-[11px] text-muted-foreground">{myDevice.pendingUpdates?.length ? `${myDevice.pendingUpdates.length} pending` : "Up to date"}</div>
                    </div>
                  </CardContent>
                </Card>
                <Card className={`${!myDevice.bsodCount ? "border-green-200" : "border-red-200"}`}>
                  <CardContent className="py-3 flex items-center gap-3">
                    {!myDevice.bsodCount ? <CheckCircle className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-red-500" />}
                    <div>
                      <div className="text-xs font-medium">Stability</div>
                      <div className="text-[11px] text-muted-foreground">{myDevice.bsodCount ? `${myDevice.bsodCount} BSOD events` : "No crashes"}</div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Quick actions */}
              <Card>
                <CardContent className="py-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-sm font-medium">Quick Actions:</span>
                    <Button size="sm" variant="outline" onClick={() => setActiveTab("selfservice")}>
                      <Wrench className="h-3.5 w-3.5 mr-1" /> Fix an Issue
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setActiveTab("submit")}>
                      <UserPlus className="h-3.5 w-3.5 mr-1" /> Submit a Ticket
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Self-Remediation History */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <ScrollText className="h-4 w-4 text-emerald-500" /> My Remediation History
                    </CardTitle>
                    {commandLogs.length > 0 && (
                      <Badge variant="outline" className="text-xs">{commandLogs.length} action{commandLogs.length !== 1 ? "s" : ""}</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">Self-service remediations you&apos;ve run on this device.</p>
                </CardHeader>
                <CardContent>
                  {commandLogs.length === 0 ? (
                    <div className="text-center py-8">
                      <ScrollText className="h-7 w-7 mx-auto text-muted-foreground/50 mb-2" />
                      <p className="text-sm text-muted-foreground">No remediations yet</p>
                      <p className="text-xs text-muted-foreground mt-1">When you run self-service fixes, they&apos;ll appear here.</p>
                      <Button size="sm" variant="outline" className="mt-3" onClick={() => setActiveTab("selfservice")}>
                        <Wrench className="h-3.5 w-3.5 mr-1.5" /> Browse Fixes
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {commandLogs.map((log) => (
                        <div key={log.id} className={`rounded-lg border p-3 transition-colors ${
                          log.status === "COMPLETED" ? "border-green-200 bg-green-50/30 dark:bg-green-950/10 dark:border-green-900" :
                          log.status === "FAILED" ? "border-red-200 bg-red-50/30 dark:bg-red-950/10 dark:border-red-900" :
                          "border-blue-200 bg-blue-50/30 dark:bg-blue-950/10 dark:border-blue-900"
                        }`}>
                          <div className="flex items-center gap-2">
                            {(log.status === "PENDING" || log.status === "SENT" || log.status === "EXECUTING") && (
                              <Loader2 className="h-4 w-4 animate-spin text-blue-500 shrink-0" />
                            )}
                            {log.status === "COMPLETED" && <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />}
                            {log.status === "FAILED" && <XCircle className="h-4 w-4 text-red-500 shrink-0" />}
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">{log.title}</div>
                              <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                                <span>{log.issuedAt.toLocaleDateString()} at {log.issuedAt.toLocaleTimeString()}</span>
                                <span>&bull;</span>
                                <span className="font-medium">{log.deviceName}</span>
                              </div>
                            </div>
                            <Badge className={`text-[10px] shrink-0 ${
                              log.status === "COMPLETED" ? "bg-green-100 text-green-800 dark:bg-green-900/60 dark:text-green-300" :
                              log.status === "FAILED" ? "bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-300" :
                              "bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300"
                            }`}>
                              {log.status === "PENDING" ? "Queued" : log.status === "SENT" ? "Sent" : log.status === "EXECUTING" ? "Running" : log.status === "COMPLETED" ? "Success" : "Failed"}
                            </Badge>
                          </div>
                          {log.result && (
                            <details className="mt-2 group">
                              <summary className="text-[11px] text-muted-foreground cursor-pointer hover:text-foreground flex items-center gap-1">
                                <ChevronRight className="h-3 w-3 transition-transform group-open:rotate-90" />
                                View output
                              </summary>
                              <div className="mt-1 bg-gray-950 text-green-400 rounded-md px-3 py-2 font-mono text-[10px] overflow-x-auto max-h-24">
                                <pre className="whitespace-pre-wrap">{log.result}</pre>
                              </div>
                            </details>
                          )}
                          {log.script && (
                            <details className="mt-1 group">
                              <summary className="text-[11px] text-muted-foreground cursor-pointer hover:text-foreground flex items-center gap-1">
                                <ChevronRight className="h-3 w-3 transition-transform group-open:rotate-90" />
                                View script
                              </summary>
                              <div className="mt-1 bg-gray-950 text-amber-400 rounded-md px-3 py-2 font-mono text-[10px] overflow-x-auto max-h-24">
                                <pre className="whitespace-pre-wrap">{log.script}</pre>
                              </div>
                            </details>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}

      {/* ═══ SELF-SERVICE FIX TAB ═══ */}
      {activeTab === "selfservice" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Wrench className="h-5 w-5 text-emerald-500" /> Self-Service Remediation
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Fix common issues on your device — no IT ticket needed. These are safe, pre-approved actions.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Device info bar */}
            {myDevice ? (
              <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20">
                <div className={`w-2 h-2 rounded-full ${myDevice.status === "ONLINE" ? "bg-green-500" : "bg-red-400"}`} />
                <span className="text-sm font-medium">{myDevice.hostname}</span>
                <Badge variant="outline" className="text-xs">{isWindows ? "Windows" : isMac ? "macOS" : "Linux"}</Badge>
                <span className="text-xs text-muted-foreground">{myDevice.ipAddress}</span>
              </div>
            ) : (
              <div className="text-center py-4 rounded-lg border border-dashed">
                <Monitor className="h-5 w-5 mx-auto text-muted-foreground mb-1.5" />
                <p className="text-sm text-muted-foreground">No device detected. Showing all available remediations.</p>
              </div>
            )}

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
                              <Badge variant="outline" className={`text-[9px] px-1 ${remedy.risk === "safe" ? "text-green-700 border-green-300" : "text-amber-700 border-amber-300"}`}>
                                {remedy.risk === "safe" ? "✓ Safe" : "⚡ Low Risk"}
                              </Badge>
                              <span><Clock className="h-2.5 w-2.5 inline mr-0.5" />{remedy.time}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{remedy.desc}</p>
                      <ul className="space-y-0.5">
                        {remedy.steps.map((step, i) => (
                          <li key={i} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                            <span className="text-emerald-500 mt-0.5 shrink-0">{hasRun ? "✓" : `${i + 1}.`}</span>
                            {step}
                          </li>
                        ))}
                      </ul>

                      {/* App picker for Reset Stuck Application */}
                      {remedy.id === "sf11" && myDevice && deviceApps.length > 0 && (
                        <div className="mt-2 space-y-1.5">
                          <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                            <Input
                              placeholder="Search your applications..."
                              value={appSearchQuery}
                              onChange={(e) => setAppSearchQuery(e.target.value)}
                              className="pl-7 h-7 text-xs"
                            />
                          </div>
                          <div className="max-h-32 overflow-y-auto rounded-lg border bg-muted/20 divide-y">
                            {deviceApps
                              .filter((a) => !appSearchQuery || a.name.toLowerCase().includes(appSearchQuery.toLowerCase()))
                              .slice(0, 30)
                              .map((app, idx) => (
                                <button
                                  key={`${app.name}-${idx}`}
                                  onClick={() => setSelectedResetApp(selectedResetApp === app.name ? null : app.name)}
                                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-left transition-colors text-xs ${
                                    selectedResetApp === app.name
                                      ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200"
                                      : "hover:bg-muted/50"
                                  }`}
                                >
                                  <Package className="h-3 w-3 shrink-0 text-muted-foreground" />
                                  <span className="font-medium truncate">{app.name}</span>
                                  <span className="text-[10px] text-muted-foreground ml-auto shrink-0">v{app.version}</span>
                                  {selectedResetApp === app.name && <CheckCircle className="h-3 w-3 text-emerald-600 shrink-0" />}
                                </button>
                              ))}
                            {deviceApps.filter((a) => !appSearchQuery || a.name.toLowerCase().includes(appSearchQuery.toLowerCase())).length === 0 && (
                              <div className="px-3 py-2 text-[11px] text-muted-foreground text-center">No matching applications</div>
                            )}
                          </div>
                          {selectedResetApp && (
                            <div className="text-[11px] text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" /> Selected: <strong>{selectedResetApp}</strong>
                            </div>
                          )}
                          {!selectedResetApp && (
                            <div className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" /> Select an application above to continue
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {remedy.script && myDevice && (
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
                        disabled={!myDevice || runningCommands.size > 0 || (remedy.id === "sf11" && !selectedResetApp)}
                        onClick={() => {
                          setRanRemediations(prev => new Set(prev).add(remedy.id));
                          if (remedy.script && myDevice) executeRemediation(
                            remedy.id === "sf11" ? `Reset: ${selectedResetApp}` : remedy.title,
                            remedy.script
                          );
                        }}
                      >
                        {hasRun ? <><CheckCircle className="h-3 w-3 mr-1.5" />Completed</> :
                         remedy.id === "sf11" && !selectedResetApp ? <><AlertTriangle className="h-3 w-3 mr-1.5" />Select App First</> :
                         <><Play className="h-3 w-3 mr-1.5" />Run Fix</>}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {displayRemediations.length === 0 && (
              <div className="text-center py-8">
                <Search className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No remediations for this filter.</p>
              </div>
            )}

            <div className="rounded-lg border border-dashed p-4 text-center bg-muted/10">
              <p className="text-sm font-medium">Still having issues?</p>
              <p className="text-xs text-muted-foreground mt-1">If none of these fixed your problem, submit a ticket.</p>
              <Button size="sm" variant="outline" className="mt-3" onClick={() => setActiveTab("submit")}>
                <ClipboardList className="h-3.5 w-3.5 mr-1.5" /> Submit a Ticket
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══ SUBMIT TICKET TAB ═══ */}
      {activeTab === "submit" && (
        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><UserPlus className="h-5 w-5 text-blue-500" /> Submit a Support Ticket</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            {/* Device auto-detected */}
            <div>
              <label className="text-sm font-medium mb-2 block">1. Your device</label>
              {myDevice ? (
                <div className="flex items-center gap-3 p-3 rounded-lg border border-blue-300 bg-blue-50/50 dark:bg-blue-950/20">
                  <div className={`w-2 h-2 rounded-full ${myDevice.status === "ONLINE" ? "bg-green-500" : "bg-red-400"}`} />
                  <span className="text-sm font-medium">{myDevice.hostname}</span>
                  <Badge variant="outline" className="text-xs">{isWindows ? "Windows" : isMac ? "macOS" : "Linux"}</Badge>
                  <span className="text-xs text-muted-foreground">{myDevice.ipAddress}</span>
                  <Badge className="text-[9px] bg-blue-100 text-blue-700 ml-auto">Auto-detected</Badge>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No device detected. Your ticket will be submitted without device info.</p>
              )}
            </div>

            {/* Issue reason */}
            <div>
              <label className="text-sm font-medium mb-2 block">2. What&apos;s the issue?</label>
              <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                {stockReasons.map((reason) => (
                  <button key={reason.id} onClick={() => { setSelectedReason(selectedReason === reason.id ? null : reason.id); setSelectedApp(null); }}
                    className={`flex items-center gap-2.5 p-3 rounded-lg border text-left transition-all text-sm ${selectedReason === reason.id ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30 ring-1 ring-blue-500" : "hover:bg-muted/30"}`}>
                    <span className="text-lg">{reason.icon}</span>
                    <span>{reason.label}</span>
                    {reason.common && <Badge className="ml-auto text-[9px] bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">Common</Badge>}
                  </button>
                ))}
              </div>
            </div>

            {/* App selector for app-related issues */}
            {myDevice && (selectedReason === "sr2" || selectedReason === "sr3") && deviceApps.length > 0 && (
              <div>
                <label className="text-sm font-medium mb-2 block">3. Which application?</label>
                <div className="grid gap-2 md:grid-cols-3 lg:grid-cols-4">
                  {deviceApps.slice(0, 20).map((app, idx) => {
                    const path = isWindows ? appPaths[app.name]?.win : appPaths[app.name]?.mac;
                    return (
                      <button key={`${app.name}-${idx}`} onClick={() => setSelectedApp(selectedApp === app.name ? null : app.name)}
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

            {/* Network auto-capture */}
            {myDevice && (selectedReason === "sr3" || selectedReason === "sr4") && (
              <div className="rounded-lg border bg-muted/20 p-4">
                <div className="text-sm font-medium mb-2 flex items-center gap-2"><Wifi className="h-4 w-4 text-blue-500" /> Network Information <Badge className="text-[9px] bg-blue-100 text-blue-800">Auto-captured</Badge></div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  <div><span className="text-muted-foreground text-xs">IP Address</span><div className="font-medium">{myDevice.ipAddress}</div></div>
                  <div><span className="text-muted-foreground text-xs">Platform</span><div className="font-medium">{isWindows ? "Windows" : "macOS"}</div></div>
                  <div><span className="text-muted-foreground text-xs">Agent Status</span><div className="font-medium">{myDevice.status}</div></div>
                </div>
              </div>
            )}

            {/* Description */}
            <div>
              <label className="text-sm font-medium mb-2 block">{(selectedReason === "sr2" || selectedReason === "sr3") ? "4" : "3"}. Additional details <span className="text-muted-foreground font-normal">(optional)</span></label>
              <textarea value={ticketDescription} onChange={(e) => setTicketDescription(e.target.value)} placeholder="Describe the issue in more detail..." className="w-full h-24 rounded-lg border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            {/* Submit */}
            <div className="flex items-center justify-between pt-2">
              <div className="text-xs text-muted-foreground">
                {myDevice && <span className="mr-3">Device: <strong>{myDevice.hostname}</strong></span>}
                {selectedReason && <span className="mr-3">Issue: <strong>{stockReasons.find(r => r.id === selectedReason)?.label}</strong></span>}
                {selectedApp && <span>App: <strong>{selectedApp}</strong></span>}
              </div>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white" disabled={!selectedReason || submittingTicket} onClick={submitTicket}>
                {submittingTicket ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Submitting...</> : <><ClipboardList className="h-4 w-4 mr-2" />Submit Ticket</>}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══ MY TICKETS TAB ═══ */}
      {activeTab === "tickets" && (
        <>
          {viewingTicket ? (() => {
            const ticket = tickets.find(t => t.id === viewingTicket);
            if (!ticket) return null;
            const statusColors: Record<string, string> = { OPEN: "bg-blue-100 text-blue-800", IN_PROGRESS: "bg-amber-100 text-amber-800", WAITING_ON_USER: "bg-orange-100 text-orange-800", WAITING_ON_IT: "bg-purple-100 text-purple-800", RESOLVED: "bg-green-100 text-green-800", CLOSED: "bg-gray-100 text-gray-800" };
            return (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Button variant="ghost" size="sm" onClick={() => { setViewingTicket(null); setTicketMessages([]); }}><ArrowLeft className="h-4 w-4" /></Button>
                    <div className="flex-1">
                      <CardTitle className="text-lg">{ticket.subject}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={`text-[10px] ${statusColors[ticket.status] || "bg-gray-100 text-gray-800"}`}>{ticket.status.replace(/_/g, " ")}</Badge>
                        <Badge variant="outline" className="text-[10px]">{ticket.priority}</Badge>
                        {ticket.device && <span className="text-xs text-muted-foreground">{ticket.device.hostname}</span>}
                        <span className="text-xs text-muted-foreground">Opened {new Date(ticket.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Ticket details */}
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
                        <p className="text-sm text-muted-foreground text-center py-6">No messages yet. Send a message to get help from IT.</p>
                      ) : (
                        ticketMessages.map((msg) => {
                          const isMe = msg.user.id === session?.user?.id;
                          const isIT = msg.user.role === "ADMIN" || msg.user.role === "SUPER_ADMIN";
                          return (
                            <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                              <div className={`max-w-[75%] rounded-xl px-3 py-2 ${isMe ? "bg-blue-600 text-white" : "bg-muted"}`}>
                                <div className={`text-[10px] font-medium mb-0.5 ${isMe ? "text-blue-200" : "text-muted-foreground"}`}>
                                  {isMe ? "You" : msg.user.name} {isIT && !isMe && <Badge className="text-[8px] ml-1 bg-green-100 text-green-700 px-1 py-0">IT</Badge>}
                                </div>
                                <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                                <div className={`text-[9px] mt-1 ${isMe ? "text-blue-200" : "text-muted-foreground"}`}>{new Date(msg.createdAt).toLocaleString()}</div>
                              </div>
                            </div>
                          );
                        })
                      )}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Message input */}
                    {!["RESOLVED", "CLOSED"].includes(ticket.status) && (
                      <div className="border-t p-3">
                        <div className="flex gap-2">
                          <textarea
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                            placeholder="Type a message..."
                            className="flex-1 h-10 rounded-lg border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <Button onClick={sendMessage} disabled={!newMessage.trim() || sendingMessage} className="bg-blue-600 hover:bg-blue-700 text-white">
                            {sendingMessage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Resolution confirmation + rating */}
                    {ticket.status === "RESOLVED" && !ticket.satisfactionRating && (
                      <div className="border-t p-4 space-y-3 bg-green-50/50 dark:bg-green-950/20">
                        <div className="text-sm font-medium text-center flex items-center justify-center gap-2">
                          <ThumbsUp className="h-4 w-4 text-green-600" />
                          IT has marked this ticket as resolved. Is your issue fixed?
                        </div>
                        <div className="flex justify-center gap-3">
                          <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => confirmResolved(ticket.id)}>
                            <CheckCircle className="h-3.5 w-3.5 mr-1.5" /> Yes, issue is fixed
                          </Button>
                          <Button size="sm" variant="outline" className="text-orange-600 border-orange-300" onClick={async () => {
                            await fetch("/api/v1/tickets", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: ticket.id, status: "WAITING_ON_IT" }) });
                            fetchTickets();
                          }}>
                            No, still having issues
                          </Button>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-muted-foreground mb-2">Rate your support experience</div>
                          <div className="flex justify-center gap-1 mb-2">
                            {[1, 2, 3, 4, 5].map(star => (
                              <button key={star}
                                onMouseEnter={() => setRatingHover(star)}
                                onMouseLeave={() => setRatingHover(0)}
                                onClick={() => setRatingStars(star)}
                                className="p-0.5 transition-transform hover:scale-110">
                                <Star className={`h-6 w-6 ${(ratingHover || ratingStars) >= star ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
                              </button>
                            ))}
                          </div>
                          {ratingStars > 0 && (
                            <div className="space-y-2 max-w-sm mx-auto">
                              <textarea value={ratingComment} onChange={e => setRatingComment(e.target.value)}
                                placeholder="Any feedback? (optional)" className="w-full h-16 rounded-lg border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-500" />
                              <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" disabled={submittingRating}
                                onClick={() => submitRating(ticket.id)}>
                                {submittingRating ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Star className="h-3.5 w-3.5 mr-1.5" />}
                                Submit Rating & Close
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {ticket.status === "CLOSED" && (
                      <div className="border-t p-3 text-center text-sm text-muted-foreground">
                        This ticket has been closed.
                        {ticket.satisfactionRating && (
                          <span className="ml-2">Your rating: {[1,2,3,4,5].map(s => (
                            <Star key={s} className={`inline h-3.5 w-3.5 ${s <= ticket.satisfactionRating! ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
                          ))}</span>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })() : (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2"><ClipboardList className="h-5 w-5 text-amber-500" /> My Tickets</CardTitle>
                  <Button size="sm" onClick={() => setActiveTab("submit")}><UserPlus className="h-3.5 w-3.5 mr-1.5" /> New Ticket</Button>
                </div>
              </CardHeader>
              <CardContent>
                {ticketsLoading ? (
                  <div className="text-center py-8"><Loader2 className="h-6 w-6 mx-auto animate-spin text-muted-foreground" /></div>
                ) : tickets.length === 0 ? (
                  <div className="text-center py-12">
                    <ClipboardList className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
                    <p className="text-sm font-medium">No tickets yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Tickets you submit will appear here so you can track their status.</p>
                    <Button size="sm" className="mt-4" onClick={() => setActiveTab("submit")}>
                      <UserPlus className="h-3.5 w-3.5 mr-1.5" /> Submit a Ticket
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {tickets.map((ticket) => {
                      const statusColors: Record<string, string> = { OPEN: "bg-blue-100 text-blue-800", IN_PROGRESS: "bg-amber-100 text-amber-800", WAITING_ON_USER: "bg-orange-100 text-orange-800", WAITING_ON_IT: "bg-purple-100 text-purple-800", RESOLVED: "bg-green-100 text-green-800", CLOSED: "bg-gray-100 text-gray-800" };
                      return (
                        <button key={ticket.id} onClick={() => setViewingTicket(ticket.id)}
                          className="w-full flex items-center gap-3 p-3 rounded-lg border text-left hover:bg-muted/30 transition-colors">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium truncate">{ticket.subject}</span>
                              <Badge className={`text-[10px] shrink-0 ${statusColors[ticket.status] || "bg-gray-100 text-gray-800"}`}>{ticket.status.replace(/_/g, " ")}</Badge>
                              <Badge variant="outline" className="text-[10px] shrink-0">{ticket.priority}</Badge>
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                              {ticket.device && <span>{ticket.device.hostname}</span>}
                              <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                              {ticket._count && ticket._count.messages > 0 && (
                                <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" />{ticket._count.messages}</span>
                              )}
                              {ticket.assignee && <span>Assigned: {ticket.assignee.name}</span>}
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* ═══ FLOATING COMMAND LOG ═══ */}
      {showLogPanel && (
        <div className={`fixed bottom-4 right-4 w-96 z-50 rounded-xl border shadow-2xl bg-background ${logPanelMinimized ? "h-12" : "max-h-80"} overflow-hidden transition-all`}>
          <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b cursor-pointer" onClick={() => setLogPanelMinimized(!logPanelMinimized)}>
            <div className="flex items-center gap-2 text-sm font-medium">
              <Terminal className="h-4 w-4" />
              Command Log
              {runningCommands.size > 0 && <Loader2 className="h-3 w-3 animate-spin text-blue-500" />}
            </div>
            <div className="flex items-center gap-1">
              <button onClick={(e) => { e.stopPropagation(); setLogPanelMinimized(!logPanelMinimized); }}>
                {logPanelMinimized ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              <button onClick={(e) => { e.stopPropagation(); setShowLogPanel(false); }}>
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          {!logPanelMinimized && (
            <div className="overflow-y-auto max-h-64 p-2 space-y-1.5">
              {commandLogs.map((log) => (
                <div key={log.id} className={`rounded-lg border p-2 text-xs ${log.status === "COMPLETED" ? "border-green-200 bg-green-50/50" : log.status === "FAILED" ? "border-red-200 bg-red-50/50" : "border-blue-200 bg-blue-50/50"}`}>
                  <div className="flex items-center gap-2">
                    {(log.status === "PENDING" || log.status === "SENT" || log.status === "EXECUTING") && <Loader2 className="h-3 w-3 animate-spin text-blue-500" />}
                    {log.status === "COMPLETED" && <CheckCircle className="h-3 w-3 text-green-500" />}
                    {log.status === "FAILED" && <XCircle className="h-3 w-3 text-red-500" />}
                    <span className="font-medium truncate">{log.title}</span>
                    <span className="ml-auto text-muted-foreground text-[10px]">{log.issuedAt.toLocaleTimeString()}</span>
                  </div>
                  {log.result && <div className="mt-1 text-[10px] text-muted-foreground font-mono truncate">{log.result}</div>}
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
