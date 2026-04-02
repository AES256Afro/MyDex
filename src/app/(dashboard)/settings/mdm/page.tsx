"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRequireRole } from "@/hooks/use-require-role";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Smartphone,
  ArrowLeft,
  Loader2,
  CheckCircle,
  XCircle,
  RefreshCw,
  Trash2,
  Power,
  PowerOff,
  Monitor,
  Shield,
  Plus,
  Settings,
  Clock,
  History,
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

interface MdmProvider {
  id: string;
  providerType: string;
  name: string;
  clientId: string | null;
  clientSecret: string | null;
  tenantId: string | null;
  apiToken: string | null;
  instanceUrl: string | null;
  isActive: boolean;
  autoAssign: boolean;
  syncIntervalMinutes: number;
  lastSyncAt: string | null;
  lastSyncStatus: string;
  lastSyncError: string | null;
  lastSyncDeviceCount: number | null;
  _count?: { mdmDevices: number };
}

const PROVIDER_INFO: Record<string, { label: string; color: string; bgColor: string; description: string }> = {
  MICROSOFT_INTUNE: {
    label: "Microsoft Intune",
    color: "text-blue-700",
    bgColor: "bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800",
    description: "Manage Windows, macOS, iOS, and Android devices via Microsoft Endpoint Manager",
  },
  JAMF_PRO: {
    label: "Jamf Pro",
    color: "text-purple-700",
    bgColor: "bg-purple-50 border-purple-200 dark:bg-purple-950 dark:border-purple-800",
    description: "Apple-focused MDM for macOS, iOS, iPadOS, and tvOS devices",
  },
  KANDJI: {
    label: "Kandji",
    color: "text-green-700",
    bgColor: "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800",
    description: "Modern Apple MDM with auto-remediation and compliance enforcement",
  },
};

interface MdmActionRecord {
  id: string;
  actionType: string;
  status: string;
  mdmDeviceId: string | null;
  issuedAt: string;
  completedAt: string | null;
  result: string | null;
  errorMessage: string | null;
  issuerName: string;
  mdmProvider: { name: string; providerType: string };
}

const ACTION_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  SENT: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  COMPLETED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  FAILED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  CANCELLED: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

const SYNC_INTERVALS = [
  { value: 15, label: "Every 15 minutes" },
  { value: 30, label: "Every 30 minutes" },
  { value: 60, label: "Every hour" },
  { value: 240, label: "Every 4 hours" },
  { value: 720, label: "Every 12 hours" },
  { value: 1440, label: "Once a day" },
];

