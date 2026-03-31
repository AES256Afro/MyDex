vi.mock("@/lib/mdm/factory", () => ({
  createMdmClient: vi.fn(),
}));

import { syncMdmProvider } from "@/lib/mdm/sync";
import { createMdmClient } from "@/lib/mdm/factory";
import { mockPrisma } from "../../helpers/mock-prisma";
import type { MdmDeviceData } from "@/lib/mdm/types";

const mockCreateMdmClient = createMdmClient as ReturnType<typeof vi.fn>;

const baseProvider = {
  id: "provider-1",
  organizationId: "org-1",
  providerType: "MICROSOFT_INTUNE",
  name: "Test Intune",
  clientId: "cid",
  clientSecret: "csecret",
  tenantId: "tid",
  apiToken: null,
  instanceUrl: null,
  isActive: true,
  autoAssign: false,
  syncIntervalMinutes: 60,
  lastSyncAt: null,
  lastSyncStatus: null,
  lastSyncDeviceCount: null,
  lastSyncError: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeDevice(overrides?: Partial<MdmDeviceData>): MdmDeviceData {
  return {
    mdmDeviceId: "mdm-dev-1",
    serialNumber: "SN-001",
    hostname: "LAPTOP-001",
    userEmail: "john@example.com",
    enrollmentStatus: "enrolled",
    deviceName: "John's Laptop",
    platform: "Windows",
    osVersion: "11.0",
    ...overrides,
  };
}

function setupMockClient(devices: MdmDeviceData[]) {
  const client = {
    listDevices: vi.fn().mockResolvedValue(devices),
    testConnection: vi.fn().mockResolvedValue({ success: true }),
    getDevice: vi.fn(),
    lockDevice: vi.fn(),
    wipeDevice: vi.fn(),
    restartDevice: vi.fn(),
    deployApp: vi.fn(),
    retireDevice: vi.fn(),
    syncDevice: vi.fn(),
  };
  mockCreateMdmClient.mockReturnValue(client);
  return client;
}

function setupBaseProviderMocks() {
  mockPrisma.mdmProvider.findUnique.mockResolvedValue(baseProvider);
  mockPrisma.mdmProvider.update.mockResolvedValue(baseProvider);
  mockPrisma.user.findMany.mockResolvedValue([]);
  mockPrisma.agentDevice.findMany.mockResolvedValue([]);
  mockPrisma.mdmDevice.findMany.mockResolvedValue([]);
}

describe("syncMdmProvider", () => {
  it("throws when provider not found", async () => {
    mockPrisma.mdmProvider.findUnique.mockResolvedValue(null);
    await expect(syncMdmProvider("nonexistent")).rejects.toThrow("Provider not found");
  });

  it("syncs devices and calls upsert for each", async () => {
    setupBaseProviderMocks();
    const devices = [makeDevice(), makeDevice({ mdmDeviceId: "mdm-dev-2", serialNumber: "SN-002" })];
    setupMockClient(devices);

    const result = await syncMdmProvider("provider-1");

    expect(result.synced).toBe(2);
    expect(mockPrisma.mdmDevice.upsert).toHaveBeenCalledTimes(2);
  });

  it("matches user by email with high confidence", async () => {
    setupBaseProviderMocks();
    mockPrisma.user.findMany.mockResolvedValue([
      { id: "user-1", email: "john@example.com" },
    ]);

    const device = makeDevice({ userEmail: "john@example.com" });
    setupMockClient([device]);

    await syncMdmProvider("provider-1");

    expect(mockPrisma.mdmDevice.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          matchedUserId: "user-1",
          matchConfidence: "high",
        }),
      })
    );
  });

  it("matches agent device by serial number with high confidence", async () => {
    setupBaseProviderMocks();
    mockPrisma.agentDevice.findMany.mockResolvedValue([
      { id: "agent-1", hostname: "OTHER", serialNumber: "SN-001", userId: null },
    ]);

    const device = makeDevice({ serialNumber: "SN-001", userEmail: undefined });
    setupMockClient([device]);

    const result = await syncMdmProvider("provider-1");

    expect(result.matched).toBe(1);
    expect(mockPrisma.mdmDevice.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          agentDeviceId: "agent-1",
          matchConfidence: "high",
        }),
      })
    );
  });

  it("falls back to hostname matching with medium confidence", async () => {
    setupBaseProviderMocks();
    mockPrisma.agentDevice.findMany.mockResolvedValue([
      { id: "agent-2", hostname: "LAPTOP-001", serialNumber: null, userId: null },
    ]);

    // Device has no serial number, but has hostname
    const device = makeDevice({ serialNumber: undefined, hostname: "LAPTOP-001", userEmail: undefined });
    setupMockClient([device]);

    const result = await syncMdmProvider("provider-1");

    expect(result.matched).toBe(1);
    expect(mockPrisma.mdmDevice.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          agentDeviceId: "agent-2",
          matchConfidence: "medium",
        }),
      })
    );
  });

  it("auto-assigns user to agent device when autoAssign is true", async () => {
    const autoAssignProvider = { ...baseProvider, autoAssign: true };
    mockPrisma.mdmProvider.findUnique.mockResolvedValue(autoAssignProvider);
    mockPrisma.mdmProvider.update.mockResolvedValue(autoAssignProvider);

    mockPrisma.user.findMany.mockResolvedValue([
      { id: "user-1", email: "john@example.com" },
    ]);
    mockPrisma.agentDevice.findMany.mockResolvedValue([
      { id: "agent-1", hostname: "LAPTOP-001", serialNumber: "SN-001", userId: null },
    ]);
    mockPrisma.mdmDevice.findMany.mockResolvedValue([]);

    const device = makeDevice({ userEmail: "john@example.com", serialNumber: "SN-001" });
    setupMockClient([device]);

    const result = await syncMdmProvider("provider-1");

    expect(result.autoAssigned).toBe(1);
    expect(mockPrisma.agentDevice.update).toHaveBeenCalledWith({
      where: { id: "agent-1" },
      data: { userId: "user-1" },
    });
  });

  it("skips auto-assign when agent device already has userId", async () => {
    const autoAssignProvider = { ...baseProvider, autoAssign: true };
    mockPrisma.mdmProvider.findUnique.mockResolvedValue(autoAssignProvider);
    mockPrisma.mdmProvider.update.mockResolvedValue(autoAssignProvider);

    mockPrisma.user.findMany.mockResolvedValue([
      { id: "user-1", email: "john@example.com" },
    ]);
    mockPrisma.agentDevice.findMany.mockResolvedValue([
      { id: "agent-1", hostname: "LAPTOP-001", serialNumber: "SN-001", userId: "existing-user" },
    ]);
    mockPrisma.mdmDevice.findMany.mockResolvedValue([]);

    const device = makeDevice({ userEmail: "john@example.com", serialNumber: "SN-001" });
    setupMockClient([device]);

    const result = await syncMdmProvider("provider-1");

    expect(result.autoAssigned).toBe(0);
    expect(mockPrisma.agentDevice.update).not.toHaveBeenCalled();
  });

  it("marks stale devices as unenrolled", async () => {
    setupBaseProviderMocks();
    // Existing device in DB that won't appear in sync
    mockPrisma.mdmDevice.findMany.mockResolvedValue([
      { id: "db-1", mdmDeviceId: "stale-device-1" },
    ]);

    // Sync returns a different device
    const device = makeDevice({ mdmDeviceId: "new-device-1" });
    setupMockClient([device]);

    await syncMdmProvider("provider-1");

    expect(mockPrisma.mdmDevice.updateMany).toHaveBeenCalledWith({
      where: {
        mdmProviderId: "provider-1",
        mdmDeviceId: { in: ["stale-device-1"] },
      },
      data: { enrollmentStatus: "unenrolled" },
    });
  });

  it("sets provider status to FAILED when listDevices throws", async () => {
    setupBaseProviderMocks();
    const client = {
      listDevices: vi.fn().mockRejectedValue(new Error("API timeout")),
      testConnection: vi.fn(),
      getDevice: vi.fn(),
      lockDevice: vi.fn(),
      wipeDevice: vi.fn(),
      restartDevice: vi.fn(),
      deployApp: vi.fn(),
      retireDevice: vi.fn(),
      syncDevice: vi.fn(),
    };
    mockCreateMdmClient.mockReturnValue(client);

    const result = await syncMdmProvider("provider-1");

    expect(result.synced).toBe(0);
    expect(result.errors).toContain("API timeout");
    expect(mockPrisma.mdmProvider.update).toHaveBeenCalledWith({
      where: { id: "provider-1" },
      data: {
        lastSyncStatus: "FAILED",
        lastSyncError: "API timeout",
      },
    });
  });

  it("updates provider status to SUCCESS with device count on success", async () => {
    setupBaseProviderMocks();
    const devices = [makeDevice(), makeDevice({ mdmDeviceId: "mdm-dev-2" })];
    setupMockClient(devices);

    await syncMdmProvider("provider-1");

    // The last update call should be the success one
    const updateCalls = mockPrisma.mdmProvider.update.mock.calls;
    const successCall = updateCalls.find(
      (call: unknown[]) => (call[0] as { data: { lastSyncStatus?: string } }).data.lastSyncStatus === "SUCCESS"
    );
    expect(successCall).toBeDefined();
    expect((successCall![0] as { data: { lastSyncDeviceCount: number } }).data.lastSyncDeviceCount).toBe(2);
    expect((successCall![0] as { data: { lastSyncAt: unknown } }).data.lastSyncAt).toBeInstanceOf(Date);
  });
});
