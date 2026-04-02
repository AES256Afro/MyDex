"use client";

import { useRequireRole } from "@/hooks/use-require-role";
import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  Search,
  AlertTriangle,
  CheckCircle,
  Monitor,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Layers,
  HardDrive,
  Users,
  X,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

// ─── Types ─────────────────────────────────────────────────────────────────

interface VersionDetail {
  version: string;
  count: number;
  devices: Array<{
    deviceId: string;
    hostname: string;
    platform: string;
    userName: string;
    installPath?: string;
  }>;
}

interface SoftwareEntry {
  name: string;
  totalInstalls: number;
  versions: VersionDetail[];
  latestVersion: string;
  outdatedCount: number;
  publishers: string[];
}

interface Summary {
  totalDevices: number;
  totalInstallations: number;
  uniqueApps: number;
  appsWithMultipleVersions: number;
  totalOutdated: number;
}

// ─── Chart Colors ──────────────────────────────────────────────────────────

const CHART_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1",
  "#14b8a6", "#e11d48", "#a855f7", "#22c55e", "#eab308",
];

const PLATFORM_COLORS: Record<string, string> = {
  win32: "#0078d4",
  windows: "#0078d4",
  darwin: "#555555",
  macos: "#555555",
  linux: "#e95420",
};

// ─── Helpers ───────────────────────────────────────────────────────────────

function getPlatformLabel(platform: string): string {
  switch (platform.toLowerCase()) {
    case "win32":
    case "windows":
      return "Windows";
    case "darwin":
    case "macos":
      return "macOS";
    case "linux":
      return "Linux";
    default:
      return platform;
  }
}

// ─── Component ─────────────────────────────────────────────────────────────

