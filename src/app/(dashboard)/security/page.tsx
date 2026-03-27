import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Shield, ShieldCheck, FileText, AlertTriangle, Fingerprint, Bug } from "lucide-react";

export default async function SecurityOverviewPage() {
  const session = await auth();
  if (!session) redirect("/login");

  if (!hasPermission(session.user.role, "security:read")) {
    redirect("/dashboard");
  }

  const orgId = session.user.organizationId;

  const [openAlerts, criticalAlerts, activePolicies, recentLogCount, iocCount, openCveCount] =
    await Promise.all([
      prisma.securityAlert.count({
        where: { organizationId: orgId, status: "OPEN" },
      }),
      prisma.securityAlert.count({
        where: {
          organizationId: orgId,
          severity: "CRITICAL",
          status: { in: ["OPEN", "INVESTIGATING"] },
        },
      }),
      prisma.dlpPolicy.count({
        where: { organizationId: orgId, isActive: true },
      }),
      prisma.auditLog.count({
        where: {
          organizationId: orgId,
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      }),
      prisma.iocEntry.count({
        where: { organizationId: orgId },
      }),
      prisma.cveEntry.count({
        where: { organizationId: orgId, status: "OPEN" },
      }),
    ]);

  const sections = [
    {
      title: "Threat Dashboard",
      description: `${openAlerts} open alert${openAlerts !== 1 ? "s" : ""}${
        criticalAlerts > 0 ? ` (${criticalAlerts} critical)` : ""
      }`,
      href: "/security/threats",
      icon: AlertTriangle,
      highlight: criticalAlerts > 0,
    },
    {
      title: "IOC Detection",
      description: `${iocCount} hash${iocCount !== 1 ? "es" : ""} in database`,
      href: "/security/ioc",
      icon: Fingerprint,
      highlight: false,
    },
    {
      title: "CVE Scanner",
      description: `${openCveCount} open vulnerabilit${openCveCount !== 1 ? "ies" : "y"}`,
      href: "/security/cve",
      icon: Bug,
      highlight: openCveCount > 0,
    },
    {
      title: "DLP Policies",
      description: `${activePolicies} active polic${
        activePolicies !== 1 ? "ies" : "y"
      }`,
      href: "/security/dlp",
      icon: ShieldCheck,
      highlight: false,
    },
    {
      title: "Audit Log",
      description: `${recentLogCount} event${
        recentLogCount !== 1 ? "s" : ""
      } in the last 24 hours`,
      href: "/security/audit-log",
      icon: FileText,
      highlight: false,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Shield className="h-8 w-8" />
          Security
        </h1>
        <p className="text-muted-foreground">
          Monitor threats, manage policies, and review audit logs
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((section) => (
          <Link key={section.href} href={section.href}>
            <Card
              className={`h-full transition-colors hover:bg-muted/50 ${
                section.highlight ? "border-destructive/50" : ""
              }`}
            >
              <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
                <section.icon
                  className={`h-5 w-5 ${
                    section.highlight
                      ? "text-destructive"
                      : "text-muted-foreground"
                  }`}
                />
                <CardTitle className="text-base">{section.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p
                  className={`text-sm ${
                    section.highlight
                      ? "text-destructive font-medium"
                      : "text-muted-foreground"
                  }`}
                >
                  {section.description}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
