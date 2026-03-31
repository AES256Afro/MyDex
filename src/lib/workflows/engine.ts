import { prisma } from "@/lib/prisma";
import { sendIntegrationMessage } from "@/lib/integrations";
import { createNotification, notifyAdmins } from "@/lib/notifications";
import { notificationEmailTemplate } from "@/lib/email-templates";
import type { Prisma } from "@/generated/prisma";

// ── Condition types ──

interface Condition {
  field: string;
  operator: "equals" | "not_equals" | "contains" | "greater_than" | "less_than" | "in";
  value: unknown;
}

// ── Action types ──

interface ActionConfig {
  type: "send_notification" | "send_channel_message" | "create_ticket" | "assign_ticket" | "send_email";
  config: Record<string, unknown>;
}

// ── Condition evaluation ──

export function evaluateCondition(condition: Condition, data: Record<string, unknown>): boolean {
  const fieldValue = data[condition.field];
  const expected = condition.value;

  switch (condition.operator) {
    case "equals":
      return String(fieldValue).toLowerCase() === String(expected).toLowerCase();
    case "not_equals":
      return String(fieldValue).toLowerCase() !== String(expected).toLowerCase();
    case "contains":
      return String(fieldValue).toLowerCase().includes(String(expected).toLowerCase());
    case "greater_than":
      return Number(fieldValue) > Number(expected);
    case "less_than":
      return Number(fieldValue) < Number(expected);
    case "in": {
      const list = Array.isArray(expected) ? expected : String(expected).split(",").map((s) => s.trim());
      return list.some((v: unknown) => String(v).toLowerCase() === String(fieldValue).toLowerCase());
    }
    default:
      return false;
  }
}

export function evaluateAllConditions(conditions: Condition[], data: Record<string, unknown>): boolean {
  if (!conditions || conditions.length === 0) return true;
  return conditions.every((c) => evaluateCondition(c, data));
}

// ── Action execution ──

export async function executeAction(
  orgId: string,
  action: ActionConfig,
  triggerData: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  try {
    switch (action.type) {
      case "send_notification": {
        const cfg = action.config;
        const role = cfg.role as string | undefined;
        const userId = cfg.userId as string | undefined;
        const title = (cfg.title as string) || "Workflow Notification";
        const message = (cfg.message as string) || JSON.stringify(triggerData);
        const link = cfg.link as string | undefined;

        if (role === "ADMIN" || (!userId && !role)) {
          await notifyAdmins({ organizationId: orgId, type: "WORKFLOW", title, message, link });
        } else if (userId) {
          await createNotification({ organizationId: orgId, userId, type: "WORKFLOW", title, message, link });
        }
        return { success: true };
      }

      case "send_channel_message": {
        const cfg = action.config;
        const title = (cfg.title as string) || "Workflow Alert";
        const message = (cfg.message as string) || JSON.stringify(triggerData);
        const color = cfg.color as string | undefined;
        const link = cfg.link as string | undefined;
        await sendIntegrationMessage(orgId, { title, message, color, link });
        return { success: true };
      }

      case "create_ticket": {
        const cfg = action.config;
        // Find first admin to submit as
        const admin = await prisma.user.findFirst({
          where: { organizationId: orgId, role: { in: ["ADMIN", "SUPER_ADMIN"] }, status: "ACTIVE" },
          select: { id: true },
        });
        if (!admin) return { success: false, error: "No admin user found to create ticket" };

        const priority = (cfg.priority as string) || "MEDIUM";
        const validPriorities = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
        const ticketPriority = validPriorities.includes(priority as typeof validPriorities[number])
          ? (priority as typeof validPriorities[number])
          : "MEDIUM";

        await prisma.supportTicket.create({
          data: {
            organizationId: orgId,
            submittedBy: admin.id,
            subject: (cfg.subject as string) || `[Workflow] ${(triggerData.title as string) || "Automated ticket"}`,
            category: (cfg.category as string) || "Automated",
            description: (cfg.description as string) || `Auto-created by workflow. Trigger data: ${JSON.stringify(triggerData)}`,
            priority: ticketPriority,
          },
        });
        return { success: true };
      }

      case "assign_ticket": {
        const cfg = action.config;
        const ticketId = (triggerData.ticketId as string) || (cfg.ticketId as string);
        const assignTo = cfg.assignTo as string;
        if (!ticketId || !assignTo) {
          return { success: false, error: "Missing ticketId or assignTo in action config" };
        }
        await prisma.supportTicket.update({
          where: { id: ticketId },
          data: { assignedTo: assignTo },
        });
        return { success: true };
      }

      case "send_email": {
        const cfg = action.config;
        const to = cfg.to as string;
        const subject = (cfg.subject as string) || "Workflow Notification";
        const body = (cfg.body as string) || JSON.stringify(triggerData);
        if (!to) return { success: false, error: "Missing email recipient" };

        const appUrl = process.env.NEXTAUTH_URL || "https://mydexnow.com";

        // Lazy-init Resend
        const { Resend } = await import("resend");
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || "MyDex <noreply@antifascist.work>",
          to,
          subject,
          html: notificationEmailTemplate({
            title: subject,
            message: body,
            ctaText: "View in MyDex",
            ctaUrl: appUrl,
          }),
        });
        return { success: true };
      }

      default:
        return { success: false, error: `Unknown action type: ${(action as ActionConfig).type}` };
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ── Main engine entry point ──

export async function evaluateWorkflows(
  orgId: string,
  trigger: string,
  triggerData: Record<string, unknown>
): Promise<void> {
  try {
    // Fetch all active workflows for this org + trigger
    const workflows = await prisma.workflow.findMany({
      where: {
        organizationId: orgId,
        trigger,
        isActive: true,
      },
    });

    if (workflows.length === 0) return;

    for (const workflow of workflows) {
      const conditions = (workflow.conditions as unknown as Condition[]) || [];
      const actions = (workflow.actions as unknown as ActionConfig[]) || [];

      // Evaluate conditions
      if (!evaluateAllConditions(conditions, triggerData)) continue;

      // Execute each action independently — one failure does not stop others
      const results: Array<{ type: string; success: boolean; error?: string }> = [];
      for (const action of actions) {
        const result = await executeAction(orgId, action, triggerData);
        results.push({ type: action.type, ...result });
      }

      const allSuccess = results.every((r) => r.success);
      const errors = results.filter((r) => !r.success).map((r) => `${r.type}: ${r.error}`);

      // Log execution
      await prisma.workflowLog.create({
        data: {
          workflowId: workflow.id,
          organizationId: orgId,
          trigger,
          triggerData: triggerData as Prisma.InputJsonValue,
          actionsExecuted: results as unknown as Prisma.InputJsonValue,
          success: allSuccess,
          errorMessage: errors.length > 0 ? errors.join("; ") : null,
        },
      });

      // Update workflow stats
      await prisma.workflow.update({
        where: { id: workflow.id },
        data: {
          lastTriggeredAt: new Date(),
          triggerCount: { increment: 1 },
        },
      });
    }
  } catch (err) {
    console.error("[WorkflowEngine] Fatal error evaluating workflows:", err);
  }
}
