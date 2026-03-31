import { GET, POST, PATCH, DELETE } from "@/app/api/v1/workflows/route";
import { createRequest } from "../../helpers/request";
import {
  setAuthSession,
  mockAdminSession,
  mockEmployeeSession,
} from "../../helpers/mock-auth";
import { mockPrisma } from "../../helpers/mock-prisma";

const BASE_URL = "/api/v1/workflows";

const validWorkflowBody = {
  name: "Alert on device offline",
  trigger: "device_offline" as const,
  actions: [
    { type: "send_notification", config: { title: "Offline", message: "A device went offline" } },
  ],
};

const mockWorkflow = {
  id: "wf-1",
  organizationId: "test-org-id",
  createdBy: "test-user-id",
  name: "Alert on device offline",
  description: null,
  trigger: "device_offline",
  conditions: [],
  actions: [{ type: "send_notification", config: { title: "Offline", message: "A device went offline" } }],
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  creator: { id: "test-user-id", name: "Test User", email: "test@example.com" },
  _count: { logs: 0 },
};

describe("GET /api/v1/workflows", () => {
  it("returns 401 when unauthenticated", async () => {
    await setAuthSession(null);
    const res = await GET();
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 403 for EMPLOYEE role", async () => {
    await setAuthSession(mockEmployeeSession());
    const res = await GET();
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe("Forbidden");
  });

  it("returns workflows list for ADMIN", async () => {
    await setAuthSession(mockAdminSession());
    mockPrisma.workflow.findMany.mockResolvedValue([mockWorkflow]);

    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.workflows).toHaveLength(1);
    expect(data.workflows[0].name).toBe("Alert on device offline");
    expect(mockPrisma.workflow.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: "test-org-id" },
      })
    );
  });
});

describe("POST /api/v1/workflows", () => {
  it("returns 401 when unauthenticated", async () => {
    await setAuthSession(null);
    const req = createRequest("POST", BASE_URL, { body: validWorkflowBody });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-admin", async () => {
    await setAuthSession(mockEmployeeSession());
    const req = createRequest("POST", BASE_URL, { body: validWorkflowBody });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("returns 400 when name is missing", async () => {
    await setAuthSession(mockAdminSession());
    const req = createRequest("POST", BASE_URL, {
      body: { trigger: "device_offline", actions: [{ type: "send_notification", config: { title: "T", message: "M" } }] },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid input");
  });

  it("returns 400 when actions are missing", async () => {
    await setAuthSession(mockAdminSession());
    const req = createRequest("POST", BASE_URL, {
      body: { name: "Test", trigger: "device_offline" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 201 and creates workflow with valid body", async () => {
    await setAuthSession(mockAdminSession());
    mockPrisma.workflow.create.mockResolvedValue(mockWorkflow);

    const req = createRequest("POST", BASE_URL, { body: validWorkflowBody });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.name).toBe("Alert on device offline");
    expect(mockPrisma.workflow.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "test-org-id",
          name: "Alert on device offline",
          trigger: "device_offline",
        }),
      })
    );
  });
});

describe("PATCH /api/v1/workflows", () => {
  it("returns 401 when unauthenticated", async () => {
    await setAuthSession(null);
    const req = createRequest("PATCH", BASE_URL, {
      body: { id: "wf-1", name: "Updated" },
    });
    const res = await PATCH(req);
    expect(res.status).toBe(401);
  });

  it("returns updated workflow for valid update", async () => {
    await setAuthSession(mockAdminSession());
    mockPrisma.workflow.findFirst.mockResolvedValue(mockWorkflow);
    mockPrisma.workflow.update.mockResolvedValue({ ...mockWorkflow, name: "Updated" });

    const req = createRequest("PATCH", BASE_URL, {
      body: { id: "wf-1", name: "Updated" },
    });
    const res = await PATCH(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.name).toBe("Updated");
  });

  it("returns 404 when workflow not in org", async () => {
    await setAuthSession(mockAdminSession());
    mockPrisma.workflow.findFirst.mockResolvedValue(null);

    const req = createRequest("PATCH", BASE_URL, {
      body: { id: "wf-other-org", name: "Updated" },
    });
    const res = await PATCH(req);
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe("Workflow not found");
  });
});

describe("DELETE /api/v1/workflows", () => {
  it("returns 401 when unauthenticated", async () => {
    await setAuthSession(null);
    const req = createRequest("DELETE", `${BASE_URL}?id=wf-1`);
    const res = await DELETE(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when id param is missing", async () => {
    await setAuthSession(mockAdminSession());
    const req = createRequest("DELETE", BASE_URL);
    const res = await DELETE(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Workflow ID required");
  });

  it("returns success for valid delete", async () => {
    await setAuthSession(mockAdminSession());
    mockPrisma.workflow.findFirst.mockResolvedValue(mockWorkflow);
    mockPrisma.workflow.delete.mockResolvedValue(mockWorkflow);

    const req = createRequest("DELETE", `${BASE_URL}?id=wf-1`);
    const res = await DELETE(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(mockPrisma.workflow.delete).toHaveBeenCalledWith({ where: { id: "wf-1" } });
  });

  it("returns 404 when workflow not in org", async () => {
    await setAuthSession(mockAdminSession());
    mockPrisma.workflow.findFirst.mockResolvedValue(null);

    const req = createRequest("DELETE", `${BASE_URL}?id=wf-other`);
    const res = await DELETE(req);
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe("Workflow not found");
  });
});
