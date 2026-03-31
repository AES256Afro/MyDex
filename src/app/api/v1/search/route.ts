import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasMinRole } from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = session.user.organizationId;
  const role = session.user.role;
  const isManager = hasMinRole(role, "MANAGER");
  const query = request.nextUrl.searchParams.get("q")?.trim();

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const results: { type: string; id: string; title: string; subtitle: string; href: string }[] = [];

    // Search employees (managers+)
    if (isManager) {
      const employees = await prisma.user.findMany({
        where: {
          organizationId: orgId,
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
          ],
        },
        select: { id: true, name: true, email: true, role: true },
        take: 5,
      });
      for (const emp of employees) {
        results.push({
          type: "employee",
          id: emp.id,
          title: emp.name,
          subtitle: `${emp.email} · ${emp.role}`,
          href: `/employees/${emp.id}`,
        });
      }
    }

    // Search devices (managers+)
    if (isManager) {
      const devices = await prisma.agentDevice.findMany({
        where: {
          organizationId: orgId,
          OR: [
            { hostname: { contains: query, mode: "insensitive" } },
            { ipAddress: { contains: query, mode: "insensitive" } },
          ],
        },
        select: { id: true, hostname: true, platform: true, status: true },
        take: 5,
      });
      for (const dev of devices) {
        results.push({
          type: "device",
          id: dev.id,
          title: dev.hostname,
          subtitle: `${dev.platform || "Unknown"} · ${dev.status}`,
          href: `/devices?device=${dev.id}`,
        });
      }
    }

    // Search projects
    const projects = await prisma.project.findMany({
      where: {
        organizationId: orgId,
        name: { contains: query, mode: "insensitive" },
      },
      select: { id: true, name: true, status: true },
      take: 5,
    });
    for (const proj of projects) {
      results.push({
        type: "project",
        id: proj.id,
        title: proj.name,
        subtitle: `Project · ${proj.status}`,
        href: `/projects/${proj.id}`,
      });
    }

    // Search support tickets (managers+)
    if (isManager) {
      const tickets = await prisma.supportTicket.findMany({
        where: {
          organizationId: orgId,
          OR: [
            { subject: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
          ],
        },
        select: { id: true, subject: true, status: true, priority: true },
        take: 5,
      });
      for (const ticket of tickets) {
        results.push({
          type: "ticket",
          id: ticket.id,
          title: ticket.subject,
          subtitle: `Ticket · ${ticket.status} · ${ticket.priority}`,
          href: `/it-support?ticket=${ticket.id}`,
        });
      }
    }

    // Search security alerts (managers+)
    if (isManager) {
      const alerts = await prisma.securityAlert.findMany({
        where: {
          organizationId: orgId,
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
          ],
        },
        select: { id: true, alertType: true, severity: true, title: true, description: true },
        take: 3,
      });
      for (const alert of alerts) {
        results.push({
          type: "alert",
          id: alert.id,
          title: alert.title || alert.alertType.replace(/_/g, " "),
          subtitle: `${alert.severity} · ${(alert.description || "").slice(0, 60)}`,
          href: `/security`,
        });
      }
    }

    return NextResponse.json({ results: results.slice(0, 20) });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
