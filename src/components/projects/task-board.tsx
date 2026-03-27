"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Calendar,
  User,
} from "lucide-react";

type TaskStatus = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE" | "CANCELLED";
type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

interface TaskItem {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  assignee: { id: string; name: string; image: string | null } | null;
}

interface Member {
  id: string;
  name: string;
  image: string | null;
}

interface TaskBoardProps {
  projectId: string;
  tasks: TaskItem[];
  members: Member[];
  canWrite: boolean;
}

const COLUMNS: { key: TaskStatus; label: string }[] = [
  { key: "TODO", label: "Todo" },
  { key: "IN_PROGRESS", label: "In Progress" },
  { key: "IN_REVIEW", label: "In Review" },
  { key: "DONE", label: "Done" },
];

const STATUS_ORDER: TaskStatus[] = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"];

function priorityBadgeVariant(priority: TaskPriority) {
  switch (priority) {
    case "LOW":
      return "secondary" as const;
    case "MEDIUM":
      return "default" as const;
    case "HIGH":
      return "warning" as const;
    case "URGENT":
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

export function TaskBoard({
  projectId,
  tasks: initialTasks,
  members,
  canWrite,
}: TaskBoardProps) {
  const router = useRouter();
  const [tasks, setTasks] = useState<TaskItem[]>(initialTasks);
  const [movingTaskId, setMovingTaskId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState<TaskStatus | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>("MEDIUM");
  const [newTaskAssigneeId, setNewTaskAssigneeId] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [addingTask, setAddingTask] = useState(false);

  async function moveTask(taskId: string, direction: "left" | "right") {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const currentIndex = STATUS_ORDER.indexOf(task.status);
    const newIndex =
      direction === "right" ? currentIndex + 1 : currentIndex - 1;
    if (newIndex < 0 || newIndex >= STATUS_ORDER.length) return;

    const newStatus = STATUS_ORDER[newIndex];
    setMovingTaskId(taskId);

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );

    try {
      const res = await fetch(
        `/api/v1/projects/${projectId}/tasks/${taskId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (!res.ok) {
        // Revert on failure
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId ? { ...t, status: task.status } : t
          )
        );
      }
    } catch {
      // Revert on error
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, status: task.status } : t
        )
      );
    } finally {
      setMovingTaskId(null);
    }
  }

  async function handleAddTask(status: TaskStatus) {
    if (!newTaskTitle.trim()) return;
    setAddingTask(true);

    try {
      const res = await fetch(`/api/v1/projects/${projectId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTaskTitle.trim(),
          status,
          priority: newTaskPriority,
          assigneeId: newTaskAssigneeId || undefined,
          dueDate: newTaskDueDate || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setTasks((prev) => [
          ...prev,
          {
            id: data.task.id,
            title: data.task.title,
            description: data.task.description,
            status: data.task.status,
            priority: data.task.priority,
            dueDate: data.task.dueDate,
            assignee: data.task.assignee || null,
          },
        ]);
        setNewTaskTitle("");
        setNewTaskPriority("MEDIUM");
        setNewTaskAssigneeId("");
        setNewTaskDueDate("");
        setShowAddForm(null);
      }
    } catch {
      // Silently fail - user can retry
    } finally {
      setAddingTask(false);
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {COLUMNS.map((column) => {
        const columnTasks = tasks.filter((t) => t.status === column.key);
        const columnIndex = STATUS_ORDER.indexOf(column.key);

        return (
          <div key={column.key} className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                {column.label}
                <span className="ml-2 text-xs font-normal">
                  ({columnTasks.length})
                </span>
              </h3>
              {canWrite && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() =>
                    setShowAddForm(
                      showAddForm === column.key ? null : column.key
                    )
                  }
                >
                  {showAddForm === column.key ? (
                    <X className="h-4 w-4" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>

            {/* Add Task Form */}
            {showAddForm === column.key && canWrite && (
              <Card className="border-dashed">
                <CardContent className="p-3 space-y-2">
                  <Input
                    placeholder="Task title..."
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newTaskTitle.trim()) {
                        handleAddTask(column.key);
                      }
                    }}
                    autoFocus
                  />
                  <div className="space-y-1.5">
                    <Label className="text-xs">Priority</Label>
                    <select
                      value={newTaskPriority}
                      onChange={(e) =>
                        setNewTaskPriority(e.target.value as TaskPriority)
                      }
                      className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Assignee</Label>
                    <select
                      value={newTaskAssigneeId}
                      onChange={(e) => setNewTaskAssigneeId(e.target.value)}
                      className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="">Unassigned</option>
                      {members.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Due Date</Label>
                    <Input
                      type="date"
                      value={newTaskDueDate}
                      onChange={(e) => setNewTaskDueDate(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <Button
                    size="sm"
                    className="w-full"
                    disabled={addingTask || !newTaskTitle.trim()}
                    onClick={() => handleAddTask(column.key)}
                  >
                    {addingTask ? "Adding..." : "Add Task"}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Task Cards */}
            <div className="space-y-2 min-h-[100px]">
              {columnTasks.map((task) => (
                <Card
                  key={task.id}
                  className={`transition-opacity ${
                    movingTaskId === task.id ? "opacity-50" : ""
                  }`}
                >
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-medium leading-tight">
                        {task.title}
                      </span>
                      <Badge
                        variant={priorityBadgeVariant(task.priority)}
                        className="shrink-0 text-[10px] px-1.5 py-0"
                      >
                        {task.priority}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {task.assignee && (
                        <span className="flex items-center gap-1">
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-medium">
                            {getInitials(task.assignee.name)}
                          </span>
                          <span className="truncate max-w-[80px]">
                            {task.assignee.name}
                          </span>
                        </span>
                      )}
                      {task.dueDate && (
                        <span className="flex items-center gap-1 ml-auto">
                          <Calendar className="h-3 w-3" />
                          {new Date(task.dueDate).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      )}
                    </div>

                    {/* Move buttons */}
                    {canWrite && (
                      <div className="flex items-center justify-between pt-1 border-t">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          disabled={
                            columnIndex === 0 || movingTaskId === task.id
                          }
                          onClick={() => moveTask(task.id, "left")}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          disabled={
                            columnIndex === STATUS_ORDER.length - 1 ||
                            movingTaskId === task.id
                          }
                          onClick={() => moveTask(task.id, "right")}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
