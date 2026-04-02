"use client";

import { useState, useEffect } from "react";
import { useRequireRole } from "@/hooks/use-require-role";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Bell,
  AlertTriangle,
  Clock,
  Shield,
  Monitor,
  Save,
  RotateCcw,
  CheckCircle2,
  Mail,
  Zap,
} from "lucide-react";

interface AlertThreshold {
  id: string;
  name: string;
  description: string;
  category: "security" | "performance" | "compliance" | "availability";
  enabled: boolean;
  threshold: number;
  unit: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  notifyEmail: boolean;
  notifyDashboard: boolean;
  autoRemediate: boolean;
}

const DEFAULT_THRESHOLDS: AlertThreshold[] = [
  {
    id: "unusual-hours",
    name: "Unusual Working Hours",
    description: "Alert when employee activity is detected outside normal business hours",
    category: "security",
    enabled: true,
    threshold: 22,
    unit: "hour (24h)",
    severity: "MEDIUM",
    notifyEmail: false,
    notifyDashboard: true,
    autoRemediate: false,
  },
  {
    id: "excessive-data",
    name: "Excessive Data Access",
    description: "Alert when file access volume exceeds threshold in a single session",
    category: "security",
    enabled: true,
    threshold: 100,
    unit: "files/hour",
    severity: "HIGH",
    notifyEmail: true,
    notifyDashboard: true,
    autoRemediate: false,
  },
  {
    id: "device-offline",
    name: "Device Offline Duration",
    description: "Alert when a managed device hasn't checked in for the specified duration",
    category: "availability",
    enabled: true,
    threshold: 24,
    unit: "hours",
    severity: "MEDIUM",
    notifyEmail: false,
    notifyDashboard: true,
    autoRemediate: false,
  },
  {
    id: "dex-score-drop",
    name: "DEX Score Drop",
    description: "Alert when a device's DEX score falls below this threshold",
    category: "performance",
    enabled: true,
    threshold: 50,
    unit: "score (0-100)",
    severity: "HIGH",
    notifyEmail: true,
    notifyDashboard: true,
    autoRemediate: false,
  },
  {
    id: "bsod-frequency",
    name: "BSOD Frequency",
    description: "Alert when a device experiences more than N blue screen crashes in 30 days",
    category: "performance",
    enabled: true,
    threshold: 3,
    unit: "crashes/30d",
    severity: "CRITICAL",
    notifyEmail: true,
    notifyDashboard: true,
    autoRemediate: true,
  },
  {
    id: "update-compliance",
    name: "Update Non-Compliance",
    description: "Alert when a device has pending updates for more than the specified days",
    category: "compliance",
    enabled: true,
    threshold: 14,
    unit: "days",
    severity: "MEDIUM",
    notifyEmail: false,
    notifyDashboard: true,
    autoRemediate: true,
  },
  {
    id: "unauthorized-app",
    name: "Unauthorized Application",
    description: "Alert when a blacklisted application is detected running on a device",
    category: "security",
    enabled: true,
    threshold: 1,
    unit: "occurrences",
    severity: "HIGH",
    notifyEmail: true,
    notifyDashboard: true,
    autoRemediate: false,
  },
  {
    id: "disk-space",
    name: "Low Disk Space",
    description: "Alert when available disk space falls below this percentage",
    category: "performance",
    enabled: true,
    threshold: 10,
    unit: "% free",
    severity: "MEDIUM",
    notifyEmail: false,
    notifyDashboard: true,
    autoRemediate: false,
  },
  {
    id: "no-antivirus",
    name: "Missing Antivirus Protection",
    description: "Alert when a device has no antivirus or Windows Defender disabled",
    category: "security",
    enabled: true,
    threshold: 1,
    unit: "detection",
    severity: "CRITICAL",
    notifyEmail: true,
    notifyDashboard: true,
    autoRemediate: false,
  },
  {
    id: "uptime-excessive",
    name: "Excessive Uptime",
    description: "Alert when a device hasn't been restarted for the specified number of days",
    category: "compliance",
    enabled: true,
    threshold: 30,
    unit: "days",
    severity: "LOW",
    notifyEmail: false,
    notifyDashboard: true,
    autoRemediate: true,
  },
];

function severityColor(severity: string) {
  switch (severity) {
    case "CRITICAL": return "destructive" as const;
    case "HIGH": return "warning" as const;
    case "MEDIUM": return "secondary" as const;
    case "LOW": return "outline" as const;
    default: return "secondary" as const;
  }
}

function categoryIcon(category: string) {
  switch (category) {
    case "security": return <Shield className="h-4 w-4 text-red-500" />;
    case "performance": return <Zap className="h-4 w-4 text-yellow-500" />;
    case "compliance": return <CheckCircle2 className="h-4 w-4 text-blue-500" />;
    case "availability": return <Monitor className="h-4 w-4 text-green-500" />;
    default: return <AlertTriangle className="h-4 w-4" />;
  }
}

