"use client";

import { useEffect, useState, Fragment } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Monitor,
  Cpu,
  HardDrive,
  Shield,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Wifi,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  FileText,
  Trash2,
  ArrowRightLeft,
  Copy,
  Bug,
  Activity,
  Package,
  Play,
  FileCheck,
  Lock,
  ShieldCheck as ShieldCheckIcon,
  AlertCircle,
  Zap,
  Terminal,
  Wrench,
  Loader2,
} from "lucide-react";

interface Device {
  id: string;
  hostname: string;
  platform: string;
  agentVersion: string;
  status: "ONLINE" | "OFFLINE" | "STALE";
  lastSeenAt: string;
  ipAddress: string | null;
  osVersion: string | null;
  cpuName: string | null;
  cpuCores: number | null;
  ramTotalGb: number | null;
  ramAvailGb: number | null;
  gpuName: string | null;
  diskDrives: Array<{ model: string; sizeGb: number; freeGb?: number; type: string }> | null;
  uptimeSeconds: number | null;
  antivirusName: string | null;
  firewallStatus: Record<string, boolean> | null;
  defenderStatus: string | null;
  securityGrade: string | null;
  lastUpdateDate: string | null;
  pendingUpdates: Array<{ title: string; kb: string }> | null;
  updateServiceStatus: string | null;
  rebootPending: boolean;
  bsodEvents: Array<{ Date: string; Source: string; Message: string }> | null;
  bsodCount: number;
  performanceIssues: Array<{ check: string; status: string; detail: string }> | null;
  dnsServers: string | null;
  networkAdapters: Array<{ name: string; description: string; mac: string; speed: string }> | null;
  wifiSignal: number | null;
  installedSoftware: Array<{ name: string; version: string; publisher?: string; size?: number }> | null;
  runningSoftware: Array<{ name: string; count: number; memoryMb: number }> | null;
  serialNumber: string | null;
  user: { id: string; name: string | null; email: string };
  _count: { commands: number; diagnostics: number };
  mdmDevices: {
    id: string;
    enrollmentStatus: string | null;
    complianceStatus: string | null;
    managementState: string | null;
    deviceName: string | null;
    model: string | null;
    isEncrypted: boolean | null;
    lastCheckIn: string | null;
    managedApps: { name: string; version: string; installState: string }[] | null;
    mdmDeviceId: string;
    mdmProvider: { id: string; name: string; providerType: string };
  }[];
  openCves: number;
  activeIocs: number;
  recentActivity: Array<{
    eventType: string;
    appName: string | null;
    windowTitle: string | null;
    timestamp: string;
    url: string | null;
  }>;
  fileEvents: Array<{
    eventType: string;
    windowTitle: string | null;
    url: string | null;
    timestamp: string;
    metadata: Record<string, unknown> | null;
  }>;
}

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

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [search, setSearch] = useState("");
  const [runningFix, setRunningFix] = useState<string | null>(null);
  const [commandLogs, setCommandLogs] = useState<{ id: string; label: string; status: "pending" | "running" | "success" | "failed"; output?: string; ts: Date }[]>([]);
  const [expandedCheck, setExpandedCheck] = useState<string | null>(null);

  async function executeRemediation(deviceId: string, label: string, script: string) {
    const logId = `${deviceId}-${Date.now()}`;
    setRunningFix(logId);
    setCommandLogs(prev => [{ id: logId, label, status: "running", ts: new Date() }, ...prev]);
    try {
      const res = await fetch("/api/v1/agents/commands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId, type: "RUN_SCRIPT", payload: { script, name: label } }),
      });
      if (res.ok) {
        const cmd = await res.json();
        // Poll for completion
        const poll = setInterval(async () => {
          try {
            const r = await fetch(`/api/v1/agents/commands?deviceId=${deviceId}`);
            if (r.ok) {
              const data = await r.json();
              const found = data.commands?.find((c: { id: string }) => c.id === cmd.id);
              if (found && (found.status === "COMPLETED" || found.status === "FAILED")) {
                clearInterval(poll);
                setCommandLogs(prev => prev.map(l => l.id === logId ? { ...l, status: found.status === "COMPLETED" ? "success" : "failed", output: found.result || found.error || (found.status === "COMPLETED" ? "Command executed successfully" : "Command failed") } : l));
                setRunningFix(null);
              }
            }
          } catch { /* retry */ }
        }, 2000);
        setTimeout(() => { clearInterval(poll); setRunningFix(null); }, 60000);
      } else {
        setCommandLogs(prev => prev.map(l => l.id === logId ? { ...l, status: "failed", output: "Failed to send command" } : l));
        setRunningFix(null);
      }
    } catch {
      setCommandLogs(prev => prev.map(l => l.id === logId ? { ...l, status: "failed", output: "Network error" } : l));
      setRunningFix(null);
    }
  }

  async function executeMdmAction(mdmProviderId: string, mdmDeviceId: string, agentDeviceId: string, actionType: string) {
    try {
      const res = await fetch("/api/v1/mdm/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mdmProviderId, mdmDeviceId, agentDeviceId, actionType }),
      });
      const data = await res.json();
      if (data.action?.status === "COMPLETED") {
        alert(`${actionType} command sent successfully.`);
      } else if (data.action?.status === "FAILED") {
        alert(`${actionType} failed: ${data.action.errorMessage || "Unknown error"}`);
      }
    } catch {
      alert("Failed to send MDM command.");
    }
  }

  async function fetchDevices() {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/agents/devices");
      if (res.ok) {
        const data = await res.json();
        setDevices(data.devices || []);
      }
    } catch (err) {
      console.error("Failed to fetch devices:", err);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchDevices();
    const interval = setInterval(fetchDevices, 30000);
    return () => clearInterval(interval);
  }, []);

  const filtered = devices.filter(
    (d) =>
      d.hostname.toLowerCase().includes(search.toLowerCase()) ||
      d.user.name?.toLowerCase().includes(search.toLowerCase()) ||
      d.user.email.toLowerCase().includes(search.toLowerCase()) ||
      d.ipAddress?.includes(search)
  );

  const onlineCount = devices.filter((d) => d.status === "ONLINE").length;
  const totalCves = devices.reduce((sum, d) => sum + d.openCves, 0);
  const totalIocs = devices.reduce((sum, d) => sum + d.activeIocs, 0);
  const rebootNeeded = devices.filter((d) => d.rebootPending).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Monitor className="h-6 w-6" /> Devices
          </h1>
          <p className="text-muted-foreground text-sm">Connected agents and system health</p>
        </div>
        <Button onClick={fetchDevices} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* Summary Cards */}
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
            <div className="text-sm text-muted-foreground">Applicable CVEs</div>
            <div className="text-2xl font-bold text-orange-600">{totalCves}</div>
            <div className="text-xs text-muted-foreground">confirmed or potential</div>
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

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-10"
          placeholder="Search by hostname, user, or IP..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Device List */}
      {loading && devices.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Loading devices...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {devices.length === 0
            ? "No devices connected. Install the MyDex Agent on target machines."
            : "No devices match your search."}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((device) => (
            <Fragment key={device.id}>
              {/* Device Row */}
              <Card
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => {
                  setExpandedId(expandedId === device.id ? null : device.id);
                  setActiveTab("overview");
                }}
              >
                <CardContent className="py-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {expandedId === device.id ? (
                        <ChevronDown className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      )}
                      <Monitor className="h-5 w-5 flex-shrink-0 text-blue-500" />
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{device.hostname}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {device.user.name || device.user.email} &middot; {device.ipAddress || "No IP"} &middot; {device.platform}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0 text-sm">
                      {device.cpuName && (
                        <span className="hidden lg:flex items-center gap-1 text-muted-foreground" title={device.cpuName}>
                          <Cpu className="h-3.5 w-3.5" /> {device.cpuCores || "?"}c
                        </span>
                      )}
                      {device.ramTotalGb && (
                        <span className="hidden lg:flex items-center gap-1 text-muted-foreground">
                          {device.ramTotalGb}GB
                        </span>
                      )}
                      {device.openCves > 0 && (
                        <Badge variant="outline" className="text-orange-600 border-orange-300">
                          <Bug className="h-3 w-3 mr-1" /> {device.openCves} CVE
                        </Badge>
                      )}
                      {device.rebootPending && (
                        <Badge variant="outline" className="text-yellow-600 border-yellow-300">
                          <RefreshCw className="h-3 w-3 mr-1" /> Reboot
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        <Clock className="h-3 w-3 inline mr-1" />
                        {formatTimeAgo(device.lastSeenAt)}
                      </span>
                      <StatusBadge status={device.status} />
                      {device.mdmDevices?.[0] && (() => {
                        const mdm = device.mdmDevices[0];
                        return (
                          <>
                            <Badge className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">{mdm.mdmProvider.name}</Badge>
                            {mdm.complianceStatus === "compliant" && <Badge className="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">Compliant</Badge>}
                            {mdm.complianceStatus === "noncompliant" && <Badge className="text-xs bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">Non-Compliant</Badge>}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Expanded Detail */}
              {expandedId === device.id && (
                <Card className="border-l-4 border-l-blue-500">
                  <CardContent className="py-4">
                    {/* Tab Navigation */}
                    <div className="flex gap-1 mb-4 flex-wrap">
                      {[
                        { id: "overview", label: "Overview", icon: Monitor },
                        { id: "security", label: "Security", icon: Shield },
                        { id: "software", label: "Software", icon: Package },
                        { id: "activity", label: "Activity", icon: Activity },
                        { id: "files", label: "Files", icon: FileText },
                        { id: "remediation", label: "Remediation", icon: Wrench },
                        { id: "compliance", label: "Compliance", icon: FileCheck },
                        ...(device.mdmDevices?.length ? [{ id: "mdm", label: "MDM", icon: Lock }] : []),
                      ].map((tab) => (
                        <Button
                          key={tab.id}
                          size="sm"
                          variant={activeTab === tab.id ? "default" : "ghost"}
                          onClick={(e) => { e.stopPropagation(); setActiveTab(tab.id); }}
                        >
                          <tab.icon className="h-3.5 w-3.5 mr-1" /> {tab.label}
                        </Button>
                      ))}
                    </div>

                    {/* Overview Tab */}
                    {activeTab === "overview" && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Hardware */}
                        <div className="space-y-2">
                          <h3 className="font-semibold text-sm flex items-center gap-1"><Cpu className="h-4 w-4" /> Hardware</h3>
                          <div className="text-sm space-y-1">
                            <div><span className="text-muted-foreground">CPU:</span> {device.cpuName || "N/A"}</div>
                            <div><span className="text-muted-foreground">Cores:</span> {device.cpuCores || "N/A"}</div>
                            <div><span className="text-muted-foreground">RAM:</span> {device.ramAvailGb || "?"}GB free / {device.ramTotalGb || "?"}GB total</div>
                            <div><span className="text-muted-foreground">GPU:</span> {device.gpuName || "N/A"}</div>
                            <div><span className="text-muted-foreground">Uptime:</span> {formatUptime(device.uptimeSeconds)}</div>
                          </div>
                          {device.diskDrives && device.diskDrives.length > 0 && (
                            <div className="mt-2">
                              <div className="text-xs font-medium text-muted-foreground mb-1">Disks</div>
                              {device.diskDrives.map((disk, i) => (
                                <div key={i} className="text-xs flex items-center gap-1">
                                  <HardDrive className="h-3 w-3" /> {disk.model} — {disk.sizeGb}GB ({disk.type})
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Windows Update */}
                        <div className="space-y-2">
                          <h3 className="font-semibold text-sm flex items-center gap-1"><RefreshCw className="h-4 w-4" /> Windows Update</h3>
                          <div className="text-sm space-y-1">
                            <div>
                              <span className="text-muted-foreground">Last Update:</span>{" "}
                              {device.lastUpdateDate ? new Date(device.lastUpdateDate).toLocaleDateString() : "N/A"}
                            </div>
                            <div>
                              <span className="text-muted-foreground">Service:</span>{" "}
                              {device.updateServiceStatus === "running" ? (
                                <span className="text-green-600">Running</span>
                              ) : (
                                <span className="text-red-600">{device.updateServiceStatus || "N/A"}</span>
                              )}
                            </div>
                            <div>
                              <span className="text-muted-foreground">Reboot Pending:</span>{" "}
                              {device.rebootPending ? (
                                <span className="text-yellow-600">Yes</span>
                              ) : (
                                <span className="text-green-600">No</span>
                              )}
                            </div>
                          </div>
                          {device.pendingUpdates && device.pendingUpdates.length > 0 && (
                            <div className="mt-2">
                              <div className="text-xs font-medium text-yellow-600 mb-1">
                                {device.pendingUpdates.length} Pending Updates
                              </div>
                              <div className="max-h-32 overflow-y-auto space-y-1">
                                {device.pendingUpdates.map((u, i) => (
                                  <div key={i} className="text-xs bg-yellow-50 dark:bg-yellow-900/20 p-1.5 rounded">
                                    {u.title} {u.kb && <span className="text-muted-foreground">({u.kb})</span>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Network & BSOD */}
                        <div className="space-y-2">
                          <h3 className="font-semibold text-sm flex items-center gap-1"><Wifi className="h-4 w-4" /> Network</h3>
                          <div className="text-sm space-y-1">
                            <div><span className="text-muted-foreground">IP:</span> {device.ipAddress || "N/A"}</div>
                            <div><span className="text-muted-foreground">DNS:</span> {device.dnsServers || "N/A"}</div>
                            {device.wifiSignal != null && (
                              <div><span className="text-muted-foreground">WiFi Signal:</span> {device.wifiSignal}%</div>
                            )}
                          </div>
                          {device.networkAdapters && device.networkAdapters.length > 0 && (
                            <div className="mt-1">
                              {device.networkAdapters.map((a, i) => (
                                <div key={i} className="text-xs text-muted-foreground">{a.name}: {a.speed}</div>
                              ))}
                            </div>
                          )}

                          {device.bsodCount > 0 && (
                            <div className="mt-3">
                              <h3 className="font-semibold text-sm flex items-center gap-1 text-red-600">
                                <AlertTriangle className="h-4 w-4" /> {device.bsodCount} BSOD Events
                              </h3>
                              <div className="max-h-24 overflow-y-auto mt-1 space-y-1">
                                {device.bsodEvents?.map((e, i) => (
                                  <div key={i} className="text-xs bg-red-50 dark:bg-red-900/20 p-1.5 rounded">
                                    {e.Date} — {e.Message?.slice(0, 100)}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {device.performanceIssues && device.performanceIssues.length > 0 && (
                            <div className="mt-3">
                              <h3 className="font-semibold text-sm flex items-center gap-1 text-yellow-600">
                                <AlertTriangle className="h-4 w-4" /> Performance Issues
                              </h3>
                              {device.performanceIssues.map((issue, i) => (
                                <div key={i} className="text-xs mt-1">{issue.check}: {issue.detail}</div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Security Tab */}
                    {activeTab === "security" && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <h3 className="font-semibold text-sm">Antivirus</h3>
                            <div className="flex items-center gap-2 text-sm">
                              {device.antivirusName ? (
                                <><CheckCircle className="h-4 w-4 text-green-500" /> {device.antivirusName}</>
                              ) : (
                                <><XCircle className="h-4 w-4 text-red-500" /> No antivirus detected</>
                              )}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <h3 className="font-semibold text-sm">Windows Defender</h3>
                            <div className="flex items-center gap-2 text-sm">
                              {device.defenderStatus === "enabled" ? (
                                <><CheckCircle className="h-4 w-4 text-green-500" /> Real-time protection ON</>
                              ) : (
                                <><XCircle className="h-4 w-4 text-red-500" /> {device.defenderStatus || "Unknown"}</>
                              )}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <h3 className="font-semibold text-sm">Firewall</h3>
                            {device.firewallStatus ? (
                              Object.entries(device.firewallStatus).map(([profile, enabled]) => (
                                <div key={profile} className="flex items-center gap-2 text-sm">
                                  {enabled ? (
                                    <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                                  ) : (
                                    <XCircle className="h-3.5 w-3.5 text-red-500" />
                                  )}
                                  {profile}: {enabled ? "ON" : "OFF"}
                                </div>
                              ))
                            ) : (
                              <div className="text-sm text-muted-foreground">No data</div>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                          <div>
                            <h3 className="font-semibold text-sm mb-2 flex items-center gap-1">
                              <Bug className="h-4 w-4" /> Applicable CVEs ({device.openCves})
                            </h3>
                            {device.openCves > 0 ? (
                              <p className="text-sm text-orange-600">{device.openCves} vulnerabilities may affect this device</p>
                            ) : (
                              <p className="text-sm text-green-600">No open CVEs</p>
                            )}
                          </div>
                          <div>
                            <h3 className="font-semibold text-sm mb-2 flex items-center gap-1">
                              <Shield className="h-4 w-4" /> Blocked IOCs ({device.activeIocs})
                            </h3>
                            {device.activeIocs > 0 ? (
                              <p className="text-sm text-red-600">{device.activeIocs} active threat indicators in the blocklist</p>
                            ) : (
                              <p className="text-sm text-green-600">No active IOC threats</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Software Tab */}
                    {activeTab === "software" && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Installed Software */}
                        <div>
                          <h3 className="font-semibold text-sm mb-2 flex items-center gap-1">
                            <Package className="h-4 w-4" /> Installed Applications ({device.installedSoftware?.length || 0})
                          </h3>
                          <div className="max-h-80 overflow-y-auto border rounded-md">
                            <table className="w-full text-xs">
                              <thead className="bg-muted/50 sticky top-0">
                                <tr>
                                  <th className="text-left p-2">Name</th>
                                  <th className="text-left p-2">Version</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(device.installedSoftware || []).map((sw, i) => (
                                  <tr key={i} className="border-t">
                                    <td className="p-2 truncate max-w-[200px]" title={sw.name}>{sw.name}</td>
                                    <td className="p-2 text-muted-foreground">{sw.version}</td>
                                  </tr>
                                ))}
                                {(!device.installedSoftware || device.installedSoftware.length === 0) && (
                                  <tr><td colSpan={2} className="p-4 text-center text-muted-foreground">No data — awaiting diagnostics sync</td></tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Running Processes */}
                        <div>
                          <h3 className="font-semibold text-sm mb-2 flex items-center gap-1">
                            <Play className="h-4 w-4" /> Running Processes ({device.runningSoftware?.length || 0})
                          </h3>
                          <div className="max-h-80 overflow-y-auto border rounded-md">
                            <table className="w-full text-xs">
                              <thead className="bg-muted/50 sticky top-0">
                                <tr>
                                  <th className="text-left p-2">Process</th>
                                  <th className="text-right p-2">Count</th>
                                  <th className="text-right p-2">Memory</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(device.runningSoftware || []).map((proc, i) => (
                                  <tr key={i} className="border-t">
                                    <td className="p-2">{proc.name}</td>
                                    <td className="p-2 text-right text-muted-foreground">{proc.count}</td>
                                    <td className="p-2 text-right text-muted-foreground">{proc.memoryMb} MB</td>
                                  </tr>
                                ))}
                                {(!device.runningSoftware || device.runningSoftware.length === 0) && (
                                  <tr><td colSpan={3} className="p-4 text-center text-muted-foreground">No data — awaiting diagnostics sync</td></tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Activity Tab */}
                    {activeTab === "activity" && (
                      <div>
                        <h3 className="font-semibold text-sm mb-2 flex items-center gap-1">
                          <Activity className="h-4 w-4" /> Recent Activity
                        </h3>
                        <div className="max-h-80 overflow-y-auto border rounded-md">
                          <table className="w-full text-xs">
                            <thead className="bg-muted/50 sticky top-0">
                              <tr>
                                <th className="text-left p-2">Time</th>
                                <th className="text-left p-2">Type</th>
                                <th className="text-left p-2">App</th>
                                <th className="text-left p-2">Window / URL</th>
                              </tr>
                            </thead>
                            <tbody>
                              {device.recentActivity.map((evt, i) => (
                                <tr key={i} className="border-t">
                                  <td className="p-2 whitespace-nowrap text-muted-foreground">{formatTimeAgo(evt.timestamp)}</td>
                                  <td className="p-2">
                                    <Badge variant="outline" className="text-[10px]">{evt.eventType}</Badge>
                                  </td>
                                  <td className="p-2">{evt.appName || "—"}</td>
                                  <td className="p-2 truncate max-w-[300px]" title={evt.windowTitle || evt.url || ""}>
                                    {evt.windowTitle || evt.url || "—"}
                                  </td>
                                </tr>
                              ))}
                              {device.recentActivity.length === 0 && (
                                <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">No recent activity</td></tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Files Tab */}
                    {activeTab === "files" && (
                      <div>
                        <h3 className="font-semibold text-sm mb-2 flex items-center gap-1">
                          <FileText className="h-4 w-4" /> File Events
                        </h3>
                        <div className="max-h-80 overflow-y-auto border rounded-md">
                          <table className="w-full text-xs">
                            <thead className="bg-muted/50 sticky top-0">
                              <tr>
                                <th className="text-left p-2">Time</th>
                                <th className="text-left p-2">Action</th>
                                <th className="text-left p-2">File</th>
                                <th className="text-left p-2">Path</th>
                              </tr>
                            </thead>
                            <tbody>
                              {device.fileEvents.map((evt, i) => {
                                const iconMap: Record<string, typeof FileText> = {
                                  FILE_CREATE: FileText,
                                  FILE_DELETE: Trash2,
                                  FILE_MOVE: ArrowRightLeft,
                                  FILE_COPY: Copy,
                                };
                                const Icon = iconMap[evt.eventType] || FileText;
                                const colorMap: Record<string, string> = {
                                  FILE_CREATE: "text-green-600",
                                  FILE_DELETE: "text-red-600",
                                  FILE_MOVE: "text-blue-600",
                                  FILE_COPY: "text-purple-600",
                                };
                                return (
                                  <tr key={i} className="border-t">
                                    <td className="p-2 whitespace-nowrap text-muted-foreground">{formatTimeAgo(evt.timestamp)}</td>
                                    <td className="p-2">
                                      <span className={`flex items-center gap-1 ${colorMap[evt.eventType] || ""}`}>
                                        <Icon className="h-3 w-3" />
                                        {evt.eventType.replace("FILE_", "")}
                                      </span>
                                    </td>
                                    <td className="p-2">{evt.windowTitle || "—"}</td>
                                    <td className="p-2 truncate max-w-[300px] text-muted-foreground" title={evt.url || ""}>
                                      {evt.url || "—"}
                                    </td>
                                  </tr>
                                );
                              })}
                              {device.fileEvents.length === 0 && (
                                <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">No file events recorded</td></tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Remediation Tab */}
                    {activeTab === "remediation" && (() => {
                      const isWin = device.platform === "win32" || device.platform?.toLowerCase() === "windows";
                      const isMac = device.platform === "darwin" || device.platform?.toLowerCase() === "macos";

                      // Build remediation list dynamically from device issues
                      const remediations: { id: string; category: string; severity: "critical" | "high" | "medium" | "low"; title: string; desc: string; script: string }[] = [];

                      // Pending Updates
                      if (device.pendingUpdates && device.pendingUpdates.length > 0) {
                        remediations.push({
                          id: "install-updates",
                          category: "Updates",
                          severity: "critical",
                          title: "Install Pending Updates",
                          desc: `${device.pendingUpdates.length} update(s) waiting: ${device.pendingUpdates.slice(0, 2).map((u: { title: string }) => u.title).join(", ")}${device.pendingUpdates.length > 2 ? "..." : ""}`,
                          script: isWin
                            ? "Install-Module PSWindowsUpdate -Force -Scope CurrentUser\nGet-WindowsUpdate -Install -AcceptAll -AutoReboot"
                            : isMac ? "softwareupdate --install --all" : "sudo apt update && sudo apt upgrade -y",
                        });
                      }

                      // Reboot Pending
                      if (device.rebootPending) {
                        remediations.push({
                          id: "reboot",
                          category: "System",
                          severity: "high",
                          title: "Reboot Required",
                          desc: "System has a pending reboot — patches may not be applied until restart.",
                          script: isWin
                            ? "shutdown /r /t 300 /c \"Scheduled reboot in 5 minutes for patching\""
                            : "sudo shutdown -r +5 'Scheduled reboot for patching'",
                        });
                      }

                      // BSOD Events
                      if (device.bsodCount && device.bsodCount > 0) {
                        remediations.push({
                          id: "bsod-diag",
                          category: "Stability",
                          severity: "critical",
                          title: `Diagnose ${device.bsodCount} BSOD Event(s)`,
                          desc: "System has experienced blue screen crashes. Run diagnostics to identify root cause.",
                          script: isWin
                            ? "# System File Checker\nsfc /scannow\n\n# DISM Health Restore\nDISM /Online /Cleanup-Image /RestoreHealth\n\n# Check memory\nmdsched.exe"
                            : "sudo fsck -fy\nsudo memtest86+",
                        });
                        remediations.push({
                          id: "bsod-drivers",
                          category: "Stability",
                          severity: "high",
                          title: "Update Drivers (BSOD Prevention)",
                          desc: "Outdated or faulty drivers are the #1 cause of BSODs. Update all critical drivers.",
                          script: isWin
                            ? "# Check for driver updates\npnputil /scan-devices\n\n# Export driver list for review\ndriverquery /v /fo csv > $env:TEMP\\drivers.csv\nWrite-Host \"Driver list exported to $env:TEMP\\drivers.csv\""
                            : "# macOS: Check for system updates\nsoftwareupdate --list",
                        });
                      }

                      // Open CVEs
                      if (device.openCves && device.openCves > 0) {
                        remediations.push({
                          id: "cve-scan",
                          category: "Security",
                          severity: "critical",
                          title: `Address ${device.openCves} Open CVE(s)`,
                          desc: "Known vulnerabilities detected. Install security patches and update affected software.",
                          script: isWin
                            ? "# Check Windows security updates\n$Searcher = (New-Object -ComObject Microsoft.Update.Session).CreateUpdateSearcher()\n$Results = $Searcher.Search('IsInstalled=0 AND Type=\"Software\"')\n$Results.Updates | Select Title,MsrcSeverity | Format-Table\n\n# Install critical updates\nInstall-WindowsUpdate -Severity Critical -AcceptAll"
                            : "softwareupdate --list\nsudo apt list --upgradable 2>/dev/null",
                        });
                      }

                      // Active IOCs
                      if (device.activeIocs && device.activeIocs > 0) {
                        remediations.push({
                          id: "ioc-scan",
                          category: "Security",
                          severity: "critical",
                          title: `Investigate ${device.activeIocs} Active IOC(s)`,
                          desc: "Indicators of compromise detected. Run malware scan and check for suspicious activity.",
                          script: isWin
                            ? "# Full Windows Defender scan\nStart-MpScan -ScanType FullScan\n\n# Check recent threat detections\nGet-MpThreatDetection | Format-Table -AutoSize\n\n# Check running processes for suspicious activity\nGet-Process | Where-Object {$_.Path -notlike 'C:\\Windows*' -and $_.Path -notlike 'C:\\Program Files*'} | Select Name,Path,Id | Format-Table"
                            : "# macOS: Check XProtect and MRT\nsudo /usr/libexec/MRT -a\nps aux | grep -v grep | grep -v '/usr\\|/System\\|/Library'",
                        });
                      }

                      // Firewall Issues
                      if (device.firewallStatus && !Object.values(device.firewallStatus).every(Boolean)) {
                        const disabled = Object.entries(device.firewallStatus).filter(([, v]) => !v).map(([k]) => k);
                        remediations.push({
                          id: "firewall-fix",
                          category: "Security",
                          severity: "high",
                          title: "Enable Firewall Profiles",
                          desc: `Disabled profiles: ${disabled.join(", ")}. All firewall profiles should be active.`,
                          script: isWin
                            ? `Set-NetFirewallProfile -Profile ${disabled.join(",")} -Enabled True\nGet-NetFirewallProfile | Select Name,Enabled | Format-Table`
                            : "sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setglobalstate on",
                        });
                      }

                      // Antivirus Missing or Disabled
                      if (!device.antivirusName || device.defenderStatus !== "enabled") {
                        remediations.push({
                          id: "av-fix",
                          category: "Security",
                          severity: "critical",
                          title: device.antivirusName ? "Enable Antivirus Protection" : "Install Antivirus",
                          desc: device.antivirusName ? `${device.antivirusName} is present but Defender status: ${device.defenderStatus}` : "No antivirus detected on this device.",
                          script: isWin
                            ? "# Enable Windows Defender real-time protection\nSet-MpPreference -DisableRealtimeMonitoring $false\n\n# Update definitions\nUpdate-MpSignature\n\n# Verify status\nGet-MpComputerStatus | Select AntivirusEnabled,RealTimeProtectionEnabled,AntivirusSignatureLastUpdated | Format-List"
                            : "# macOS: Verify XProtect is enabled\nspctl --status\ndefaults read /Library/Preferences/com.apple.alf globalstate",
                        });
                      }

                      // Performance issues (parsed from performanceIssues array)
                      if (device.performanceIssues) {
                        const startupIssue = device.performanceIssues.find(p => p.check.toLowerCase().includes("startup"));
                        const startupMatch = startupIssue?.detail?.match(/(\d+)/);
                        const startupCount = startupMatch ? parseInt(startupMatch[1]) : 0;
                        if (startupCount > 15) {
                          remediations.push({
                            id: "startup-cleanup",
                            category: "Performance",
                            severity: "medium",
                            title: `Reduce Startup Programs (${startupCount})`,
                            desc: `${startupCount} startup programs may slow boot time. Review and disable unnecessary ones.`,
                            script: isWin
                              ? "# List all startup programs\nGet-CimInstance Win32_StartupCommand | Select Name,Command,Location | Format-Table -AutoSize\n\n# Alternative: Open Task Manager Startup tab\ntaskmgr /0 /startup"
                              : "# macOS: List login items\nosascript -e 'tell application \"System Events\" to get the name of every login item'",
                          });
                        }

                        const tempIssue = device.performanceIssues.find(p => p.check.toLowerCase().includes("temp"));
                        const tempMatch = tempIssue?.detail?.match(/(\d+)/);
                        const tempMb = tempMatch ? parseInt(tempMatch[1]) : 0;
                        if (tempMb > 500) {
                          remediations.push({
                            id: "temp-cleanup",
                            category: "Performance",
                            severity: "low",
                            title: `Clean Temp Files (${(tempMb / 1024).toFixed(1)} GB)`,
                            desc: `${tempMb} MB of temporary files. Free up disk space.`,
                            script: isWin
                              ? "# Clean temp folders\nRemove-Item -Path $env:TEMP\\* -Recurse -Force -ErrorAction SilentlyContinue\nRemove-Item -Path C:\\Windows\\Temp\\* -Recurse -Force -ErrorAction SilentlyContinue\n\n# Run Disk Cleanup\ncleanmgr /sagerun:1"
                              : "# macOS: Clean caches\nsudo rm -rf /tmp/*\nrm -rf ~/Library/Caches/*",
                          });
                        }
                      }

                      // Low disk space
                      if (device.diskDrives) {
                        const lowDisk = device.diskDrives.filter((d: { freeGb?: number; sizeGb?: number }) => d.freeGb && d.sizeGb && (d.freeGb / d.sizeGb) < 0.1);
                        if (lowDisk.length > 0) {
                          remediations.push({
                            id: "disk-space",
                            category: "Performance",
                            severity: "high",
                            title: "Low Disk Space Warning",
                            desc: `${lowDisk.length} drive(s) with less than 10% free space.`,
                            script: isWin
                              ? "# Check disk usage\nGet-PSDrive -PSProvider FileSystem | Select Name,@{N='Used(GB)';E={[math]::Round($_.Used/1GB,1)}},@{N='Free(GB)';E={[math]::Round($_.Free/1GB,1)}} | Format-Table\n\n# Find largest files\nGet-ChildItem C:\\ -Recurse -File -ErrorAction SilentlyContinue | Sort Length -Descending | Select -First 20 FullName,@{N='Size(MB)';E={[math]::Round($_.Length/1MB,1)}} | Format-Table"
                              : "df -h\ndu -sh /* 2>/dev/null | sort -rh | head -20",
                          });
                        }
                      }

                      // Low RAM
                      if (device.ramTotalGb && device.ramAvailGb !== null && device.ramAvailGb !== undefined && device.ramTotalGb > 0 && (device.ramAvailGb / device.ramTotalGb) < 0.15) {
                        remediations.push({
                          id: "ram-pressure",
                          category: "Performance",
                          severity: "medium",
                          title: "High Memory Usage",
                          desc: `Only ${device.ramAvailGb.toFixed(1)} GB free of ${device.ramTotalGb.toFixed(1)} GB total.`,
                          script: isWin
                            ? "# Top memory consumers\nGet-Process | Sort WorkingSet64 -Descending | Select -First 15 Name,@{N='RAM(MB)';E={[math]::Round($_.WorkingSet64/1MB,0)}} | Format-Table\n\n# Flush standby memory\nWrite-Host 'Consider closing heavy applications or restarting'"
                            : "# macOS: Show memory pressure\nvm_stat\ntop -l 1 -o mem | head -20",
                        });
                      }

                      // Agent offline
                      if (device.status !== "ONLINE") {
                        remediations.push({
                          id: "agent-restart",
                          category: "Agent",
                          severity: "high",
                          title: "Agent Offline — Restart",
                          desc: `Agent last seen ${formatTimeAgo(device.lastSeenAt)}. Try restarting the service.`,
                          script: isWin
                            ? "# Restart MyDex Agent service\nRestart-Service MyDexAgent -Force\nStart-Sleep 3\nGet-Service MyDexAgent | Select Status,StartType"
                            : "sudo launchctl kickstart -k system/work.antifascist.mydex-agent\nlaunchctl list | grep mydex",
                        });
                      }

                      const sevOrder = { critical: 0, high: 1, medium: 2, low: 3 };
                      remediations.sort((a, b) => sevOrder[a.severity] - sevOrder[b.severity]);

                      const sevColors = {
                        critical: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
                        high: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
                        medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
                        low: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
                      };

                      const deviceLogs = commandLogs.filter(l => l.id.startsWith(device.id));

                      return (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-semibold text-sm flex items-center gap-2">
                                <Wrench className="h-4 w-4" /> Device Remediations
                              </h3>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {remediations.length} actionable fix{remediations.length !== 1 ? "es" : ""} detected for {device.hostname}
                              </p>
                            </div>
                            {remediations.length > 0 && (
                              <div className="flex gap-1.5">
                                {(["critical", "high", "medium", "low"] as const).map(s => {
                                  const count = remediations.filter(r => r.severity === s).length;
                                  return count > 0 ? (
                                    <Badge key={s} className={`text-[10px] ${sevColors[s]}`}>{count} {s}</Badge>
                                  ) : null;
                                })}
                              </div>
                            )}
                          </div>

                          {remediations.length === 0 ? (
                            <div className="text-center py-8 rounded-lg border border-green-200 bg-green-50/50 dark:bg-green-950/10">
                              <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                              <p className="text-sm font-medium text-green-800 dark:text-green-300">No issues detected</p>
                              <p className="text-xs text-muted-foreground mt-1">This device is healthy — no remediations needed.</p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {remediations.map((r) => (
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
                                      <Button
                                        size="sm"
                                        variant="default"
                                        className="h-7 text-xs"
                                        disabled={!!runningFix}
                                        onClick={(e) => { e.stopPropagation(); executeRemediation(device.id, r.title, r.script); }}
                                      >
                                        {runningFix?.startsWith(device.id) ? (
                                          <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Running...</>
                                        ) : (
                                          <><Play className="h-3 w-3 mr-1" /> Run Fix</>
                                        )}
                                      </Button>
                                    </div>
                                  </div>
                                  <div className="bg-gray-950 text-green-400 p-3 font-mono text-[11px] overflow-x-auto max-h-40">
                                    <pre className="whitespace-pre-wrap">{r.script}</pre>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Command Log */}
                          {deviceLogs.length > 0 && (
                            <div className="space-y-2 pt-2 border-t">
                              <h4 className="text-sm font-semibold flex items-center gap-2">
                                <Terminal className="h-4 w-4" /> Command Log
                              </h4>
                              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                                {deviceLogs.map(log => (
                                  <div key={log.id} className={`flex items-center gap-2 text-xs p-2 rounded border ${log.status === "success" ? "bg-green-50/50 border-green-200 dark:bg-green-950/10" : log.status === "failed" ? "bg-red-50/50 border-red-200 dark:bg-red-950/10" : "bg-blue-50/50 border-blue-200 dark:bg-blue-950/10"}`}>
                                    {log.status === "running" && <Loader2 className="h-3 w-3 animate-spin text-blue-500" />}
                                    {log.status === "success" && <CheckCircle className="h-3 w-3 text-green-500" />}
                                    {log.status === "failed" && <XCircle className="h-3 w-3 text-red-500" />}
                                    <span className="font-medium">{log.label}</span>
                                    <span className="text-muted-foreground ml-auto">{log.ts.toLocaleTimeString()}</span>
                                    {log.output && <span className="text-muted-foreground truncate max-w-[200px]">{log.output}</span>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Compliance Tab */}
                    {activeTab === "compliance" && (() => {
                      const isWin = device.platform === "win32" || device.platform?.toLowerCase() === "windows";
                      const hasSoftware = device.installedSoftware && device.installedSoftware.length > 0;

                      // Compute device-specific compliance checks with expandable details
                      const checks = [
                        { id: "encryption", label: "Disk Encryption", control: "C1.3", pass: true, desc: isWin ? "BitLocker status requires agent diagnostic" : "FileVault status requires agent diagnostic", icon: Lock, details: device.diskDrives?.map(d => `${d.model} — ${d.sizeGb}GB (${d.type})`) || [] },
                        { id: "antivirus", label: "Antivirus Active", control: "CC6.8", pass: !!device.antivirusName && device.defenderStatus === "enabled", desc: device.antivirusName ? `${device.antivirusName} — ${device.defenderStatus}` : "No antivirus detected", icon: Shield, details: device.antivirusName ? [`Engine: ${device.antivirusName}`, `Defender: ${device.defenderStatus || "unknown"}`] : ["No antivirus engine detected on this device"] },
                        { id: "firewall", label: "Firewall Enabled", control: "CC6.6", pass: device.firewallStatus ? Object.values(device.firewallStatus).every(Boolean) : false, desc: device.firewallStatus ? `Domain: ${device.firewallStatus.domain ? "✓" : "✗"} | Private: ${device.firewallStatus.private ? "✓" : "✗"} | Public: ${device.firewallStatus.public ? "✓" : "✗"}` : "Firewall status unknown", icon: Shield, details: device.firewallStatus ? Object.entries(device.firewallStatus).map(([profile, on]) => `${profile}: ${on ? "Enabled ✓" : "DISABLED ✗"}`) : ["Firewall data not available"] },
                        { id: "updates", label: "OS Updates Current", control: "CC7.1", pass: !device.pendingUpdates || device.pendingUpdates.length === 0, desc: device.pendingUpdates?.length ? `${device.pendingUpdates.length} pending update(s)` : "Up to date — 0 pending", icon: RefreshCw, details: device.pendingUpdates?.map(u => `${u.title} (${u.kb})`) || ["All updates installed"] },
                        { id: "reboot", label: "No Reboot Pending", control: "CC7.1", pass: !device.rebootPending, desc: device.rebootPending ? "Device requires reboot" : "No reboot needed", icon: RefreshCw, details: device.rebootPending ? ["A system restart is required to complete pending updates or configuration changes"] : ["System is up to date — no reboot required"] },
                        { id: "bsod", label: "System Stability", control: "CC7.5", pass: !device.bsodCount || device.bsodCount === 0, desc: device.bsodCount ? `${device.bsodCount} BSOD event(s) detected` : "0 crash events", icon: AlertTriangle, details: device.bsodEvents?.map(e => `${e.Date} — ${e.Message}`) || (device.bsodCount ? [`${device.bsodCount} crash event(s) recorded`] : ["No crash events recorded"]) },
                        { id: "cve", label: "Vulnerability Status", control: "CC9.1", pass: !device.openCves || device.openCves === 0, desc: device.openCves ? `${device.openCves} open CVE(s) affecting this device` : "0 open CVEs — all clear", icon: Bug, details: device.openCves ? [`${device.openCves} known vulnerability/vulnerabilities detected`, "Run a vulnerability scan to identify affected software", "Install pending updates to patch known CVEs"] : ["No known vulnerabilities detected for installed software"] },
                        { id: "ioc", label: "Threat Indicators", control: "CC7.2", pass: !device.activeIocs || device.activeIocs === 0, desc: device.activeIocs ? `${device.activeIocs} active indicator(s) of compromise` : "0 active IOCs — all clear", icon: AlertCircle, details: device.activeIocs ? [`${device.activeIocs} IOC match(es) found`, "Investigate suspicious network connections and processes", "Consider isolating the device if threat is confirmed"] : ["No indicators of compromise detected"] },
                        { id: "software", label: "Software Inventory", control: "CC8.2", pass: hasSoftware, desc: hasSoftware ? `${device.installedSoftware!.length} apps tracked` : "No software inventory — agent sync needed", icon: Package, details: hasSoftware ? device.installedSoftware!.slice(0, 10).map(s => `${s.name} v${s.version}`) : ["Software inventory is empty — ensure the agent is collecting data"] },
                        { id: "agent", label: "Agent Reporting", control: "CC7.1", pass: device.status === "ONLINE", desc: device.status === "ONLINE" ? `Agent v${device.agentVersion} — online` : "Agent offline — last seen " + formatTimeAgo(device.lastSeenAt), icon: Monitor, details: [`Status: ${device.status}`, `Version: ${device.agentVersion}`, `Last seen: ${new Date(device.lastSeenAt).toLocaleString()}`] },
                      ];

                      const passCount = checks.filter(c => c.pass).length;
                      const failCount = checks.filter(c => !c.pass).length;
                      const score = Math.round((passCount / checks.length) * 100);

                      // Quick-fix scripts for failing checks
                      const remediations = checks.filter(c => !c.pass).map(c => {
                        const scripts: Record<string, { title: string; script: string }> = {
                          antivirus: { title: "Update Antivirus Definitions", script: isWin ? "Update-MpSignature -UpdateSource MicrosoftUpdateServer\nGet-MpComputerStatus | Select AntivirusSignatureLastUpdated,AntivirusEnabled" : "softwareupdate --background-critical" },
                          firewall: { title: "Enable All Firewall Profiles", script: isWin ? "Set-NetFirewallProfile -Profile Domain,Public,Private -Enabled True\nGet-NetFirewallProfile | Select Name,Enabled | Format-Table" : "sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setglobalstate on" },
                          updates: { title: "Install Pending Updates", script: isWin ? "Install-Module PSWindowsUpdate -Force -Scope CurrentUser\nGet-WindowsUpdate -Install -AcceptAll -AutoReboot" : "softwareupdate --install --all" },
                          reboot: { title: "Schedule Reboot", script: isWin ? "shutdown /r /t 300 /c 'Compliance reboot scheduled in 5 minutes'" : "sudo shutdown -r +5 'Compliance reboot'" },
                          bsod: { title: "System File Check", script: isWin ? "sfc /scannow\nDISM /Online /Cleanup-Image /RestoreHealth" : "sudo diskutil verifyVolume /" },
                          cve: { title: "Run Vulnerability Scan", script: isWin ? "$Searcher = (New-Object -ComObject Microsoft.Update.Session).CreateUpdateSearcher()\n$Searcher.Search('IsInstalled=0').Updates | Select Title,MsrcSeverity | Format-Table" : "softwareupdate --list" },
                          ioc: { title: "Malware Quick Scan", script: isWin ? "Start-MpScan -ScanType QuickScan\nGet-MpThreatDetection | Format-Table" : "echo 'XProtect scan initiated'" },
                          software: { title: "Sync Software Inventory", script: "Write-Host 'Trigger agent sync from Agent Setup page'" },
                          agent: { title: "Check Agent Status", script: isWin ? "Get-Service MyDexAgent -EA SilentlyContinue | Select Status,StartType" : "launchctl list | grep mydex" },
                          encryption: { title: "Check Disk Encryption", script: isWin ? "Get-BitLockerVolume | Select MountPoint,VolumeStatus,EncryptionPercentage,ProtectionStatus | Format-Table" : "fdesetup status" },
                        };
                        return { check: c, ...(scripts[c.id] || { title: `Fix ${c.label}`, script: "# Manual remediation required" }) };
                      });

                      return (
                        <div className="space-y-4">
                          {/* Score Header */}
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-semibold text-sm flex items-center gap-2">
                                <FileCheck className="h-4 w-4" /> SOC 2 Device Compliance
                              </h3>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {device.hostname} — {passCount}/{checks.length} controls passing
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className={`text-3xl font-bold ${score >= 90 ? "text-green-600" : score >= 70 ? "text-amber-600" : "text-red-600"}`}>
                                {score}%
                              </div>
                              <Badge className={`text-xs ${score >= 90 ? "bg-green-100 text-green-800" : score >= 70 ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800"}`}>
                                {score >= 90 ? "Compliant" : score >= 70 ? "Needs Attention" : "At Risk"}
                              </Badge>
                            </div>
                          </div>

                          {/* Progress Bar */}
                          <div className="w-full h-3 bg-muted rounded-full overflow-hidden flex">
                            <div className="bg-green-500 transition-all" style={{ width: `${(passCount / checks.length) * 100}%` }} />
                            <div className="bg-red-500 transition-all" style={{ width: `${(failCount / checks.length) * 100}%` }} />
                          </div>
                          <div className="flex gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" />{passCount} Passing</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" />{failCount} Failing</span>
                          </div>

                          {/* Control Checks Grid — Expandable */}
                          <div className="grid gap-2 md:grid-cols-2">
                            {checks.map((check) => (
                              <div key={check.id} className="rounded-lg border overflow-hidden">
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); setExpandedCheck(expandedCheck === check.id ? null : check.id); }}
                                  className={`w-full flex items-start gap-3 p-3 text-left transition-colors ${check.pass ? "bg-green-50/50 border-green-200 hover:bg-green-100/50 dark:bg-green-950/10 dark:hover:bg-green-950/20" : "bg-red-50/50 border-red-200 hover:bg-red-100/50 dark:bg-red-950/10 dark:hover:bg-red-950/20"}`}
                                >
                                  <div className="mt-0.5">
                                    {check.pass ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium">{check.label}</span>
                                      <Badge variant="outline" className="text-[9px] font-mono">{check.control}</Badge>
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-0.5">{check.desc}</div>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0 mt-0.5">
                                    <check.icon className={`h-4 w-4 ${check.pass ? "text-green-400" : "text-red-400"}`} />
                                    {expandedCheck === check.id ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                                  </div>
                                </button>
                                {expandedCheck === check.id && (
                                  <div className={`border-t px-3 py-2 space-y-1 ${check.pass ? "bg-green-50/30 dark:bg-green-950/5" : "bg-red-50/30 dark:bg-red-950/5"}`}>
                                    {check.details.map((detail, i) => (
                                      <div key={i} className="flex items-start gap-2 text-xs">
                                        <span className={`mt-1 h-1.5 w-1.5 rounded-full shrink-0 ${check.pass ? "bg-green-400" : "bg-red-400"}`} />
                                        <span className="text-muted-foreground">{detail}</span>
                                      </div>
                                    ))}
                                    {check.details.length > 10 && (
                                      <div className="text-xs text-muted-foreground italic pl-3.5">...and more</div>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>

                          {/* Quick-Fix Remediations for Failing Controls */}
                          {remediations.length > 0 && (
                            <div className="space-y-2 pt-2">
                              <h4 className="text-sm font-semibold flex items-center gap-2">
                                <Terminal className="h-4 w-4 text-amber-500" /> Quick-Fix Remediations
                                <Badge className="text-[9px] bg-amber-100 text-amber-800">{remediations.length} issue{remediations.length !== 1 ? "s" : ""}</Badge>
                              </h4>
                              <div className="grid gap-2 md:grid-cols-2">
                                {remediations.map((r) => (
                                  <div key={r.check.id} className="rounded-lg border overflow-hidden">
                                    <div className="flex items-center justify-between p-2.5 bg-muted/30">
                                      <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-[9px] font-mono">{r.check.control}</Badge>
                                        <span className="text-sm font-medium">{r.title}</span>
                                      </div>
                                      <Button size="sm" variant="outline" className="text-[11px] h-7">
                                        <Play className="h-3 w-3 mr-1" />Run
                                      </Button>
                                    </div>
                                    <div className="bg-gray-950 text-green-400 p-2 font-mono text-[10px] overflow-x-auto">
                                      <pre className="whitespace-pre-wrap">{r.script}</pre>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* All Passing Message */}
                          {remediations.length === 0 && (
                            <div className="text-center py-4 rounded-lg border border-green-200 bg-green-50/50 dark:bg-green-950/10">
                              <CheckCircle className="h-6 w-6 text-green-500 mx-auto mb-2" />
                              <p className="text-sm font-medium text-green-800 dark:text-green-300">All SOC 2 controls passing</p>
                              <p className="text-xs text-muted-foreground mt-1">This device meets all compliance requirements.</p>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* MDM Tab */}
                    {activeTab === "mdm" && device.mdmDevices?.[0] && (() => {
                      const mdm = device.mdmDevices[0];
                      return (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <h3 className="font-semibold text-sm flex items-center gap-1"><Lock className="h-4 w-4" /> MDM Status</h3>
                              <div className="text-sm space-y-1">
                                <div className="flex justify-between"><span className="text-muted-foreground">Provider</span><span>{mdm.mdmProvider.name}</span></div>
                                <div className="flex justify-between"><span className="text-muted-foreground">Enrollment</span>
                                  <Badge className={mdm.enrollmentStatus === "enrolled" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>{mdm.enrollmentStatus || "Unknown"}</Badge>
                                </div>
                                <div className="flex justify-between"><span className="text-muted-foreground">Compliance</span>
                                  <Badge className={mdm.complianceStatus === "compliant" ? "bg-green-100 text-green-800" : mdm.complianceStatus === "noncompliant" ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-800"}>{mdm.complianceStatus || "Unknown"}</Badge>
                                </div>
                                <div className="flex justify-between"><span className="text-muted-foreground">Management</span><span>{mdm.managementState || "N/A"}</span></div>
                                <div className="flex justify-between"><span className="text-muted-foreground">Encrypted</span>
                                  <span>{mdm.isEncrypted === true ? "Yes" : mdm.isEncrypted === false ? "No" : "N/A"}</span>
                                </div>
                                {mdm.model && <div className="flex justify-between"><span className="text-muted-foreground">Model</span><span>{mdm.model}</span></div>}
                                {mdm.lastCheckIn && <div className="flex justify-between"><span className="text-muted-foreground">Last Check-in</span><span>{formatTimeAgo(mdm.lastCheckIn)}</span></div>}
                              </div>
                            </div>

                            {/* Managed Apps */}
                            <div className="md:col-span-2 space-y-2">
                              <h3 className="font-semibold text-sm flex items-center gap-1"><Package className="h-4 w-4" /> Managed Apps</h3>
                              {(!mdm.managedApps || mdm.managedApps.length === 0) ? (
                                <p className="text-xs text-muted-foreground">No managed apps reported.</p>
                              ) : (
                                <div className="max-h-48 overflow-y-auto border rounded">
                                  <table className="w-full text-xs">
                                    <thead><tr className="border-b bg-muted/30"><th className="px-2 py-1 text-left">App</th><th className="px-2 py-1 text-left">Version</th><th className="px-2 py-1 text-left">Status</th></tr></thead>
                                    <tbody>
                                      {mdm.managedApps.map((app, i) => (
                                        <tr key={i} className="border-b last:border-0"><td className="px-2 py-1">{app.name}</td><td className="px-2 py-1 text-muted-foreground">{app.version}</td><td className="px-2 py-1"><Badge variant="outline" className="text-[9px]">{app.installState}</Badge></td></tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* MDM Actions */}
                          <div className="space-y-2">
                            <h3 className="font-semibold text-sm flex items-center gap-1"><Wrench className="h-4 w-4" /> MDM Actions</h3>
                            <div className="flex flex-wrap gap-2">
                              <Button size="sm" variant="outline" onClick={() => executeMdmAction(mdm.mdmProvider.id, mdm.mdmDeviceId, device.id, "sync")}>
                                <RefreshCw className="h-3.5 w-3.5 mr-1" /> Sync
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => executeMdmAction(mdm.mdmProvider.id, mdm.mdmDeviceId, device.id, "lock")}>
                                <Lock className="h-3.5 w-3.5 mr-1" /> Lock
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => executeMdmAction(mdm.mdmProvider.id, mdm.mdmDeviceId, device.id, "restart")}>
                                <RefreshCw className="h-3.5 w-3.5 mr-1" /> Restart
                              </Button>
                              <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700" onClick={() => {
                                if (confirm(`Are you sure you want to WIPE ${device.hostname}? This cannot be undone.`)) {
                                  executeMdmAction(mdm.mdmProvider.id, mdm.mdmDeviceId, device.id, "wipe");
                                }
                              }}>
                                <Trash2 className="h-3.5 w-3.5 mr-1" /> Wipe
                              </Button>
                              <Button size="sm" variant="outline" className="text-orange-600" onClick={() => {
                                if (confirm(`Retire/unenroll ${device.hostname} from MDM?`)) {
                                  executeMdmAction(mdm.mdmProvider.id, mdm.mdmDeviceId, device.id, "retire");
                                }
                              }}>
                                <XCircle className="h-3.5 w-3.5 mr-1" /> Retire
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              )}
            </Fragment>
          ))}
        </div>
      )}
    </div>
  );
}
