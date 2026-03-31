"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  Zap,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Play,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Copy,
  Pencil,
  LayoutTemplate,
} from "lucide-react";

// ── Types ──

interface Condition {
  field: string;
  operator: string;
  value: string;
}

interface Action {
  type: string;
  config: Record<string, string>;
}

interface Workflow {
  id: string;
  name: string;
  description?: string | null;
  trigger: string;
  conditions: Condition[];
  actions: Action[];
  isActive: boolean;
  lastTriggeredAt?: string | null;
  triggerCount: number;
  createdAt: string;
  creator: { id: string; name: string; email: string };
  _count?: { logs: number };
}

interface WorkflowLog {
  id: string;
  workflowId: string;
  trigger: string;
  triggerData: Record<string, unknown>;
  actionsExecuted: Array<{ type: string; success: boolean; error?: string }>;
  success: boolean;
  errorMessage?: string | null;
  executedAt: string;
  workflow: { id: string; name: string };
}

// ── Constants ──

const TRIGGER_OPTIONS: { value: string; label: string; description: string }[] = [
  { value: "device_offline", label: "Device Offline", description: "Fires when a device goes offline" },
  { value: "security_alert", label: "Security Alert", description: "Fires when a security alert is created" },
  { value: "ticket_created", label: "Ticket Created", description: "Fires when a support ticket is submitted" },
  { value: "compliance_drop", label: "Compliance Score Drop", description: "Fires when compliance score drops below threshold" },
  { value: "clock_missed", label: "Missed Clock-In", description: "Fires when an employee misses their scheduled clock-in" },
  { value: "leave_approved", label: "Leave Approved", description: "Fires when a leave request is approved" },
];

const OPERATOR_OPTIONS = [
  { value: "equals", label: "equals" },
  { value: "not_equals", label: "does not equal" },
  { value: "contains", label: "contains" },
  { value: "greater_than", label: "greater than" },
  { value: "less_than", label: "less than" },
  { value: "in", label: "is one of" },
];

const ACTION_OPTIONS = [
  { value: "send_notification", label: "Send Notification" },
  { value: "send_channel_message", label: "Send Channel Message (Slack/Teams)" },
  { value: "create_ticket", label: "Create Support Ticket" },
  { value: "assign_ticket", label: "Assign Ticket" },
  { value: "send_email", label: "Send Email" },
];

const ACTION_CONFIG_FIELDS: Record<string, { key: string; label: string; placeholder: string }[]> = {
  send_notification: [
    { key: "title", label: "Title", placeholder: "Notification title" },
    { key: "message", label: "Message", placeholder: "Notification message" },
    { key: "role", label: "Notify Role", placeholder: "ADMIN (or leave empty for admins)" },
  ],
  send_channel_message: [
    { key: "title", label: "Title", placeholder: "Message title" },
    { key: "message", label: "Message", placeholder: "Message body" },
    { key: "color", label: "Color", placeholder: "#EF4444" },
  ],
  create_ticket: [
    { key: "subject", label: "Subject", placeholder: "Ticket subject" },
    { key: "category", label: "Category", placeholder: "Automated" },
    { key: "priority", label: "Priority", placeholder: "MEDIUM" },
    { key: "description", label: "Description", placeholder: "Auto-created by workflow" },
  ],
  assign_ticket: [
    { key: "assignTo", label: "Assign To (User ID)", placeholder: "User ID to assign ticket to" },
  ],
  send_email: [
    { key: "to", label: "Recipient Email", placeholder: "email@example.com" },
    { key: "subject", label: "Subject", placeholder: "Email subject" },
    { key: "body", label: "Body", placeholder: "Email body text" },
  ],
};

// ── Templates ──

interface WorkflowTemplate {
  name: string;
  description: string;
  trigger: string;
  conditions: Condition[];
  actions: Action[];
}