export default function MdmSettingsPage() {
  const { authorized } = useRequireRole("ADMIN");
  const { data: session } = useSession();
  const [providers, setProviders] = useState<MdmProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string; deviceCount?: number } | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<{ devicesFound?: number; usersMatched?: number; devicesMatched?: number; autoAssigned?: number; error?: string } | null>(null);
  const [actionHistory, setActionHistory] = useState<MdmActionRecord[]>([]);
  const [actionsLoading, setActionsLoading] = useState(false);

  // Form fields
  const [name, setName] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [instanceUrl, setInstanceUrl] = useState("");
  const [autoAssign, setAutoAssign] = useState(true);
  const [syncInterval, setSyncInterval] = useState(60);

  useEffect(() => {
    fetchProviders();
    fetchActionHistory();
  }, []);

  async function fetchProviders() {
    try {
      const res = await fetch("/api/v1/mdm/providers");
      if (res.ok) {
        const data = await res.json();
        setProviders(data.providers || []);
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }

  async function fetchActionHistory() {
    setActionsLoading(true);
    try {
      const res = await fetch("/api/v1/mdm/actions?limit=20");
      if (res.ok) {
        const data = await res.json();
        setActionHistory(data.actions || []);
      }
    } catch { /* ignore */ } finally {
      setActionsLoading(false);
    }
  }

  function resetForm() {
    setName("");
    setTenantId("");
    setClientId("");
    setClientSecret("");
    setApiToken("");
    setInstanceUrl("");
    setAutoAssign(true);
    setSyncInterval(60);
    setTestResult(null);
  }

  function selectProvider(type: string) {
    setSelectedType(type);
    resetForm();
    setName(PROVIDER_INFO[type]?.label || type);

    // Pre-fill if already configured
    const existing = providers.find((p) => p.providerType === type);
    if (existing) {
      setName(existing.name);
      setTenantId(existing.tenantId || "");
      setClientId(existing.clientId || "");
      setInstanceUrl(existing.instanceUrl || "");
      setAutoAssign(existing.autoAssign);
      setSyncInterval(existing.syncIntervalMinutes);
    }
  }

  async function testConnection() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/v1/mdm/providers/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerType: selectedType,
          tenantId: tenantId || undefined,
          clientId: clientId || undefined,
          clientSecret: clientSecret || undefined,
          apiToken: apiToken || undefined,
          instanceUrl: instanceUrl || undefined,
        }),
      });
      const data = await res.json();
      setTestResult(data);
    } catch {
      setTestResult({ success: false, error: "Connection failed" });
    } finally {
      setTesting(false);
    }
  }

  async function saveProvider() {
    if (!selectedType) return;
    setSaving(true);
    try {
      const res = await fetch("/api/v1/mdm/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerType: selectedType,
          name,
          tenantId: tenantId || undefined,
          clientId: clientId || undefined,
          clientSecret: clientSecret || undefined,
          apiToken: apiToken || undefined,
          instanceUrl: instanceUrl || undefined,
          autoAssign,
          syncIntervalMinutes: syncInterval,
        }),
      });
      if (res.ok) {
        await fetchProviders();
        setSelectedType(null);
        resetForm();
      }
    } catch { /* ignore */ } finally {
      setSaving(false);
    }
  }

  async function toggleProvider(id: string, isActive: boolean) {
    await fetch("/api/v1/mdm/providers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ providerId: id, isActive }),
    });
    await fetchProviders();
  }

  async function deleteProvider(id: string) {
    if (!confirm("Remove this MDM provider? All synced device data will be deleted.")) return;
    await fetch(`/api/v1/mdm/providers?providerId=${id}`, { method: "DELETE" });
    await fetchProviders();
  }

  async function syncProvider(id: string) {
    setSyncing(id);
    setSyncResult(null);
    try {
      const res = await fetch("/api/v1/mdm/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerId: id }),
      });
      const data = await res.json();
      setSyncResult(data);
      await fetchProviders();
    } catch { /* ignore */ } finally {
      setSyncing(null);
    }
  }

  if (!authorized) return null;

  const isAdmin = session?.user?.role === "ADMIN" || session?.user?.role === "SUPER_ADMIN";

  if (!isAdmin) {
    return <div className="text-center py-12 text-muted-foreground">You don&apos;t have permission to access MDM settings.</div>;
  }

  if (loading) {
    return <div className="text-center py-12"><Loader2 className="h-6 w-6 mx-auto animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Link href="/settings" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-4">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Settings
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Smartphone className="h-6 w-6 text-primary" />
          MDM Integration
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Connect your MDM provider to sync devices, auto-assign users, and manage endpoints from MyDex.
        </p>
      </div>

      {/* Configured Providers */}
      {providers.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Connected Providers</h2>
          {providers.map((p) => {
            const info = PROVIDER_INFO[p.providerType];
            return (
              <Card key={p.id} className={p.isActive ? "" : "opacity-60"}>
                <CardContent className="pt-5">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-semibold ${info?.color || ""}`}>{p.name}</span>
                        <Badge variant={p.isActive ? "default" : "secondary"}>
                          {p.isActive ? "Active" : "Disabled"}
                        </Badge>
                        {p.lastSyncStatus === "SUCCESS" && (
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                            <CheckCircle className="h-3 w-3 mr-1" /> Synced
                          </Badge>
                        )}
                        {p.lastSyncStatus === "FAILED" && (
                          <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                            <XCircle className="h-3 w-3 mr-1" /> Failed
                          </Badge>
                        )}
                        {p.lastSyncStatus === "SYNCING" && (
                          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Syncing
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <Monitor className="h-3 w-3" />
                          {p._count?.mdmDevices ?? p.lastSyncDeviceCount ?? 0} devices
                        </span>
                        {p.lastSyncAt && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Last sync {formatDistanceToNow(new Date(p.lastSyncAt), { addSuffix: true })}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <RefreshCw className="h-3 w-3" />
                          Every {p.syncIntervalMinutes}m
                        </span>
                        {p.autoAssign && (
                          <span className="flex items-center gap-1">
                            <Shield className="h-3 w-3" /> Auto-assign
                          </span>
                        )}
                      </div>
                      {p.lastSyncError && (
                        <p className="text-xs text-red-600 mt-1">{p.lastSyncError}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => syncProvider(p.id)}
                        disabled={syncing === p.id || !p.isActive}
                      >
                        {syncing === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                        <span className="ml-1">Sync</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleProvider(p.id, !p.isActive)}
                      >
                        {p.isActive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => selectProvider(p.providerType)}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600"
                        onClick={() => deleteProvider(p.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* Sync result */}
          {syncResult && (
            <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
              <CardContent className="pt-4">
                <h3 className="text-sm font-medium mb-2">Sync Results</h3>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Devices found:</span> <strong>{String(syncResult.devicesFound ?? 0)}</strong></div>
                  <div><span className="text-muted-foreground">Users matched:</span> <strong>{String(syncResult.usersMatched ?? 0)}</strong></div>
                  <div><span className="text-muted-foreground">Devices matched:</span> <strong>{String(syncResult.devicesMatched ?? 0)}</strong></div>
                  <div><span className="text-muted-foreground">Auto-assigned:</span> <strong>{String(syncResult.autoAssigned ?? 0)}</strong></div>
                  {syncResult.error && (
                    <div className="col-span-2 text-red-600">{String(syncResult.error)}</div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Provider Selector */}
      {!selectedType && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Plus className="h-4 w-4" />
              {providers.length > 0 ? "Add Another Provider" : "Connect an MDM Provider"}
            </CardTitle>
            <CardDescription>Select your MDM solution to get started</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {Object.entries(PROVIDER_INFO).map(([type, info]) => {
                const existing = providers.find((p) => p.providerType === type);
                return (
                  <button
                    key={type}
                    onClick={() => selectProvider(type)}
                    disabled={!!existing}
                    className={`flex flex-col items-start gap-2 rounded-lg border-2 p-4 text-left transition-colors ${info.bgColor} ${existing ? "opacity-50 cursor-not-allowed" : "hover:ring-2 hover:ring-primary/30 cursor-pointer"}`}
                  >
                    <Smartphone className={`h-6 w-6 ${info.color}`} />
                    <div>
                      <span className={`font-semibold text-sm ${info.color}`}>{info.label}</span>
                      {existing && <Badge className="ml-2 text-xs" variant="secondary">Configured</Badge>}
                    </div>
                    <span className="text-xs text-muted-foreground">{info.description}</span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Configuration Form */}
      {selectedType && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Smartphone className={`h-5 w-5 ${PROVIDER_INFO[selectedType]?.color}`} />
              Configure {PROVIDER_INFO[selectedType]?.label}
            </CardTitle>
            <CardDescription>{PROVIDER_INFO[selectedType]?.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Display Name */}
            <div>
              <label className="text-sm font-medium">Display Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="My MDM" className="mt-1 max-w-sm" />
            </div>

            {/* Provider-specific fields */}
            {selectedType === "MICROSOFT_INTUNE" && (
              <>
                <div>
                  <label className="text-sm font-medium">Azure Tenant ID</label>
                  <Input value={tenantId} onChange={(e) => setTenantId(e.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" className="mt-1 max-w-lg font-mono text-sm" />
                </div>
                <div>
                  <label className="text-sm font-medium">Application (Client) ID</label>
                  <Input value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" className="mt-1 max-w-lg font-mono text-sm" />
                </div>
                <div>
                  <label className="text-sm font-medium">Client Secret</label>
                  <Input type="password" value={clientSecret} onChange={(e) => setClientSecret(e.target.value)} placeholder="Enter client secret" className="mt-1 max-w-lg" />
                </div>
                <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border p-4 text-sm space-y-2">
                  <p className="font-medium text-blue-800 dark:text-blue-300">Setup Instructions</p>
                  <ol className="list-decimal list-inside space-y-1 text-muted-foreground text-xs">
                    <li>Go to Azure Portal &gt; App registrations &gt; New registration</li>
                    <li>Under API permissions, add <code className="text-xs bg-muted px-1 rounded">DeviceManagementManagedDevices.ReadWrite.All</code></li>
                    <li>Grant admin consent for the permissions</li>
                    <li>Create a client secret under Certificates &amp; secrets</li>
                    <li>Copy the Tenant ID, Application ID, and Client Secret above</li>
                  </ol>
                </div>
              </>
            )}

            {selectedType === "JAMF_PRO" && (
              <>
                <div>
                  <label className="text-sm font-medium">Jamf Instance URL</label>
                  <Input value={instanceUrl} onChange={(e) => setInstanceUrl(e.target.value)} placeholder="https://your-company.jamfcloud.com" className="mt-1 max-w-lg" />
                </div>
                <div>
                  <label className="text-sm font-medium">Client ID <span className="text-xs text-muted-foreground">(OAuth2)</span></label>
                  <Input value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="Optional if using API token" className="mt-1 max-w-lg font-mono text-sm" />
                </div>
                <div>
                  <label className="text-sm font-medium">Client Secret <span className="text-xs text-muted-foreground">(OAuth2)</span></label>
                  <Input type="password" value={clientSecret} onChange={(e) => setClientSecret(e.target.value)} placeholder="Optional if using API token" className="mt-1 max-w-lg" />
                </div>
                <div className="text-center text-xs text-muted-foreground">— or —</div>
                <div>
                  <label className="text-sm font-medium">API Token</label>
                  <Input type="password" value={apiToken} onChange={(e) => setApiToken(e.target.value)} placeholder="Bearer token from Jamf Pro" className="mt-1 max-w-lg" />
                </div>
              </>
            )}

            {selectedType === "KANDJI" && (
              <>
                <div>
                  <label className="text-sm font-medium">Kandji Instance URL</label>
                  <Input value={instanceUrl} onChange={(e) => setInstanceUrl(e.target.value)} placeholder="https://your-company.api.kandji.io" className="mt-1 max-w-lg" />
                </div>
                <div>
                  <label className="text-sm font-medium">API Token</label>
                  <Input type="password" value={apiToken} onChange={(e) => setApiToken(e.target.value)} placeholder="Bearer token from Kandji settings" className="mt-1 max-w-lg" />
                </div>
              </>
            )}

            {/* Common settings */}
            <div className="border-t pt-4 space-y-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="autoAssign"
                  checked={autoAssign}
                  onChange={(e) => setAutoAssign(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="autoAssign" className="text-sm">
                  <span className="font-medium">Auto-assign devices to users</span>
                  <span className="block text-xs text-muted-foreground">When MDM reports a device belongs to a user, automatically assign it in MyDex</span>
                </label>
              </div>

              <div>
                <label className="text-sm font-medium">Sync Interval</label>
                <select
                  value={syncInterval}
                  onChange={(e) => setSyncInterval(Number(e.target.value))}
                  className="block mt-1 rounded-md border px-3 py-2 text-sm bg-background max-w-xs"
                >
                  {SYNC_INTERVALS.map((i) => (
                    <option key={i.value} value={i.value}>{i.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Test & Save */}
            <div className="flex items-center gap-3 pt-2">
              <Button variant="outline" onClick={testConnection} disabled={testing}>
                {testing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Shield className="h-4 w-4 mr-1" />}
                Test Connection
              </Button>
              <Button onClick={saveProvider} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                Save Provider
              </Button>
              <Button variant="ghost" onClick={() => { setSelectedType(null); resetForm(); }}>Cancel</Button>
            </div>

            {testResult && (
              <div className={`rounded-lg p-3 text-sm ${testResult.success ? "bg-green-50 text-green-800 dark:bg-green-950/30 dark:text-green-300" : "bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-300"}`}>
                {testResult.success ? (
                  <span className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Connection successful! Found {testResult.deviceCount ?? 0} device(s).
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <XCircle className="h-4 w-4" />
                    Connection failed: {testResult.error}
                  </span>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* How it works */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">How MDM Integration Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div className="space-y-1">
              <div className="font-medium flex items-center gap-2"><RefreshCw className="h-4 w-4 text-blue-500" /> Sync</div>
              <p className="text-xs text-muted-foreground">MyDex periodically pulls device data from your MDM, including enrollment status, compliance, and installed apps.</p>
            </div>
            <div className="space-y-1">
              <div className="font-medium flex items-center gap-2"><Shield className="h-4 w-4 text-green-500" /> Auto-Assign</div>
              <p className="text-xs text-muted-foreground">Devices are automatically matched to MyDex users by email and assigned. Multiple devices per user are supported.</p>
            </div>
            <div className="space-y-1">
              <div className="font-medium flex items-center gap-2"><Monitor className="h-4 w-4 text-purple-500" /> Manage</div>
              <p className="text-xs text-muted-foreground">Lock, restart, wipe, or deploy apps to devices directly from the MyDex Devices page — no need to switch to your MDM console.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <History className="h-4 w-4" />
              Action History
            </CardTitle>
            <Button size="sm" variant="ghost" onClick={fetchActionHistory} disabled={actionsLoading}>
              {actionsLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            </Button>
          </div>
          <CardDescription>Recent MDM actions executed across all providers</CardDescription>
        </CardHeader>
        <CardContent>
          {actionsLoading && actionHistory.length === 0 ? (
            <div className="text-center py-6">
              <Loader2 className="h-5 w-5 mx-auto animate-spin text-muted-foreground" />
            </div>
          ) : actionHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No MDM actions have been executed yet.</p>
          ) : (
            <div className="overflow-x-auto border rounded">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="px-3 py-2 text-left font-medium">Time</th>
                    <th className="px-3 py-2 text-left font-medium">Device</th>
                    <th className="px-3 py-2 text-left font-medium">Action</th>
                    <th className="px-3 py-2 text-left font-medium">Status</th>
                    <th className="px-3 py-2 text-left font-medium">Issued By</th>
                    <th className="px-3 py-2 text-left font-medium">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {actionHistory.map((action) => (
                    <tr key={action.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(action.issuedAt), { addSuffix: true })}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        <span className="font-mono">{action.mdmDeviceId ? action.mdmDeviceId.slice(0, 12) + "..." : "N/A"}</span>
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant="outline" className="text-xs capitalize">{action.actionType.replace("_", " ")}</Badge>
                      </td>
                      <td className="px-3 py-2">
                        <Badge className={`text-xs ${ACTION_STATUS_COLORS[action.status] || ""}`}>
                          {action.status}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{action.issuerName}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground max-w-[200px] truncate">
                        {action.status === "FAILED" ? (
                          <span className="text-red-600">{action.errorMessage || "Failed"}</span>
                        ) : (
                          action.result || (action.status === "COMPLETED" ? "Success" : "-")
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
