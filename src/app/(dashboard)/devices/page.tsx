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
  diskDrives: Array<{ model: string; sizeGb: number; type: string }> | null;
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
  user: { id: string; name: string | null; email: string };
  _count: { commands: number; diagnostics: number };
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
                              <Bug className="h-4 w-4" /> Open CVEs ({device.openCves})
                            </h3>
                            {device.openCves > 0 ? (
                              <p className="text-sm text-orange-600">{device.openCves} unpatched vulnerabilities detected for this organization</p>
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