const TEMPLATES: WorkflowTemplate[] = [
  {
    name: "Alert on Critical Security Event",
    description: "Sends a channel message and notification when a critical security alert is detected",
    trigger: "security_alert",
    conditions: [{ field: "severity", operator: "equals", value: "CRITICAL" }],
    actions: [
      {
        type: "send_channel_message",
        config: {
          title: "Critical Security Alert",
          message: "A critical security vulnerability has been detected. Immediate action required.",
          color: "#EF4444",
        },
      },
      {
        type: "send_notification",
        config: {
          title: "Critical Security Alert",
          message: "A critical security event requires your attention.",
          role: "ADMIN",
        },
      },
    ],
  },
  {
    name: "Auto-assign Urgent Tickets",
    description: "Notifies the team via Slack/Teams and in-app when an urgent ticket is created",
    trigger: "ticket_created",
    conditions: [{ field: "priority", operator: "equals", value: "URGENT" }],
    actions: [
      {
        type: "send_channel_message",
        config: {
          title: "Urgent Ticket Created",
          message: "An urgent support ticket has been submitted and needs immediate attention.",
          color: "#F59E0B",
        },
      },
      {
        type: "send_notification",
        config: {
          title: "Urgent Ticket Submitted",
          message: "A new urgent ticket requires your attention.",
          role: "ADMIN",
        },
      },
    ],
  },
  {
    name: "Notify on Device Offline",
    description: "Creates a support ticket and sends a notification when a device goes offline",
    trigger: "device_offline",
    conditions: [],
    actions: [
      {
        type: "create_ticket",
        config: {
          subject: "Device Offline Alert",
          category: "Hardware",
          priority: "HIGH",
          description: "A monitored device has gone offline and may need investigation.",
        },
      },
      {
        type: "send_notification",
        config: {
          title: "Device Offline",
          message: "A device in your fleet has gone offline.",
          role: "ADMIN",
        },
      },
    ],
  },
];