export default function SoftwareInventoryPage() {
  const { authorized } = useRequireRole("ADMIN");
  if (!authorized) return null;

  const [software, setSoftware] = useState<SoftwareEntry[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedApp, setSelectedApp] = useState<SoftwareEntry | null>(null);
  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(new Set());
  const [filterMode, setFilterMode] = useState<"all" | "outdated" | "multiversion">("all");

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/v1/software-inventory");
      if (!res.ok) throw new Error("Failed to fetch software inventory");
      const data = await res.json();
      setSoftware(data.software ?? []);
      setSummary(data.summary ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter software list
  const filtered = software.filter((app) => {
    if (filterMode === "outdated" && app.outdatedCount === 0) return false;
    if (filterMode === "multiversion" && app.versions.length <= 1) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        app.name.toLowerCase().includes(q) ||
        app.publishers.some((p) => p.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Top 10 most installed apps for the overview chart
  const topApps = software.slice(0, 10).map((app) => ({
    name: app.name.length > 20 ? app.name.slice(0, 18) + "..." : app.name,
    fullName: app.name,
    installs: app.totalInstalls,
    outdated: app.outdatedCount,
  }));

  // Outdated breakdown for pie chart
  const outdatedApps = software
    .filter((a) => a.outdatedCount > 0)
    .sort((a, b) => b.outdatedCount - a.outdatedCount)
    .slice(0, 8)
    .map((a) => ({
      name: a.name.length > 18 ? a.name.slice(0, 16) + "..." : a.name,
      fullName: a.name,
      value: a.outdatedCount,
    }));

  function toggleVersionExpand(version: string) {
    setExpandedVersions((prev) => {
      const next = new Set(prev);
      if (next.has(version)) next.delete(version);
      else next.add(version);
      return next;
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground mr-3" />
        <p className="text-muted-foreground">Loading software inventory...</p>
      </div>
    );
  }

  // ─── Selected App Detail View ──────────────────────────────────────────
  if (selectedApp) {
    const versionChartData = selectedApp.versions.map((v) => ({
      name: v.version,
      value: v.count,
    }));

    const platformCounts: Record<string, number> = {};
    for (const ver of selectedApp.versions) {
      for (const dev of ver.devices) {
        const p = getPlatformLabel(dev.platform);
        platformCounts[p] = (platformCounts[p] || 0) + 1;
      }
    }
    const platformChartData = Object.entries(platformCounts).map(([name, value]) => ({
      name,
      value,
    }));

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setSelectedApp(null)}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Package className="h-6 w-6" />
              {selectedApp.name}
            </h1>
            <p className="text-muted-foreground">
              {selectedApp.totalInstalls} installation{selectedApp.totalInstalls !== 1 ? "s" : ""} across your environment
              {selectedApp.publishers.length > 0 && (
                <span> &middot; {selectedApp.publishers.join(", ")}</span>
              )}
            </p>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid gap-4 sm:grid-cols-4">
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="text-sm text-muted-foreground">Total Installs</div>
              <div className="text-2xl font-bold">{selectedApp.totalInstalls}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="text-sm text-muted-foreground">Versions</div>
              <div className="text-2xl font-bold">{selectedApp.versions.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="text-sm text-muted-foreground">Latest Version</div>
              <div className="text-lg font-bold font-mono truncate">{selectedApp.latestVersion}</div>
            </CardContent>
          </Card>
          <Card className={selectedApp.outdatedCount > 0 ? "border-orange-300 bg-orange-50/50" : "border-green-300 bg-green-50/50"}>
            <CardContent className="pt-4 pb-3">
              <div className="text-sm text-muted-foreground">Outdated</div>
              <div className={`text-2xl font-bold ${selectedApp.outdatedCount > 0 ? "text-orange-600" : "text-green-600"}`}>
                {selectedApp.outdatedCount}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts row */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Version Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={versionChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }: { name?: string; percent?: number }) =>
                        `${name ?? ""} (${((percent ?? 0) * 100).toFixed(0)}%)`
                      }
                    >
                      {versionChartData.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => [`${value} device${value !== 1 ? "s" : ""}`, "Installations"]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Platform Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={platformChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }: { name?: string; percent?: number }) =>
                        `${name ?? ""} (${((percent ?? 0) * 100).toFixed(0)}%)`
                      }
                    >
                      {platformChartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={PLATFORM_COLORS[entry.name.toLowerCase()] || CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => [`${value} device${value !== 1 ? "s" : ""}`, "Installations"]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Version detail table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Version Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {selectedApp.versions.map((ver) => {
                const isLatest = ver.version === selectedApp.latestVersion;
                const isExpanded = expandedVersions.has(ver.version);

                return (
                  <div key={ver.version} className="border rounded-lg">
                    <button
                      onClick={() => toggleVersionExpand(ver.version)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="font-mono font-medium">{ver.version}</span>
                        {isLatest ? (
                          <Badge variant="outline" className="text-green-600 border-green-300 text-xs">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Latest
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-orange-600 border-orange-300 text-xs">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Outdated
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                          <Monitor className="h-3 w-3 mr-1" />
                          {ver.count} device{ver.count !== 1 ? "s" : ""}
                        </Badge>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t px-4 py-3 bg-muted/30">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b text-left">
                              <th className="pb-2 pr-4 font-medium text-muted-foreground">Hostname</th>
                              <th className="pb-2 pr-4 font-medium text-muted-foreground">User</th>
                              <th className="pb-2 pr-4 font-medium text-muted-foreground">Platform</th>
                              <th className="pb-2 font-medium text-muted-foreground">Install Path</th>
                            </tr>
                          </thead>
                          <tbody>
                            {ver.devices.map((dev) => (
                              <tr key={dev.deviceId} className="border-b last:border-0">
                                <td className="py-2 pr-4 font-mono text-xs">{dev.hostname}</td>
                                <td className="py-2 pr-4">{dev.userName}</td>
                                <td className="py-2 pr-4">
                                  <Badge variant="outline" className="text-xs">
                                    {getPlatformLabel(dev.platform)}
                                  </Badge>
                                </td>
                                <td className="py-2 font-mono text-xs text-muted-foreground truncate max-w-xs">
                                  {dev.installPath || "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Main List View ─────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Package className="h-7 w-7" />
            Software Inventory
          </h1>
          <p className="text-muted-foreground">
            Application versions, paths, and usage across all enrolled devices
          </p>
        </div>
        <Button variant="outline" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline hover:no-underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Monitor className="h-4 w-4" />
                Devices
              </div>
              <div className="text-2xl font-bold">{summary.totalDevices}</div>
              <div className="text-xs text-muted-foreground">enrolled</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Package className="h-4 w-4" />
                Applications
              </div>
              <div className="text-2xl font-bold">{summary.uniqueApps}</div>
              <div className="text-xs text-muted-foreground">unique titles</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <HardDrive className="h-4 w-4" />
                Installations
              </div>
              <div className="text-2xl font-bold">{summary.totalInstallations}</div>
              <div className="text-xs text-muted-foreground">total</div>
            </CardContent>
          </Card>
          <Card className={summary.appsWithMultipleVersions > 0 ? "border-yellow-300 bg-yellow-50/50" : ""}>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Layers className="h-4 w-4" />
                Multi-Version
              </div>
              <div className={`text-2xl font-bold ${summary.appsWithMultipleVersions > 0 ? "text-yellow-600" : ""}`}>
                {summary.appsWithMultipleVersions}
              </div>
              <div className="text-xs text-muted-foreground">apps with version drift</div>
            </CardContent>
          </Card>
          <Card className={summary.totalOutdated > 0 ? "border-orange-300 bg-orange-50/50" : "border-green-300 bg-green-50/50"}>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertTriangle className="h-4 w-4" />
                Outdated
              </div>
              <div className={`text-2xl font-bold ${summary.totalOutdated > 0 ? "text-orange-600" : "text-green-600"}`}>
                {summary.totalOutdated}
              </div>
              <div className="text-xs text-muted-foreground">installs behind latest</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Overview Charts */}
      {software.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Top installed apps */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />
                Most Installed Applications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topApps} layout="vertical" margin={{ left: 10, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={130}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip
                      formatter={(value, name) => [
                        `${value} device${value !== 1 ? "s" : ""}`,
                        name === "installs" ? "Installed" : "Outdated",
                      ]}
                      labelFormatter={(label) => {
                        const app = topApps.find((a) => a.name === label);
                        return app?.fullName || String(label);
                      }}
                    />
                    <Bar dataKey="installs" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Installed" />
                    <Bar dataKey="outdated" fill="#f59e0b" radius={[0, 4, 4, 0]} name="Outdated" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Outdated software pie chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                Outdated Software Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              {outdatedApps.length === 0 ? (
                <div className="h-72 flex items-center justify-center">
                  <div className="text-center">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">All software is up to date</p>
                  </div>
                </div>
              ) : (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={outdatedApps}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={85}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, value }) => `${name} (${value})`}
                      >
                        {outdatedApps.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={CHART_COLORS[index % CHART_COLORS.length]}
                            className="cursor-pointer hover:opacity-80 transition-opacity"
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => [`${value} outdated install${value !== 1 ? "s" : ""}`, "Count"]}
                        labelFormatter={(label) => {
                          const app = outdatedApps.find((a) => a.name === label);
                          return app?.fullName || String(label);
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filter + Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-1">
          {([
            { key: "all" as const, label: "All Apps" },
            { key: "outdated" as const, label: "Outdated" },
            { key: "multiversion" as const, label: "Multi-Version" },
          ]).map((f) => (
            <button
              key={f.key}
              onClick={() => setFilterMode(f.key)}
              className={`inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                filterMode === f.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by application name or publisher..."
            className="pl-10"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Software List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Applications ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="py-12 text-center">
              {software.length === 0 ? (
                <>
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No software inventory data yet.</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Deploy the MyDex agent to devices to start collecting installed software data.
                  </p>
                </>
              ) : (
                <p className="text-muted-foreground">No applications match your search or filter.</p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">Application</th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground text-center">Installs</th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground text-center">Versions</th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">Latest</th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground text-center">Outdated</th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">Publisher</th>
                    <th className="pb-3 font-medium text-muted-foreground">Version Spread</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((app) => {
                    const maxBarWidth = 120;
                    const maxInstalls = filtered[0]?.totalInstalls || 1;

                    return (
                      <tr
                        key={app.name}
                        className="border-b last:border-0 hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => {
                          setSelectedApp(app);
                          setExpandedVersions(new Set());
                        }}
                      >
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="font-medium">{app.name}</span>
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-center font-medium">{app.totalInstalls}</td>
                        <td className="py-3 pr-4 text-center">
                          {app.versions.length > 1 ? (
                            <Badge variant="outline" className="text-yellow-600 border-yellow-300">
                              {app.versions.length}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">1</span>
                          )}
                        </td>
                        <td className="py-3 pr-4 font-mono text-xs">{app.latestVersion}</td>
                        <td className="py-3 pr-4 text-center">
                          {app.outdatedCount > 0 ? (
                            <Badge variant="outline" className="text-orange-600 border-orange-300">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              {app.outdatedCount}
                            </Badge>
                          ) : (
                            <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                          )}
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground text-xs truncate max-w-[150px]">
                          {app.publishers.join(", ") || "—"}
                        </td>
                        <td className="py-3">
                          {/* Mini version bar chart */}
                          <div className="flex items-center gap-0.5">
                            {app.versions.slice(0, 5).map((v, i) => {
                              const width = Math.max(
                                4,
                                (v.count / maxInstalls) * maxBarWidth
                              );
                              return (
                                <div
                                  key={v.version}
                                  className="h-4 rounded-sm"
                                  style={{
                                    width: `${width}px`,
                                    backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                                    opacity: v.version === app.latestVersion ? 1 : 0.6,
                                  }}
                                  title={`${v.version}: ${v.count} device${v.count !== 1 ? "s" : ""}`}
                                />
                              );
                            })}
                            {app.versions.length > 5 && (
                              <span className="text-xs text-muted-foreground ml-1">+{app.versions.length - 5}</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
