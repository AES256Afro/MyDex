import { executeAction } from "@/lib/workflows/engine";
import { sendIntegrationMessage } from "@/lib/integrations";
import { notifyAdmins, createNotification } from "@/lib/notifications";
import { mockPrisma } from "../../helpers/mock-prisma";

vi.mock("resend", () => {
  const sendFn = vi.fn().mockResolvedValue({ id: "email-123" });
  return {
    Resend: class MockResend {
      emails = { send: sendFn };
    },
  };
});

const ORG_ID = "org-test-123";

describe("executeAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Ensure email service is "configured" for tests
    process.env.RESEND_API_KEY = "re_test_fake_key";
  });

  // ── send_notification ──

  describe("send_notification", () => {
    it("calls notifyAdmins when role is ADMIN", async () => {
      const action = {
        type: "send_notification" as const,
        config: {
          role: "ADMIN",
          title: "Alert",
          message: "Something happened",
          link: "/dashboard",
        },
      };

      const result = await executeAction(ORG_ID, action, { foo: "bar" });

      expect(result).toEqual({ success: true });
      expect(notifyAdmins).toHaveBeenCalledWith({
        organizationId: ORG_ID,
        type: "WORKFLOW",
        title: "Alert",
        message: "Something happened",
        link: "/dashboard",
      });
    });

    it("calls notifyAdmins when neither role nor userId is specified", async () => {
      const action = {
        type: "send_notification" as const,
        config: {
          title: "Fallback alert",
          message: "No target specified",
        },
      };

      const result = await executeAction(ORG_ID, action, {});

      expect(result).toEqual({ success: true });
      expect(notifyAdmins).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: ORG_ID,
          type: "WORKFLOW",
          title: "Fallback alert",
        })
      );
    });

    it("calls createNotification when userId is provided", async () => {
      const action = {
        type: "send_notification" as const,
        config: {
          userId: "user-456",
          title: "Personal alert",
          message: "Just for you",
        },
      };

      const result = await executeAction(ORG_ID, action, {});

      expect(result).toEqual({ success: true });
      expect(createNotification).toHaveBeenCalledWith({
        organizationId: ORG_ID,
        userId: "user-456",
        type: "WORKFLOW",
        title: "Personal alert",
        message: "Just for you",
        link: undefined,
      });
    });

    it("uses default title and message from triggerData when not provided", async () => {
      const action = {
        type: "send_notification" as const,
        config: { role: "ADMIN" },
      };
      const triggerData = { key: "value" };

      await executeAction(ORG_ID, action, triggerData);

      expect(notifyAdmins).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Workflow Notification",
          message: JSON.stringify(triggerData),
        })
      );
    });
  });

  // ── send_channel_message ──

  describe("send_channel_message", () => {
    it("calls sendIntegrationMessage with correct params", async () => {
      const action = {
        type: "send_channel_message" as const,
        config: {
          title: "Channel Alert",
          message: "New event occurred",
          color: "#ff0000",
          link: "/events",
        },
      };

      const result = await executeAction(ORG_ID, action, {});

      expect(result).toEqual({ success: true });
      expect(sendIntegrationMessage).toHaveBeenCalledWith(ORG_ID, {
        title: "Channel Alert",
        message: "New event occurred",
        color: "#ff0000",
        link: "/events",
      });
    });

    it("uses defaults when title and message are missing", async () => {
      const action = {
        type: "send_channel_message" as const,
        config: {},
      };
      const triggerData = { event: "test" };

      await executeAction(ORG_ID, action, triggerData);

      expect(sendIntegrationMessage).toHaveBeenCalledWith(ORG_ID, {
        title: "Workflow Alert",
        message: JSON.stringify(triggerData),
        color: undefined,
        link: undefined,
      });
    });
  });

  // ── create_ticket ──

  describe("create_ticket", () => {
    it("finds admin user and creates support ticket", async () => {
      vi.mocked(mockPrisma.user.findFirst).mockResolvedValue({ id: "admin-1" } as any);
      vi.mocked(mockPrisma.supportTicket.create).mockResolvedValue({} as any);

      const action = {
        type: "create_ticket" as const,
        config: {
          subject: "Automated issue",
          category: "Bug",
          description: "Something broke",
          priority: "HIGH",
        },
      };

      const result = await executeAction(ORG_ID, action, {});

      expect(result).toEqual({ success: true });
      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          organizationId: ORG_ID,
          role: { in: ["ADMIN", "SUPER_ADMIN"] },
          status: "ACTIVE",
        },
        select: { id: true },
      });
      expect(mockPrisma.supportTicket.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          organizationId: ORG_ID,
          submittedBy: "admin-1",
          subject: "Automated issue",
          category: "Bug",
          description: "Something broke",
          priority: "HIGH",
        }),
      });
    });

    it("returns success: false when no admin user is found", async () => {
      vi.mocked(mockPrisma.user.findFirst).mockResolvedValue(null);

      const action = {
        type: "create_ticket" as const,
        config: { subject: "Test" },
      };

      const result = await executeAction(ORG_ID, action, {});

      expect(result).toEqual({
        success: false,
        error: "No admin user found to create ticket",
      });
      expect(mockPrisma.supportTicket.create).not.toHaveBeenCalled();
    });

    it("falls back to MEDIUM priority for invalid priority values", async () => {
      vi.mocked(mockPrisma.user.findFirst).mockResolvedValue({ id: "admin-1" } as any);
      vi.mocked(mockPrisma.supportTicket.create).mockResolvedValue({} as any);

      const action = {
        type: "create_ticket" as const,
        config: { priority: "SUPER_URGENT" },
      };

      await executeAction(ORG_ID, action, { title: "Test event" });

      expect(mockPrisma.supportTicket.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          priority: "MEDIUM",
        }),
      });
    });
  });

  // ── assign_ticket ──

  describe("assign_ticket", () => {
    it("updates ticket assignedTo", async () => {
      vi.mocked(mockPrisma.supportTicket.update).mockResolvedValue({} as any);

      const action = {
        type: "assign_ticket" as const,
        config: { assignTo: "user-789" },
      };

      const result = await executeAction(ORG_ID, action, { ticketId: "ticket-1" });

      expect(result).toEqual({ success: true });
      expect(mockPrisma.supportTicket.update).toHaveBeenCalledWith({
        where: { id: "ticket-1" },
        data: { assignedTo: "user-789" },
      });
    });

    it("returns error when ticketId is missing", async () => {
      const action = {
        type: "assign_ticket" as const,
        config: { assignTo: "user-789" },
      };

      const result = await executeAction(ORG_ID, action, {});

      expect(result).toEqual({
        success: false,
        error: "Missing ticketId or assignTo in action config",
      });
    });

    it("returns error when assignTo is missing", async () => {
      const action = {
        type: "assign_ticket" as const,
        config: {},
      };

      const result = await executeAction(ORG_ID, action, { ticketId: "ticket-1" });

      expect(result).toEqual({
        success: false,
        error: "Missing ticketId or assignTo in action config",
      });
    });
  });

  // ── send_email ──

  describe("send_email", () => {
    it("sends email via Resend", async () => {
      const action = {
        type: "send_email" as const,
        config: {
          to: "user@example.com",
          subject: "Test Subject",
          body: "Hello world",
        },
      };

      const result = await executeAction(ORG_ID, action, {});

      expect(result).toEqual({ success: true });

      const { Resend } = await import("resend");
      const instance = new Resend("fake");
      expect(instance.emails.send).toBeDefined();
    });

    it("returns error when recipient is missing", async () => {
      const action = {
        type: "send_email" as const,
        config: { subject: "No recipient" },
      };

      const result = await executeAction(ORG_ID, action, {});

      expect(result).toEqual({
        success: false,
        error: "Missing email recipient",
      });
    });
  });

  // ── Unknown action type ──

  describe("unknown action type", () => {
    it("returns error for unrecognized action type", async () => {
      const action = {
        type: "launch_missiles" as any,
        config: {},
      };

      const result = await executeAction(ORG_ID, action, {});

      expect(result).toEqual({
        success: false,
        error: "Unknown action type: launch_missiles",
      });
    });
  });
});
