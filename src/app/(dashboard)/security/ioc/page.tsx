"use client";

import { useRequireRole } from "@/hooks/use-require-role";
import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, X, Search, Shield, Download, Copy, ChevronDown, ChevronRight } from "lucide-react";
import Link from "next/link";

type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
type HashType = "MD5" | "SHA1" | "SHA256";

interface IocEntry {
  id: string;
  hashType: HashType;
  hashValue: string;
  threatName: string;
  severity: Severity;
  description: string | null;
  source: string;
  isBlocked: boolean;
  matchCount: number;
  lastSeenAt: string | null;
  createdAt: string;
}

function severityColor(severity: Severity) {
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

function severityBgClass(severity: Severity) {
  switch (severity) {
    case "CRITICAL":
      return "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-700";
    case "HIGH":
      return "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-700";
    case "MEDIUM":
      return "text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-700";
    case "LOW":
      return "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-700";
  }
}

function truncateHash(hash: string, maxLen = 16) {
  if (hash.length <= maxLen) return hash;
  return hash.slice(0, 8) + "..." + hash.slice(-8);
}

export default function IocPage() {
  const { authorized } = useRequireRole("ADMIN");

  const [entries, setEntries] = useState<IocEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search and filter
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState<Severity | null>(null);

  // Add form state
  const [showForm, setShowForm] = useState(false);
  const [formHashType, setFormHashType] = useState<HashType>("SHA256");
  const [formHashValue, setFormHashValue] = useState("");
  const [formThreatName, setFormThreatName] = useState("");
  const [formSeverity, setFormSeverity] = useState<Severity>("MEDIUM");
  const [formDescription, setFormDescription] = useState("");
  const [formBlocked, setFormBlocked] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Expanded rows
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Lookup state
  const [lookupHash, setLookupHash] = useState("");
  const [lookupResult, setLookupResult] = useState<IocEntry | null>(null);
  const [lookupNotFound, setLookupNotFound] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  // Import state
  const [showImport, setShowImport] = useState(false);
  const [importSource, setImportSource] = useState<
    "malwarebazaar" | "threatfox" | "tweetfeed" | "virustotal" | "bulk"
  >("malwarebazaar");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{
    source: string;
    totalFetched: number;
    imported: number;
    skipped: number;
  } | null>(null);
  // MalwareBazaar options
  const [mbQuery, setMbQuery] = useState<"recent" | "tag" | "signature">("recent");
  const [mbTag, setMbTag] = useState("");
  const [mbSignature, setMbSignature] = useState("");
  const [mbLimit, setMbLimit] = useState(25);
  // ThreatFox options
  const [tfQuery, setTfQuery] = useState<"recent" | "tag" | "malware" | "search">("recent");
  const [tfTag, setTfTag] = useState("");
  const [tfMalware, setTfMalware] = useState("");
  const [tfSearch, setTfSearch] = useState("");
  const [tfDays, setTfDays] = useState(7);
  // TweetFeed options
  const [tfeedTime, setTfeedTime] = useState<"today" | "week" | "month">("today");
  const [tfeedTag, setTfeedTag] = useState("");
  const [tfeedType, setTfeedType] = useState<"" | "sha256" | "md5" | "ip" | "domain" | "url">("");
  // VirusTotal options
  const [vtApiKey, setVtApiKey] = useState("");
  const [vtHash, setVtHash] = useState("");

  // Load saved VT API key from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("mydex_vt_api_key");
    if (saved) setVtApiKey(saved);
  }, []);

  function handleVtApiKeyChange(value: string) {
    setVtApiKey(value);
    if (value) localStorage.setItem("mydex_vt_api_key", value);
    else localStorage.removeItem("mydex_vt_api_key");
  }
  // Bulk paste options
  const [bulkText, setBulkText] = useState("");
  const [bulkSeverity, setBulkSeverity] = useState<Severity>("MEDIUM");
  const [bulkThreatName, setBulkThreatName] = useState("");

  // VT Enrich state
  const [enriching, setEnriching] = useState(false);
  const [enrichResult, setEnrichResult] = useState<{
    total: number;
    enriched: number;
    failed: number;
  } | null>(null);
  const [enrichError, setEnrichError] = useState<string | null>(null);

  const fetchEntries = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/security/ioc");
      if (!res.ok) throw new Error("Failed to fetch IOC entries");
      const data = await res.json();
      setEntries(data.entries ?? data.iocs ?? data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  function resetForm() {
    setShowForm(false);
    setFormHashType("SHA256");
    setFormHashValue("");
    setFormThreatName("");
    setFormSeverity("MEDIUM");
    setFormDescription("");
    setFormBlocked(true);
    setFormError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/v1/security/ioc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hashType: formHashType,
          hashValue: formHashValue.trim(),
          threatName: formThreatName.trim(),
          severity: formSeverity,
          description: formDescription.trim() || undefined,
          isBlocked: formBlocked,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create IOC entry");
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
    if (!confirm("Are you sure you want to delete this IOC entry?")) return;

    try {
      const res = await fetch(`/api/v1/security/ioc?id=${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete IOC entry");
      }

      fetchEntries();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }

  async function handleLookup() {
    if (!lookupHash.trim()) return;

    setLookupLoading(true);
    setLookupResult(null);
    setLookupNotFound(false);
    setLookupError(null);

    try {
      const res = await fetch(
        `/api/v1/security/ioc/lookup?hash=${encodeURIComponent(lookupHash.trim())}`
      );

      if (res.status === 404) {
        setLookupNotFound(true);
        return;
      }

      if (!res.ok) {
        throw new Error("Lookup failed");
      }

      const data = await res.json();
      setLookupResult(data.entry ?? data.ioc ?? data);
    } catch (err) {
      setLookupError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLookupLoading(false);
    }
  }

  async function handleEnrich() {
    const apiKey = vtApiKey || localStorage.getItem("mydex_vt_api_key");
    if (!apiKey) {
      setEnrichError("Enter your VirusTotal API key in the Import panel first.");
      return;
    }

    setEnriching(true);
    setEnrichError(null);
    setEnrichResult(null);

    try {
      const res = await fetch("/api/v1/security/ioc/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vtApiKey: apiKey, limit: 20 }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Enrichment failed");

      setEnrichResult(data);
      fetchEntries();
    } catch (err) {
      setEnrichError(err instanceof Error ? err.message : "Enrichment failed");
    } finally {
      setEnriching(false);
    }
  }

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    setImporting(true);
    setImportError(null);
    setImportResult(null);

    try {
      const body: Record<string, unknown> = { source: importSource };

      if (importSource === "malwarebazaar") {
        body.mbQuery = mbQuery;
        body.mbTag = mbTag || undefined;
        body.mbSignature = mbSignature || undefined;
        body.mbLimit = mbLimit;
      } else if (importSource === "threatfox") {
        body.tfQuery = tfQuery;
        body.tfTag = tfTag || undefined;
        body.tfMalware = tfMalware || undefined;
        body.tfSearch = tfSearch || undefined;
        body.tfDays = tfDays;
      } else if (importSource === "tweetfeed") {
        body.tfeedTime = tfeedTime;
        body.tfeedTag = tfeedTag || undefined;
        body.tfeedType = tfeedType || undefined;
      } else if (importSource === "virustotal") {
        body.vtApiKey = vtApiKey;
        // Split textarea into array of hashes
        const hashLines = vtHash
          .split(/[\n,]+/)
          .map((h: string) => h.trim())
          .filter(Boolean);
        if (hashLines.length === 1) {
          body.vtHash = hashLines[0];
        } else {
          body.vtHashes = hashLines;
        }
      } else if (importSource === "bulk") {
        body.bulkHashes = bulkText
          .split(/[\n,]+/)
          .map((h: string) => h.trim())
          .filter(Boolean);
        body.bulkSeverity = bulkSeverity;
        body.bulkThreatName = bulkThreatName || "Imported IOC";
      }

      const res = await fetch("/api/v1/security/ioc/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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

  // Filter entries
  const filtered = entries.filter((entry) => {
    if (severityFilter && entry.severity !== severityFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        entry.hashValue.toLowerCase().includes(q) ||
        entry.threatName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-muted-foreground">Loading IOC entries...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            IOC Hash Detection
          </h1>
          <p className="text-muted-foreground">
            Indicators of Compromise hash management
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/security"
            className="text-sm text-muted-foreground hover:underline"
          >
            Back to Security
          </Link>
          {!showImport && (
            <Button variant="outline" onClick={() => setShowImport(true)}>
              <Download className="h-4 w-4 mr-2" />
              Import Threat Intel
            </Button>
          )}
          {!showForm && (
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add IOC
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

      {/* Import Threat Intel */}
      {showImport && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Import Threat Intelligence
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
            <form onSubmit={handleImport} className="space-y-4">
              {/* Source selector */}
              <div className="space-y-2">
                <Label>Source</Label>
                <div className="flex gap-2 flex-wrap">
                  {(
                    [
                      { key: "malwarebazaar", label: "MalwareBazaar", desc: "abuse.ch — Free, no API key" },
                      { key: "threatfox", label: "ThreatFox", desc: "abuse.ch — Free, no API key" },
                      { key: "tweetfeed", label: "TweetFeed.live", desc: "Free — IOCs from Twitter/X" },
                      { key: "virustotal", label: "VirusTotal", desc: "Requires API key" },
                      { key: "bulk", label: "Bulk Paste", desc: "Paste hashes directly" },
                    ] as const
                  ).map((s) => (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => setImportSource(s.key)}
                      className={`rounded-lg border px-4 py-2 text-left text-sm transition-colors ${
                        importSource === s.key
                          ? "border-primary bg-primary/5 ring-2 ring-primary"
                          : "border-gray-200 dark:border-gray-700 hover:bg-muted/50"
                      }`}
                    >
                      <div className="font-medium">{s.label}</div>
                      <div className="text-xs text-muted-foreground">{s.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* MalwareBazaar options */}
              {importSource === "malwarebazaar" && (
                <div className="space-y-3">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Query Type</Label>
                      <select
                        value={mbQuery}
                        onChange={(e) => setMbQuery(e.target.value as "recent" | "tag" | "signature")}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="recent">Recent Samples</option>
                        <option value="tag">By Tag</option>
                        <option value="signature">By Signature</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Limit</Label>
                      <Input
                        type="number"
                        min={1}
                        max={500}
                        value={mbLimit}
                        onChange={(e) => {
                          const v = parseInt(e.target.value);
                          setMbLimit(isNaN(v) ? 1 : Math.min(500, Math.max(1, v)));
                        }}
                      />
                    </div>
                  </div>
                  {mbQuery === "tag" && (
                    <div className="space-y-2">
                      <Label>Tag</Label>
                      <Input
                        value={mbTag}
                        onChange={(e) => setMbTag(e.target.value)}
                        placeholder="e.g., Emotet, AgentTesla, Cobalt Strike"
                        required
                      />
                    </div>
                  )}
                  {mbQuery === "signature" && (
                    <div className="space-y-2">
                      <Label>Signature</Label>
                      <Input
                        value={mbSignature}
                        onChange={(e) => setMbSignature(e.target.value)}
                        placeholder="e.g., Heodo, RedLineStealer"
                        required
                      />
                    </div>
                  )}
                </div>
              )}

              {/* ThreatFox options */}
              {importSource === "threatfox" && (
                <div className="space-y-3">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Query Type</Label>
                      <select
                        value={tfQuery}
                        onChange={(e) => setTfQuery(e.target.value as "recent" | "tag" | "malware" | "search")}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="recent">Recent IOCs</option>
                        <option value="tag">By Tag</option>
                        <option value="malware">By Malware Family</option>
                        <option value="search">Search</option>
                      </select>
                    </div>
                    {tfQuery === "recent" && (
                      <div className="space-y-2">
                        <Label>Days</Label>
                        <Input
                          type="number"
                          min={1}
                          max={30}
                          value={tfDays}
                          onChange={(e) => setTfDays(parseInt(e.target.value) || 7)}
                        />
                      </div>
                    )}
                  </div>
                  {tfQuery === "tag" && (
                    <div className="space-y-2">
                      <Label>Tag</Label>
                      <Input
                        value={tfTag}
                        onChange={(e) => setTfTag(e.target.value)}
                        placeholder="e.g., Cobalt Strike, AsyncRAT"
                        required
                      />
                    </div>
                  )}
                  {tfQuery === "malware" && (
                    <div className="space-y-2">
                      <Label>Malware Family</Label>
                      <Input
                        value={tfMalware}
                        onChange={(e) => setTfMalware(e.target.value)}
                        placeholder="e.g., win.cobalt_strike, win.emotet"
                        required
                      />
                    </div>
                  )}
                  {tfQuery === "search" && (
                    <div className="space-y-2">
                      <Label>Search Term</Label>
                      <Input
                        value={tfSearch}
                        onChange={(e) => setTfSearch(e.target.value)}
                        placeholder="Search IOCs..."
                        required
                      />
                    </div>
                  )}
                </div>
              )}

              {/* TweetFeed options */}
              {importSource === "tweetfeed" && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Import IOCs shared by security researchers on Twitter/X. Free, no API key needed.
                  </p>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label>Time Range</Label>
                      <select
                        value={tfeedTime}
                        onChange={(e) => setTfeedTime(e.target.value as "today" | "week" | "month")}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="today">Today</option>
                        <option value="week">This Week</option>
                        <option value="month">This Month</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Tag Filter (optional)</Label>
                      <Input
                        value={tfeedTag}
                        onChange={(e) => setTfeedTag(e.target.value)}
                        placeholder="e.g., cobaltStrike, phishing"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>IOC Type</Label>
                      <select
                        value={tfeedType}
                        onChange={(e) => setTfeedType(e.target.value as "" | "sha256" | "md5" | "ip" | "domain" | "url")}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="">All Types</option>
                        <option value="sha256">SHA256 Hashes</option>
                        <option value="md5">MD5 Hashes</option>
                        <option value="domain">Domains</option>
                        <option value="ip">IP Addresses</option>
                        <option value="url">URLs</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* VirusTotal options */}
              {importSource === "virustotal" && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>API Key</Label>
                    <Input
                      type="password"
                      value={vtApiKey}
                      onChange={(e) => handleVtApiKeyChange(e.target.value)}
                      placeholder="Your VirusTotal API key"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Get a free key at virustotal.com. Free tier: 4 requests/min, 500/day.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>IOCs — Hashes, Domains, or IPs (one per line)</Label>
                    <textarea
                      value={vtHash}
                      onChange={(e) => setVtHash(e.target.value)}
                      placeholder={"Paste hashes, domains, or IPs:\n275a021bbfb6489e54d471899f7db9d1663fc695ec2fe2a2c4538aabf651fd0f\nd41d8cd98f00b204e9800998ecf8427e\nexample-malware.com\n192.168.1.100"}
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[100px]"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Auto-detects IOC type: file hashes (MD5/SHA1/SHA256), domains, and IPs. Each gets looked up against VT. Max 50 per import.
                    </p>
                  </div>
                </div>
              )}

              {/* Bulk paste options */}
              {importSource === "bulk" && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Hashes (one per line or comma-separated)</Label>
                    <textarea
                      value={bulkText}
                      onChange={(e) => setBulkText(e.target.value)}
                      placeholder={"Paste MD5, SHA1, or SHA256 hashes:\nd41d8cd98f00b204e9800998ecf8427e\ne3b0c44298fc1c149afbf4c8996fb924\n275a021bbfb6489e54d471899f7db9d1663fc695..."}
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[120px]"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Hash type is auto-detected by length: 32 chars = MD5, 40 = SHA1, 64 = SHA256.
                    </p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Threat Name</Label>
                      <Input
                        value={bulkThreatName}
                        onChange={(e) => setBulkThreatName(e.target.value)}
                        placeholder="e.g., Ransomware Campaign 2025"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Severity</Label>
                      <select
                        value={bulkSeverity}
                        onChange={(e) => setBulkSeverity(e.target.value as Severity)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="CRITICAL">Critical</option>
                        <option value="HIGH">High</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="LOW">Low</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <Button type="submit" disabled={importing}>
                  {importing ? "Importing..." : "Import"}
                </Button>
                {importing && (
                  <span className="text-sm text-muted-foreground">
                    Fetching from {importSource}...
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
                  <li>Source: {importResult.source}</li>
                  <li>Fetched {importResult.totalFetched} IOC hashes</li>
                  <li>Imported {importResult.imported} new entries</li>
                  <li>Skipped {importResult.skipped} (already in database)</li>
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add IOC Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Add IOC Entry</span>
              <Button variant="ghost" size="sm" onClick={resetForm}>
                <X className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="ioc-hash-type">Hash Type</Label>
                  <select
                    id="ioc-hash-type"
                    value={formHashType}
                    onChange={(e) =>
                      setFormHashType(e.target.value as HashType)
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="MD5">MD5</option>
                    <option value="SHA1">SHA1</option>
                    <option value="SHA256">SHA256</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ioc-severity">Severity</Label>
                  <select
                    id="ioc-severity"
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
              </div>
              <div className="space-y-2">
                <Label htmlFor="ioc-hash-value">Hash Value</Label>
                <Input
                  id="ioc-hash-value"
                  value={formHashValue}
                  onChange={(e) => setFormHashValue(e.target.value)}
                  placeholder="e.g., d41d8cd98f00b204e9800998ecf8427e"
                  required
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ioc-threat-name">Threat Name</Label>
                <Input
                  id="ioc-threat-name"
                  value={formThreatName}
                  onChange={(e) => setFormThreatName(e.target.value)}
                  placeholder="e.g., Emotet Dropper"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ioc-description">Description</Label>
                <Input
                  id="ioc-description"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Optional description of this IOC"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="ioc-blocked"
                  type="checkbox"
                  checked={formBlocked}
                  onChange={(e) => setFormBlocked(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 dark:border-gray-600"
                />
                <Label htmlFor="ioc-blocked">Blocked</Label>
              </div>

              {formError && (
                <p className="text-sm text-destructive">{formError}</p>
              )}

              <div className="flex gap-2">
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Adding..." : "Add IOC"}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by hash or threat name..."
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant={severityFilter === null ? "default" : "outline"}
            size="sm"
            onClick={() => setSeverityFilter(null)}
          >
            All
          </Button>
          {(["CRITICAL", "HIGH", "MEDIUM", "LOW"] as Severity[]).map((s) => (
            <Button
              key={s}
              variant={severityFilter === s ? "default" : "outline"}
              size="sm"
              onClick={() => setSeverityFilter(s)}
              className={severityFilter === s ? "" : severityBgClass(s)}
            >
              {s}
            </Button>
          ))}
        </div>
      </div>

      {/* IOC Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-lg">
              <Shield className="h-5 w-5" />
              IOC Entries
              <span className="text-sm font-normal text-muted-foreground">
                ({filtered.length})
              </span>
            </span>
            {entries.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleEnrich}
                disabled={enriching}
              >
                {enriching ? "Enriching..." : "VT Enrich"}
              </Button>
            )}
            {filtered.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const csv = [
                    "Hash Type,Hash Value,Threat Name,Severity,Blocked,Match Count,Last Seen",
                    ...filtered.map(
                      (e) =>
                        `${e.hashType},"${e.hashValue}","${e.threatName}",${e.severity},${e.isBlocked},${e.matchCount},${e.lastSeenAt || "Never"},"${e.source || ""}"`
                    ),
                  ].join("\n");
                  const blob = new Blob([csv], { type: "text/csv" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `ioc-export-${new Date().toISOString().slice(0, 10)}.csv`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                <Download className="h-3.5 w-3.5 mr-1" />
                Export CSV
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {enrichError && (
            <div className="mb-4 rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
              {enrichError}
              <button onClick={() => setEnrichError(null)} className="ml-2 underline">Dismiss</button>
            </div>
          )}
          {enrichResult && (
            <div className="mb-4 rounded-md bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-700 p-3 text-sm text-blue-800 dark:text-blue-200">
              VT Enrichment: Updated {enrichResult.enriched}/{enrichResult.total} entries
              {enrichResult.failed > 0 && ` (${enrichResult.failed} failed/not found)`}
              <button onClick={() => setEnrichResult(null)} className="ml-2 underline">Dismiss</button>
            </div>
          )}
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              {entries.length === 0
                ? "No IOC entries found. Add one to get started."
                : "No entries match your search or filter criteria."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">
                      Hash Type
                    </th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">
                      Hash Value
                    </th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">
                      Threat Name
                    </th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">
                      Severity
                    </th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">
                      Blocked
                    </th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">
                      Match Count
                    </th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">
                      Last Seen
                    </th>
                    <th className="pb-3 font-medium text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((entry) => {
                    const isExpanded = expandedId === entry.id;
                    return (
                      <React.Fragment key={entry.id}>
                        <tr
                          className="border-b hover:bg-muted/50 cursor-pointer"
                          onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                        >
                          <td className="py-3 pr-4">
                            <span className="flex items-center gap-1">
                              {isExpanded ? (
                                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                              )}
                              <Badge variant="outline">{entry.hashType}</Badge>
                            </span>
                          </td>
                          <td className="py-3 pr-4 font-mono text-xs">
                            <span className="flex items-center gap-1">
                              <span title={entry.hashValue}>{truncateHash(entry.hashValue)}</span>
                              <button
                                title="Copy full hash"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigator.clipboard.writeText(entry.hashValue);
                                  setCopiedId(entry.id);
                                  setTimeout(() => setCopiedId(null), 2000);
                                }}
                                className="text-muted-foreground hover:text-foreground"
                              >
                                {copiedId === entry.id ? (
                                  <span className="text-green-600 text-xs">Copied!</span>
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </button>
                            </span>
                          </td>
                          <td className="py-3 pr-4 font-medium">
                            {entry.threatName}
                          </td>
                          <td className="py-3 pr-4">
                            <Badge variant={severityColor(entry.severity)}>
                              {entry.severity}
                            </Badge>
                          </td>
                          <td className="py-3 pr-4">
                            <Badge
                              variant={entry.isBlocked ? "destructive" : "secondary"}
                            >
                              {entry.isBlocked ? "Blocked" : "Monitor"}
                            </Badge>
                          </td>
                          <td className="py-3 pr-4 text-muted-foreground">
                            {entry.matchCount}
                          </td>
                          <td className="py-3 pr-4 text-muted-foreground">
                            {entry.lastSeenAt
                              ? new Date(entry.lastSeenAt).toLocaleDateString()
                              : "Never"}
                          </td>
                          <td className="py-3">
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
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="border-b bg-muted/30">
                            <td colSpan={8} className="px-6 py-4">
                              <div className="space-y-3">
                                <div>
                                  <span className="text-xs font-medium text-muted-foreground uppercase">Full Hash</span>
                                  <div className="flex items-center gap-2 mt-1">
                                    <code className="text-xs font-mono bg-muted px-2 py-1 rounded break-all">
                                      {entry.hashValue}
                                    </code>
                                    <button
                                      onClick={() => {
                                        navigator.clipboard.writeText(entry.hashValue);
                                        setCopiedId(entry.id);
                                        setTimeout(() => setCopiedId(null), 2000);
                                      }}
                                      className="text-muted-foreground hover:text-foreground shrink-0"
                                    >
                                      <Copy className="h-4 w-4" />
                                    </button>
                                  </div>
                                </div>
                                {entry.description && (
                                  <div>
                                    <span className="text-xs font-medium text-muted-foreground uppercase">Details</span>
                                    <p className="text-sm mt-1">{entry.description}</p>
                                  </div>
                                )}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                                  <div>
                                    <span className="text-xs font-medium text-muted-foreground uppercase">Source</span>
                                    <p className="mt-1">{entry.source || "manual"}</p>
                                  </div>
                                  <div>
                                    <span className="text-xs font-medium text-muted-foreground uppercase">Status</span>
                                    <p className="mt-1">{entry.isBlocked ? "Blocked" : "Monitoring"}</p>
                                  </div>
                                  <div>
                                    <span className="text-xs font-medium text-muted-foreground uppercase">Matches</span>
                                    <p className="mt-1">{entry.matchCount}</p>
                                  </div>
                                  <div>
                                    <span className="text-xs font-medium text-muted-foreground uppercase">Added</span>
                                    <p className="mt-1">{new Date(entry.createdAt).toLocaleDateString()}</p>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual Lookup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Search className="h-5 w-5" />
            Manual Lookup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Paste a hash to check it against the IOC database.
          </p>
          <div className="flex gap-2">
            <Input
              value={lookupHash}
              onChange={(e) => setLookupHash(e.target.value)}
              placeholder="Paste MD5, SHA1, or SHA256 hash..."
              className="font-mono flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleLookup();
              }}
            />
            <Button onClick={handleLookup} disabled={lookupLoading}>
              {lookupLoading ? "Checking..." : "Lookup"}
            </Button>
          </div>

          {lookupError && (
            <p className="text-sm text-destructive">{lookupError}</p>
          )}

          {lookupNotFound && (
            <div className="rounded-md bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-700 p-4 text-sm text-green-700 dark:text-green-300">
              No matching IOC found for this hash. The hash appears clean.
            </div>
          )}

          {lookupResult && (
            <div className="rounded-md border p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant={severityColor(lookupResult.severity)}>
                  {lookupResult.severity}
                </Badge>
                <span className="font-medium">{lookupResult.threatName}</span>
                {lookupResult.isBlocked && (
                  <Badge variant="destructive">Blocked</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground font-mono">
                {lookupResult.hashType}: {lookupResult.hashValue}
              </p>
              {lookupResult.description && (
                <p className="text-sm text-muted-foreground">
                  {lookupResult.description}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Matched {lookupResult.matchCount} time(s)
                {lookupResult.lastSeenAt &&
                  ` | Last seen: ${new Date(lookupResult.lastSeenAt).toLocaleDateString()}`}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
