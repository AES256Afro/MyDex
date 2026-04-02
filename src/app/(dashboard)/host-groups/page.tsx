"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Server, Shield, Globe, Plus, Trash2, ChevronDown, ChevronRight,
  Monitor, AlertTriangle, CheckCircle, XCircle, Flame, Upload, X,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Device {
  id: string;
  hostname: string;
  status: string;
  ipAddress: string | null;
  platform: string;
}

interface HostGroupMember {
  id: string;
  device: Device;
}

interface Policy {
  id: string;
  policyType: "DOMAIN_BLOCK" | "FIREWALL";
  action: "BLOCK" | "LOG" | "WARN";
  direction: string | null;
  protocol: string | null;
  port: string | null;
  remoteAddress: string | null;
  description: string | null;
  isActive: boolean;
  blocklist: { id: string; name: string; category: string | null } | null;
  hostGroup: { id: string; name: string };
}

interface HostGroup {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  department: { id: string; name: string } | null;
  members: HostGroupMember[];
  policies: Policy[];
  _count: { members: number; policies: number };
}

interface Blocklist {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  domains: string[];
  isActive: boolean;
  _count: { policies: number };
  policies: { hostGroup: { id: string; name: string } }[];
}

// ─── Preset Blocklists ──────────────────────────────────────────────────────

// ─── Public Blocklist Sources ────────────────────────────────────────────────

const PUBLIC_BLOCKLIST_SOURCES = [
  {
    name: "StevenBlack Unified Hosts",
    category: "Malware & Ads",
    description: "Adware, malware, and trackers from multiple curated sources",
    url: "https://raw.githubusercontent.com/StevenBlack/hosts/master/hosts",
    parser: "hosts",
  },
  {
    name: "OISD Big (Full)",
    category: "Ads & Tracking",
    description: "One of the most comprehensive domain blocklists",
    url: "https://big.oisd.nl/domainswild",
    parser: "domains",
  },
  {
    name: "Phishing Army",
    category: "Phishing",
    description: "Known phishing domains, updated regularly",
    url: "https://phishing.army/download/phishing_army_blocklist.txt",
    parser: "domains",
  },
  {
    name: "URLhaus Malware",
    category: "Malware",
    description: "Active malware distribution domains from abuse.ch",
    url: "https://urlhaus.abuse.ch/downloads/hostfile/",
    parser: "hosts",
  },
  {
    name: "NoTracking",
    category: "Tracking",
    description: "Blocks ads, trackers, and mining domains",
    url: "https://raw.githubusercontent.com/notracking/hosts-blocklists/master/dnscrypt-proxy/dnscrypt-proxy.blacklist.txt",
    parser: "domains",
  },
  {
    name: "Energized Basic",
    category: "Ads & Tracking",
    description: "Lightweight blocklist for ads and trackers",
    url: "https://energized.pro/basic/formats/domains.txt",
    parser: "domains",
  },
  {
    name: "Dan Pollock's Hosts",
    category: "Ads & Malware",
    description: "Long-running curated ad/malware blocklist",
    url: "https://someonewhocares.org/hosts/zero/hosts",
    parser: "hosts",
  },
  {
    name: "Feodo Tracker C2 IPs",
    category: "C2 Servers",
    description: "Botnet command & control server IPs from abuse.ch",
    url: "https://feodotracker.abuse.ch/downloads/ipblocklist.txt",
    parser: "ips",
  },
  {
    name: "Emerging Threats IPs",
    category: "Compromised IPs",
    description: "Known compromised IPs and hostile networks",
    url: "https://rules.emergingthreats.net/blockrules/compromised-ips.txt",
    parser: "ips",
  },
];

