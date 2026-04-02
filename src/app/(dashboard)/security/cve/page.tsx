"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, X, Search, Bug, Download, Send, Monitor, RefreshCw, CheckCircle } from "lucide-react";
import Link from "next/link";

type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
type CveStatus =
  | "OPEN"
  | "PATCHED"
  | "MITIGATED"
  | "ACCEPTED"
  | "FALSE_POSITIVE";

type CommandType =
  | "UPDATE_SOFTWARE"
  | "UNINSTALL_SOFTWARE"
  | "RUN_SCRIPT"
  | "RESTART_SERVICE"
  | "CUSTOM";

type CveApplicability = "CONFIRMED" | "POTENTIAL" | "NOT_APPLICABLE" | "UNASSESSED";

interface CveEntry {
  id: string;
  cveId: string;
  severity: Severity;
  cvssScore: number;
  description: string | null;
  affectedSoftware: string;
  affectedVersions: string;
  fixedVersion: string | null;
  remediation: string | null;
  status: CveStatus;
  applicability: CveApplicability;
  detectedAt: string;
  createdAt: string;
}

interface AgentDevice {
  id: string;
  hostname: string;
  platform: string;
  status: string;
}

interface ScanResult {
  id: string;
  hostname: string;
  softwareName: string;
  installedVersion: string;
  cveEntryId: string | null;
  scannedAt: string;
  cveEntry?: {
    cveId: string;
    severity: Severity;
  } | null;
}

const ALL_STATUSES: CveStatus[] = [
  "OPEN",
  "PATCHED",
  "MITIGATED",
  "ACCEPTED",
  "FALSE_POSITIVE",
];

const ALL_COMMAND_TYPES: CommandType[] = [
  "UPDATE_SOFTWARE",
  "UNINSTALL_SOFTWARE",
  "RUN_SCRIPT",
  "RESTART_SERVICE",
  "CUSTOM",
];

function severityBadgeVariant(severity: Severity) {
  switch (severity) {
    case "CRITICAL":
      return "destructive" as const;
    case "HIGH":
      return "warning" as const;
    case "MEDIUM":
      return "default" as const;
    case "LOW":
      return "secondary" as const;
  }
}

function statusBadgeVariant(status: CveStatus) {
  switch (status) {
    case "OPEN":
      return "destructive" as const;
    case "PATCHED":
      return "success" as const;
    case "MITIGATED":
      return "warning" as const;
    case "ACCEPTED":
      return "secondary" as const;
    case "FALSE_POSITIVE":
      return "outline" as const;
  }
}

function statusLabel(status: CveStatus) {
  return status.replace(/_/g, " ");
}

function cvssColor(score: number) {
  if (score >= 9.0) return "text-red-600 font-bold";
  if (score >= 7.0) return "text-orange-600 font-semibold";
  if (score >= 4.0) return "text-yellow-600 font-medium";
  return "text-blue-600";
}

function statusCountColor(status: CveStatus) {
  switch (status) {
    case "OPEN":
      return "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-700";
    case "PATCHED":
      return "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-700";
    case "MITIGATED":
      return "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-700";
    case "ACCEPTED":
      return "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-700";
    case "FALSE_POSITIVE":
      return "text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700";
  }
}

function suggestFixCommand(entry: CveEntry): string {
  const sw = entry.affectedSoftware.toLowerCase();
  if (sw.includes("edge")) return "winget upgrade --id Microsoft.Edge";
  if (sw.includes("chrome")) return "winget upgrade --id Google.Chrome";
  if (sw.includes("firefox")) return "winget upgrade --id Mozilla.Firefox";
  if (sw.includes("vscode") || sw.includes("visual studio code"))
    return "winget upgrade --id Microsoft.VisualStudioCode";
  if (sw.includes("node")) return "winget upgrade --id OpenJS.NodeJS.LTS";
  if (sw.includes("python")) return "winget upgrade --id Python.Python.3.12";
  if (sw.includes("7-zip") || sw.includes("7zip"))
    return "winget upgrade --id 7zip.7zip";
  if (entry.fixedVersion)
    return `winget upgrade --id ${entry.affectedSoftware} --version ${entry.fixedVersion}`;
  return `winget upgrade --id ${entry.affectedSoftware}`;
}

function applicabilityLabel(a: CveApplicability): string {
  switch (a) {
    case "CONFIRMED": return "Applies to your devices";
    case "POTENTIAL": return "May apply";
    case "NOT_APPLICABLE": return "Does not apply";
    case "UNASSESSED": return "Not assessed";
  }
}

