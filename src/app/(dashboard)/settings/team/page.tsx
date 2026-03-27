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

interface Employee {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  department: string | null;
  jobTitle: string | null;
}

function statusVariant(
  status: string
): "success" | "secondary" | "destructive" {
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

export default function TeamManagementPage() {
  const { data: session } = useSession();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Invite form
  const [showInvite, setShowInvite] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("EMPLOYEE");
  const [inviteDepartment, setInviteDepartment] = useState("");
  const [invitePassword, setInvitePassword] = useState("");
  const [inviting, setInviting] = useState(false);

  // Inline action states
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/employees");
      if (res.ok) {
        const data = await res.json();
        setEmployees(data.employees);
      } else {
        setError("Failed to load team members");
      }
    } catch {
      setError("Failed to load team members");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  async function handleInvite() {
    setInviting(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: inviteName,
          email: inviteEmail,
          password: invitePassword,
          role: inviteRole,
          department: inviteDepartment || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to invite member");
      }
      setShowInvite(false);
      setInviteName("");
      setInviteEmail("");
      setInviteRole("EMPLOYEE");
      setInviteDepartment("");
      setInvitePassword("");
      fetchEmployees();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setInviting(false);
    }
  }

  async function handleRoleChange(employeeId: string, newRole: string) {
    setUpdatingId(employeeId);
    try {
      const res = await fetch(`/api/v1/employees/${employeeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        setEmployees((prev) =>
          prev.map((e) =>
            e.id === employeeId ? { ...e, role: newRole } : e
          )
        );
      }
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleToggleStatus(employee: Employee) {
    const newStatus =
      employee.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    setUpdatingId(employee.id);
    try {
      const res = await fetch(`/api/v1/employees/${employee.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setEmployees((prev) =>
          prev.map((e) =>
            e.id === employee.id ? { ...e, status: newStatus } : e
          )
        );
      }
    } finally {
      setUpdatingId(null);
    }
  }

  if (!session) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Team Management
          </h1>
          <p className="text-muted-foreground">
            Manage team members, roles, and access
          </p>
        </div>
        <Button onClick={() => setShowInvite(!showInvite)}>
          {showInvite ? "Cancel" : "Invite Member"}
        </Button>
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {/* Invite Form */}
      {showInvite && (
        <Card>
          <CardHeader>
            <CardTitle>Invite New Member</CardTitle>
            <CardDescription>
              Add a new team member to your organization
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="inviteName">Full Name</Label>
                <Input
                  id="inviteName"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="Jane Smith"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inviteEmail">Email Address</Label>
                <Input
                  id="inviteEmail"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="jane@company.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invitePassword">Initial Password</Label>
                <Input
                  id="invitePassword"
                  type="password"
                  value={invitePassword}
                  onChange={(e) => setInvitePassword(e.target.value)}
                  placeholder="Min 8 characters"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inviteRole">Role</Label>
                <Select
                  id="inviteRole"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                >
                  <option value="EMPLOYEE">Employee</option>
                  <option value="MANAGER">Manager</option>
                  <option value="ADMIN">Admin</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="inviteDept">Department (optional)</Label>
                <Input
                  id="inviteDept"
                  value={inviteDepartment}
                  onChange={(e) => setInviteDepartment(e.target.value)}
                  placeholder="Engineering"
                />
              </div>
            </div>

            <Button
              onClick={handleInvite}
              disabled={inviting || !inviteName || !inviteEmail || !invitePassword}
            >
              {inviting ? "Inviting..." : "Send Invite"}
            </Button>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Team Members Table */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            {employees.length} member{employees.length !== 1 ? "s" : ""} in your
            organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Loading...
            </p>
          ) : employees.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No team members found.
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
                      Email
                    </th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">
                      Department
                    </th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">
                      Role
                    </th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="pb-3 font-medium text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp) => (
                    <tr
                      key={emp.id}
                      className="border-b last:border-0 hover:bg-muted/50 transition-colors"
                    >
                      <td className="py-3 pr-4 font-medium">{emp.name}</td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {emp.email}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {emp.department ?? "\u2014"}
                      </td>
                      <td className="py-3 pr-4">
                        <Select
                          value={emp.role}
                          onChange={(e) =>
                            handleRoleChange(emp.id, e.target.value)
                          }
                          disabled={
                            updatingId === emp.id ||
                            emp.id === session.user.id
                          }
                          className="w-32 h-8 text-xs"
                        >
                          <option value="EMPLOYEE">Employee</option>
                          <option value="MANAGER">Manager</option>
                          <option value="ADMIN">Admin</option>
                        </Select>
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant={statusVariant(emp.status)}>
                          {emp.status}
                        </Badge>
                      </td>
                      <td className="py-3">
                        {emp.id !== session.user.id && (
                          <Button
                            variant={
                              emp.status === "ACTIVE"
                                ? "destructive"
                                : "outline"
                            }
                            size="sm"
                            disabled={updatingId === emp.id}
                            onClick={() => handleToggleStatus(emp)}
                          >
                            {emp.status === "ACTIVE"
                              ? "Deactivate"
                              : "Reactivate"}
                          </Button>
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
