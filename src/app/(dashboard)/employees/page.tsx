import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { Users, UserPlus } from "lucide-react";
import type { Role, UserStatus } from "@/generated/prisma";
import { ExportButton } from "@/components/shared/export-button";

function roleBadgeVariant(role: Role) {
  switch (role) {
    case "SUPER_ADMIN":
      return "destructive" as const;
    case "ADMIN":
      return "default" as const;
    case "MANAGER":
      return "warning" as const;
    case "EMPLOYEE":
      return "secondary" as const;
  }
}

function statusBadgeVariant(status: UserStatus) {
  switch (status) {
    case "ACTIVE":
      return "success" as const;
    case "INACTIVE":
      return "secondary" as const;
    case "SUSPENDED":
      return "destructive" as const;
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

export default async function EmployeesPage() {
  const session = await auth();
  if (!session) redirect("/login");

  if (!hasPermission(session.user.role, "employees:read")) {
    redirect("/dashboard");
  }

  const employees = await prisma.user.findMany({
    where: { organizationId: session.user.organizationId },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      status: true,
      department: true,
      jobTitle: true,
    },
  });

  const canInvite = hasPermission(session.user.role, "employees:invite");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Employees</h1>
          <p className="text-muted-foreground">
            {employees.length} team member{employees.length !== 1 ? "s" : ""} in
            your organization
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton type="employees" />
          {canInvite && (
            <Link
              href="/settings/team"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
            >
              <UserPlus className="h-4 w-4" />
              Invite Employee
            </Link>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5" />
            All Employees
          </CardTitle>
        </CardHeader>
        <CardContent>
          {employees.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No employees found. Invite team members to get started.
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
                      Role
                    </th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">
                      Department
                    </th>
                    <th className="pb-3 font-medium text-muted-foreground">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((employee) => (
                    <tr
                      key={employee.id}
                      className="border-b last:border-0 hover:bg-muted/50 transition-colors"
                    >
                      <td className="py-3 pr-4">
                        <Link
                          href={`/employees/${employee.id}`}
                          className="flex items-center gap-3 hover:underline"
                        >
                          <Avatar className="h-8 w-8">
                            {employee.image && (
                              <AvatarImage src={employee.image} alt={employee.name} />
                            )}
                            <AvatarFallback className="text-xs">
                              {getInitials(employee.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{employee.name}</div>
                            {employee.jobTitle && (
                              <div className="text-xs text-muted-foreground">
                                {employee.jobTitle}
                              </div>
                            )}
                          </div>
                        </Link>
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {employee.email}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant={roleBadgeVariant(employee.role)}>
                          {employee.role.replace("_", " ")}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {employee.department ?? "—"}
                      </td>
                      <td className="py-3">
                        <Badge variant={statusBadgeVariant(employee.status)}>
                          {employee.status}
                        </Badge>
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
