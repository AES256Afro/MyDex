import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import Link from "next/link";
import { FileText } from "lucide-react";
import { ExportButton } from "@/components/shared/export-button";

interface SearchParams {
  page?: string;
  action?: string;
  user?: string;
}

const PAGE_SIZE = 50;

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  if (!hasPermission(session.user.role, "security:read")) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const currentPage = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const actionFilter = params.action ?? "";
  const userFilter = params.user ?? "";

  const where: Record<string, unknown> = {
    organizationId: session.user.organizationId,
  };

  if (actionFilter) {
    where.action = { contains: actionFilter, mode: "insensitive" };
  }

  if (userFilter) {
    where.user = {
      OR: [
        { name: { contains: userFilter, mode: "insensitive" } },
        { email: { contains: userFilter, mode: "insensitive" } },
      ],
    };
  }

  const [logs, totalCount] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.auditLog.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  function buildUrl(overrides: Record<string, string>) {
    const p = new URLSearchParams();
    if (overrides.page ?? params.page) p.set("page", overrides.page ?? params.page ?? "1");
    if (overrides.action ?? actionFilter) p.set("action", overrides.action ?? actionFilter);
    if (overrides.user ?? userFilter) p.set("user", overrides.user ?? userFilter);
    const qs = p.toString();
    return `/security/audit-log${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audit Log</h1>
          <p className="text-muted-foreground">
            {totalCount} audit event{totalCount !== 1 ? "s" : ""} recorded
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton type="audit-log" />
          <Link
            href="/security"
            className="text-sm text-muted-foreground hover:underline"
          >
            Back to Security
          </Link>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <form className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <label
                htmlFor="filter-action"
                className="text-sm font-medium text-muted-foreground"
              >
                Action
              </label>
              <input
                id="filter-action"
                name="action"
                type="text"
                defaultValue={actionFilter}
                placeholder="e.g., CREATE, UPDATE"
                className="flex h-9 w-48 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <div className="space-y-1">
              <label
                htmlFor="filter-user"
                className="text-sm font-medium text-muted-foreground"
              >
                User
              </label>
              <input
                id="filter-user"
                name="user"
                type="text"
                defaultValue={userFilter}
                placeholder="Name or email"
                className="flex h-9 w-48 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <input type="hidden" name="page" value="1" />
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 h-9 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
            >
              Search
            </button>
            {(actionFilter || userFilter) && (
              <Link
                href="/security/audit-log"
                className="inline-flex items-center justify-center rounded-md bg-muted px-4 h-9 text-sm font-medium text-muted-foreground hover:bg-muted/80 transition-colors"
              >
                Clear
              </Link>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Audit Log Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5" />
            Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No audit log entries found.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">
                      Timestamp
                    </th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">
                      User
                    </th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">
                      Action
                    </th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">
                      Resource
                    </th>
                    <th className="pb-3 font-medium text-muted-foreground">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr
                      key={log.id}
                      className="border-b last:border-0 hover:bg-muted/50 transition-colors"
                    >
                      <td className="py-3 pr-4 text-muted-foreground whitespace-nowrap">
                        {format(
                          new Date(log.createdAt),
                          "MMM d, yyyy HH:mm:ss"
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        {log.user ? (
                          <div>
                            <div className="font-medium">{log.user.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {log.user.email}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">System</span>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {log.resource}
                        {log.resourceId && (
                          <span className="text-xs ml-1 opacity-60">
                            ({log.resourceId})
                          </span>
                        )}
                      </td>
                      <td className="py-3">
                        {log.details ? (
                          <details className="text-xs">
                            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                              View
                            </summary>
                            <pre className="mt-1 p-2 rounded bg-muted overflow-x-auto max-w-md">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          </details>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex gap-2">
                {currentPage > 1 && (
                  <Link
                    href={buildUrl({ page: String(currentPage - 1) })}
                    className="inline-flex items-center justify-center rounded-md border px-3 h-8 text-sm font-medium hover:bg-muted transition-colors"
                  >
                    Previous
                  </Link>
                )}
                {currentPage < totalPages && (
                  <Link
                    href={buildUrl({ page: String(currentPage + 1) })}
                    className="inline-flex items-center justify-center rounded-md border px-3 h-8 text-sm font-medium hover:bg-muted transition-colors"
                  >
                    Next
                  </Link>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
