"use client";

import { useRequireRole } from "@/hooks/use-require-role";
import { useEffect, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import Link from "next/link";

interface LeaveRequest {
  id: string;
  userId: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string | null;
  status: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    department: string | null;
  };
}

function statusBadgeVariant(status: string) {
  switch (status) {
    case "PENDING":
      return "warning" as const;
    case "APPROVED":
      return "success" as const;
    case "REJECTED":
      return "destructive" as const;
    case "CANCELLED":
      return "secondary" as const;
    default:
      return "outline" as const;
  }
}

export default function LeaveRequestsPage() {
  const { authorized } = useRequireRole("MANAGER");
  if (!authorized) return null;

  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // New request form state
  const [showForm, setShowForm] = useState(false);
  const [leaveType, setLeaveType] = useState("ANNUAL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);

  const fetchRequests = async () => {
    try {
      const params = new URLSearchParams();
      if (filterStatus !== "all") params.set("status", filterStatus);
      const res = await fetch(`/api/v1/attendance/leave-requests?${params}`);
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(false);

    startTransition(async () => {
      try {
        const res = await fetch("/api/v1/attendance/leave-requests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ leaveType, startDate, endDate, reason }),
        });

        if (!res.ok) {
          const data = await res.json();
          setFormError(data.error || "Failed to submit request");
          return;
        }

        setFormSuccess(true);
        setStartDate("");
        setEndDate("");
        setReason("");
        setShowForm(false);
        fetchRequests();
      } catch {
        setFormError("Failed to submit request");
      }
    });
  };

  const handleAction = async (id: string, action: "APPROVED" | "REJECTED") => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/v1/attendance/leave-requests", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, action }),
        });
        if (res.ok) {
          fetchRequests();
        }
      } catch {
        // silently fail
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leave Requests</h1>
          <p className="text-muted-foreground">
            Manage and submit leave requests
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/attendance"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            Back to Attendance
          </Link>
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? "Cancel" : "New Request"}
          </Button>
        </div>
      </div>

      {/* New Request Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Submit Leave Request</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="leaveType">Leave Type</Label>
                  <Select
                    id="leaveType"
                    value={leaveType}
                    onChange={(e) => setLeaveType(e.target.value)}
                  >
                    <option value="ANNUAL">Annual</option>
                    <option value="SICK">Sick</option>
                    <option value="PERSONAL">Personal</option>
                    <option value="UNPAID">Unpaid</option>
                    <option value="MATERNITY">Maternity</option>
                    <option value="PATERNITY">Paternity</option>
                    <option value="OTHER">Other</option>
                  </Select>
                </div>
                <div />
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reason">Reason (optional)</Label>
                <Input
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Briefly describe your reason..."
                />
              </div>
              {formError && (
                <p className="text-sm text-destructive">{formError}</p>
              )}
              {formSuccess && (
                <p className="text-sm text-green-600">
                  Leave request submitted successfully!
                </p>
              )}
              <Button type="submit" disabled={isPending}>
                {isPending ? "Submitting..." : "Submit Request"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Label htmlFor="statusFilter" className="text-sm whitespace-nowrap">
          Filter by status:
        </Label>
        <Select
          id="statusFilter"
          className="w-48"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="all">All</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="CANCELLED">Cancelled</option>
        </Select>
      </div>

      {/* Leave Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Leave Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Loading...
            </p>
          ) : requests.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No leave requests found.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">
                      Employee
                    </th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">
                      Type
                    </th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">
                      Start
                    </th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">
                      End
                    </th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">
                      Reason
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
                  {requests.map((req) => (
                    <tr
                      key={req.id}
                      className="border-b last:border-0 hover:bg-muted/50 transition-colors"
                    >
                      <td className="py-3 pr-4 font-medium">
                        {req.user.name}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground capitalize">
                        {req.leaveType.toLowerCase()}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {new Date(req.startDate).toLocaleDateString()}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {new Date(req.endDate).toLocaleDateString()}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground max-w-[200px] truncate">
                        {req.reason || "\u2014"}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant={statusBadgeVariant(req.status)}>
                          {req.status}
                        </Badge>
                      </td>
                      <td className="py-3">
                        {req.status === "PENDING" && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleAction(req.id, "APPROVED")}
                              disabled={isPending}
                              className="rounded bg-green-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleAction(req.id, "REJECTED")}
                              disabled={isPending}
                              className="rounded bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                            >
                              Reject
                            </button>
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
