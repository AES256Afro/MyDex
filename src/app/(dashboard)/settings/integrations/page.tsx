"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { MessageSquare, Video, CheckCircle, XCircle, Send, Loader2, Key, Copy, Trash2, Shield, Clock } from "lucide-react";

interface IntegrationData {
  provider: string;
  enabled: boolean;
  webhookUrl: string;
  channelName: string;
  settings: Record<string, boolean>;
}

const EVENT_OPTIONS = [
  { key: "security_alerts", label: "Security Alerts", desc: "Critical, high, and medium severity alerts" },
  { key: "device_offline", label: "Device Offline", desc: "When a device goes offline for extended period" },
  { key: "clock_summary", label: "Clock In/Out Summary", desc: "Daily org-wide attendance summary" },
  { key: "ticket_created", label: "Support Ticket Created", desc: "New IT support tickets" },
  { key: "compliance_change", label: "Compliance Status Change", desc: "SOC 2 compliance changes" },
];

function IntegrationCard({
  provider,
  icon: Icon,
  color,
  data,
  onChange,
  onSave,
  onTest,
  saving,
  testing,
  instructions,
}: {
  provider: string;
  icon: typeof MessageSquare;
  color: string;
  data: IntegrationData;
  onChange: (updates: Partial<IntegrationData>) => void;
  onSave: () => void;
  onTest: () => void;
  saving: boolean;
  testing: boolean;
  instructions: string[];
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${color}`}>
              <Icon className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg capitalize">{provider}</CardTitle>
              <p className="text-sm text-muted-foreground">
                Send notifications to {provider === "slack" ? "Slack channels" : "Teams channels"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {data.enabled && data.webhookUrl ? (
              <Badge variant="success" className="gap-1">
                <CheckCircle className="h-3 w-3" /> Connected
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1">
                <XCircle className="h-3 w-3" /> Disconnected
              </Badge>
            )}
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={data.enabled}
                onChange={(e) => onChange({ enabled: e.target.checked })}
              />
              <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium">Webhook URL</label>
          <Input
            value={data.webhookUrl}
            onChange={(e) => onChange({ webhookUrl: e.target.value })}
            placeholder={`https://hooks.${provider === "slack" ? "slack.com/services/..." : "office.com/webhookb2/..."}`}
            className="mt-1 font-mono text-xs"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Channel Name (optional)</label>
          <Input
            value={data.channelName}
            onChange={(e) => onChange({ channelName: e.target.value })}
            placeholder={provider === "slack" ? "#security-alerts" : "General"}
            className="mt-1"
          />
        </div>

        {/* Event notification checkboxes */}
        <div>
          <label className="text-sm font-medium block mb-2">Event Notifications</label>
          <div className="space-y-2">
            {EVENT_OPTIONS.map((opt) => (
              <label key={opt.key} className="flex items-start gap-3 cursor-pointer p-2 rounded hover:bg-muted/50">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-input dark:border-gray-600"
                  checked={data.settings[opt.key] ?? true}
                  onChange={(e) =>
                    onChange({ settings: { ...data.settings, [opt.key]: e.target.checked } })
                  }
                />
                <div>
                  <div className="text-sm font-medium">{opt.label}</div>
                  <div className="text-xs text-muted-foreground">{opt.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Setup instructions */}
        <div className="rounded-lg border bg-muted/30 p-3">
          <p className="text-xs font-medium text-muted-foreground mb-2">Setup Instructions:</p>
          <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
            {instructions.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </div>

        <div className="flex gap-2">
          <Button onClick={onSave} disabled={saving} className="flex-1">
            {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving...</> : "Save"}
          </Button>
          <Button
            variant="outline"
            onClick={onTest}
            disabled={testing || !data.webhookUrl || !data.enabled}
          >
            {testing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
            Test
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface ScimTokenData {
  id: string;
  provider: string;
  description: string;
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
  tokenPreview: string;
}

interface ScimEventData {
  id: string;
  provider: string;
  action: string;
  email: string | null;
  success: boolean;
  errorMessage: string | null;
  createdAt: string;
}

function ScimProvisioningSection() {
  const [tokens, setTokens] = useState<ScimTokenData[]>([]);
  const [events, setEvents] = useState<ScimEventData[]>([]);
  const [generatingSlack, setGeneratingSlack] = useState(false);
  const [generatingTeams, setGeneratingTeams] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [showEvents, setShowEvents] = useState(false);

  useEffect(() => {
    fetch("/api/v1/scim/tokens").then(r => r.json()).then(d => setTokens(d.tokens || [])).catch(() => {});
  }, []);

  async function generateToken(provider: "slack" | "teams") {
    const setGen = provider === "slack" ? setGeneratingSlack : setGeneratingTeams;
    setGen(true);
    try {
      const res = await fetch("/api/v1/scim/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      const data = await res.json();
      if (res.ok) {
        setNewToken(data.token);
        toast.success(`${provider} SCIM token generated`);
        // Refresh token list
        const r2 = await fetch("/api/v1/scim/tokens");
        const d2 = await r2.json();
        setTokens(d2.tokens || []);
      } else {
        toast.error(data.error || "Failed to generate token");
      }
    } catch { toast.error("Network error"); }
    finally { setGen(false); }
  }

  async function revokeToken(id: string) {
    try {
      const res = await fetch("/api/v1/scim/tokens", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        toast.success("Token revoked");
        setTokens(t => t.filter(tk => tk.id !== id));
      } else toast.error("Failed to revoke");
    } catch { toast.error("Network error"); }
  }

  async function loadEvents() {
    setShowEvents(!showEvents);
    if (!showEvents) {
      const res = await fetch("/api/v1/scim/events");
      const data = await res.json();
      setEvents(data.events || []);
    }
  }

  function copyToken() {
    if (newToken) {
      navigator.clipboard.writeText(newToken);
      toast.success("Token copied to clipboard");
    }
  }

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://mydexnow.com";

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Shield className="h-5 w-5" /> SCIM Provisioning
        </h2>
        <p className="text-sm text-muted-foreground">
          Automatically sync users from Slack or Microsoft Teams using SCIM 2.0
        </p>
      </div>

      {/* SCIM endpoint info */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          <div>
            <label className="text-sm font-medium">SCIM Base URL</label>
            <div className="flex items-center gap-2 mt-1">
              <code className="flex-1 px-3 py-2 bg-muted rounded text-sm font-mono">
                {baseUrl}/api/v1/scim
              </code>
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  navigator.clipboard.writeText(`${baseUrl}/api/v1/scim`);
                  toast.success("URL copied");
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">How to set up SCIM provisioning:</p>
            <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Generate a SCIM token below for your provider (Slack or Teams)</li>
              <li>In your provider&apos;s admin settings, find the SCIM/Provisioning section</li>
              <li>Enter the SCIM Base URL above and paste the Bearer token</li>
              <li>Enable provisioning — users will be automatically synced</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* Token generation */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded bg-[#611f69]">
                <MessageSquare className="h-4 w-4 text-white" />
              </div>
              <CardTitle className="text-base">Slack SCIM</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {tokens.find(t => t.provider === "slack") ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                    {tokens.find(t => t.provider === "slack")?.tokenPreview}
                  </code>
                  <div className="flex gap-1">
                    <Badge variant="success" className="text-xs">Active</Badge>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => revokeToken(tokens.find(t => t.provider === "slack")!.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                {tokens.find(t => t.provider === "slack")?.lastUsedAt && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Last used: {new Date(tokens.find(t => t.provider === "slack")!.lastUsedAt!).toLocaleDateString()}
                  </p>
                )}
                <Button variant="outline" size="sm" className="w-full" onClick={() => generateToken("slack")} disabled={generatingSlack}>
                  {generatingSlack ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Key className="h-4 w-4 mr-2" />}
                  Regenerate Token
                </Button>
              </div>
            ) : (
              <Button className="w-full" onClick={() => generateToken("slack")} disabled={generatingSlack}>
                {generatingSlack ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Key className="h-4 w-4 mr-2" />}
                Generate Slack SCIM Token
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded bg-[#464EB8]">
                <Video className="h-4 w-4 text-white" />
              </div>
              <CardTitle className="text-base">Teams SCIM</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {tokens.find(t => t.provider === "teams") ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                    {tokens.find(t => t.provider === "teams")?.tokenPreview}
                  </code>
                  <div className="flex gap-1">
                    <Badge variant="success" className="text-xs">Active</Badge>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => revokeToken(tokens.find(t => t.provider === "teams")!.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                {tokens.find(t => t.provider === "teams")?.lastUsedAt && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Last used: {new Date(tokens.find(t => t.provider === "teams")!.lastUsedAt!).toLocaleDateString()}
                  </p>
                )}
                <Button variant="outline" size="sm" className="w-full" onClick={() => generateToken("teams")} disabled={generatingTeams}>
                  {generatingTeams ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Key className="h-4 w-4 mr-2" />}
                  Regenerate Token
                </Button>
              </div>
            ) : (
              <Button className="w-full" onClick={() => generateToken("teams")} disabled={generatingTeams}>
                {generatingTeams ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Key className="h-4 w-4 mr-2" />}
                Generate Teams SCIM Token
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Show new token banner */}
      {newToken && (
        <Card className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="pt-4">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">
              Save this token now — it will not be shown again
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 bg-white dark:bg-background rounded text-xs font-mono break-all border">
                {newToken}
              </code>
              <Button variant="outline" size="icon" onClick={copyToken}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="ghost" size="sm" className="mt-2" onClick={() => setNewToken(null)}>
              Dismiss
            </Button>
          </CardContent>
        </Card>
      )}

      {/* SCIM events audit log */}
      <Button variant="outline" onClick={loadEvents}>
        {showEvents ? "Hide" : "Show"} Provisioning Activity Log
      </Button>

      {showEvents && events.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {events.map((evt) => (
                <div key={evt.id} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                  <div className="flex items-center gap-2">
                    <Badge variant={evt.success ? "success" : "destructive"} className="text-[10px] px-1.5">
                      {evt.success ? "OK" : "ERR"}
                    </Badge>
                    <span className="font-mono text-xs">{evt.action}</span>
                    {evt.email && <span className="text-muted-foreground">{evt.email}</span>}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="text-[10px]">{evt.provider}</Badge>
                    {new Date(evt.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {showEvents && events.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">No provisioning events yet</p>
      )}
    </div>
  );
}

export default function IntegrationsPage() {
  const [slack, setSlack] = useState<IntegrationData>({
    provider: "slack", enabled: false, webhookUrl: "", channelName: "",
    settings: { security_alerts: true, device_offline: true, clock_summary: false, ticket_created: true, compliance_change: true },
  });
  const [teams, setTeams] = useState<IntegrationData>({
    provider: "teams", enabled: false, webhookUrl: "", channelName: "",
    settings: { security_alerts: true, device_offline: true, clock_summary: false, ticket_created: true, compliance_change: true },
  });
  const [savingSlack, setSavingSlack] = useState(false);
  const [savingTeams, setSavingTeams] = useState(false);
  const [testingSlack, setTestingSlack] = useState(false);
  const [testingTeams, setTestingTeams] = useState(false);

  useEffect(() => {
    fetch("/api/v1/integrations")
      .then((r) => r.json())
      .then((data) => {
        for (const i of data.integrations || []) {
          const d: IntegrationData = {
            provider: i.provider,
            enabled: i.enabled,
            webhookUrl: i.webhookUrl || "",
            channelName: i.channelName || "",
            settings: (i.settings as Record<string, boolean>) || {},
          };
          if (i.provider === "slack") setSlack(d);
          if (i.provider === "teams") setTeams(d);
        }
      })
      .catch(() => {});
  }, []);

  async function save(provider: string, data: IntegrationData) {
    const setSaving = provider === "slack" ? setSavingSlack : setSavingTeams;
    setSaving(true);
    try {
      const res = await fetch("/api/v1/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          webhookUrl: data.webhookUrl,
          channelName: data.channelName,
          enabled: data.enabled,
          settings: data.settings,
        }),
      });
      if (res.ok) toast.success(`${provider} integration saved`);
      else toast.error(`Failed to save ${provider} integration`);
    } catch { toast.error("Network error"); }
    finally { setSaving(false); }
  }

  async function test(provider: string) {
    const setTesting = provider === "slack" ? setTestingSlack : setTestingTeams;
    setTesting(true);
    try {
      const res = await fetch(`/api/v1/integrations/${provider}/test`, { method: "POST" });
      const data = await res.json();
      if (res.ok) toast.success("Test message sent! Check your channel.");
      else toast.error(data.error || "Test failed");
    } catch { toast.error("Network error"); }
    finally { setTesting(false); }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Integrations</h1>
        <p className="text-muted-foreground">
          Connect MyDex to your team communication tools for real-time notifications
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <IntegrationCard
          provider="slack"
          icon={MessageSquare}
          color="bg-[#611f69]"
          data={slack}
          onChange={(u) => setSlack((p) => ({ ...p, ...u }))}
          onSave={() => save("slack", slack)}
          onTest={() => test("slack")}
          saving={savingSlack}
          testing={testingSlack}
          instructions={[
            "Go to api.slack.com/apps and create a new app (or use an existing one)",
            "Navigate to Incoming Webhooks and activate them",
            "Click 'Add New Webhook to Workspace' and select a channel",
            "Copy the webhook URL and paste it above",
          ]}
        />

        <IntegrationCard
          provider="teams"
          icon={Video}
          color="bg-[#464EB8]"
          data={teams}
          onChange={(u) => setTeams((p) => ({ ...p, ...u }))}
          onSave={() => save("teams", teams)}
          onTest={() => test("teams")}
          saving={savingTeams}
          testing={testingTeams}
          instructions={[
            "Open the Teams channel where you want notifications",
            "Click the ··· menu > Manage channel > Connectors",
            "Find 'Incoming Webhook' and click Configure",
            "Name it 'MyDex', copy the webhook URL, and paste it above",
          ]}
        />
      </div>

      {/* SCIM Provisioning Section */}
      <ScimProvisioningSection />
    </div>
  );
}
