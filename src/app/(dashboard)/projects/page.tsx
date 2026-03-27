import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { FolderKanban, Plus } from "lucide-react";
import { format } from "date-fns";
import type { ProjectStatus } from "@/generated/prisma";

function statusBadgeVariant(status: ProjectStatus) {
  switch (status) {
    case "PLANNING":
      return "secondary" as const;
    case "ACTIVE":
      return "success" as const;
    case "ON_HOLD":
      return "warning" as const;
    case "COMPLETED":
      return "default" as const;
    case "ARCHIVED":
      return "outline" as const;
  }
}

export default async function ProjectsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  if (!hasPermission(session.user.role, "projects:read")) {
    redirect("/dashboard");
  }

  const projects = await prisma.project.findMany({
    where: { organizationId: session.user.organizationId },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: {
        select: { tasks: true },
      },
    },
  });

  const canCreate = hasPermission(session.user.role, "projects:write");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">
            {projects.length} project{projects.length !== 1 ? "s" : ""} in your
            organization
          </p>
        </div>
        {canCreate && (
          <Link
            href="/projects/new"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Project
          </Link>
        )}
      </div>

      {projects.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <p className="text-sm text-muted-foreground text-center">
              No projects yet. Create your first project to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg leading-tight">
                      <span className="flex items-center gap-2">
                        <FolderKanban className="h-4 w-4 shrink-0 text-muted-foreground" />
                        {project.name}
                      </span>
                    </CardTitle>
                    <Badge variant={statusBadgeVariant(project.status)}>
                      {project.status.replace("_", " ")}
                    </Badge>
                  </div>
                  {project.description && (
                    <CardDescription className="line-clamp-2 mt-1">
                      {project.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>
                      {project._count.tasks} task
                      {project._count.tasks !== 1 ? "s" : ""}
                    </span>
                    <span>
                      {project.startDate && project.endDate
                        ? `${format(new Date(project.startDate), "MMM d")} - ${format(new Date(project.endDate), "MMM d, yyyy")}`
                        : project.startDate
                          ? `Started ${format(new Date(project.startDate), "MMM d, yyyy")}`
                          : "No dates set"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
