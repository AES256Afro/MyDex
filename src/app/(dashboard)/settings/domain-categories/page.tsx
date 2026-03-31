"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Globe,
  Plus,
  Trash2,
  Pencil,
  Search,
  Upload,
  Loader2,
  Check,
  X,
  Lightbulb,
} from "lucide-react";

interface DomainCategoryItem {
  id: string;
  domain: string;
  category: "productive" | "neutral" | "unproductive";
  label: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Suggestion {
  domain: string;
  count: number;
}

const CATEGORY_OPTIONS = [
  { value: "productive", label: "Productive", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" },
  { value: "neutral", label: "Neutral", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  { value: "unproductive", label: "Unproductive", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" },
] as const;

function getCategoryBadge(category: string) {
  const opt = CATEGORY_OPTIONS.find((o) => o.value === category);
  return (
    <Badge variant="outline" className={opt?.color || ""}>
      {opt?.label || category}
    </Badge>
  );
}

export default function DomainCategoriesPage() {
  const [categories, setCategories] = useState<DomainCategoryItem[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  // Add form
  const [newDomain, setNewDomain] = useState("");
  const [newCategory, setNewCategory] = useState<"productive" | "neutral" | "unproductive">("neutral");
  const [newLabel, setNewLabel] = useState("");

  // Bulk import
  const [showBulk, setShowBulk] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkCategory, setBulkCategory] = useState<"productive" | "neutral" | "unproductive">("neutral");

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCategory, setEditCategory] = useState<"productive" | "neutral" | "unproductive">("neutral");
  const [editLabel, setEditLabel] = useState("");

  useEffect(() => {
    fetchCategories();
  }, []);

  async function fetchCategories() {
    try {
      const res = await fetch("/api/v1/domain-categories");
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
        setSuggestions(data.suggestions || []);
      }
    } catch (e) {
      console.error("Failed to fetch domain categories:", e);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newDomain.trim()) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/v1/domain-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: newDomain.trim(),
          category: newCategory,
          label: newLabel.trim() || null,
        }),
      });
      if (res.ok) {
        setNewDomain("");
        setNewLabel("");
        await fetchCategories();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to add");
      }
    } catch {
      setError("Failed to add domain category");
    } finally {
      setSaving(false);
    }
  }

  async function handleBulkImport() {
    const domains = bulkText
      .split("\n")
      .map((d) => d.trim())
      .filter(Boolean);
    if (domains.length === 0) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/v1/domain-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domains, category: bulkCategory }),
      });
      if (res.ok) {
        setBulkText("");
        setShowBulk(false);
        await fetchCategories();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to import");
      }
    } catch {
      setError("Failed to import domains");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(domain: string) {
    if (!confirm(`Remove categorization for ${domain}?`)) return;
    try {
      const res = await fetch(`/api/v1/domain-categories?domain=${encodeURIComponent(domain)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchCategories();
      }
    } catch {
      setError("Failed to delete");
    }
  }

  async function handleEditSave(domain: string) {
    setSaving(true);
    try {
      const res = await fetch("/api/v1/domain-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain,
          category: editCategory,
          label: editLabel.trim() || null,
        }),
      });
      if (res.ok) {
        setEditingId(null);
        await fetchCategories();
      }
    } catch {
      setError("Failed to update");
    } finally {
      setSaving(false);
    }
  }

  async function handleSuggestionAdd(domain: string, category: "productive" | "neutral" | "unproductive") {
    try {
      const res = await fetch("/api/v1/domain-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain, category }),
      });
      if (res.ok) {
        await fetchCategories();
      }
    } catch {
      setError("Failed to add suggestion");
    }
  }

  const filtered = useMemo(() => {
    if (!search) return categories;
    const q = search.toLowerCase();
    return categories.filter(
      (c) =>
        c.domain.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        (c.label && c.label.toLowerCase().includes(q))
    );
  }, [categories, search]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Globe className="h-6 w-6" />
          Domain Categories
        </h1>
        <p className="text-muted-foreground">
          Categorize websites as productive, neutral, or unproductive for activity monitoring
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
          <button className="ml-2 underline" onClick={() => setError("")}>Dismiss</button>
        </div>
      )}

      {/* Add Domain Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Add Domain</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="domain">Domain</Label>
              <Input
                id="domain"
                placeholder="example.com"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
              />
            </div>
            <div className="w-44">
              <Label htmlFor="category">Category</Label>
              <select
                id="category"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as "productive" | "neutral" | "unproductive")}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="w-44">
              <Label htmlFor="label">Label (optional)</Label>
              <Input
                id="label"
                placeholder="Friendly name"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={saving || !newDomain.trim()}>
              <Plus className="mr-2 h-4 w-4" />
              Add
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowBulk(!showBulk)}
            >
              <Upload className="mr-2 h-4 w-4" />
              Bulk Import
            </Button>
          </form>

          {showBulk && (
            <div className="mt-4 space-y-3 border-t pt-4">
              <Label>Paste domains (one per line)</Label>
              <textarea
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[120px] font-mono"
                placeholder={"github.com\nstackoverflow.com\nslack.com"}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
              />
              <div className="flex items-center gap-3">
                <select
                  value={bulkCategory}
                  onChange={(e) => setBulkCategory(e.target.value as "productive" | "neutral" | "unproductive")}
                  className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <Button onClick={handleBulkImport} disabled={saving || !bulkText.trim()}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Import {bulkText.split("\n").filter(Boolean).length} Domains
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-amber-500" />
              Suggested Domains
            </CardTitle>
            <CardDescription>
              Top domains from your organization&apos;s activity data that haven&apos;t been categorized yet
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <div
                  key={s.domain}
                  className="flex items-center gap-1 rounded-full border px-3 py-1 text-sm"
                >
                  <span className="font-mono">{s.domain}</span>
                  <button
                    onClick={() => handleSuggestionAdd(s.domain, "productive")}
                    className="ml-1 rounded-full p-0.5 hover:bg-green-100 dark:hover:bg-green-900/30"
                    title="Mark productive"
                  >
                    <Check className="h-3.5 w-3.5 text-green-600" />
                  </button>
                  <button
                    onClick={() => handleSuggestionAdd(s.domain, "unproductive")}
                    className="rounded-full p-0.5 hover:bg-red-100 dark:hover:bg-red-900/30"
                    title="Mark unproductive"
                  >
                    <X className="h-3.5 w-3.5 text-red-600" />
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Domain Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              Categorized Domains ({categories.length})
            </CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search domains..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              {categories.length === 0
                ? "No domains categorized yet. Add your first domain above."
                : "No domains match your search."}
            </p>
          ) : (
            <div className="rounded-md border">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left text-sm font-medium">Domain</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Category</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Label</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="px-4 py-3 font-mono text-sm">{item.domain}</td>
                      <td className="px-4 py-3">
                        {editingId === item.id ? (
                          <select
                            value={editCategory}
                            onChange={(e) => setEditCategory(e.target.value as "productive" | "neutral" | "unproductive")}
                            className="flex h-8 rounded-md border border-input bg-background px-2 py-1 text-sm"
                          >
                            {CATEGORY_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        ) : (
                          getCategoryBadge(item.category)
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {editingId === item.id ? (
                          <Input
                            value={editLabel}
                            onChange={(e) => setEditLabel(e.target.value)}
                            placeholder="Label"
                            className="h-8"
                          />
                        ) : (
                          item.label || "--"
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {editingId === item.id ? (
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditSave(item.domain)}
                              disabled={saving}
                            >
                              <Check className="h-4 w-4 text-green-500" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingId(null)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingId(item.id);
                                setEditCategory(item.category);
                                setEditLabel(item.label || "");
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(item.domain)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
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
