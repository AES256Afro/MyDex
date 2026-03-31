import { GET, POST, PATCH, DELETE } from "@/app/api/v1/mdm/providers/route";
import { createRequest } from "../../helpers/request";
import {
  setAuthSession,
  mockAdminSession,
  mockEmployeeSession,
} from "../../helpers/mock-auth";
import { mockPrisma } from "../../helpers/mock-prisma";

const BASE_URL = "/api/v1/mdm/providers";

const mockProvider = {
  id: "mdm-1",
  organizationId: "test-org-id",
  providerType: "MICROSOFT_INTUNE",
  name: "Corp Intune",
  clientId: "client-id-123",
  clientSecret: "super-secret-value-1234",
  tenantId: "tenant-abc",
  apiToken: null,
  instanceUrl: null,
  isActive: true,
  autoAssign: true,
  syncIntervalMinutes: 60,
  lastSyncAt: null,
  lastSyncStatus: null,
  lastSyncDeviceCount: null,
  lastSyncError: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  _count: { mdmDevices: 5 },
};

describe("GET /api/v1/mdm/providers", () => {
  it("returns 401 when unauthenticated", async () => {
    await setAuthSession(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 403 for EMPLOYEE role (no mdm:read)", async () => {
    await setAuthSession(mockEmployeeSession());
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("returns providers with masked secrets for ADMIN", async () => {
    await setAuthSession(mockAdminSession());
    mockPrisma.mdmProvider.findMany.mockResolvedValue([mockProvider]);

    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.providers).toHaveLength(1);

    const provider = data.providers[0];
    // clientSecret should be masked: first 4 + *** + last 4
    expect(provider.clientSecret).toBe("supe***1234");
    // apiToken is null so should be ""
    expect(provider.apiToken).toBe("");
    // Other fields remain
    expect(provider.name).toBe("Corp Intune");
    expect(provider._count.mdmDevices).toBe(5);
  });
});

describe("POST /api/v1/mdm/providers", () => {
  it("returns 401 when unauthenticated", async () => {
    await setAuthSession(null);
    const req = createRequest("POST", BASE_URL, {
      body: { providerType: "MICROSOFT_INTUNE", name: "Intune" },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("creates Intune provider with valid config", async () => {
    await setAuthSession(mockAdminSession());
    mockPrisma.mdmProvider.upsert.mockResolvedValue(mockProvider);

    const req = createRequest("POST", BASE_URL, {
      body: {
        providerType: "MICROSOFT_INTUNE",
        name: "Corp Intune",
        clientId: "client-id-123",
        clientSecret: "super-secret-value-1234",
        tenantId: "tenant-abc",
      },
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.provider.name).toBe("Corp Intune");
    expect(data.provider.clientSecret).toBe("supe***1234");
  });

  it("creates Jamf provider with valid config", async () => {
    await setAuthSession(mockAdminSession());
    const jamfProvider = {
      ...mockProvider,
      providerType: "JAMF_PRO",
      name: "Corp Jamf",
      apiToken: "jamf-api-token-value",
      instanceUrl: "https://jamf.corp.com",
      clientId: null,
      clientSecret: null,
      tenantId: null,
    };
    mockPrisma.mdmProvider.upsert.mockResolvedValue(jamfProvider);

    const req = createRequest("POST", BASE_URL, {
      body: {
        providerType: "JAMF_PRO",
        name: "Corp Jamf",
        apiToken: "jamf-api-token-value",
        instanceUrl: "https://jamf.corp.com",
      },
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.provider.name).toBe("Corp Jamf");
  });

  it("returns 400 for missing required fields (Intune without tenantId)", async () => {
    await setAuthSession(mockAdminSession());
    const req = createRequest("POST", BASE_URL, {
      body: {
        providerType: "MICROSOFT_INTUNE",
        name: "Bad Intune",
        clientId: "id",
        clientSecret: "secret",
        // tenantId missing
      },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Intune requires");
  });

  it("returns 400 for invalid providerType", async () => {
    await setAuthSession(mockAdminSession());
    const req = createRequest("POST", BASE_URL, {
      body: { providerType: "INVALID_TYPE", name: "Bad" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/v1/mdm/providers", () => {
  it("returns 401 when unauthenticated", async () => {
    await setAuthSession(null);
    const req = createRequest("PATCH", BASE_URL, {
      body: { providerId: "mdm-1", isActive: false },
    });
    const res = await PATCH(req);
    expect(res.status).toBe(401);
  });

  it("toggles isActive successfully", async () => {
    await setAuthSession(mockAdminSession());
    mockPrisma.mdmProvider.findFirst.mockResolvedValue(mockProvider);
    mockPrisma.mdmProvider.update.mockResolvedValue({
      ...mockProvider,
      isActive: false,
    });

    const req = createRequest("PATCH", BASE_URL, {
      body: { providerId: "mdm-1", isActive: false },
    });
    const res = await PATCH(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.provider.isActive).toBe(false);
    expect(mockPrisma.mdmProvider.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isActive: false }),
      })
    );
  });

  it("returns 404 when provider not in org", async () => {
    await setAuthSession(mockAdminSession());
    mockPrisma.mdmProvider.findFirst.mockResolvedValue(null);

    const req = createRequest("PATCH", BASE_URL, {
      body: { providerId: "mdm-other", isActive: true },
    });
    const res = await PATCH(req);
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe("Provider not found");
  });
});

describe("DELETE /api/v1/mdm/providers", () => {
  it("returns 401 when unauthenticated", async () => {
    await setAuthSession(null);
    const req = createRequest("DELETE", `${BASE_URL}?providerId=mdm-1`);
    const res = await DELETE(req);
    expect(res.status).toBe(401);
  });

  it("deletes provider successfully", async () => {
    await setAuthSession(mockAdminSession());
    mockPrisma.mdmProvider.findFirst.mockResolvedValue(mockProvider);
    mockPrisma.mdmProvider.delete.mockResolvedValue(mockProvider);

    const req = createRequest("DELETE", `${BASE_URL}?providerId=mdm-1`);
    const res = await DELETE(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(mockPrisma.mdmProvider.delete).toHaveBeenCalledWith({
      where: { id: "mdm-1" },
    });
  });

  it("returns 404 when provider not in org", async () => {
    await setAuthSession(mockAdminSession());
    mockPrisma.mdmProvider.findFirst.mockResolvedValue(null);

    const req = createRequest("DELETE", `${BASE_URL}?providerId=mdm-other`);
    const res = await DELETE(req);
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe("Provider not found");
  });
});