export default function AlertThresholdsPage() {
  const { authorized } = useRequireRole("ADMIN");
  const [thresholds, setThresholds] = useState<AlertThreshold[]>(DEFAULT_THRESHOLDS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      const res = await fetch("/api/v1/settings");
      if (res.ok) {
        const data = await res.json();
        const savedThresholds = data.organization?.settings?.alertThresholds;
        if (savedThresholds && Array.isArray(savedThresholds) && savedThresholds.length > 0) {
          setThresholds(savedThresholds);
        }
      }
    } catch (e) {
      console.error("Failed to load alert settings:", e);
    } finally {
      setLoading(false);
    }
  }

  function updateThreshold(id: string, updates: Partial<AlertThreshold>) {
    setThresholds((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch("/api/v1/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: { alertThresholds: thresholds } }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to save alert thresholds");
      }
    } catch {
      setError("Failed to save alert thresholds");
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setThresholds(DEFAULT_THRESHOLDS);
    setSaved(false);
  }

  const categories = ["security", "performance", "compliance", "availability"] as const;

  if (!authorized) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Alert Thresholds</h1>
          <p className="text-muted-foreground">
            Customize alert thresholds and workflows to proactively identify issues before they escalate
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-1" /> Reset Defaults
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-1" /> {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" /> {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center h-32">
          <Clock className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-primary" />
              <div>
                <div className="text-2xl font-bold">{thresholds.filter((t) => t.enabled).length}</div>
                <div className="text-xs text-muted-foreground">Active Alerts</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{thresholds.filter((t) => t.enabled && t.notifyEmail).length}</div>
                <div className="text-xs text-muted-foreground">Email Notifications</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Zap className="h-5 w-5 text-yellow-500" />
              <div>
                <div className="text-2xl font-bold">{thresholds.filter((t) => t.enabled && t.autoRemediate).length}</div>
                <div className="text-xs text-muted-foreground">Auto-Remediation</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <div>
                <div className="text-2xl font-bold">{thresholds.filter((t) => t.enabled && (t.severity === "CRITICAL" || t.severity === "HIGH")).length}</div>
                <div className="text-xs text-muted-foreground">Critical/High Rules</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alert Rules by Category */}
      {categories.map((category) => {
        const categoryThresholds = thresholds.filter((t) => t.category === category);
        return (
          <Card key={category}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg capitalize">
                {categoryIcon(category)} {category} Alerts
              </CardTitle>
              <CardDescription>
                {category === "security" && "Detect unauthorized access, data exfiltration, and suspicious behavior"}
                {category === "performance" && "Monitor device health, crashes, and resource utilization"}
                {category === "compliance" && "Track update compliance, uptime policies, and configuration standards"}
                {category === "availability" && "Ensure agent connectivity and device accessibility"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {categoryThresholds.map((rule) => (
                  <div
                    key={rule.id}
                    className={`rounded-lg border p-4 transition-colors ${rule.enabled ? "" : "opacity-50"}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-sm">{rule.name}</h4>
                          <Badge variant={severityColor(rule.severity)}>{rule.severity}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{rule.description}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={rule.enabled}
                          onChange={(e) => updateThreshold(rule.id, { enabled: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 dark:after:border-gray-600 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary" />
                      </label>
                    </div>

                    {rule.enabled && (
                      <div className="mt-3 flex flex-wrap items-end gap-4">
                        <div>
                          <Label className="text-xs">Threshold</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <Input
                              type="number"
                              value={rule.threshold}
                              onChange={(e) => updateThreshold(rule.id, { threshold: Number(e.target.value) })}
                              className="w-20 h-8 text-sm"
                            />
                            <span className="text-xs text-muted-foreground">{rule.unit}</span>
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs">Severity</Label>
                          <select
                            value={rule.severity}
                            onChange={(e) => updateThreshold(rule.id, { severity: e.target.value as AlertThreshold["severity"] })}
                            className="block mt-1 rounded-md border px-2 py-1.5 text-sm bg-background h-8"
                          >
                            <option value="LOW">Low</option>
                            <option value="MEDIUM">Medium</option>
                            <option value="HIGH">High</option>
                            <option value="CRITICAL">Critical</option>
                          </select>
                        </div>
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                            <input
                              type="checkbox"
                              checked={rule.notifyEmail}
                              onChange={(e) => updateThreshold(rule.id, { notifyEmail: e.target.checked })}
                              className="rounded border-gray-300 dark:border-gray-600"
                            />
                            <Mail className="h-3 w-3" /> Email
                          </label>
                          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                            <input
                              type="checkbox"
                              checked={rule.notifyDashboard}
                              onChange={(e) => updateThreshold(rule.id, { notifyDashboard: e.target.checked })}
                              className="rounded border-gray-300 dark:border-gray-600"
                            />
                            <Bell className="h-3 w-3" /> Dashboard
                          </label>
                          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                            <input
                              type="checkbox"
                              checked={rule.autoRemediate}
                              onChange={(e) => updateThreshold(rule.id, { autoRemediate: e.target.checked })}
                              className="rounded border-gray-300 dark:border-gray-600"
                            />
                            <Zap className="h-3 w-3" /> Auto-fix
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