function applicabilityBadgeClass(a: CveApplicability): string {
  switch (a) {
    case "CONFIRMED": return "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 border-red-300 dark:border-red-600";
    case "POTENTIAL": return "bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-600";
    case "NOT_APPLICABLE": return "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-300 dark:border-gray-600";
    case "UNASSESSED": return "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-600";
  }
}

const CVE_PATTERN = /^CVE-\d{4}-\d{4,}$/;

export default function CvePage() {
  const [entries, setEntries] = useState<CveEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search and filter
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<CveStatus | null>(null);
  const [applicabilityFilter, setApplicabilityFilter] = useState<CveApplicability | "ALL">("ALL");

  // Add form state
  const [showForm, setShowForm] = useState(false);
  const [formCveId, setFormCveId] = useState("");
  const [formSeverity, setFormSeverity] = useState<Severity>("MEDIUM");
  const [formCvss, setFormCvss] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formSoftware, setFormSoftware] = useState("");
  const [formVersions, setFormVersions] = useState("");
  const [formFixedVersion, setFormFixedVersion] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Import form state
  const [showImport, setShowImport] = useState(false);
  const [importKeyword, setImportKeyword] = useState("");
  const [importMaxResults, setImportMaxResults] = useState(20);
  const [importMinYear, setImportMinYear] = useState(new Date().getFullYear());
  const [importing, setImporting] = useState(false);
  const [importOsFilters, setImportOsFilters] = useState<Set<string>>(
    new Set(["windows11"])
  );
  const [importResult, setImportResult] = useState<{
    totalFromNvd: number;
    imported: number;
    skipped: number;
    filteredOut: number;
  } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  // Bulk update state
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [bulkResult, setBulkResult] = useState<{
    totalFromNvd: number;
    imported: number;
    skipped: number;
    filteredOut: number;
    categoryResults: Array<{
      category: string;
      found: number;
      imported: number;
      error?: string;
    }>;
    applicability?: {
      confirmed: number;
      potential: number;
      notApplicable: number;
    };
  } | null>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);

  // Send Fix Command state (tracked per CVE entry id)
  const [fixFormOpen, setFixFormOpen] = useState<string | null>(null);
  const [devices, setDevices] = useState<AgentDevice[]>([]);
  const [devicesLoading, setDevicesLoading] = useState(false);
  const [fixTargetDevice, setFixTargetDevice] = useState("ALL");
  const [fixCommandType, setFixCommandType] = useState<CommandType>("UPDATE_SOFTWARE");
  const [fixCommandText, setFixCommandText] = useState("");
  const [fixDescription, setFixDescription] = useState("");
  const [fixSending, setFixSending] = useState(false);
  const [fixError, setFixError] = useState<string | null>(null);
  const [fixSuccess, setFixSuccess] = useState<string | null>(null);

  // Selection for bulk delete
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Device scan results
  const [activeTab, setActiveTab] = useState<"cves" | "devices">("cves");
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  const fetchEntries = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/security/cve");
      if (!res.ok) throw new Error("Failed to fetch CVE entries");
      const data = await res.json();
      setEntries(data.entries ?? data.cves ?? data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDevices = useCallback(async () => {
    try {
      setDevicesLoading(true);
      const res = await fetch("/api/v1/agents/devices");
      if (!res.ok) throw new Error("Failed to fetch devices");
      const data = await res.json();
      setDevices(data.devices ?? data);
    } catch {
      setDevices([]);
    } finally {
      setDevicesLoading(false);
    }
  }, []);

  const fetchScanResults = useCallback(async () => {
    try {
      setScanLoading(true);
      setScanError(null);
      const res = await fetch("/api/v1/security/cve/scan/results");
      if (!res.ok) throw new Error("Failed to fetch scan results");
      const data = await res.json();
      setScanResults(data.results ?? data);
    } catch (err) {
      setScanError(err instanceof Error ? err.message : "Failed to load scan results");
    } finally {
      setScanLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  useEffect(() => {
    if (activeTab === "devices") {
      fetchScanResults();
    }
  }, [activeTab, fetchScanResults]);

  // Status counts
  const statusCounts: Record<CveStatus, number> = {
    OPEN: 0,
    PATCHED: 0,
    MITIGATED: 0,
    ACCEPTED: 0,
    FALSE_POSITIVE: 0,
  };
  for (const entry of entries) {
    if (statusCounts[entry.status] !== undefined) {
      statusCounts[entry.status]++;
    }
  }

  function resetForm() {
    setShowForm(false);
    setFormCveId("");
    setFormSeverity("MEDIUM");
    setFormCvss("");
    setFormDescription("");
    setFormSoftware("");
    setFormVersions("");
    setFormFixedVersion("");
    setFormError(null);
  }

  function openFixForm(entry: CveEntry) {
    setFixFormOpen(entry.id);
    setFixTargetDevice("ALL");
    setFixCommandType("UPDATE_SOFTWARE");
    setFixCommandText(suggestFixCommand(entry));
    setFixDescription(`Fix ${entry.cveId} in ${entry.affectedSoftware}`);
    setFixError(null);
    setFixSuccess(null);
    fetchDevices();
  }

  function closeFixForm() {
    setFixFormOpen(null);
    setFixError(null);
    setFixSuccess(null);
  }

  async function handleSendCommand(cveEntryId: string) {
    setFixSending(true);
    setFixError(null);
    setFixSuccess(null);

    try {
      if (fixTargetDevice === "ALL") {
        // Send to all devices
        const targetDevices = devices.length > 0 ? devices : [];
        if (targetDevices.length === 0) {
          throw new Error("No devices available to send commands to");
        }
        const results = await Promise.allSettled(
          targetDevices.map((device) =>
            fetch("/api/v1/agents/commands", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                deviceId: device.id,
                cveEntryId,
                commandType: fixCommandType,
                command: fixCommandText.trim(),
                description: fixDescription.trim() || undefined,
              }),
            })
          )
        );
        const succeeded = results.filter((r) => r.status === "fulfilled").length;
        setFixSuccess(`Command sent to ${succeeded}/${targetDevices.length} devices`);
      } else {
        const res = await fetch("/api/v1/agents/commands", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            deviceId: fixTargetDevice,
            cveEntryId,
            commandType: fixCommandType,
            command: fixCommandText.trim(),
            description: fixDescription.trim() || undefined,
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to send command");
        }
        setFixSuccess("Command sent successfully");
      }
    } catch (err) {
      setFixError(err instanceof Error ? err.message : "Failed to send command");
    } finally {
      setFixSending(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const trimmedCveId = formCveId.trim().toUpperCase();
    if (!CVE_PATTERN.test(trimmedCveId)) {
      setFormError("CVE ID must match pattern CVE-YYYY-NNNNN (e.g., CVE-2024-12345)");
      return;
    }

    const cvssNum = parseFloat(formCvss);
    if (isNaN(cvssNum) || cvssNum < 0 || cvssNum > 10) {
      setFormError("CVSS score must be a number between 0 and 10");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/v1/security/cve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cveId: trimmedCveId,
          severity: formSeverity,
          cvssScore: cvssNum,
          description: formDescription.trim() || undefined,
          affectedSoftware: formSoftware.trim(),
          affectedVersions: formVersions.trim(),
          fixedVersion: formFixedVersion.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create CVE entry");
      }

      resetForm();
      fetchEntries();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this CVE entry?")) return;

    try {
      const res = await fetch(`/api/v1/security/cve?id=${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete CVE entry");
      }

      fetchEntries();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }

  async function handleStatusUpdate(id: string, newStatus: CveStatus) {
    try {
      const res = await fetch("/api/v1/security/cve", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update CVE status");
      }

      fetchEntries();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    setImporting(true);
    setImportError(null);
    setImportResult(null);

    try {
      const res = await fetch("/api/v1/security/cve/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: importKeyword.trim(),
          maxResults: importMaxResults,
          osFilters: Array.from(importOsFilters),
          minYear: importMinYear,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");

      setImportResult(data);
      fetchEntries();
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }

  async function handleBulkUpdate() {
    setBulkUpdating(true);
    setBulkError(null);
    setBulkResult(null);

    try {
      const res = await fetch("/api/v1/security/cve/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bulkUpdate: true,
          maxResults: 20,
          minYear: new Date().getFullYear(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Bulk update failed");

      setBulkResult(data);
      fetchEntries();
    } catch (err) {
      setBulkError(err instanceof Error ? err.message : "Bulk update failed");
    } finally {
      setBulkUpdating(false);
    }
  }

  // Filter entries
  const filtered = entries.filter((entry) => {
    if (statusFilter && entry.status !== statusFilter) return false;
    if (applicabilityFilter !== "ALL" && entry.applicability !== applicabilityFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        entry.cveId.toLowerCase().includes(q) ||
        entry.affectedSoftware.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Applicability counts
  const applicabilityCounts = {
    CONFIRMED: entries.filter((e) => e.applicability === "CONFIRMED" && e.status === "OPEN").length,
    POTENTIAL: entries.filter((e) => e.applicability === "POTENTIAL" && e.status === "OPEN").length,
    NOT_APPLICABLE: entries.filter((e) => e.applicability === "NOT_APPLICABLE" && e.status === "OPEN").length,
    UNASSESSED: entries.filter((e) => e.applicability === "UNASSESSED" && e.status === "OPEN").length,
  };

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((e) => e.id)));
    }
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    if (!confirm(`Delete ${count} selected CVE${count > 1 ? "s" : ""}?`)) return;

    try {
      const ids = Array.from(selectedIds).join(",");
      const res = await fetch(`/api/v1/security/cve?ids=${ids}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      setSelectedIds(new Set());
      fetchEntries();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }

  async function handleDeleteAll() {
    if (!confirm(`Delete ALL ${entries.length} CVE entries? This cannot be undone.`)) return;

    try {
      const res = await fetch("/api/v1/security/cve?all=true", {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete all");
      setSelectedIds(new Set());
      fetchEntries();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }

  // Group scan results by hostname
  const scanResultsByHostname: Record<string, ScanResult[]> = {};
  for (const result of scanResults) {
    if (!scanResultsByHostname[result.hostname]) {
      scanResultsByHostname[result.hostname] = [];
    }
    scanResultsByHostname[result.hostname].push(result);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-muted-foreground">Loading CVE entries...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">CVE Scanner</h1>
          <p className="text-muted-foreground">
            {applicabilityCounts.CONFIRMED > 0 ? (
              <span className="text-red-600 font-medium">{applicabilityCounts.CONFIRMED} confirmed</span>
            ) : (
              <span className="text-green-600 font-medium">No confirmed</span>
            )}
            {" "}vulnerabilities on your devices
            {applicabilityCounts.POTENTIAL > 0 && (
              <span className="text-yellow-600"> &middot; {applicabilityCounts.POTENTIAL} potential</span>
            )}
            {" "}&middot; {entries.length} total tracked
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/security"
            className="text-sm text-muted-foreground hover:underline"
          >
            Back to Security
          </Link>
          <Button
            onClick={handleBulkUpdate}
            disabled={bulkUpdating}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${bulkUpdating ? "animate-spin" : ""}`} />
            {bulkUpdating ? "Updating..." : "Update CVEs"}
          </Button>
          {!showImport && (
            <Button variant="outline" onClick={() => setShowImport(true)}>
              <Download className="h-4 w-4 mr-2" />
              Manual Import
            </Button>
          )}
          {!showForm && (
            <Button variant="outline" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add CVE
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Bulk Update Result */}
      {bulkError && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
          {bulkError}
          <button
            onClick={() => setBulkError(null)}
            className="ml-2 underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {bulkUpdating && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="py-6">
            <div className="flex items-center gap-3">
              <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />
              <div>
                <p className="font-medium text-blue-800">Scanning NVD for vulnerabilities...</p>
                <p className="text-sm text-blue-600 mt-1">
                  Checking Windows 11, Chrome, Firefox, Edge, Office, Node.js, Python, Docker, macOS, Linux, and installed software from your devices. This may take 1-2 minutes due to NVD rate limits.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {bulkResult && (
        <Card className="border-green-200 dark:border-green-700 bg-green-50/50 dark:bg-green-950/20">
          <CardContent className="py-6">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-green-800 dark:text-green-200">
                  CVE Update Complete
                </p>
                <div className="mt-2 grid gap-1 text-sm text-green-700 dark:text-green-300">
                  <p>Found {bulkResult.totalFromNvd} CVEs across all categories</p>
                  <p>Imported {bulkResult.imported} new CVEs</p>
                  <p>Skipped {bulkResult.skipped} (already in database)</p>
                  {bulkResult.filteredOut > 0 && (
                    <p>Filtered out {bulkResult.filteredOut} (wrong OS / old Windows)</p>
                  )}
                </div>
                {bulkResult.applicability && (
                  <div className="mt-3 flex flex-wrap gap-3 text-sm">
                    <span className="px-2 py-1 rounded bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 font-medium">
                      {bulkResult.applicability.confirmed} confirmed on your devices
                    </span>
                    <span className="px-2 py-1 rounded bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 font-medium">
                      {bulkResult.applicability.potential} may apply
                    </span>
                    <span className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-medium">
                      {bulkResult.applicability.notApplicable} not applicable
                    </span>
                  </div>
                )}

                {bulkResult.categoryResults.length > 0 && (
                  <details className="mt-3">
                    <summary className="text-sm font-medium text-green-800 dark:text-green-200 cursor-pointer hover:underline">
                      Category breakdown ({bulkResult.categoryResults.length} categories scanned)
                    </summary>
                    <div className="mt-2 grid gap-1">
                      {bulkResult.categoryResults.map((cat) => (
                        <div
                          key={cat.category}
                          className="flex items-center justify-between text-sm px-2 py-1 rounded bg-white/60 dark:bg-gray-900/60"
                        >
                          <span className="font-medium">{cat.category}</span>
                          <span className="text-muted-foreground">
                            {cat.error ? (
                              <span className="text-destructive">{cat.error}</span>
                            ) : (
                              <>
                                {cat.found} found, {cat.imported} imported
                              </>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
                <button
                  onClick={() => setBulkResult(null)}
                  className="mt-3 text-sm text-green-700 dark:text-green-300 underline hover:no-underline"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* NVD Import */}
      {showImport && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Import CVEs from NIST NVD
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowImport(false);
                  setImportResult(null);
                  setImportError(null);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Search the National Vulnerability Database (NVD) and import CVEs
              into your database. Try keywords like &quot;Windows 11&quot;,
              &quot;Microsoft Office&quot;, &quot;Chrome&quot;, &quot;Apache&quot;, etc.
            </p>
            <form onSubmit={handleImport} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-4">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="import-keyword">Search Keyword</Label>
                  <Input
                    id="import-keyword"
                    value={importKeyword}
                    onChange={(e) => setImportKeyword(e.target.value)}
                    placeholder="e.g., Windows 11, Microsoft Edge, OpenSSL"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="import-min-year">Min CVE Year</Label>
                  <Input
                    id="import-min-year"
                    type="number"
                    min={2000}
                    max={2030}
                    value={importMinYear}
                    onChange={(e) =>
                      setImportMinYear(parseInt(e.target.value) || 2025)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="import-max">Max Results</Label>
                  <Input
                    id="import-max"
                    type="number"
                    min={1}
                    max={100}
                    value={importMaxResults}
                    onChange={(e) =>
                      setImportMaxResults(parseInt(e.target.value) || 20)
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Target Operating Systems</Label>
                <p className="text-xs text-muted-foreground">
                  Only import CVEs for selected platforms. Windows 10 and older are always blocked.
                </p>
                <div className="flex flex-wrap gap-4 mt-1">
                  {[
                    { key: "windows11", label: "Windows 11" },
                    { key: "windowsServer2022", label: "Windows Server 2022/2025" },
                    { key: "macOS", label: "macOS" },
                    { key: "linux", label: "Linux" },
                  ].map((os) => (
                    <label
                      key={os.key}
                      className="flex items-center gap-2 text-sm cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={importOsFilters.has(os.key)}
                        onChange={() => {
                          setImportOsFilters((prev) => {
                            const next = new Set(prev);
                            if (next.has(os.key)) next.delete(os.key);
                            else next.add(os.key);
                            return next;
                          });
                        }}
                        className="rounded border-gray-300 dark:border-gray-600"
                      />
                      {os.label}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button type="submit" disabled={importing}>
                  {importing ? "Importing..." : "Search & Import"}
                </Button>
                {importing && (
                  <span className="text-sm text-muted-foreground">
                    Querying NVD API (may take a few seconds)...
                  </span>
                )}
              </div>
            </form>

            {importError && (
              <div className="mt-4 rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                {importError}
              </div>
            )}

            {importResult && (
              <div className="mt-4 rounded-md bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-700 p-4 text-sm">
                <p className="font-medium text-green-800 dark:text-green-200">Import Complete</p>
                <ul className="mt-2 space-y-1 text-green-700 dark:text-green-300">
                  <li>Found {importResult.totalFromNvd} CVEs from NVD</li>
                  <li>Imported {importResult.imported} new CVEs</li>
                  <li>Skipped {importResult.skipped} (already in database)</li>
                  {importResult.filteredOut > 0 && (
                    <li>Filtered out {importResult.filteredOut} (wrong OS / old Windows)</li>
                  )}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Applicability Summary */}
      {entries.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {([
            { key: "CONFIRMED" as CveApplicability, label: "Confirmed", desc: "Matches installed software", color: "border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-950", textColor: "text-red-700 dark:text-red-300", countColor: "text-red-600 dark:text-red-400" },
            { key: "POTENTIAL" as CveApplicability, label: "Potential", desc: "May affect your environment", color: "border-yellow-300 dark:border-yellow-600 bg-yellow-50 dark:bg-yellow-950", textColor: "text-yellow-700 dark:text-yellow-300", countColor: "text-yellow-600 dark:text-yellow-400" },
            { key: "NOT_APPLICABLE" as CveApplicability, label: "Not Applicable", desc: "No matching devices", color: "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900", textColor: "text-gray-500 dark:text-gray-400", countColor: "text-gray-500 dark:text-gray-400" },
            { key: "UNASSESSED" as CveApplicability, label: "Unassessed", desc: "Not yet checked", color: "border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-950", textColor: "text-blue-600 dark:text-blue-400", countColor: "text-blue-600 dark:text-blue-400" },
          ]).map((item) => (
            <button
              key={item.key}
              onClick={() => setApplicabilityFilter(applicabilityFilter === item.key ? "ALL" : item.key)}
              className={`rounded-lg border p-3 text-left transition-all hover:shadow-md ${item.color} ${
                applicabilityFilter === item.key ? "ring-2 ring-primary shadow-md" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-sm font-medium ${item.textColor}`}>{item.label}</span>
                <span className={`text-xl font-bold ${item.countColor}`}>{applicabilityCounts[item.key]}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
            </button>
          ))}
        </div>
      )}

      {applicabilityFilter !== "ALL" && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Showing:</span>
          <Badge variant="outline" className={applicabilityBadgeClass(applicabilityFilter)}>
            {applicabilityLabel(applicabilityFilter)}
          </Badge>
          <button
            onClick={() => setApplicabilityFilter("ALL")}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Status Count Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {ALL_STATUSES.map((status) => (
          <Card
            key={status}
            className={`border cursor-pointer transition-shadow hover:shadow-md ${statusCountColor(status)} ${
              statusFilter === status ? "ring-2 ring-primary" : ""
            }`}
            onClick={() =>
              setStatusFilter(statusFilter === status ? null : status)
            }
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {statusLabel(status)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statusCounts[status]}</div>
              <p className="text-xs opacity-70">vulnerabilities</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add CVE Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Add CVE Entry</span>
              <Button variant="ghost" size="sm" onClick={resetForm}>
                <X className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="cve-id">CVE ID</Label>
                  <Input
                    id="cve-id"
                    value={formCveId}
                    onChange={(e) => setFormCveId(e.target.value)}
                    placeholder="CVE-2024-12345"
                    required
                    className="font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cve-severity">Severity</Label>
                  <select
                    id="cve-severity"
                    value={formSeverity}
                    onChange={(e) =>
                      setFormSeverity(e.target.value as Severity)
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="CRITICAL">Critical</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cve-cvss">CVSS Score (0-10)</Label>
                  <Input
                    id="cve-cvss"
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={formCvss}
                    onChange={(e) => setFormCvss(e.target.value)}
                    placeholder="7.5"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cve-description">Description</Label>
                <Input
                  id="cve-description"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Description of the vulnerability"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="cve-software">Affected Software</Label>
                  <Input
                    id="cve-software"
                    value={formSoftware}
                    onChange={(e) => setFormSoftware(e.target.value)}
                    placeholder="e.g., OpenSSL"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cve-versions">Affected Versions</Label>
                  <Input
                    id="cve-versions"
                    value={formVersions}
                    onChange={(e) => setFormVersions(e.target.value)}
                    placeholder="e.g., < 3.0.7"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cve-fixed">Fixed Version</Label>
                  <Input
                    id="cve-fixed"
                    value={formFixedVersion}
                    onChange={(e) => setFormFixedVersion(e.target.value)}
                    placeholder="e.g., 3.0.7"
                  />
                </div>
              </div>

              {formError && (
                <p className="text-sm text-destructive">{formError}</p>
              )}

              <div className="flex gap-2">
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Adding..." : "Add CVE"}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setStatusFilter(null)}
          className={`inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            !statusFilter
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          All
        </button>
        {ALL_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(statusFilter === s ? null : s)}
            className={`inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              statusFilter === s
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {statusLabel(s)}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by CVE ID or software name..."
          className="pl-10"
        />
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-1 border-b">
        <button
          onClick={() => setActiveTab("cves")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "cves"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Bug className="h-4 w-4 inline mr-2" />
          CVE Entries ({filtered.length})
        </button>
        <button
          onClick={() => setActiveTab("devices")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "devices"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Monitor className="h-4 w-4 inline mr-2" />
          Device Scan Results
        </button>
      </div>

      {/* CVE Table */}
      {activeTab === "cves" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-lg">
                <Bug className="h-5 w-5" />
                CVE Entries
                <span className="text-sm font-normal text-muted-foreground">
                  ({filtered.length})
                </span>
              </span>
              <span className="flex items-center gap-2">
                {selectedIds.size > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleBulkDelete}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    Delete {selectedIds.size} selected
                  </Button>
                )}
                {entries.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDeleteAll}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    Delete All
                  </Button>
                )}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                {entries.length === 0
                  ? "No CVE entries found. Add one to get started."
                  : "No entries match your search or filter criteria."}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-3 pr-2 w-8">
                        <input
                          type="checkbox"
                          checked={selectedIds.size === filtered.length && filtered.length > 0}
                          onChange={toggleSelectAll}
                          className="h-4 w-4 rounded border-input"
                        />
                      </th>
                      <th className="pb-3 pr-4 font-medium text-muted-foreground">
                        CVE ID
                      </th>
                      <th className="pb-3 pr-4 font-medium text-muted-foreground">
                        Severity
                      </th>
                      <th className="pb-3 pr-4 font-medium text-muted-foreground">
                        CVSS
                      </th>
                      <th className="pb-3 pr-4 font-medium text-muted-foreground">
                        Affected Software
                      </th>
                      <th className="pb-3 pr-4 font-medium text-muted-foreground">
                        Versions
                      </th>
                      <th className="pb-3 pr-4 font-medium text-muted-foreground">
                        Applies?
                      </th>
                      <th className="pb-3 pr-4 font-medium text-muted-foreground">
                        Status
                      </th>
                      <th className="pb-3 pr-4 font-medium text-muted-foreground">
                        Detected
                      </th>
                      <th className="pb-3 font-medium text-muted-foreground">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((entry) => (
                      <tr key={entry.id} className="group">
                        <td className="py-3 pr-2 w-8 align-top pt-4">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(entry.id)}
                            onChange={() => toggleSelect(entry.id)}
                            className="h-4 w-4 rounded border-input"
                          />
                        </td>
                        <td className="py-3 pr-4" colSpan={9}>
                          <details className="cursor-pointer">
                            <summary className="list-none">
                              <div className="grid grid-cols-9 gap-4 items-center">
                                <div className="font-mono font-medium">
                                  {entry.cveId}
                                </div>
                                <div>
                                  <Badge variant={severityBadgeVariant(entry.severity)}>
                                    {entry.severity}
                                  </Badge>
                                </div>
                                <div className={cvssColor(entry.cvssScore)}>
                                  {entry.cvssScore.toFixed(1)}
                                </div>
                                <div>{entry.affectedSoftware}</div>
                                <div className="text-muted-foreground">
                                  {entry.affectedVersions}
                                </div>
                                <div>
                                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${applicabilityBadgeClass(entry.applicability)}`}>
                                    {entry.applicability === "CONFIRMED" ? "Yes" :
                                     entry.applicability === "POTENTIAL" ? "Maybe" :
                                     entry.applicability === "NOT_APPLICABLE" ? "No" : "?"}
                                  </span>
                                </div>
                                <div>
                                  <select
                                    value={entry.status}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      handleStatusUpdate(
                                        entry.id,
                                        e.target.value as CveStatus
                                      );
                                    }}
                                    className="rounded-md border border-input bg-background px-2 py-1 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                  >
                                    {ALL_STATUSES.map((s) => (
                                      <option key={s} value={s}>
                                        {statusLabel(s)}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div className="text-muted-foreground">
                                  {new Date(entry.detectedAt).toLocaleDateString()}
                                </div>
                                <div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDelete(entry.id);
                                    }}
                                  >
                                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                  </Button>
                                </div>
                              </div>
                            </summary>

                            {/* Expanded details */}
                            <div className="mt-3 ml-4 p-4 rounded-md bg-muted/50 border space-y-3">
                              {entry.description && (
                                <div className="text-sm">
                                  <span className="font-medium">Description:</span>{" "}
                                  {entry.description}
                                </div>
                              )}

                              <div className="grid gap-3 sm:grid-cols-3 text-sm">
                                <div>
                                  <span className="font-medium">Affected Software:</span>{" "}
                                  {entry.affectedSoftware}
                                </div>
                                <div>
                                  <span className="font-medium">Affected Versions:</span>{" "}
                                  {entry.affectedVersions}
                                </div>
                                <div>
                                  <span className="font-medium">Fixed Version:</span>{" "}
                                  {entry.fixedVersion ? (
                                    <span className="text-green-600">{entry.fixedVersion}</span>
                                  ) : (
                                    <span className="text-muted-foreground">Unknown</span>
                                  )}
                                </div>
                              </div>

                              {entry.remediation && (
                                <div className="text-sm">
                                  <span className="font-medium">Remediation Instructions:</span>{" "}
                                  <span className="text-muted-foreground">{entry.remediation}</span>
                                </div>
                              )}

                              {/* Send Fix Command button / inline form */}
                              {fixFormOpen !== entry.id ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openFixForm(entry);
                                  }}
                                >
                                  <Send className="h-3.5 w-3.5 mr-2" />
                                  Send Fix Command
                                </Button>
                              ) : (
                                <div
                                  className="p-4 rounded-md border bg-background space-y-4"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-semibold">Send Fix Command</h4>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={closeFixForm}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>

                                  <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                      <Label>Target Device</Label>
                                      <select
                                        value={fixTargetDevice}
                                        onChange={(e) => setFixTargetDevice(e.target.value)}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                      >
                                        <option value="ALL">All Devices</option>
                                        {devicesLoading && (
                                          <option disabled>Loading devices...</option>
                                        )}
                                        {devices.map((d) => (
                                          <option key={d.id} value={d.id}>
                                            {d.hostname} ({d.platform}){" "}
                                            {d.status === "OFFLINE" ? "- Offline" : ""}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Command Type</Label>
                                      <select
                                        value={fixCommandType}
                                        onChange={(e) =>
                                          setFixCommandType(e.target.value as CommandType)
                                        }
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                      >
                                        {ALL_COMMAND_TYPES.map((ct) => (
                                          <option key={ct} value={ct}>
                                            {ct.replace(/_/g, " ")}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  </div>

                                  <div className="space-y-2">
                                    <Label>Command</Label>
                                    <Input
                                      value={fixCommandText}
                                      onChange={(e) => setFixCommandText(e.target.value)}
                                      placeholder="e.g., winget upgrade --id Microsoft.Edge"
                                      className="font-mono text-sm"
                                    />
                                  </div>

                                  <div className="space-y-2">
                                    <Label>Description</Label>
                                    <Input
                                      value={fixDescription}
                                      onChange={(e) => setFixDescription(e.target.value)}
                                      placeholder="Describe this remediation action"
                                    />
                                  </div>

                                  {fixError && (
                                    <p className="text-sm text-destructive">{fixError}</p>
                                  )}
                                  {fixSuccess && (
                                    <p className="text-sm text-green-600">{fixSuccess}</p>
                                  )}

                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      disabled={fixSending || !fixCommandText.trim()}
                                      onClick={() => handleSendCommand(entry.id)}
                                    >
                                      <Send className="h-3.5 w-3.5 mr-2" />
                                      {fixSending ? "Sending..." : "Send Command"}
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={closeFixForm}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </details>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Device Scan Results Tab */}
      {activeTab === "devices" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Monitor className="h-5 w-5" />
              Device Scan Results
              <span className="text-sm font-normal text-muted-foreground">
                ({scanResults.length} entries)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {scanLoading ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Loading scan results...
              </p>
            ) : scanError ? (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
                {scanError}
                <button
                  onClick={() => {
                    setScanError(null);
                    fetchScanResults();
                  }}
                  className="ml-2 underline hover:no-underline"
                >
                  Retry
                </button>
              </div>
            ) : scanResults.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No scan results yet. Deploy the MyDex agent to employee devices to start scanning.
              </p>
            ) : (
              <div className="space-y-6">
                {Object.entries(scanResultsByHostname).map(([hostname, results]) => (
                  <div key={hostname}>
                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <Monitor className="h-4 w-4" />
                      {hostname}
                      <Badge variant="secondary">{results.length} entries</Badge>
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left">
                            <th className="pb-2 pr-4 font-medium text-muted-foreground">
                              Software
                            </th>
                            <th className="pb-2 pr-4 font-medium text-muted-foreground">
                              Installed Version
                            </th>
                            <th className="pb-2 pr-4 font-medium text-muted-foreground">
                              CVE Match
                            </th>
                            <th className="pb-2 font-medium text-muted-foreground">
                              Scanned At
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {results.map((result) => (
                            <tr
                              key={result.id}
                              className={`border-b last:border-0 ${
                                result.cveEntry
                                  ? "bg-red-50/50"
                                  : "hover:bg-muted/50"
                              }`}
                            >
                              <td className="py-2 pr-4">{result.softwareName}</td>
                              <td className="py-2 pr-4 font-mono text-xs">
                                {result.installedVersion}
                              </td>
                              <td className="py-2 pr-4">
                                {result.cveEntry ? (
                                  <span className="flex items-center gap-2">
                                    <Badge
                                      variant={severityBadgeVariant(
                                        result.cveEntry.severity
                                      )}
                                    >
                                      {result.cveEntry.cveId}
                                    </Badge>
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">None</span>
                                )}
                              </td>
                              <td className="py-2 text-muted-foreground">
                                {new Date(result.scannedAt).toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