// ── Component ──

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formTrigger, setFormTrigger] = useState("");
  const [formConditions, setFormConditions] = useState<Condition[]>([]);
  const [formActions, setFormActions] = useState<Action[]>([]);

  // Log viewer
  const [expandedLogs, setExpandedLogs] = useState<string | null>(null);
  const [logs, setLogs] = useState<WorkflowLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const fetchWorkflows = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/workflows");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setWorkflows(data.workflows);
    } catch {
      setError("Failed to load workflows");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  const resetForm = () => {
    setEditingId(null);
    setFormName("");
    setFormDescription("");
    setFormTrigger("");
    setFormConditions([]);
    setFormActions([]);
    setShowForm(false);
  };

  const fillFromTemplate = (template: WorkflowTemplate) => {
    setEditingId(null);
    setFormName(template.name);
    setFormDescription(template.description);
    setFormTrigger(template.trigger);
    setFormConditions([...template.conditions]);
    setFormActions(template.actions.map((a) => ({ ...a, config: { ...a.config } })));
    setShowForm(true);
  };

  const startEdit = (wf: Workflow) => {
    setEditingId(wf.id);
    setFormName(wf.name);
    setFormDescription(wf.description || "");
    setFormTrigger(wf.trigger);
    setFormConditions(wf.conditions || []);
    setFormActions(wf.actions || []);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formName || !formTrigger || formActions.length === 0) {
      setError("Name, trigger, and at least one action are required");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        name: formName,
        description: formDescription || undefined,
        trigger: formTrigger,
        conditions: formConditions,
        actions: formActions,
      };

      const res = editingId
        ? await fetch("/api/v1/workflows", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: editingId, ...payload }),
          })
        : await fetch("/api/v1/workflows", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }

      resetForm();
      fetchWorkflows();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save workflow");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (wf: Workflow) => {
    try {
      const res = await fetch("/api/v1/workflows", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: wf.id, isActive: !wf.isActive }),
      });
      if (!res.ok) throw new Error("Failed to toggle");
      fetchWorkflows();
    } catch {
      setError("Failed to toggle workflow");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this workflow? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/v1/workflows?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      fetchWorkflows();
    } catch {
      setError("Failed to delete workflow");
    }
  };

  const fetchLogs = async (workflowId: string) => {
    if (expandedLogs === workflowId) {
      setExpandedLogs(null);
      return;
    }
    setLoadingLogs(true);
    setExpandedLogs(workflowId);
    try {
      const res = await fetch(`/api/v1/workflows/logs?workflowId=${workflowId}&limit=10`);
      if (!res.ok) throw new Error("Failed to fetch logs");
      const data = await res.json();
      setLogs(data.logs);
    } catch {
      setLogs([]);
    } finally {
      setLoadingLogs(false);
    }
  };

  const addCondition = () => setFormConditions([...formConditions, { field: "", operator: "equals", value: "" }]);
  const removeCondition = (idx: number) => setFormConditions(formConditions.filter((_, i) => i !== idx));
  const updateCondition = (idx: number, key: keyof Condition, val: string) => {
    const updated = [...formConditions];
    updated[idx] = { ...updated[idx], [key]: val };
    setFormConditions(updated);
  };

  const addAction = () => setFormActions([...formActions, { type: "send_notification", config: {} }]);
  const removeAction = (idx: number) => setFormActions(formActions.filter((_, i) => i !== idx));
  const updateActionType = (idx: number, type: string) => {
    const updated = [...formActions];
    updated[idx] = { type, config: {} };
    setFormActions(updated);
  };
  const updateActionConfig = (idx: number, key: string, val: string) => {
    const updated = [...formActions];
    updated[idx] = { ...updated[idx], config: { ...updated[idx].config, [key]: val } };
    setFormActions(updated);
  };

  const triggerLabel = (t: string) => TRIGGER_OPTIONS.find((o) => o.value === t)?.label || t;
  const actionLabel = (t: string) => ACTION_OPTIONS.find((o) => o.value === t)?.label || t;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Zap className="h-6 w-6 text-amber-500" />
            Automated Workflows
          </h1>
          <p className="text-muted-foreground mt-1">
            Create automated playbooks that trigger actions based on system events
          </p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> Create Workflow
        </Button>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md text-sm">
          {error}
          <button className="ml-2 underline" onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      {/* Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <LayoutTemplate className="h-5 w-5 text-indigo-500" />
            Quick-Start Templates
          </CardTitle>
          <CardDescription>
            One-click workflow templates for common automation scenarios
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {TEMPLATES.map((template, idx) => (
              <div
                key={idx}
                className="border rounded-lg p-4 hover:border-primary/50 transition-colors"
              >
                <h3 className="font-medium text-sm">{template.name}</h3>
                <p className="text-xs text-muted-foreground mt-1">{template.description}</p>
                <div className="flex items-center gap-2 mt-3">
                  <Badge variant="outline" className="text-xs">
                    {triggerLabel(template.trigger)}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {template.actions.length} action{template.actions.length > 1 ? "s" : ""}
                  </Badge>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 w-full gap-1"
                  onClick={() => fillFromTemplate(template)}
                >
                  <Copy className="h-3 w-3" /> Use Template
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Create / Edit Form */}
      {showForm && (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle>{editingId ? "Edit Workflow" : "Create Workflow"}</CardTitle>
            <CardDescription>Define the trigger, conditions, and actions for this workflow</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Name & Description */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="wf-name">Name</Label>
                <Input
                  id="wf-name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Alert on Critical CVE"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wf-desc">Description (optional)</Label>
                <Input
                  id="wf-desc"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="What does this workflow do?"
                />
              </div>
            </div>

            {/* Trigger */}
            <div className="space-y-2">
              <Label>Trigger Event</Label>
              <Select
                value={formTrigger}
                onChange={(e) => setFormTrigger(e.target.value)}
                className="w-full md:w-[400px]"
              >
                <option value="">Select a trigger...</option>
                {TRIGGER_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label} — {t.description}
                  </option>
                ))}
              </Select>
            </div>

            {/* Conditions */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Conditions (all must match)</Label>
                <Button variant="outline" size="sm" onClick={addCondition} className="gap-1">
                  <Plus className="h-3 w-3" /> Add Condition
                </Button>
              </div>
              {formConditions.length === 0 && (
                <p className="text-xs text-muted-foreground">No conditions -- workflow will fire on every trigger event</p>
              )}
              {formConditions.map((cond, idx) => (
                <div key={idx} className="flex items-center gap-2 flex-wrap">
                  <Input
                    className="w-40"
                    value={cond.field}
                    onChange={(e) => updateCondition(idx, "field", e.target.value)}
                    placeholder="Field name"
                  />
                  <Select
                    value={cond.operator}
                    onChange={(e) => updateCondition(idx, "operator", e.target.value)}
                    className="w-40"
                  >
                    {OPERATOR_OPTIONS.map((op) => (
                      <option key={op.value} value={op.value}>
                        {op.label}
                      </option>
                    ))}
                  </Select>
                  <Input
                    className="w-48"
                    value={cond.value}
                    onChange={(e) => updateCondition(idx, "value", e.target.value)}
                    placeholder="Value"
                  />
                  <Button variant="ghost" size="icon" onClick={() => removeCondition(idx)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Actions (executed in order)</Label>
                <Button variant="outline" size="sm" onClick={addAction} className="gap-1">
                  <Plus className="h-3 w-3" /> Add Action
                </Button>
              </div>
              {formActions.length === 0 && (
                <p className="text-xs text-muted-foreground">At least one action is required</p>
              )}
              {formActions.map((action, idx) => (
                <div key={idx} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        Step {idx + 1}
                      </Badge>
                      <Select
                        value={action.type}
                        onChange={(e) => updateActionType(idx, e.target.value)}
                        className="w-64"
                      >
                        {ACTION_OPTIONS.map((a) => (
                          <option key={a.value} value={a.value}>
                            {a.label}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeAction(idx)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  {/* Config fields for this action type */}
                  <div className="grid gap-3 md:grid-cols-2">
                    {(ACTION_CONFIG_FIELDS[action.type] || []).map((field) => (
                      <div key={field.key} className="space-y-1">
                        <Label className="text-xs">{field.label}</Label>
                        <Input
                          value={action.config[field.key] || ""}
                          onChange={(e) => updateActionConfig(idx, field.key, e.target.value)}
                          placeholder={field.placeholder}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Save / Cancel */}
            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} disabled={saving} className="gap-2">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingId ? "Update Workflow" : "Create Workflow"}
              </Button>
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Workflow List */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">
          Your Workflows {workflows.length > 0 && <span className="text-muted-foreground font-normal">({workflows.length})</span>}
        </h2>

        {workflows.length === 0 && !showForm && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Zap className="h-10 w-10 text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No workflows yet. Create one or use a template above to get started.</p>
            </CardContent>
          </Card>
        )}

        {workflows.map((wf) => (
          <Card key={wf.id} className={!wf.isActive ? "opacity-60" : undefined}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold truncate">{wf.name}</h3>
                    <Badge variant={wf.isActive ? "default" : "secondary"}>
                      {wf.isActive ? "Active" : "Paused"}
                    </Badge>
                    <Badge variant="outline">{triggerLabel(wf.trigger)}</Badge>
                  </div>
                  {wf.description && (
                    <p className="text-sm text-muted-foreground mt-1">{wf.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Play className="h-3 w-3" />
                      Triggered {wf.triggerCount} time{wf.triggerCount !== 1 ? "s" : ""}
                    </span>
                    {wf.lastTriggeredAt && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Last: {new Date(wf.lastTriggeredAt).toLocaleDateString()}
                      </span>
                    )}
                    <span>
                      {(wf.actions as Action[]).length} action{(wf.actions as Action[]).length !== 1 ? "s" : ""}
                      {(wf.conditions as Condition[]).length > 0 &&
                        ` / ${(wf.conditions as Condition[]).length} condition${(wf.conditions as Condition[]).length !== 1 ? "s" : ""}`}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant={wf.isActive ? "outline" : "default"}
                    size="sm"
                    onClick={() => handleToggleActive(wf)}
                    className="gap-1 text-xs"
                  >
                    {wf.isActive ? "Pause" : "Activate"}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => startEdit(wf)} title="Edit">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(wf.id)} title="Delete">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>

              {/* Actions summary */}
              <div className="flex flex-wrap gap-1.5 mt-3">
                {(wf.actions as Action[]).map((a, i) => (
                  <Badge key={i} variant="secondary" className="text-xs font-normal">
                    {actionLabel(a.type)}
                  </Badge>
                ))}
              </div>

              {/* Log expander */}
              <button
                onClick={() => fetchLogs(wf.id)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-3 transition-colors"
              >
                {expandedLogs === wf.id ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
                Recent executions
              </button>

              {expandedLogs === wf.id && (
                <div className="mt-3 border rounded-md overflow-hidden">
                  {loadingLogs ? (
                    <div className="p-4 flex items-center justify-center">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  ) : logs.length === 0 ? (
                    <div className="p-4 text-xs text-muted-foreground text-center">
                      No executions yet
                    </div>
                  ) : (
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left p-2 font-medium">Time</th>
                          <th className="text-left p-2 font-medium">Status</th>
                          <th className="text-left p-2 font-medium">Actions Run</th>
                          <th className="text-left p-2 font-medium">Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {logs.map((log) => (
                          <tr key={log.id} className="border-b last:border-b-0">
                            <td className="p-2 whitespace-nowrap">
                              {new Date(log.executedAt).toLocaleString()}
                            </td>
                            <td className="p-2">
                              {log.success ? (
                                <span className="flex items-center gap-1 text-green-600">
                                  <CheckCircle2 className="h-3 w-3" /> Success
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-red-600">
                                  <XCircle className="h-3 w-3" /> Failed
                                </span>
                              )}
                            </td>
                            <td className="p-2">
                              {(log.actionsExecuted || []).map((a, i) => (
                                <Badge
                                  key={i}
                                  variant={a.success ? "secondary" : "destructive"}
                                  className="text-[10px] mr-1"
                                >
                                  {actionLabel(a.type)}
                                </Badge>
                              ))}
                            </td>
                            <td className="p-2 text-muted-foreground max-w-[200px] truncate">
                              {log.errorMessage || "OK"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
