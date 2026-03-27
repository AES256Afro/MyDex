"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Building2, Users, Plus, Pencil, Trash2, FolderTree, Shield, X, Save,
} from "lucide-react";

interface Department {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  managerId: string | null;
  parentId: string | null;
  parent: { id: string; name: string } | null;
  _count: { members: number; children: number; hostGroups: number };
}

const COLORS = [
  "#3B82F6", "#10B981", "#8B5CF6", "#F59E0B", "#EF4444",
  "#06B6D4", "#EC4899", "#6366F1", "#14B8A6", "#F97316",
];

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "", color: COLORS[0], parentId: "" });

  async function fetchDepartments() {
    try {
      const res = await fetch("/api/v1/departments");
      if (res.ok) {
        const data = await res.json();
        setDepartments(data.departments || []);
      }
    } catch (err) {
      console.error("Failed to fetch departments:", err);
    }
    setLoading(false);
  }

  useEffect(() => { fetchDepartments(); }, []);

  async function handleCreate() {
    const res = await fetch("/api/v1/departments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        description: form.description || undefined,
        color: form.color,
        parentId: form.parentId || undefined,
      }),
    });
    if (res.ok) {
      setShowCreate(false);
      setForm({ name: "", description: "", color: COLORS[0], parentId: "" });
      fetchDepartments();
    } else {
      const data = await res.json();
      alert(data.error || "Failed to create department");
    }
  }

  async function handleUpdate() {
    if (!editId) return;
    const res = await fetch("/api/v1/departments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editId,
        name: form.name,
        description: form.description || null,
        color: form.color,
        parentId: form.parentId || null,
      }),
    });
    if (res.ok) {
      setEditId(null);
      fetchDepartments();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this department? Members will be unassigned.")) return;
    const res = await fetch(`/api/v1/departments?id=${id}`, { method: "DELETE" });
    if (res.ok) fetchDepartments();
  }

  function startEdit(dept: Department) {
    setEditId(dept.id);
    setForm({
      name: dept.name,
      description: dept.description || "",
      color: dept.color || COLORS[0],
      parentId: dept.parentId || "",
    });
    setShowCreate(false);
  }

  // Build tree structure
  const rootDepts = departments.filter((d) => !d.parentId);
  const childMap = new Map<string, Department[]>();
  for (const d of departments) {
    if (d.parentId) {
      const siblings = childMap.get(d.parentId) || [];
      siblings.push(d);
      childMap.set(d.parentId, siblings);
    }
  }

  function DeptCard({ dept, depth = 0 }: { dept: Department; depth?: number }) {
    const children = childMap.get(dept.id) || [];
    const isEditing = editId === dept.id;

    return (
      <div style={{ marginLeft: depth * 24 }}>
        <Card className={`mb-2 ${isEditing ? "ring-2 ring-primary" : ""}`}>
          <CardContent className="py-3">
            {isEditing ? (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Department name" className="flex-1" />
                  <select value={form.parentId} onChange={(e) => setForm({ ...form, parentId: e.target.value })} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                    <option value="">No parent</option>
                    {departments.filter((d) => d.id !== dept.id).map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description (optional)" />
                <div className="flex gap-1.5">
                  {COLORS.map((c) => (
                    <button key={c} onClick={() => setForm({ ...form, color: c })} className={`w-6 h-6 rounded-full border-2 transition-all ${form.color === c ? "border-foreground scale-110" : "border-transparent"}`} style={{ backgroundColor: c }} />
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleUpdate}><Save className="h-3.5 w-3.5 mr-1" /> Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditId(null)}><X className="h-3.5 w-3.5 mr-1" /> Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: dept.color || "#6B7280" }} />
                  <div>
                    <div className="font-semibold flex items-center gap-2">
                      {dept.name}
                      {dept.parent && <Badge variant="outline" className="text-[10px]">{dept.parent.name}</Badge>}
                    </div>
                    {dept.description && <p className="text-xs text-muted-foreground">{dept.description}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {dept._count.members}</span>
                    {dept._count.children > 0 && <span className="flex items-center gap-1"><FolderTree className="h-3.5 w-3.5" /> {dept._count.children}</span>}
                    {dept._count.hostGroups > 0 && <span className="flex items-center gap-1"><Shield className="h-3.5 w-3.5" /> {dept._count.hostGroups}</span>}
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => startEdit(dept)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant="ghost" className="text-red-600" onClick={() => handleDelete(dept.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        {children.map((child) => (
          <DeptCard key={child.id} dept={child} depth={depth + 1} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6" /> Departments
          </h1>
          <p className="text-muted-foreground text-sm">Organize your team into departments with hierarchy</p>
        </div>
        <Button onClick={() => { setShowCreate(true); setEditId(null); setForm({ name: "", description: "", color: COLORS[Math.floor(Math.random() * COLORS.length)], parentId: "" }); }}>
          <Plus className="h-4 w-4 mr-2" /> New Department
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-sm text-muted-foreground">Total Departments</div>
            <div className="text-2xl font-bold">{departments.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-sm text-muted-foreground">Total Members</div>
            <div className="text-2xl font-bold">{departments.reduce((sum, d) => sum + d._count.members, 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-sm text-muted-foreground">With Host Groups</div>
            <div className="text-2xl font-bold">{departments.filter((d) => d._count.hostGroups > 0).length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-sm text-muted-foreground">Sub-Departments</div>
            <div className="text-2xl font-bold">{departments.filter((d) => d.parentId).length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Create Form */}
      {showCreate && (
        <Card className="ring-2 ring-primary">
          <CardHeader><CardTitle className="text-lg">Create Department</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Department name" className="flex-1" />
              <select value={form.parentId} onChange={(e) => setForm({ ...form, parentId: e.target.value })} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                <option value="">No parent (root)</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description (optional)" />
            <div className="flex gap-1.5 items-center">
              <span className="text-sm text-muted-foreground mr-2">Color:</span>
              {COLORS.map((c) => (
                <button key={c} onClick={() => setForm({ ...form, color: c })} className={`w-6 h-6 rounded-full border-2 transition-all ${form.color === c ? "border-foreground scale-110" : "border-transparent"}`} style={{ backgroundColor: c }} />
              ))}
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={!form.name.trim()}><Plus className="h-4 w-4 mr-1" /> Create</Button>
              <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Department List */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading departments...</div>
      ) : departments.length === 0 && !showCreate ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No departments yet</p>
            <p className="text-muted-foreground text-sm mb-4">Create departments to organize your team</p>
            <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-2" /> Create First Department</Button>
          </CardContent>
        </Card>
      ) : (
        <div>
          {rootDepts.map((dept) => (
            <DeptCard key={dept.id} dept={dept} />
          ))}
        </div>
      )}
    </div>
  );
}
