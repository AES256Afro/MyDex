import { evaluateWorkflows } from "@/lib/workflows/engine";
import { mockPrisma } from "../../helpers/mock-prisma";
import { sendIntegrationMessage } from "@/lib/integrations";
import { notifyAdmins } from "@/lib/notifications";

const ORG_ID = "org-test-123";

function makeWorkflow(overrides: Record<string, unknown> = {}) {
  return {
    id: "wf-1",
    organizationId: ORG_ID,
    name: "Test Workflow",
    trigger: "ticket.created",
    isActive: true,
    conditions: [],
    actions: [],
    triggerCount: 0,
    lastTriggeredAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("evaluateWorkflows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns early when no active workflows are found", async () => {
    vi.mocked(mockPrisma.workflow.findMany).mockResolvedValue([]);

    await evaluateWorkflows(ORG_ID, "ticket.created", { ticketId: "t-1" });

    expect(mockPrisma.workflow.findMany).toHaveBeenCalledWith({
      where: {
        organizationId: ORG_ID,
        trigger: "ticket.created",
        isActive: true,
      },
    });
    expect(mockPrisma.workflowLog.create).not.toHaveBeenCalled();
  });

  it("executes actions and creates success log when conditions match", async () => {
    const workflow = makeWorkflow({
      conditions: [
        { field: "priority", operator: "equals", value: "HIGH" },
      ],
      actions: [
        {
          type: "send_notification",
          config: { role: "ADMIN", title: "High priority ticket", message: "Check it" },
        },
      ],
    });

    vi.mocked(mockPrisma.workflow.findMany).mockResolvedValue([workflow] as any);
    vi.mocked(mockPrisma.workflowLog.create).mockResolvedValue({} as any);
    vi.mocked(mockPrisma.workflow.update).mockResolvedValue({} as any);

    await evaluateWorkflows(ORG_ID, "ticket.created", { priority: "HIGH" });

    expect(notifyAdmins).toHaveBeenCalled();
    expect(mockPrisma.workflowLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        workflowId: "wf-1",
        organizationId: ORG_ID,
        trigger: "ticket.created",
        success: true,
        errorMessage: null,
      }),
    });
    expect(mockPrisma.workflow.update).toHaveBeenCalledWith({
      where: { id: "wf-1" },
      data: {
        lastTriggeredAt: expect.any(Date),
        triggerCount: { increment: 1 },
      },
    });
  });

  it("skips workflow when conditions do not match", async () => {
    const workflow = makeWorkflow({
      conditions: [
        { field: "priority", operator: "equals", value: "CRITICAL" },
      ],
      actions: [
        { type: "send_notification", config: { role: "ADMIN", title: "Alert" } },
      ],
    });

    vi.mocked(mockPrisma.workflow.findMany).mockResolvedValue([workflow] as any);

    await evaluateWorkflows(ORG_ID, "ticket.created", { priority: "LOW" });

    expect(notifyAdmins).not.toHaveBeenCalled();
    expect(mockPrisma.workflowLog.create).not.toHaveBeenCalled();
  });

  it("logs with success: false when an action fails", async () => {
    const workflow = makeWorkflow({
      conditions: [],
      actions: [
        {
          type: "create_ticket",
          config: { subject: "Auto ticket" },
        },
      ],
    });

    vi.mocked(mockPrisma.workflow.findMany).mockResolvedValue([workflow] as any);
    // No admin found -> action fails
    vi.mocked(mockPrisma.user.findFirst).mockResolvedValue(null);
    vi.mocked(mockPrisma.workflowLog.create).mockResolvedValue({} as any);
    vi.mocked(mockPrisma.workflow.update).mockResolvedValue({} as any);

    await evaluateWorkflows(ORG_ID, "ticket.created", {});

    expect(mockPrisma.workflowLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        success: false,
        errorMessage: expect.stringContaining("No admin user found"),
      }),
    });
  });

  it("evaluates multiple workflows independently", async () => {
    const wf1 = makeWorkflow({
      id: "wf-1",
      conditions: [{ field: "priority", operator: "equals", value: "HIGH" }],
      actions: [
        { type: "send_channel_message", config: { title: "WF1 Alert", message: "First" } },
      ],
    });
    const wf2 = makeWorkflow({
      id: "wf-2",
      conditions: [{ field: "priority", operator: "equals", value: "LOW" }],
      actions: [
        { type: "send_notification", config: { role: "ADMIN", title: "WF2 Alert" } },
      ],
    });

    vi.mocked(mockPrisma.workflow.findMany).mockResolvedValue([wf1, wf2] as any);
    vi.mocked(mockPrisma.workflowLog.create).mockResolvedValue({} as any);
    vi.mocked(mockPrisma.workflow.update).mockResolvedValue({} as any);

    await evaluateWorkflows(ORG_ID, "ticket.created", { priority: "HIGH" });

    // wf1 matches, wf2 does not
    expect(sendIntegrationMessage).toHaveBeenCalledTimes(1);
    expect(notifyAdmins).not.toHaveBeenCalled();
    expect(mockPrisma.workflowLog.create).toHaveBeenCalledTimes(1);
    expect(mockPrisma.workflowLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ workflowId: "wf-1" }),
    });
  });

  it("catches fatal errors and does not throw", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    vi.mocked(mockPrisma.workflow.findMany).mockRejectedValue(new Error("DB connection lost"));

    // Should not throw
    await expect(
      evaluateWorkflows(ORG_ID, "ticket.created", {})
    ).resolves.toBeUndefined();

    expect(consoleSpy).toHaveBeenCalledWith(
      "[WorkflowEngine] Fatal error evaluating workflows:",
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });
});
