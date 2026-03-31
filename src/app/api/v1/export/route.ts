import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";
import { generateCSV } from "@/lib/csv";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const type = searchParams.get("type");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const orgId = session.user.organizationId;

  // Parse date range (default: last 30 days)
  const dateFrom = from
    ? new Date(from)
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const dateTo = to ? new Date(to) : new Date();

  try {
    let csv = "";
    let filename = "";

    switch (type) {
      case "attendance": {
        if (
          !hasPermission(session.user.role, "attendance:read-all") &&
          !hasPermission(session.user.role, "attendance:read")
        ) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        const isAll = hasPermission(session.user.role, "attendance:read-all");

        const records = await prisma.attendanceRecord.findMany({
          where: {
            organizationId: orgId,
            date: { gte: dateFrom, lte: dateTo },
            ...(isAll ? {} : { userId: session.user.id }),
          },
          include: {
            user: { select: { name: true, email: true, department: true } },
          },
          orderBy: { date: "desc" },
          take: 10000,
        });

        const headers = [
          "Date",
          "Employee",
          "Email",
          "Department",
          "Status",
          "Check In",
          "Check Out",
          "Notes",
        ];
        const rows = records.map((r) => [
          r.date.toISOString().split("T")[0],
          r.user.name,
          r.user.email,
          r.user.department || "",
          r.status,
          r.checkIn ? r.checkIn.toISOString() : "",
          r.checkOut ? r.checkOut.toISOString() : "",
          r.notes || "",
        ]);
        csv = generateCSV(headers, rows);
        filename = `attendance-${dateFrom.toISOString().split("T")[0]}-to-${dateTo.toISOString().split("T")[0]}.csv`;
        break;
      }

      case "time-entries": {
        if (!hasPermission(session.user.role, "time-entries:read")) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        const canReadAll = hasPermission(
          session.user.role,
          "time-entries:read-all",
        );

        const entries = await prisma.timeEntry.findMany({
          where: {
            organizationId: orgId,
            clockIn: { gte: dateFrom, lte: dateTo },
            ...(canReadAll ? {} : { userId: session.user.id }),
          },
          include: {
            user: { select: { name: true, email: true, department: true } },
          },
          orderBy: { clockIn: "desc" },
          take: 10000,
        });

        const headers = [
          "Date",
          "Employee",
          "Email",
          "Clock In",
          "Clock Out",
          "Duration (hours)",
          "Notes",
        ];
        const rows = entries.map((e) => {
          const durationMs = e.clockOut
            ? e.clockOut.getTime() - e.clockIn.getTime()
            : 0;
          const hours = (durationMs / 3600000).toFixed(2);
          return [
            e.clockIn.toISOString().split("T")[0],
            e.user.name,
            e.user.email,
            e.clockIn.toISOString(),
            e.clockOut ? e.clockOut.toISOString() : "Still clocked in",
            hours,
            e.notes || "",
          ];
        });
        csv = generateCSV(headers, rows);
        filename = `time-entries-${dateFrom.toISOString().split("T")[0]}-to-${dateTo.toISOString().split("T")[0]}.csv`;
        break;
      }

      case "audit-log": {
        if (!hasPermission(session.user.role, "security:read")) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const logs = await prisma.auditLog.findMany({
          where: {
            organizationId: orgId,
            createdAt: { gte: dateFrom, lte: dateTo },
          },
          include: { user: { select: { name: true, email: true } } },
          orderBy: { createdAt: "desc" },
          take: 10000,
        });

        const headers = [
          "Timestamp",
          "User",
          "Email",
          "Action",
          "Resource",
          "Details",
          "IP Address",
        ];
        const rows = logs.map((l) => [
          l.createdAt.toISOString(),
          l.user?.name || "System",
          l.user?.email || "",
          l.action,
          l.resource || "",
          l.details
            ? typeof l.details === "string"
              ? l.details
              : JSON.stringify(l.details)
            : "",
          l.ipAddress || "",
        ]);
        csv = generateCSV(headers, rows);
        filename = `audit-log-${dateFrom.toISOString().split("T")[0]}-to-${dateTo.toISOString().split("T")[0]}.csv`;
        break;
      }

      case "devices": {
        if (!hasPermission(session.user.role, "security:read")) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const devices = await prisma.agentDevice.findMany({
          where: { organizationId: orgId },
          include: { user: { select: { name: true, email: true } } },
          orderBy: { lastSeenAt: "desc" },
        });

        const headers = [
          "Hostname",
          "Platform",
          "OS Version",
          "Status",
          "Security Grade",
          "Assigned To",
          "Email",
          "Last Seen",
          "Enrolled",
        ];
        const rows = devices.map((d) => [
          d.hostname || "",
          d.platform || "",
          d.osVersion || "",
          d.status || "",
          d.securityGrade || "",
          d.user?.name || "Unassigned",
          d.user?.email || "",
          d.lastSeenAt ? d.lastSeenAt.toISOString() : "",
          d.createdAt.toISOString(),
        ]);
        csv = generateCSV(headers, rows);
        filename = `devices-export.csv`;
        break;
      }

      case "employees": {
        if (!hasPermission(session.user.role, "employees:read")) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const users = await prisma.user.findMany({
          where: { organizationId: orgId },
          select: {
            name: true,
            email: true,
            role: true,
            department: true,
            status: true,
            createdAt: true,
          },
          orderBy: { name: "asc" },
        });

        const headers = [
          "Name",
          "Email",
          "Role",
          "Department",
          "Status",
          "Joined",
        ];
        const rows = users.map((u) => [
          u.name,
          u.email,
          u.role,
          u.department || "",
          u.status,
          u.createdAt.toISOString().split("T")[0],
        ]);
        csv = generateCSV(headers, rows);
        filename = `employees-export.csv`;
        break;
      }

      case "security-alerts": {
        if (!hasPermission(session.user.role, "security:read")) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const alerts = await prisma.securityAlert.findMany({
          where: {
            organizationId: orgId,
            createdAt: { gte: dateFrom, lte: dateTo },
          },
          include: { user: { select: { name: true, email: true } } },
          orderBy: { createdAt: "desc" },
          take: 10000,
        });

        const headers = [
          "Timestamp",
          "Severity",
          "Type",
          "Title",
          "Description",
          "Status",
          "User",
          "Email",
        ];
        const rows = alerts.map((a) => [
          a.createdAt.toISOString(),
          a.severity,
          a.alertType,
          a.title,
          a.description || "",
          a.status,
          a.user?.name || "",
          a.user?.email || "",
        ]);
        csv = generateCSV(headers, rows);
        filename = `security-alerts-${dateFrom.toISOString().split("T")[0]}-to-${dateTo.toISOString().split("T")[0]}.csv`;
        break;
      }

      default:
        return NextResponse.json(
          { error: "Invalid export type" },
          { status: 400 },
        );
    }

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
