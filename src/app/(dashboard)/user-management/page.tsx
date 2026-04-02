"use client";

import { useRequireRole } from "@/hooks/use-require-role";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Users,
  UserCog,
  Search,
  ChevronDown,
  ChevronRight,
  Pencil,
  ToggleLeft,
  ToggleRight,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Shield,
  Building2,
  Server,
  Loader2,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Employee {
  id: string;
  email: string;
  name: string;
  image: string | null;
  role: string;
  status: string;
  department: string | null;
  jobTitle: string | null;
  managerId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Department {
  id: string;
  name: string;
  _count: { members: number };
}

interface HostGroup {
  id: string;
  name: string;
  description: string | null;
  _count: { members: number; policies: number };
}

interface Blocklist {
  id: string;
  name: string;
  category: string | null;
  isActive: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

type RoleBadgeVariant = "destructive" | "default" | "warning" | "secondary";
type StatusBadgeVariant = "success" | "secondary" | "destructive";

function roleBadgeVariant(role: string): RoleBadgeVariant {
  switch (role) {
    case "SUPER_ADMIN":
      return "destructive";
    case "ADMIN":
      return "default";
    case "MANAGER":
      return "warning";
    case "EMPLOYEE":
      return "secondary";
    default:
      return "secondary";
  }
}

function statusBadgeVariant(status: string): StatusBadgeVariant {
  switch (status) {
    case "ACTIVE":
      return "success";
    case "INACTIVE":
      return "secondary";
    case "SUSPENDED":
      return "destructive";
    default:
      return "secondary";
  }
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function UserManagementPage() {
  const { authorized } = useRequireRole("ADMIN");
  if (!authorized) return null;

  const { data: session } = useSession();

  // Data
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [hostGroups, setHostGroups] = useState<HostGroup[]>([]);
  const [blocklists, setBlocklists] = useState<Blocklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState("ALL");
  const [filterDepartment, setFilterDepartment] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Bulk action state
  const [bulkAction, setBulkAction] = useState("");
  const [bulkValue, setBulkValue] = useState("");
  const [bulkApplying, setBulkApplying] = useState(false);

  // Expanded rows
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Inline editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState("");
  const [editDepartment, setEditDepartment] = useState("");
  const [editManagerId, setEditManagerId] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // ─── Fetch data ────────────────────────────────────────────────────────────

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/employees");
      if (res.ok) {
        const data = await res.json();
        setEmployees(data.employees);
      } else {
        setError("Failed to load employees");
      }
    } catch {
      setError("Failed to load employees");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDepartments = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/departments");
      if (res.ok) {
        const data = await res.json();
        setDepartments(data.departments);
      }
    } catch {
      // silent
    }
  }, []);

  const fetchHostGroups = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/host-groups");
      if (res.ok) {
        const data = await res.json();
        setHostGroups(data.hostGroups);
      }
    } catch {
      // silent
    }
  }, []);

  const fetchBlocklists = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/domain-blocklists");
      if (res.ok) {
        const data = await res.json();
        setBlocklists(data.blocklists ?? []);
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
    fetchDepartments();
    fetchHostGroups();
    fetchBlocklists();
  }, [fetchEmployees, fetchDepartments, fetchHostGroups, fetchBlocklists]);

  // ─── Filtered employees ────────────────────────────────────────────────────

  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const q = searchQuery.toLowerCase();
      if (
        q &&
        !emp.name.toLowerCase().includes(q) &&
        !emp.email.toLowerCase().includes(q)
      ) {
        return false;
      }
      if (filterRole !== "ALL" && emp.role !== filterRole) return false;
      if (filterDepartment !== "ALL" && emp.department !== filterDepartment)
        return false;
      if (filterStatus !== "ALL" && emp.status !== filterStatus) return false;
      return true;
    });
  }, [employees, searchQuery, filterRole, filterDepartment, filterStatus]);

  // ─── Stats ─────────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const total = employees.length;
    const active = employees.filter((e) => e.status === "ACTIVE").length;
    const inactive = employees.filter((e) => e.status === "INACTIVE").length;
    const suspended = employees.filter((e) => e.status === "SUSPENDED").length;
    const superAdmins = employees.filter(
      (e) => e.role === "SUPER_ADMIN"
    ).length;
    const admins = employees.filter((e) => e.role === "ADMIN").length;
    const managers = employees.filter((e) => e.role === "MANAGER").length;
    const emps = employees.filter((e) => e.role === "EMPLOYEE").length;
    const deptSet = new Set(employees.map((e) => e.department).filter(Boolean));
    return {
      total,
      active,
      inactive,
      suspended,
      superAdmins,
      admins,
      managers,
      employees: emps,
      departments: deptSet.size,
    };
  }, [employees]);

  // ─── Selection ─────────────────────────────────────────────────────────────

  const allFilteredSelected =
    filteredEmployees.length > 0 &&
    filteredEmployees.every((e) => selectedIds.has(e.id));

  function toggleSelectAll() {
    if (allFilteredSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredEmployees.map((e) => e.id)));
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  // ─── Expand row ────────────────────────────────────────────────────────────

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  // ─── Inline edit ───────────────────────────────────────────────────────────

  function startEdit(emp: Employee) {
    setEditingId(emp.id);
    setEditRole(emp.role);
    setEditDepartment(emp.department ?? "");
    setEditManagerId(emp.managerId ?? "");
    setEditStatus(emp.status);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function saveEdit(empId: string) {
    setUpdatingId(empId);
    setError(null);
    try {
      const body: Record<string, string | null> = {};
      const emp = employees.find((e) => e.id === empId);
      if (!emp) return;

      if (editRole !== emp.role) body.role = editRole;
      if ((editDepartment || null) !== emp.department)
        body.department = editDepartment || null;
      if ((editManagerId || null) !== emp.managerId)
        body.managerId = editManagerId || null;
      if (editStatus !== emp.status) body.status = editStatus;

      if (Object.keys(body).length === 0) {
        setEditingId(null);
        return;
      }

      const res = await fetch(`/api/v1/employees/${empId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        setEmployees((prev) =>
          prev.map((e) => (e.id === empId ? { ...e, ...data.employee } : e))
        );
        setEditingId(null);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to update employee");
      }
    } catch {
      setError("Failed to update employee");
    } finally {
      setUpdatingId(null);
    }
  }

  // ─── Toggle status ─────────────────────────────────────────────────────────

  async function handleToggleStatus(emp: Employee) {
    const newStatus = emp.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    setUpdatingId(emp.id);
    try {
      const res = await fetch(`/api/v1/employees/${emp.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setEmployees((prev) =>
          prev.map((e) =>
            e.id === emp.id ? { ...e, status: newStatus } : e
          )
        );
      }
    } finally {
      setUpdatingId(null);
    }
  }

  // ─── Bulk actions ──────────────────────────────────────────────────────────

  async function handleBulkApply() {
    if (!bulkAction || !bulkValue || selectedIds.size === 0) return;

    setBulkApplying(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await fetch("/api/v1/employees/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userIds: Array.from(selectedIds),
          action: bulkAction,
          value: bulkValue,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccessMessage(
          `Successfully updated ${data.updated} user${data.updated !== 1 ? "s" : ""}.${
            data.errors?.length ? ` ${data.errors.length} error(s).` : ""
          }`
        );
        if (data.errors?.length) {
          setError(data.errors.join("; "));
        }
        setSelectedIds(new Set());
        setBulkAction("");
        setBulkValue("");
        fetchEmployees();
      } else {
        setError(data.error || "Bulk operation failed");
      }
    } catch {
      setError("Bulk operation failed");
    } finally {
      setBulkApplying(false);
    }
  }

  // Clear success message after a few seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Unique department names from employees for the filter dropdown
  const departmentNames = useMemo(() => {
    const depts = new Set(
      employees.map((e) => e.department).filter(Boolean) as string[]
    );
    return Array.from(depts).sort();
  }, [employees]);

  // Get bulk value options based on selected bulk action
  function getBulkValueOptions() {
    switch (bulkAction) {
      case "assign_role":
        return (
          <Select
            value={bulkValue}
            onChange={(e) => setBulkValue(e.target.value)}
            className="h-8 w-40 text-xs"
          >
            <option value="">Select Role...</option>
            <option value="ADMIN">Admin</option>
            <option value="MANAGER">Manager</option>
            <option value="EMPLOYEE">Employee</option>
          </Select>
        );
      case "assign_department":
        return (
          <Select
            value={bulkValue}
            onChange={(e) => setBulkValue(e.target.value)}
            className="h-8 w-40 text-xs"
          >
            <option value="">Select Dept...</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
        );
      case "change_status":
        return (
          <Select
            value={bulkValue}
            onChange={(e) => setBulkValue(e.target.value)}
            className="h-8 w-40 text-xs"
          >
            <option value="">Select Status...</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="SUSPENDED">Suspended</option>
          </Select>
        );
      case "assign_host_group":
        return (
          <Select
            value={bulkValue}
            onChange={(e) => setBulkValue(e.target.value)}
            className="h-8 w-48 text-xs"
          >
            <option value="">Select Host Group...</option>
            {hostGroups.map((hg) => (
              <option key={hg.id} value={hg.id}>
                {hg.name}
              </option>
            ))}
          </Select>
        );
      case "assign_policy":
        return (
          <Select
            value={bulkValue}
            onChange={(e) => setBulkValue(e.target.value)}
            className="h-8 w-48 text-xs"
          >
            <option value="">Select Policy...</option>
            {blocklists
              .filter((b) => b.isActive)
              .map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                  {b.category ? ` (${b.category})` : ""}
                </option>
              ))}
          </Select>
        );
      default:
        return null;
    }
  }

  if (!session) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <UserCog className="h-8 w-8" />
            User Management
          </h1>
          <p className="text-muted-foreground">
            Manage users, assign roles, departments, groups, and policies in
            bulk. {stats.total} user{stats.total !== 1 ? "s" : ""} total.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Users</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{stats.active}</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-red-600" />
              <div>
                <p className="text-2xl font-bold">
                  {stats.superAdmins + stats.admins}
                </p>
                <p className="text-xs text-muted-foreground">Admins</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold">{stats.managers}</p>
                <p className="text-xs text-muted-foreground">Managers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{stats.employees}</p>
                <p className="text-xs text-muted-foreground">Employees</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">{stats.departments}</p>
                <p className="text-xs text-muted-foreground">Departments</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Messages */}
      {error && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-auto text-destructive hover:text-destructive/80"
          >
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      )}
      {successMessage && (
        <div className="flex items-center gap-2 rounded-md border border-green-500/50 bg-green-50 dark:bg-green-950/20 p-3 text-sm text-green-700 dark:text-green-400">
          <CheckCircle className="h-4 w-4 shrink-0" />
          {successMessage}
        </div>
      )}

      {/* Filters Bar */}
      <Card>
        <CardContent className="pt-4 pb-4 px-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <Select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="h-9 w-40 text-sm"
            >
              <option value="ALL">All Roles</option>
              <option value="SUPER_ADMIN">Super Admin</option>
              <option value="ADMIN">Admin</option>
              <option value="MANAGER">Manager</option>
              <option value="EMPLOYEE">Employee</option>
            </Select>
            <Select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="h-9 w-40 text-sm"
            >
              <option value="ALL">All Departments</option>
              {departmentNames.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </Select>
            <Select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="h-9 w-36 text-sm"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="SUSPENDED">Suspended</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions Toolbar */}
      {selectedIds.size > 0 && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="pt-4 pb-4 px-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium">
                {selectedIds.size} user{selectedIds.size !== 1 ? "s" : ""}{" "}
                selected
              </span>
              <Separator orientation="vertical" className="h-6" />
              <Select
                value={bulkAction}
                onChange={(e) => {
                  setBulkAction(e.target.value);
                  setBulkValue("");
                }}
                className="h-8 w-44 text-xs"
              >
                <option value="">Select Action...</option>
                <option value="assign_role">Assign Role</option>
                <option value="assign_department">Assign Department</option>
                <option value="change_status">Change Status</option>
                <option value="assign_host_group">Add to Host Group</option>
                <option value="assign_policy">Assign Policy</option>
              </Select>
              {bulkAction && getBulkValueOptions()}
              {bulkAction && bulkValue && (
                <Button
                  size="sm"
                  onClick={handleBulkApply}
                  disabled={bulkApplying}
                >
                  {bulkApplying ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Applying...
                    </>
                  ) : (
                    "Apply"
                  )}
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedIds(new Set());
                  setBulkAction("");
                  setBulkValue("");
                }}
                className="ml-auto"
              >
                Clear Selection
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* User Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5" />
            All Users
          </CardTitle>
          <CardDescription>
            Showing {filteredEmployees.length} of {employees.length} users
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading users...
            </div>
          ) : filteredEmployees.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No users found matching your filters.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 pr-2 font-medium text-muted-foreground w-10">
                      <input
                        type="checkbox"
                        checked={allFilteredSelected}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-primary focus:ring-primary cursor-pointer"
                      />
                    </th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground w-6" />
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">
                      Name
                    </th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">
                      Email
                    </th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">
                      Role
                    </th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">
                      Department
                    </th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">
                      Manager
                    </th>
                    <th className="pb-3 font-medium text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((emp) => {
                    const isExpanded = expandedIds.has(emp.id);
                    const isEditing = editingId === emp.id;
                    const managerName = emp.managerId
                      ? employees.find((e) => e.id === emp.managerId)?.name ??
                        "\u2014"
                      : "\u2014";

                    return (
                      <React.Fragment key={emp.id}>
                        <tr
                          className={`border-b last:border-0 hover:bg-muted/50 transition-colors ${
                            selectedIds.has(emp.id) ? "bg-primary/5" : ""
                          }`}
                        >
                          {/* Checkbox */}
                          <td className="py-3 pr-2">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(emp.id)}
                              onChange={() => toggleSelect(emp.id)}
                              className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-primary focus:ring-primary cursor-pointer"
                            />
                          </td>
                          {/* Expand */}
                          <td className="py-3 pr-2">
                            <button
                              onClick={() => toggleExpand(emp.id)}
                              className="p-0.5 rounded hover:bg-muted"
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              )}
                            </button>
                          </td>
                          {/* Name */}
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                                {getInitials(emp.name)}
                              </div>
                              <div>
                                <div className="font-medium">{emp.name}</div>
                                {emp.jobTitle && (
                                  <div className="text-xs text-muted-foreground">
                                    {emp.jobTitle}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          {/* Email */}
                          <td className="py-3 pr-4 text-muted-foreground">
                            {emp.email}
                          </td>
                          {/* Role */}
                          <td className="py-3 pr-4">
                            {isEditing ? (
                              <Select
                                value={editRole}
                                onChange={(e) => setEditRole(e.target.value)}
                                className="h-7 w-28 text-xs"
                              >
                                <option value="ADMIN">Admin</option>
                                <option value="MANAGER">Manager</option>
                                <option value="EMPLOYEE">Employee</option>
                              </Select>
                            ) : (
                              <Badge variant={roleBadgeVariant(emp.role)}>
                                {emp.role.replace("_", " ")}
                              </Badge>
                            )}
                          </td>
                          {/* Department */}
                          <td className="py-3 pr-4">
                            {isEditing ? (
                              <Select
                                value={editDepartment}
                                onChange={(e) =>
                                  setEditDepartment(e.target.value)
                                }
                                className="h-7 w-32 text-xs"
                              >
                                <option value="">None</option>
                                {departments.map((d) => (
                                  <option key={d.id} value={d.name}>
                                    {d.name}
                                  </option>
                                ))}
                              </Select>
                            ) : (
                              <span className="text-muted-foreground">
                                {emp.department ?? "\u2014"}
                              </span>
                            )}
                          </td>
                          {/* Status */}
                          <td className="py-3 pr-4">
                            {isEditing ? (
                              <Select
                                value={editStatus}
                                onChange={(e) => setEditStatus(e.target.value)}
                                className="h-7 w-28 text-xs"
                              >
                                <option value="ACTIVE">Active</option>
                                <option value="INACTIVE">Inactive</option>
                                <option value="SUSPENDED">Suspended</option>
                              </Select>
                            ) : (
                              <Badge variant={statusBadgeVariant(emp.status)}>
                                {emp.status}
                              </Badge>
                            )}
                          </td>
                          {/* Manager */}
                          <td className="py-3 pr-4">
                            {isEditing ? (
                              <Select
                                value={editManagerId}
                                onChange={(e) =>
                                  setEditManagerId(e.target.value)
                                }
                                className="h-7 w-32 text-xs"
                              >
                                <option value="">None</option>
                                {employees
                                  .filter((e) => e.id !== emp.id)
                                  .map((e) => (
                                    <option key={e.id} value={e.id}>
                                      {e.name}
                                    </option>
                                  ))}
                              </Select>
                            ) : (
                              <span className="text-muted-foreground">
                                {managerName}
                              </span>
                            )}
                          </td>
                          {/* Actions */}
                          <td className="py-3">
                            <div className="flex items-center gap-1">
                              {isEditing ? (
                                <>
                                  <Button
                                    size="sm"
                                    variant="default"
                                    className="h-7 text-xs px-2"
                                    disabled={updatingId === emp.id}
                                    onClick={() => saveEdit(emp.id)}
                                  >
                                    {updatingId === emp.id ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      "Save"
                                    )}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs px-2"
                                    onClick={cancelEdit}
                                  >
                                    Cancel
                                  </Button>
                                </>
                              ) : (
                                <>
                                  {emp.role !== "SUPER_ADMIN" &&
                                    emp.id !== session.user.id && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 text-xs px-2"
                                        onClick={() => startEdit(emp)}
                                      >
                                        <Pencil className="h-3 w-3 mr-1" />
                                        Edit
                                      </Button>
                                    )}
                                  {emp.id !== session.user.id && (
                                    <Button
                                      size="sm"
                                      variant={
                                        emp.status === "ACTIVE"
                                          ? "destructive"
                                          : "outline"
                                      }
                                      className="h-7 text-xs px-2"
                                      disabled={updatingId === emp.id}
                                      onClick={() => handleToggleStatus(emp)}
                                    >
                                      {emp.status === "ACTIVE" ? (
                                        <ToggleRight className="h-3 w-3 mr-1" />
                                      ) : (
                                        <ToggleLeft className="h-3 w-3 mr-1" />
                                      )}
                                      {emp.status === "ACTIVE"
                                        ? "Deactivate"
                                        : "Activate"}
                                    </Button>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* Expanded detail row */}
                        {isExpanded && (
                          <tr className="bg-muted/30">
                            <td colSpan={9} className="px-4 py-4">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                  <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1">
                                    <Server className="h-3 w-3" />
                                    Host Group Memberships
                                  </h4>
                                  <p className="text-sm text-muted-foreground">
                                    Host group memberships are determined by the
                                    user&apos;s devices. View the Devices and
                                    Host Groups pages for details.
                                  </p>
                                </div>
                                <div>
                                  <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1">
                                    <Shield className="h-3 w-3" />
                                    Applied Policies
                                  </h4>
                                  <p className="text-sm text-muted-foreground">
                                    Policies are applied through host groups.
                                    Assign this user&apos;s devices to host
                                    groups to apply policies.
                                  </p>
                                </div>
                                <div>
                                  <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1">
                                    <Users className="h-3 w-3" />
                                    Details
                                  </h4>
                                  <div className="space-y-1 text-sm">
                                    <p>
                                      <span className="text-muted-foreground">
                                        Role:
                                      </span>{" "}
                                      <Badge
                                        variant={roleBadgeVariant(emp.role)}
                                      >
                                        {emp.role.replace("_", " ")}
                                      </Badge>
                                    </p>
                                    <p>
                                      <span className="text-muted-foreground">
                                        Department:
                                      </span>{" "}
                                      {emp.department ?? "None"}
                                    </p>
                                    <p>
                                      <span className="text-muted-foreground">
                                        Manager:
                                      </span>{" "}
                                      {managerName}
                                    </p>
                                    <p>
                                      <span className="text-muted-foreground">
                                        Status:
                                      </span>{" "}
                                      <Badge
                                        variant={statusBadgeVariant(emp.status)}
                                      >
                                        {emp.status}
                                      </Badge>
                                    </p>
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
    </div>
  );
}