const PRESET_BLOCKLISTS: { name: string; category: string; domains: string[] }[] = [
  {
    name: "Social Media",
    category: "Social Media",
    domains: ["facebook.com", "instagram.com", "twitter.com", "x.com", "tiktok.com", "snapchat.com", "reddit.com", "tumblr.com", "pinterest.com", "linkedin.com"],
  },
  {
    name: "Gaming",
    category: "Gaming",
    domains: ["steampowered.com", "store.steampowered.com", "epicgames.com", "twitch.tv", "roblox.com", "minecraft.net", "ea.com", "battle.net", "discord.com"],
  },
  {
    name: "Streaming",
    category: "Entertainment",
    domains: ["netflix.com", "hulu.com", "disneyplus.com", "youtube.com", "crunchyroll.com", "hbomax.com", "peacocktv.com", "paramountplus.com", "spotify.com"],
  },
  {
    name: "Shopping",
    category: "Shopping",
    domains: ["amazon.com", "ebay.com", "etsy.com", "wish.com", "aliexpress.com", "shopify.com", "walmart.com", "target.com"],
  },
  {
    name: "News & Media",
    category: "News",
    domains: ["cnn.com", "foxnews.com", "bbc.com", "nytimes.com", "washingtonpost.com", "reuters.com", "buzzfeed.com", "huffpost.com"],
  },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function HostGroupsPage() {
  const [hostGroups, setHostGroups] = useState<HostGroup[]>([]);
  const [blocklists, setBlocklists] = useState<Blocklist[]>([]);
  const [allDevices, setAllDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"groups" | "blocklists">("groups");
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  // Create forms
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showCreateBlocklist, setShowCreateBlocklist] = useState(false);
  const [showCreatePolicy, setShowCreatePolicy] = useState<string | null>(null); // hostGroupId
  const [showBulkDomains, setShowBulkDomains] = useState(false);
  const [managingDevicesFor, setManagingDevicesFor] = useState<string | null>(null);
  const [managingDeviceIds, setManagingDeviceIds] = useState<string[]>([]);
  const [expandedBlocklist, setExpandedBlocklist] = useState<string | null>(null);
  const [editingBlocklistEntries, setEditingBlocklistEntries] = useState<string[]>([]);
  const [newEntry, setNewEntry] = useState("");

  // Form state
  const [groupForm, setGroupForm] = useState({ name: "", description: "", deviceIds: [] as string[] });
  const [blocklistForm, setBlocklistForm] = useState({ name: "", description: "", category: "Custom", domains: [] as string[], newDomain: "" });
  const [policyForm, setPolicyForm] = useState({
    policyType: "DOMAIN_BLOCK" as "DOMAIN_BLOCK" | "FIREWALL",
    blocklistId: "",
    action: "BLOCK" as "BLOCK" | "LOG" | "WARN",
    direction: "outbound",
    protocol: "TCP",
    port: "",
    remoteAddress: "",
    description: "",
  });
  const [bulkText, setBulkText] = useState("");

  async function fetchAll() {
    setLoading(true);
    try {
      const [groupsRes, blocklistsRes, devicesRes] = await Promise.all([
        fetch("/api/v1/host-groups"),
        fetch("/api/v1/domain-blocklists"),
        fetch("/api/v1/agents/devices"),
      ]);

      if (groupsRes.ok) {
        const data = await groupsRes.json();
        setHostGroups(data.hostGroups || []);
      }
      if (blocklistsRes.ok) {
        const data = await blocklistsRes.json();
        setBlocklists(data.blocklists || []);
      }
      if (devicesRes.ok) {
        const data = await devicesRes.json();
        setAllDevices((data.devices || []).map((d: Device & Record<string, unknown>) => ({
          id: d.id, hostname: d.hostname, status: d.status, ipAddress: d.ipAddress, platform: d.platform,
        })));
      }
    } catch (err) {
      console.error("Failed to fetch:", err);
    }
    setLoading(false);
  }

  useEffect(() => { fetchAll(); }, []);

  // ─── Host Group CRUD ────────────────────────────────────────────────────

  async function createGroup() {
    const res = await fetch("/api/v1/host-groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(groupForm),
    });
    if (res.ok) {
      setShowCreateGroup(false);
      setGroupForm({ name: "", description: "", deviceIds: [] });
      fetchAll();
    } else {
      const data = await res.json();
      alert(data.error || "Failed to create");
    }
  }

  async function deleteGroup(id: string) {
    if (!confirm("Delete this host group and all its policies?")) return;
    await fetch(`/api/v1/host-groups?id=${id}`, { method: "DELETE" });
    fetchAll();
  }

  function startManagingDevices(group: HostGroup) {
    setManagingDevicesFor(group.id);
    setManagingDeviceIds(group.members.map((m) => m.device.id));
  }

  function toggleManagedDevice(deviceId: string) {
    setManagingDeviceIds((prev) =>
      prev.includes(deviceId) ? prev.filter((id) => id !== deviceId) : [...prev, deviceId]
    );
  }

  async function saveGroupDevices(groupId: string) {
    const res = await fetch("/api/v1/host-groups", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: groupId, deviceIds: managingDeviceIds }),
    });
    if (res.ok) {
      setManagingDevicesFor(null);
      fetchAll();
    } else {
      const data = await res.json();
      alert(data.error || "Failed to update devices");
    }
  }

  // ─── Blocklist CRUD ─────────────────────────────────────────────────────

  async function createBlocklist() {
    const res = await fetch("/api/v1/domain-blocklists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(blocklistForm),
    });
    if (res.ok) {
      setShowCreateBlocklist(false);
      setBlocklistForm({ name: "", description: "", category: "Custom", domains: [], newDomain: "" });
      fetchAll();
    } else {
      const data = await res.json();
      alert(data.error || "Failed to create");
    }
  }

  async function createPresetBlocklist(preset: typeof PRESET_BLOCKLISTS[0]) {
    const res = await fetch("/api/v1/domain-blocklists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: preset.name, category: preset.category, domains: preset.domains }),
    });
    if (res.ok) fetchAll();
    else {
      const data = await res.json();
      alert(data.error || "Failed to create");
    }
  }

  async function toggleBlocklist(id: string, isActive: boolean) {
    await fetch("/api/v1/domain-blocklists", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isActive: !isActive }),
    });
    fetchAll();
  }

  async function deleteBlocklist(id: string) {
    if (!confirm("Delete this blocklist?")) return;
    await fetch(`/api/v1/domain-blocklists?id=${id}`, { method: "DELETE" });
    fetchAll();
  }

  // ─── Policy CRUD ────────────────────────────────────────────────────────

  async function createPolicy(hostGroupId: string) {
    const payload: Record<string, unknown> = {
      hostGroupId,
      policyType: policyForm.policyType,
      action: policyForm.action,
      description: policyForm.description || undefined,
    };
    if (policyForm.policyType === "DOMAIN_BLOCK") {
      payload.blocklistId = policyForm.blocklistId;
    } else {
      payload.direction = policyForm.direction;
      payload.protocol = policyForm.protocol;
      payload.port = policyForm.port || undefined;
      payload.remoteAddress = policyForm.remoteAddress || undefined;
    }

    const res = await fetch("/api/v1/domain-blocklists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setShowCreatePolicy(null);
      setPolicyForm({ policyType: "DOMAIN_BLOCK", blocklistId: "", action: "BLOCK", direction: "outbound", protocol: "TCP", port: "", remoteAddress: "", description: "" });
      fetchAll();
    }
  }

  async function deletePolicy(policyId: string) {
    await fetch(`/api/v1/domain-blocklists?policyId=${policyId}`, { method: "DELETE" });
    fetchAll();
  }

  // ─── Bulk domain import ─────────────────────────────────────────────────

  function handleBulkImport() {
    const lines = bulkText.split(/[\n,;]+/).map((l) => l.trim()).filter(Boolean);
    const uniqueDomains = [...new Set([...blocklistForm.domains, ...lines])];
    setBlocklistForm({ ...blocklistForm, domains: uniqueDomains });
    setBulkText("");
    setShowBulkDomains(false);
  }

  function addDomain() {
    const d = blocklistForm.newDomain.trim().toLowerCase();
    if (d && !blocklistForm.domains.includes(d)) {
      setBlocklistForm({ ...blocklistForm, domains: [...blocklistForm.domains, d], newDomain: "" });
    }
  }

  function isIpAddress(entry: string) {
    return /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/.test(entry) || entry.includes(":");
  }

  // Save edited entries back to the blocklist
  async function saveBlocklistEntries(blocklistId: string) {
    const res = await fetch("/api/v1/domain-blocklists", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: blocklistId, domains: editingBlocklistEntries }),
    });
    if (res.ok) {
      setExpandedBlocklist(null);
      fetchAll();
    }
  }

  function addEntryToEditing() {
    const entry = newEntry.trim().toLowerCase();
    if (entry && !editingBlocklistEntries.includes(entry)) {
      setEditingBlocklistEntries([...editingBlocklistEntries, entry]);
      setNewEntry("");
    }
  }

  function removeEntryFromEditing(entry: string) {
    setEditingBlocklistEntries(editingBlocklistEntries.filter((e) => e !== entry));
  }

  const [importingSource, setImportingSource] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  async function importPublicBlocklist(source: typeof PUBLIC_BLOCKLIST_SOURCES[0]) {
    setImportingSource(source.name);
    setImportStatus(`Fetching ${source.name}...`);

    try {
      const res = await fetch(`/api/v1/domain-blocklists`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          importUrl: source.url,
          parser: source.parser,
          name: source.name,
          category: source.category,
          description: source.description,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setImportStatus(`Imported ${(data.blocklist?.domains as string[])?.length || 0} entries`);
        fetchAll();
      } else {
        const data = await res.json();
        setImportStatus(`Error: ${data.error}`);
      }
    } catch (err) {
      setImportStatus(`Failed: ${err}`);
    }
    setTimeout(() => { setImportingSource(null); setImportStatus(null); }, 3000);
  }

  function expandBlocklist(bl: Blocklist) {
    if (expandedBlocklist === bl.id) {
      setExpandedBlocklist(null);
    } else {
      setExpandedBlocklist(bl.id);
      setEditingBlocklistEntries([...(bl.domains as string[])]);
      setNewEntry("");
    }
  }

  // ─── Toggle device in group form ────────────────────────────────────────

  function toggleDevice(deviceId: string) {
    setGroupForm((prev) => ({
      ...prev,
      deviceIds: prev.deviceIds.includes(deviceId)
        ? prev.deviceIds.filter((id) => id !== deviceId)
        : [...prev.deviceIds, deviceId],
    }));
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  const existingBlocklistNames = new Set(blocklists.map((b) => b.name));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" /> Host Groups & Blocklists
          </h1>
          <p className="text-muted-foreground text-sm">Group devices and apply domain blocklists and firewall rules</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2">
        <Button variant={activeTab === "groups" ? "default" : "outline"} onClick={() => setActiveTab("groups")}>
          <Server className="h-4 w-4 mr-2" /> Host Groups ({hostGroups.length})
        </Button>
        <Button variant={activeTab === "blocklists" ? "default" : "outline"} onClick={() => setActiveTab("blocklists")}>
          <Globe className="h-4 w-4 mr-2" /> Domain Blocklists ({blocklists.length})
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : activeTab === "groups" ? (
        /* ═══════════════════════════════════════════════════════════════
           HOST GROUPS TAB
           ═══════════════════════════════════════════════════════════════ */
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowCreateGroup(true)}>
              <Plus className="h-4 w-4 mr-2" /> New Host Group
            </Button>
          </div>

          {/* Create Host Group Form */}
          {showCreateGroup && (
            <Card className="ring-2 ring-primary">
              <CardHeader><CardTitle>Create Host Group</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input value={groupForm.name} onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })} placeholder="Group name (e.g., Finance Workstations)" />
                  <Input value={groupForm.description} onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })} placeholder="Description (optional)" />
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">Select Devices ({groupForm.deviceIds.length} selected)</p>
                  <div className="max-h-48 overflow-y-auto border rounded-md p-2 space-y-1">
                    {allDevices.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">No devices connected</p>
                    ) : (
                      allDevices.map((d) => (
                        <label key={d.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted cursor-pointer">
                          <input type="checkbox" checked={groupForm.deviceIds.includes(d.id)} onChange={() => toggleDevice(d.id)} className="rounded" />
                          <Monitor className="h-3.5 w-3.5 text-blue-500" />
                          <span className="text-sm font-medium">{d.hostname}</span>
                          <Badge variant="outline" className="text-[10px] ml-auto">{d.status}</Badge>
                          <span className="text-xs text-muted-foreground">{d.ipAddress}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={createGroup} disabled={!groupForm.name.trim()}><Plus className="h-4 w-4 mr-1" /> Create</Button>
                  <Button variant="ghost" onClick={() => setShowCreateGroup(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Host Group List */}
          {hostGroups.length === 0 && !showCreateGroup ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Server className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No host groups yet</p>
                <p className="text-muted-foreground text-sm mb-4">Create groups to organize devices and apply policies</p>
                <Button onClick={() => setShowCreateGroup(true)}><Plus className="h-4 w-4 mr-2" /> Create Host Group</Button>
              </CardContent>
            </Card>
          ) : (
            hostGroups.map((group) => (
              <Card key={group.id}>
                <CardContent className="py-4">
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setExpandedGroup(expandedGroup === group.id ? null : group.id)}
                  >
                    <div className="flex items-center gap-3">
                      {expandedGroup === group.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      <Server className="h-5 w-5 text-blue-500" />
                      <div>
                        <div className="font-semibold">{group.name}</div>
                        {group.description && <p className="text-xs text-muted-foreground">{group.description}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline"><Monitor className="h-3 w-3 mr-1" /> {group._count.members} devices</Badge>
                      <Badge variant="outline"><Shield className="h-3 w-3 mr-1" /> {group._count.policies} policies</Badge>
                      <Button size="sm" variant="ghost" className="text-red-600" onClick={(e) => { e.stopPropagation(); deleteGroup(group.id); }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {expandedGroup === group.id && (
                    <div className="mt-4 space-y-4 border-t pt-4">
                      {/* Devices */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-semibold flex items-center gap-1">
                            <Monitor className="h-4 w-4" /> Devices ({group.members.length})
                          </h4>
                          {managingDevicesFor === group.id ? (
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => saveGroupDevices(group.id)}>
                                <CheckCircle className="h-3.5 w-3.5 mr-1" /> Save
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setManagingDevicesFor(null)}>Cancel</Button>
                            </div>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => startManagingDevices(group)}>
                              <Plus className="h-3.5 w-3.5 mr-1" /> Manage Devices
                            </Button>
                          )}
                        </div>

                        {managingDevicesFor === group.id ? (
                          <div className="max-h-52 overflow-y-auto border rounded-md p-2 space-y-1">
                            {allDevices.length === 0 ? (
                              <p className="text-sm text-muted-foreground text-center py-4">No devices connected yet. Install the agent on a device first.</p>
                            ) : (
                              allDevices.map((d) => (
                                <label key={d.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={managingDeviceIds.includes(d.id)}
                                    onChange={() => toggleManagedDevice(d.id)}
                                    className="rounded"
                                  />
                                  <Monitor className="h-3.5 w-3.5 text-blue-500" />
                                  <span className="text-sm font-medium">{d.hostname}</span>
                                  <span className={`w-2 h-2 rounded-full ${d.status === "ONLINE" ? "bg-green-500" : "bg-red-500"}`} />
                                  <Badge variant="outline" className="text-[10px] ml-auto">{d.platform}</Badge>
                                  <span className="text-xs text-muted-foreground">{d.ipAddress}</span>
                                </label>
                              ))
                            )}
                          </div>
                        ) : group.members.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No devices in this group — click &quot;Manage Devices&quot; to add some</p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {group.members.map((m) => (
                              <Badge key={m.id} variant="secondary" className="flex items-center gap-1">
                                <Monitor className="h-3 w-3" />
                                {m.device.hostname}
                                <span className={`w-2 h-2 rounded-full ${m.device.status === "ONLINE" ? "bg-green-500" : "bg-red-500"}`} />
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Applied Policies */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-semibold flex items-center gap-1">
                            <Shield className="h-4 w-4" /> Applied Policies
                          </h4>
                          <Button size="sm" variant="outline" onClick={() => {
                            setShowCreatePolicy(group.id);
                            setPolicyForm({ policyType: "DOMAIN_BLOCK", blocklistId: blocklists[0]?.id || "", action: "BLOCK", direction: "outbound", protocol: "TCP", port: "", remoteAddress: "", description: "" });
                          }}>
                            <Plus className="h-3.5 w-3.5 mr-1" /> Add Policy
                          </Button>
                        </div>

                        {/* Create Policy Form */}
                        {showCreatePolicy === group.id && (
                          <Card className="mb-3 ring-1 ring-primary">
                            <CardContent className="py-3 space-y-3">
                              <div className="flex gap-2">
                                <select
                                  value={policyForm.policyType}
                                  onChange={(e) => setPolicyForm({ ...policyForm, policyType: e.target.value as "DOMAIN_BLOCK" | "FIREWALL" })}
                                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                                >
                                  <option value="DOMAIN_BLOCK">Domain Block</option>
                                  <option value="FIREWALL">Firewall Rule</option>
                                </select>
                                <select
                                  value={policyForm.action}
                                  onChange={(e) => setPolicyForm({ ...policyForm, action: e.target.value as "BLOCK" | "LOG" | "WARN" })}
                                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                                >
                                  <option value="BLOCK">Block</option>
                                  <option value="LOG">Log Only</option>
                                  <option value="WARN">Warn</option>
                                </select>
                              </div>

                              {policyForm.policyType === "DOMAIN_BLOCK" ? (
                                <select
                                  value={policyForm.blocklistId}
                                  onChange={(e) => setPolicyForm({ ...policyForm, blocklistId: e.target.value })}
                                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                                >
                                  <option value="">Select a blocklist...</option>
                                  {blocklists.map((bl) => (
                                    <option key={bl.id} value={bl.id}>{bl.name} ({(bl.domains as string[]).length} domains)</option>
                                  ))}
                                </select>
                              ) : (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                  <select value={policyForm.direction} onChange={(e) => setPolicyForm({ ...policyForm, direction: e.target.value })} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                                    <option value="inbound">Inbound</option>
                                    <option value="outbound">Outbound</option>
                                  </select>
                                  <select value={policyForm.protocol} onChange={(e) => setPolicyForm({ ...policyForm, protocol: e.target.value })} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                                    <option value="TCP">TCP</option>
                                    <option value="UDP">UDP</option>
                                    <option value="ANY">Any</option>
                                  </select>
                                  <Input value={policyForm.port} onChange={(e) => setPolicyForm({ ...policyForm, port: e.target.value })} placeholder="Port (e.g., 3389)" />
                                  <Input value={policyForm.remoteAddress} onChange={(e) => setPolicyForm({ ...policyForm, remoteAddress: e.target.value })} placeholder="IP/CIDR (optional)" />
                                </div>
                              )}

                              <Input value={policyForm.description} onChange={(e) => setPolicyForm({ ...policyForm, description: e.target.value })} placeholder="Description (e.g., Block social media during work hours)" />

                              <div className="flex gap-2">
                                <Button size="sm" onClick={() => createPolicy(group.id)}><Plus className="h-3.5 w-3.5 mr-1" /> Add</Button>
                                <Button size="sm" variant="ghost" onClick={() => setShowCreatePolicy(null)}>Cancel</Button>
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {group.policies.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No policies applied</p>
                        ) : (
                          <div className="space-y-2">
                            {group.policies.map((p) => (
                              <div key={p.id} className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
                                <div className="flex items-center gap-3">
                                  {p.policyType === "DOMAIN_BLOCK" ? (
                                    <Globe className="h-4 w-4 text-orange-500" />
                                  ) : (
                                    <Flame className="h-4 w-4 text-red-500" />
                                  )}
                                  <div>
                                    <div className="text-sm font-medium flex items-center gap-2">
                                      {p.policyType === "DOMAIN_BLOCK" ? (
                                        <>Domain Block: {p.blocklist?.name || "Unknown"}</>
                                      ) : (
                                        <>Firewall: {p.direction} {p.protocol} {p.port || "all ports"}</>
                                      )}
                                      <Badge
                                        className={
                                          p.action === "BLOCK" ? "bg-red-100 text-red-800" :
                                          p.action === "WARN" ? "bg-yellow-100 text-yellow-800" :
                                          "bg-blue-100 text-blue-800"
                                        }
                                      >
                                        {p.action}
                                      </Badge>
                                    </div>
                                    {p.description && <p className="text-xs text-muted-foreground">{p.description}</p>}
                                    {p.remoteAddress && <p className="text-xs text-muted-foreground">Remote: {p.remoteAddress}</p>}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {p.isActive ? (
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                  ) : (
                                    <XCircle className="h-4 w-4 text-red-500" />
                                  )}
                                  <Button size="sm" variant="ghost" className="text-red-600" onClick={() => deletePolicy(p.id)}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      ) : (
        /* ═══════════════════════════════════════════════════════════════
           DOMAIN BLOCKLISTS TAB
           ═══════════════════════════════════════════════════════════════ */
        <div className="space-y-4">
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowCreateBlocklist(true)}>
              <Plus className="h-4 w-4 mr-2" /> Custom Blocklist
            </Button>
          </div>

          {/* Preset Quick-Add */}
          <Card>
            <CardHeader><CardTitle className="text-lg">Quick Add Presets</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {PRESET_BLOCKLISTS.map((preset) => (
                  <Button
                    key={preset.name}
                    size="sm"
                    variant={existingBlocklistNames.has(preset.name) ? "secondary" : "outline"}
                    disabled={existingBlocklistNames.has(preset.name)}
                    onClick={() => createPresetBlocklist(preset)}
                  >
                    {existingBlocklistNames.has(preset.name) ? <CheckCircle className="h-3.5 w-3.5 mr-1" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
                    {preset.name} ({preset.domains.length})
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Public Blocklist Sources */}
          <Card>
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Upload className="h-5 w-5" /> Import from Public Sources</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                Import from well-known, community-maintained blocklists. Supports domains and IP addresses.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {PUBLIC_BLOCKLIST_SOURCES.map((source) => {
                  const alreadyImported = existingBlocklistNames.has(source.name);
                  const isImporting = importingSource === source.name;
                  return (
                    <div key={source.name} className="border rounded-lg p-3 flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold">{source.name}</span>
                        <Badge variant="outline" className="text-[10px]">{source.category}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground flex-1">{source.description}</p>
                      <Button
                        size="sm"
                        variant={alreadyImported ? "secondary" : "outline"}
                        disabled={alreadyImported || isImporting}
                        onClick={() => importPublicBlocklist(source)}
                        className="mt-1 w-full"
                      >
                        {alreadyImported ? (
                          <><CheckCircle className="h-3.5 w-3.5 mr-1" /> Imported</>
                        ) : isImporting ? (
                          <>{importStatus}</>
                        ) : (
                          <><Upload className="h-3.5 w-3.5 mr-1" /> Import</>
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Create Custom Blocklist Form */}
          {showCreateBlocklist && (
            <Card className="ring-2 ring-primary">
              <CardHeader><CardTitle>Create Custom Blocklist</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Input value={blocklistForm.name} onChange={(e) => setBlocklistForm({ ...blocklistForm, name: e.target.value })} placeholder="Blocklist name" />
                  <Input value={blocklistForm.description} onChange={(e) => setBlocklistForm({ ...blocklistForm, description: e.target.value })} placeholder="Description (optional)" />
                  <select
                    value={blocklistForm.category}
                    onChange={(e) => setBlocklistForm({ ...blocklistForm, category: e.target.value })}
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="Custom">Custom</option>
                    <option value="Social Media">Social Media</option>
                    <option value="Gaming">Gaming</option>
                    <option value="Entertainment">Entertainment</option>
                    <option value="Shopping">Shopping</option>
                    <option value="News">News</option>
                    <option value="Adult">Adult</option>
                    <option value="Gambling">Gambling</option>
                    <option value="Malware">Malware</option>
                  </select>
                </div>

                {/* Add domains */}
                <div>
                  <div className="flex gap-2 mb-2">
                    <Input
                      value={blocklistForm.newDomain}
                      onChange={(e) => setBlocklistForm({ ...blocklistForm, newDomain: e.target.value })}
                      placeholder="Add domain or IP (e.g., example.com, 10.0.0.0/8)"
                      onKeyDown={(e) => e.key === "Enter" && addDomain()}
                    />
                    <Button variant="outline" onClick={addDomain}>Add</Button>
                    <Button variant="outline" onClick={() => setShowBulkDomains(!showBulkDomains)}>
                      <Upload className="h-4 w-4 mr-1" /> Bulk
                    </Button>
                  </div>

                  {showBulkDomains && (
                    <div className="mb-2 space-y-2">
                      <textarea
                        value={bulkText}
                        onChange={(e) => setBulkText(e.target.value)}
                        placeholder="Paste domains or IPs, one per line or comma-separated..."
                        className="w-full h-24 rounded-md border border-input bg-background px-3 py-2 text-sm"
                      />
                      <Button size="sm" onClick={handleBulkImport}>Import</Button>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-1.5">
                    {blocklistForm.domains.map((d) => (
                      <Badge key={d} variant="secondary" className="flex items-center gap-1 font-mono text-xs">
                        {d}
                        <button onClick={() => setBlocklistForm({ ...blocklistForm, domains: blocklistForm.domains.filter((x) => x !== d) })}>
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={createBlocklist} disabled={!blocklistForm.name.trim() || blocklistForm.domains.length === 0}>
                    <Plus className="h-4 w-4 mr-1" /> Create ({blocklistForm.domains.length} domains)
                  </Button>
                  <Button variant="ghost" onClick={() => setShowCreateBlocklist(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Blocklist List */}
          {blocklists.length === 0 && !showCreateBlocklist ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Globe className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No blocklists yet</p>
                <p className="text-muted-foreground text-sm mb-4">Create domain blocklists or use presets above</p>
              </CardContent>
            </Card>
          ) : (
            blocklists.map((bl) => {
              const entries = bl.domains as string[];
              const domainCount = entries.filter((e) => !isIpAddress(e)).length;
              const ipCount = entries.filter((e) => isIpAddress(e)).length;
              const isExpanded = expandedBlocklist === bl.id;

              return (
                <Card key={bl.id} className={isExpanded ? "ring-2 ring-primary" : ""}>
                  <CardContent className="py-4">
                    {/* Header — clickable */}
                    <div
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => expandBlocklist(bl)}
                    >
                      <div className="flex items-center gap-3">
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        <Globe className={`h-5 w-5 ${bl.isActive ? "text-orange-500" : "text-muted-foreground"}`} />
                        <div>
                          <div className="font-semibold flex items-center gap-2">
                            {bl.name}
                            <Badge variant="outline" className="text-[10px]">{bl.category}</Badge>
                            {!bl.isActive && <Badge className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-[10px]">Disabled</Badge>}
                          </div>
                          {bl.description && <p className="text-xs text-muted-foreground">{bl.description}</p>}
                          {!isExpanded && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {entries.slice(0, 6).map((d) => (
                                <span key={d} className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${isIpAddress(d) ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300" : "bg-muted"}`}>{d}</span>
                              ))}
                              {entries.length > 6 && (
                                <span className="text-[10px] text-muted-foreground">+{entries.length - 6} more</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        {domainCount > 0 && (
                          <Badge variant="outline" className="text-xs">
                            <Globe className="h-3 w-3 mr-1" /> {domainCount} domains
                          </Badge>
                        )}
                        {ipCount > 0 && (
                          <Badge variant="outline" className="text-xs text-red-600 border-red-300">
                            {ipCount} IPs
                          </Badge>
                        )}
                        {bl.policies.length > 0 && (
                          <Badge variant="outline" className="text-xs">
                            <Shield className="h-3 w-3 mr-1" /> {bl.policies.length} groups
                          </Badge>
                        )}
                        <Button size="sm" variant="outline" onClick={() => toggleBlocklist(bl.id, bl.isActive)}>
                          {bl.isActive ? "Disable" : "Enable"}
                        </Button>
                        <Button size="sm" variant="ghost" className="text-red-600" onClick={() => deleteBlocklist(bl.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Expanded — full entry list with edit */}
                    {isExpanded && (
                      <div className="mt-4 border-t pt-4 space-y-3">
                        {/* Add new entry */}
                        <div className="flex gap-2">
                          <Input
                            value={newEntry}
                            onChange={(e) => setNewEntry(e.target.value)}
                            placeholder="Add domain or IP (e.g., example.com, 192.168.1.0/24)"
                            onKeyDown={(e) => e.key === "Enter" && addEntryToEditing()}
                            className="flex-1"
                          />
                          <Button variant="outline" size="sm" onClick={addEntryToEditing}>
                            <Plus className="h-4 w-4 mr-1" /> Add
                          </Button>
                        </div>

                        {/* Entries grouped by type */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Domains */}
                          <div>
                            <h4 className="text-sm font-semibold mb-2 flex items-center gap-1">
                              <Globe className="h-4 w-4 text-orange-500" /> Domains ({editingBlocklistEntries.filter((e) => !isIpAddress(e)).length})
                            </h4>
                            <div className="max-h-60 overflow-y-auto border rounded-md p-2 space-y-1">
                              {editingBlocklistEntries.filter((e) => !isIpAddress(e)).length === 0 ? (
                                <p className="text-xs text-muted-foreground text-center py-2">No domains</p>
                              ) : (
                                editingBlocklistEntries.filter((e) => !isIpAddress(e)).map((entry) => (
                                  <div key={entry} className="flex items-center justify-between group py-1 px-2 rounded hover:bg-muted">
                                    <span className="text-sm font-mono">{entry}</span>
                                    <button onClick={() => removeEntryFromEditing(entry)} className="opacity-0 group-hover:opacity-100 text-red-500 transition-opacity">
                                      <X className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>

                          {/* IPs */}
                          <div>
                            <h4 className="text-sm font-semibold mb-2 flex items-center gap-1">
                              <AlertTriangle className="h-4 w-4 text-red-500" /> IP Addresses ({editingBlocklistEntries.filter((e) => isIpAddress(e)).length})
                            </h4>
                            <div className="max-h-60 overflow-y-auto border rounded-md p-2 space-y-1">
                              {editingBlocklistEntries.filter((e) => isIpAddress(e)).length === 0 ? (
                                <p className="text-xs text-muted-foreground text-center py-2">No IPs — add IPs or CIDR ranges</p>
                              ) : (
                                editingBlocklistEntries.filter((e) => isIpAddress(e)).map((entry) => (
                                  <div key={entry} className="flex items-center justify-between group py-1 px-2 rounded hover:bg-muted">
                                    <span className="text-sm font-mono text-red-600 dark:text-red-400">{entry}</span>
                                    <button onClick={() => removeEntryFromEditing(entry)} className="opacity-0 group-hover:opacity-100 text-red-500 transition-opacity">
                                      <X className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Applied to groups */}
                        {bl.policies.length > 0 && (
                          <div>
                            <h4 className="text-xs font-semibold text-muted-foreground mb-1">Applied to host groups:</h4>
                            <div className="flex flex-wrap gap-1">
                              {bl.policies.map((p, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                  <Server className="h-3 w-3 mr-1" /> {p.hostGroup.name}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Save / Cancel */}
                        <div className="flex gap-2 pt-2 border-t">
                          <Button size="sm" onClick={() => saveBlocklistEntries(bl.id)}>
                            Save Changes ({editingBlocklistEntries.length} entries)
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setExpandedBlocklist(null)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* Summary Footer */}
      <Card>
        <CardContent className="py-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold">{hostGroups.length}</div>
              <div className="text-xs text-muted-foreground">Host Groups</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{blocklists.length}</div>
              <div className="text-xs text-muted-foreground">Blocklists</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{blocklists.reduce((sum, bl) => sum + (bl.domains as string[]).filter((e) => !isIpAddress(e)).length, 0)}</div>
              <div className="text-xs text-muted-foreground">Blocked Domains</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">{blocklists.reduce((sum, bl) => sum + (bl.domains as string[]).filter((e) => isIpAddress(e)).length, 0)}</div>
              <div className="text-xs text-muted-foreground">Blocked IPs</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">
                {hostGroups.reduce((sum, g) => sum + g.policies.filter((p) => p.action === "BLOCK").length, 0)}
              </div>
              <div className="text-xs text-muted-foreground">Active Block Policies</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
