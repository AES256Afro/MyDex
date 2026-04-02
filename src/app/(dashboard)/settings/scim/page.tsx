"use client";

import { useState, useEffect, useCallback } from "react";
import { useRequireRole } from "@/hooks/use-require-role";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Users,
  Plus,
  Trash2,
  Copy,
  Check,
  Loader2,
  RefreshCw,
  Shield,
  ExternalLink,
  AlertTriangle,
  KeyRound,
  Clock,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────

interface ScimToken {
  id: string;
  provider: string;
  description: string | null;
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
  tokenPreview: string;
}

interface ScimEvent {
  id: string;
  provider: string;
  action: string;
  externalId: string | null;
  userId: string | null;
  email: string | null;
  success: boolean;
  errorMessage: string | null;
  createdAt: string;
}

// ── Helpers ────────────────────────────────────────────────────────────

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  CREATE_USER: { label: "Created", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  UPDATE_USER: { label: "Updated", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  DEACTIVATE_USER: { label: "Deactivated", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
  REACTIVATE_USER: { label: "Reactivated", color: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" },
};

const PROVIDER_INFO: Record<string, { label: string; color: string }> = {
  slack: { label: "Slack", color: "bg-purple-500" },
  teams: { label: "Microsoft Teams", color: "bg-blue-500" },
  okta: { label: "Okta", color: "bg-indigo-500" },
  entra: { label: "Microsoft Entra ID", color: "bg-blue-600" },
};

// ── Page Component ─────────────────────────────────────────────────────

export default function ScimSettingsPage() {
  const { authorized } = useRequireRole("ADMIN");
  const [tokens, setTokens] = useState<ScimToken[]>([]);
  const [events, setEvents] = useState<ScimEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [newProvider, setNewProvider] = useState("slack");
  const [newDescription, setNewDescription] = useState("");
  const [showNewTokenForm, setShowNewTokenForm] = useState(false);
  const [newlyCreatedToken, setNewlyCreatedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [tokensRes, eventsRes] = await Promise.all([
        fetch("/api/v1/scim/tokens"),
        fetch("/api/v1/scim/events"),
      ]);
      if (tokensRes.ok) {
        const data = await tokensRes.json();
        setTokens(data.tokens || []);
      }
      if (eventsRes.ok) {
        const data = await eventsRes.json();
        setEvents(data.events || []);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleGenerate() {
    setGenerating(true);
    setNewlyCreatedToken(null);
    try {
      const res = await fetch("/api/v1/scim/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: newProvider, description: newDescription || undefined }),
      });
      if (res.ok) {
        const data = await res.json();
        setNewlyCreatedToken(data.token);
        setShowNewTokenForm(false);
        setNewDescription("");
        fetchData();
      }
    } catch {
      // silently fail
    } finally {
      setGenerating(false);
    }
  }

  async function handleRevoke(id: string) {
    setDeleting(id);
    try {
      await fetch("/api/v1/scim/tokens", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      fetchData();
    } catch {
      // silently fail
    } finally {
      setDeleting(null);
    }
  }

  function handleCopy() {
    if (newlyCreatedToken) {
      navigator.clipboard.writeText(newlyCreatedToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (!authorized) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Users className="h-7 w-7" /> SCIM Provisioning
        </h1>
        <p className="text-muted-foreground mt-1">
          Automate user provisioning and deprovisioning from your identity provider
        </p>
      </div>

      {/* How it works */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">How SCIM Provisioning Works</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            SCIM (System for Cross-domain Identity Management) lets your identity provider
            automatically create, update, and deactivate user accounts in MyDex.
          </p>
          <div className="grid gap-3 md:grid-cols-3 mt-3">
            <div className="rounded-lg border p-3">
              <div className="font-medium text-foreground mb-1">1. Generate Token</div>
              <p>Create a SCIM bearer token below for your IdP.</p>
            </div>
            <div className="rounded-lg border p-3">
              <div className="font-medium text-foreground mb-1">2. Configure IdP</div>
              <p>Enter the SCIM endpoint URL and token in your IdP settings.</p>
            </div>
            <div className="rounded-lg border p-3">
              <div className="font-medium text-foreground mb-1">3. Auto-Sync</div>
              <p>Users are automatically provisioned and deprovisioned.</p>
            </div>
          </div>
          <div className="mt-3 p-3 rounded-lg bg-muted/50">
            <p className="text-xs font-medium text-foreground mb-1">SCIM Endpoint URL</p>
            <code className="text-xs bg-muted px-2 py-1 rounded">
              {typeof window !== "undefined" ? window.location.origin : "https://mydexnow.com"}/api/v1/scim
            </code>
          </div>
        </CardContent>
      </Card>

      {/* Newly created token */}
      {newlyCreatedToken && (
        <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <p className="font-medium text-sm">Save this token — it will not be shown again</p>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-muted px-3 py-2 rounded flex-1 break-all">{newlyCreatedToken}</code>
                  <Button size="sm" variant="outline" onClick={handleCopy} className="gap-1.5 flex-shrink-0">
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tokens */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">SCIM Tokens</CardTitle>
            <CardDescription>Bearer tokens for identity provider integrations</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={fetchData} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Button size="sm" onClick={() => setShowNewTokenForm(true)}>
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Generate Token
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showNewTokenForm && (
            <div className="mb-4 p-4 rounded-lg border bg-muted/30 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-sm">Provider</Label>
                  <select
                    value={newProvider}
                    onChange={(e) => setNewProvider(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring mt-1"
                  >
                    <option value="slack">Slack</option>
                    <option value="teams">Microsoft Teams</option>
                    <option value="okta">Okta</option>
                    <option value="entra">Microsoft Entra ID</option>
                  </select>
                </div>
                <div>
                  <Label className="text-sm">Description (optional)</Label>
                  <Input
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="e.g. Production SCIM token"
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleGenerate} disabled={generating}>
                  {generating ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5 mr-1.5" />}
                  Generate
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowNewTokenForm(false)}>Cancel</Button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : tokens.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <KeyRound className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No SCIM tokens configured</p>
              <p className="text-xs mt-1">Generate a token to connect your identity provider</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tokens.map((token) => {
                const info = PROVIDER_INFO[token.provider] || { label: token.provider, color: "bg-gray-500" };
                return (
                  <div key={token.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-lg ${info.color} flex items-center justify-center text-white text-xs font-bold`}>
                        {info.label[0]}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{info.label}</span>
                          <Badge variant={token.isActive ? "default" : "secondary"}>
                            {token.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                          <span>Token: {token.tokenPreview}</span>
                          {token.description && <span>{token.description}</span>}
                          {token.lastUsedAt && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" /> Last used {relativeTime(token.lastUsedAt)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                      onClick={() => handleRevoke(token.id)}
                      disabled={deleting === token.id}
                    >
                      {deleting === token.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Provisioning Events */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Provisioning Activity</CardTitle>
          <CardDescription>Recent SCIM operations from your identity provider</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No provisioning events yet</p>
              <p className="text-xs mt-1">Events will appear here once your IdP starts syncing users</p>
            </div>
          ) : (
            <div className="space-y-2">
              {events.map((event) => {
                const actionInfo = ACTION_LABELS[event.action] || { label: event.action, color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200" };
                return (
                  <div key={event.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                    <div className="flex items-center gap-3">
                      <Badge className={actionInfo.color}>{actionInfo.label}</Badge>
                      <div>
                        <span className="font-medium">{event.email || event.externalId || "Unknown user"}</span>
                        {!event.success && event.errorMessage && (
                          <span className="text-red-600 ml-2 text-xs">Error: {event.errorMessage}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{event.provider}</span>
                      <span>{relativeTime(event.createdAt)}</span>
                      {event.success ? (
                        <Check className="h-3.5 w-3.5 text-green-500" />
                      ) : (
                        <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Documentation links */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Setup Guides</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            {[
              { provider: "Okta", url: "https://help.okta.com/en-us/content/topics/apps/apps_app_integration_wizard_scim.htm" },
              { provider: "Microsoft Entra ID", url: "https://learn.microsoft.com/en-us/entra/identity/app-provisioning/use-scim-to-provision-users-and-groups" },
              { provider: "OneLogin", url: "https://developers.onelogin.com/scim" },
              { provider: "JumpCloud", url: "https://support.jumpcloud.com/s/article/getting-started-scim-integration" },
            ].map((guide) => (
              <a
                key={guide.provider}
                href={guide.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg border p-3 hover:bg-muted/50 transition-colors text-sm"
              >
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
                <span>{guide.provider} SCIM Setup Guide</span>
              </a>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
