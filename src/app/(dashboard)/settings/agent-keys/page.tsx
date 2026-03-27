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
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Key,
  Plus,
  Copy,
  Check,
  AlertTriangle,
  ShieldCheck,
  Monitor,
  Clock,
  Terminal,
} from "lucide-react";

interface AgentKey {
  id: string;
  name: string;
  keyPrefix: string;
  deviceId: string | null;
  permissions: string[];
  isActive: boolean;
  expiresAt: string | null;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdBy: string;
  createdAt: string;
}

function getKeyStatus(key: AgentKey): "active" | "revoked" | "expired" {
  if (key.revokedAt || !key.isActive) return "revoked";
  if (key.expiresAt && new Date(key.expiresAt) < new Date()) return "expired";
  return "active";
}

function statusBadgeVariant(
  status: "active" | "revoked" | "expired"
): "success" | "destructive" | "warning" {
  switch (status) {
    case "active":
      return "success";
    case "revoked":
      return "destructive";
    case "expired":
      return "warning";
  }
}

function isExpiringSoon(key: AgentKey): boolean {
  if (!key.expiresAt || !key.isActive || key.revokedAt) return false;
  const expiresAt = new Date(key.expiresAt);
  const now = new Date();
  const daysUntilExpiry =
    (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "\u2014";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function AgentKeysPage() {
  const { data: session } = useSession();

  const [keys, setKeys] = useState<AgentKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Generate form state
  const [showGenerate, setShowGenerate] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyExpiration, setNewKeyExpiration] = useState("never");
  const [generating, setGenerating] = useState(false);

  // Newly generated key display
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Revoke state
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const fetchKeys = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/agents/keys");
      if (res.ok) {
        const data = await res.json();
        setKeys(data.keys);
      } else {
        setError("Failed to load API keys");
      }
    } catch {
      setError("Failed to load API keys");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  async function handleGenerate() {
    if (!newKeyName.trim()) return;
    setGenerating(true);
    setError(null);
    try {
      const expiresInDays =
        newKeyExpiration === "never"
          ? undefined
          : newKeyExpiration === "30"
            ? 30
            : newKeyExpiration === "90"
              ? 90
              : 365;

      const res = await fetch("/api/v1/agents/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newKeyName.trim(),
          expiresInDays,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate key");
      }

      const data = await res.json();
      setGeneratedKey(data.apiKey);
      setNewKeyName("");
      setNewKeyExpiration("never");
      fetchKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setGenerating(false);
    }
  }

  async function handleRevoke(keyId: string) {
    setRevokingId(keyId);
    setError(null);
    try {
      const res = await fetch("/api/v1/agents/keys", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: keyId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to revoke key");
      }

      fetchKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setRevokingId(null);
    }
  }

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  // Computed stats
  const totalKeys = keys.length;
  const activeKeys = keys.filter((k) => getKeyStatus(k) === "active").length;
  const devicesLinked = new Set(
    keys.filter((k) => k.deviceId && getKeyStatus(k) === "active").map((k) => k.deviceId)
  ).size;
  const expiringSoon = keys.filter((k) => isExpiringSoon(k)).length;

  if (!session) return null;

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agent API Keys</h1>
          <p className="text-muted-foreground">Loading keys...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agent API Keys</h1>
          <p className="text-muted-foreground">
            Generate and manage API keys for the MyDex desktop agent
          </p>
        </div>
        <Button
          onClick={() => {
            setShowGenerate(!showGenerate);
            setGeneratedKey(null);
          }}
        >
          {showGenerate ? "Cancel" : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              Generate New Key
            </>
          )}
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Key className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalKeys}</p>
                <p className="text-xs text-muted-foreground">Total Keys</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <ShieldCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeKeys}</p>
                <p className="text-xs text-muted-foreground">Active Keys</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Monitor className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{devicesLinked}</p>
                <p className="text-xs text-muted-foreground">Devices Linked</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{expiringSoon}</p>
                <p className="text-xs text-muted-foreground">
                  Keys Expiring Soon
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Generate New Key Form */}
      {showGenerate && (
        <Card>
          <CardHeader>
            <CardTitle>Generate New API Key</CardTitle>
            <CardDescription>
              Create a new API key for installing the MyDex agent on devices
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {generatedKey ? (
              /* Show newly generated key */
              <div className="space-y-4">
                <div className="rounded-lg border-2 border-yellow-500 bg-yellow-50 dark:bg-yellow-950/30 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm font-semibold">
                      Copy this key now. It won&apos;t be shown again.
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded-md bg-background border px-3 py-2 text-sm font-mono break-all select-all">
                      {generatedKey}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(generatedKey)}
                      className="flex-shrink-0"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    setGeneratedKey(null);
                    setShowGenerate(false);
                  }}
                >
                  Done
                </Button>
              </div>
            ) : (
              /* Key generation form */
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="keyName">Key Name</Label>
                    <Input
                      id="keyName"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      placeholder="e.g., Engineering Laptops, Finance Team"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="keyExpiration">Expiration</Label>
                    <Select
                      id="keyExpiration"
                      value={newKeyExpiration}
                      onChange={(e) => setNewKeyExpiration(e.target.value)}
                    >
                      <option value="never">Never</option>
                      <option value="30">30 days</option>
                      <option value="90">90 days</option>
                      <option value="365">1 year</option>
                    </Select>
                  </div>
                </div>
                <Button
                  onClick={handleGenerate}
                  disabled={generating || !newKeyName.trim()}
                >
                  {generating ? "Generating..." : "Generate Key"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Keys Table */}
      <Card>
        <CardHeader>
          <CardTitle>Existing Keys</CardTitle>
          <CardDescription>
            {keys.length} key{keys.length !== 1 ? "s" : ""} in your
            organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          {keys.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No API keys found. Generate one to get started.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">
                      Name
                    </th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">
                      Key Prefix
                    </th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">
                      Device
                    </th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">
                      Created
                    </th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">
                      Last Used
                    </th>
                    <th className="pb-3 font-medium text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {keys.map((key) => {
                    const status = getKeyStatus(key);
                    return (
                      <tr
                        key={key.id}
                        className="border-b last:border-0 hover:bg-muted/50 transition-colors"
                      >
                        <td className="py-3 pr-4 font-medium">{key.name}</td>
                        <td className="py-3 pr-4">
                          <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                            {key.keyPrefix}...
                          </code>
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground">
                          {key.deviceId ?? "\u2014"}
                        </td>
                        <td className="py-3 pr-4">
                          <Badge variant={statusBadgeVariant(status)}>
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </Badge>
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground">
                          {formatDate(key.createdAt)}
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground">
                          {formatDate(key.lastUsedAt)}
                        </td>
                        <td className="py-3">
                          {status === "active" && (
                            <Button
                              variant="destructive"
                              size="sm"
                              disabled={revokingId === key.id}
                              onClick={() => handleRevoke(key.id)}
                            >
                              {revokingId === key.id
                                ? "Revoking..."
                                : "Revoke"}
                            </Button>
                          )}
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

      {/* Installation Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            Installation Instructions
          </CardTitle>
          <CardDescription>
            Use one of the commands below to install the MyDex agent on a device.
            Replace the API key placeholder with a generated key.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Windows */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Monitor className="h-4 w-4" />
              Windows (PowerShell)
            </Label>
            <div className="relative">
              <pre className="rounded-md bg-muted px-4 py-3 text-sm font-mono overflow-x-auto">
                {`.\\install.ps1 -ApiKey "mdx_xxxxx" -ServerUrl "https://antifascist.work"`}
              </pre>
            </div>
          </div>

          <Separator />

          {/* macOS */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Terminal className="h-4 w-4" />
              macOS
            </Label>
            <div className="relative">
              <pre className="rounded-md bg-muted px-4 py-3 text-sm font-mono overflow-x-auto">
                {`sudo ./install.sh --api-key "mdx_xxxxx" --server "https://antifascist.work"`}
              </pre>
            </div>
          </div>

          <Separator />

          {/* Linux */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Terminal className="h-4 w-4" />
              Linux
            </Label>
            <div className="relative">
              <pre className="rounded-md bg-muted px-4 py-3 text-sm font-mono overflow-x-auto">
                {`sudo ./install.sh --api-key "mdx_xxxxx" --server "https://antifascist.work"`}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
