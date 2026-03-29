"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Megaphone,
  Plus,
  Pencil,
  Trash2,
  X,
  Tag,
  Calendar,
  User,
  ChevronDown,
  ChevronRight,
  Check,
} from "lucide-react";

interface PatchNote {
  id: string;
  title: string;
  content: string;
  version: string | null;
  tags: string[];
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  author: { id: string; name: string; role: string; image: string | null };
}

const TAG_COLORS: Record<string, string> = {
  feature: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  bugfix: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  security: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  improvement: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  infrastructure: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  ui: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
  api: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  agent: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  compliance: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
};

const AVAILABLE_TAGS = Object.keys(TAG_COLORS);

export default function PatchNotesPage() {
  const { data: session } = useSession();
  const [notes, setNotes] = useState<PatchNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formVersion, setFormVersion] = useState("");
  const [formTags, setFormTags] = useState<string[]>([]);
  const [formPublished, setFormPublished] = useState(true);
  const [saving, setSaving] = useState(false);

  const isAdmin = session?.user?.role === "ADMIN" || session?.user?.role === "SUPER_ADMIN";

  const fetchNotes = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/patch-notes?limit=50");
      if (res.ok) {
        const data = await res.json();
        setNotes(data.notes);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const resetForm = () => {
    setFormTitle("");
    setFormContent("");
    setFormVersion("");
    setFormTags([]);
    setFormPublished(true);
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (note: PatchNote) => {
    setFormTitle(note.title);
    setFormContent(note.content);
    setFormVersion(note.version || "");
    setFormTags(Array.isArray(note.tags) ? note.tags : []);
    setFormPublished(note.isPublished);
    setEditingId(note.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSave = async () => {
    if (!formTitle.trim() || !formContent.trim()) return;
    setSaving(true);

    try {
      const payload = {
        title: formTitle.trim(),
        content: formContent.trim(),
        version: formVersion.trim() || undefined,
        tags: formTags,
        isPublished: formPublished,
      };

      const url = editingId
        ? `/api/v1/patch-notes/${editingId}`
        : "/api/v1/patch-notes";
      const method = editingId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        resetForm();
        fetchNotes();
      }
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this patch note? This cannot be undone.")) return;

    try {
      const res = await fetch(`/api/v1/patch-notes/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchNotes();
      }
    } catch {
      // ignore
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleTag = (tag: string) => {
    setFormTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  // Group notes by month/year
  const groupedNotes: { label: string; notes: PatchNote[] }[] = [];
  for (const note of notes) {
    const d = new Date(note.createdAt);
    const label = d.toLocaleDateString("en-US", { year: "numeric", month: "long" });
    const existing = groupedNotes.find((g) => g.label === label);
    if (existing) existing.notes.push(note);
    else groupedNotes.push({ label, notes: [note] });
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Megaphone className="h-6 w-6" /> Patch Notes
          </h1>
          <p className="text-muted-foreground text-sm">
            Platform updates, new features, and improvements
          </p>
        </div>
        {isAdmin && !showForm && (
          <Button onClick={() => setShowForm(true)} className="gap-2">
            <Plus className="h-4 w-4" /> New Patch Note
          </Button>
        )}
      </div>

      {/* Create / Edit Form */}
      {showForm && isAdmin && (
        <Card className="border-blue-200 dark:border-blue-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">
              {editingId ? "Edit Patch Note" : "New Patch Note"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="pn-title">Title</Label>
                <Input
                  id="pn-title"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Dark Theme & Monitoring Policies"
                />
              </div>
              <div>
                <Label htmlFor="pn-version">Version (optional)</Label>
                <Input
                  id="pn-version"
                  value={formVersion}
                  onChange={(e) => setFormVersion(e.target.value)}
                  placeholder="e.g. v0.2.0"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="pn-content">Content (Markdown supported)</Label>
              <textarea
                id="pn-content"
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                placeholder="Describe the changes..."
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[200px] resize-y focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {AVAILABLE_TAGS.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                      formTags.includes(tag)
                        ? TAG_COLORS[tag] + " ring-2 ring-offset-1 ring-current"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {formTags.includes(tag) && <Check className="h-3 w-3 inline mr-1" />}
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="pn-published"
                checked={formPublished}
                onChange={(e) => setFormPublished(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="pn-published" className="text-sm cursor-pointer">
                Published (visible to all users)
              </Label>
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} disabled={saving || !formTitle.trim() || !formContent.trim()}>
                {saving ? "Saving..." : editingId ? "Update" : "Publish"}
              </Button>
              <Button variant="outline" onClick={resetForm}>
                <X className="h-4 w-4 mr-1" /> Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Patch Notes List */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading patch notes...</div>
      ) : notes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Megaphone className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">No patch notes yet.</p>
            {isAdmin && (
              <Button variant="outline" className="mt-4" onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4 mr-1" /> Create the first one
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {groupedNotes.map((group) => (
            <div key={group.label}>
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  {group.label}
                </h2>
                <div className="flex-1 border-t" />
              </div>

              <div className="space-y-4 relative">
                {/* Timeline line */}
                <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border hidden md:block" />

                {group.notes.map((note) => {
                  const isExpanded = expandedIds.has(note.id);
                  const tags = Array.isArray(note.tags) ? note.tags : [];
                  const contentPreview = note.content.length > 200
                    ? note.content.slice(0, 200) + "..."
                    : note.content;

                  return (
                    <div key={note.id} className="flex gap-4 md:pl-8 relative">
                      {/* Timeline dot */}
                      <div className="absolute left-[11px] top-5 h-2.5 w-2.5 rounded-full bg-primary border-2 border-background hidden md:block" />

                      <Card className="flex-1 hover:shadow-md transition-shadow">
                        <CardContent className="pt-5 pb-4">
                          {/* Header */}
                          <div className="flex items-start justify-between gap-3">
                            <div
                              className="flex-1 cursor-pointer"
                              onClick={() => toggleExpand(note.id)}
                            >
                              <div className="flex items-center gap-2 flex-wrap">
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                )}
                                <h3 className="text-base font-semibold">{note.title}</h3>
                                {note.version && (
                                  <Badge variant="outline" className="text-xs font-mono">
                                    {note.version}
                                  </Badge>
                                )}
                                {!note.isPublished && (
                                  <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 text-[10px]">
                                    Draft
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground ml-6">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {formatDate(note.createdAt)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {note.author.name}
                                </span>
                                {note.updatedAt !== note.createdAt && (
                                  <span className="italic">
                                    edited {formatDateTime(note.updatedAt)}
                                  </span>
                                )}
                              </div>
                            </div>

                            {isAdmin && (
                              <div className="flex gap-1 flex-shrink-0">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => startEdit(note)}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => handleDelete(note.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            )}
                          </div>

                          {/* Tags */}
                          {tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2 ml-6">
                              {tags.map((tag) => (
                                <span
                                  key={tag}
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-medium flex items-center gap-1 ${
                                    TAG_COLORS[tag] || "bg-gray-100 text-gray-700"
                                  }`}
                                >
                                  <Tag className="h-2.5 w-2.5" />
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Content */}
                          <div className="mt-3 ml-6 text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                            {isExpanded ? note.content : contentPreview}
                          </div>

                          {note.content.length > 200 && !isExpanded && (
                            <button
                              onClick={() => toggleExpand(note.id)}
                              className="ml-6 mt-1 text-xs text-primary hover:underline"
                            >
                              Read more
                            </button>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
