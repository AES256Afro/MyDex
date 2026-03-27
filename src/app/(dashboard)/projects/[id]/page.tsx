import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { ArrowLeft, Calendar, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { TaskBoard } from "@/components/projects/task-board";
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

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  if (!hasPermission(session.user.role, "projects:read")) {
    redirect("/dashboard");
  }

  const { id } = await params;

  const project = await prisma.project.findFirst({
    where: {
      id,
      organizationId: session.user.organizationId,
    },
    include: {
      tasks: {
        include: {
          assignee: {
            select: { id: true, name: true, image: true },
          },
        },
        orderBy: { sortOrder: "asc" },
      },
      milestones: {
        orderBy: { dueDate: "asc" },
      },
    },
  });

  if (!project) notFound();

  const canWrite = hasPermission(session.user.role, "projects:write");
  const canWriteTasks = hasPermission(session.user.role, "tasks:write");

  // Fetch org members for task assignment
  const members = await prisma.user.findMany({
    where: {
      organizationId: session.user.organizationId,
      status: "ACTIVE",
    },
    select: { id: true, name: true, image: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/projects"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Projects
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">
                {project.name}
              </h1>
              <Badge variant={statusBadgeVariant(project.status)}>
                {project.status.replace("_", " ")}
              </Badge>
            </div>
            {project.description && (
              <p className="text-muted-foreground mt-1 max-w-2xl">
                {project.description}
              </p>
            )}
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              {project.startDate && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {format(new Date(project.startDate), "MMM d, yyyy")}
                  {project.endDate &&
                    ` - ${format(new Date(project.endDate), "MMM d, yyyy")}`}
                </span>
              )}
              <span>
                {project.tasks.length} task
                {project.tasks.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>
      </div>

      <TaskBoard
        projectId={project.id}
        tasks={project.tasks.map((t) => ({
          id: t.id,
          title: t.title,
          description: t.description,
          status: t.status,
          priority: t.priority,
          dueDate: t.dueDate ? t.dueDate.toISOString() : null,
          assignee: t.assignee
            ? { id: t.assignee.id, name: t.assignee.name, image: t.assignee.image }
            : null,
        }))}
        members={members}
        canWrite={canWriteTasks}
      />

      {/* Milestones */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Milestones</CardTitle>
        </CardHeader>
        <CardContent>
          {project.milestones.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No milestones defined for this project.
            </p>
          ) : (
            <div className="space-y-3">
              {project.milestones.map((milestone) => (
                <div
                  key={milestone.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle2
                      className={`h-5 w-5 ${
                        milestone.completed
                          ? "text-green-600"
                          : "text-muted-foreground"
                      }`}
                    />
                    <span
                      className={
                        milestone.completed
                          ? "line-through text-muted-foreground"
                          : ""
                      }
                    >
                      {milestone.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {milestone.dueDate && (
                      <span>
                        Due {format(new Date(milestone.dueDate), "MMM d, yyyy")}
                      </span>
                    )}
                    {milestone.completed && (
                      <Badge variant="success">Completed</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
