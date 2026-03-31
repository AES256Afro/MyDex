import { GET } from "@/app/api/v1/time-entries/route";
import { createRequest } from "../../helpers/request";
import {
  setAuthSession,
  mockAdminSession,
  mockEmployeeSession,
  mockManagerSession,
} from "../../helpers/mock-auth";
import { mockPrisma } from "../../helpers/mock-prisma";

const BASE_URL = "/api/v1/time-entries";

const mockEntries = [
  {
    id: "te-1",
    userId: "test-employee-id",
    organizationId: "test-org-id",
    clockIn: new Date("2024-06-01T09:00:00Z"),
    clockOut: new Date("2024-06-01T17:00:00Z"),
    status: "COMPLETED",
    user: { id: "test-employee-id", name: "Test Employee", email: "employee@example.com" },
  },
  {
    id: "te-2",
    userId: "test-user-id",
    organizationId: "test-org-id",
    clockIn: new Date("2024-06-01T08:00:00Z"),
    clockOut: new Date("2024-06-01T16:00:00Z"),
    status: "COMPLETED",
    user: { id: "test-user-id", name: "Test User", email: "test@example.com" },
  },
];

describe("GET /api/v1/time-entries", () => {
  it("returns 401 when unauthenticated", async () => {
    await setAuthSession(null);
    const req = createRequest("GET", BASE_URL);
    const res = await GET(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe("Unauthorized");
  });

  it("employee sees own entries only (userId forced to own id)", async () => {
    await setAuthSession(mockEmployeeSession());
    mockPrisma.timeEntry.findMany.mockResolvedValue([mockEntries[0]]);
    mockPrisma.timeEntry.count.mockResolvedValue(1);

    const req = createRequest("GET", BASE_URL);
    const res = await GET(req);
    expect(res.status).toBe(200);

    // Verify the where clause forces the employee's own userId
    expect(mockPrisma.timeEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "test-org-id",
          userId: "test-employee-id",
        }),
      })
    );
  });

  it("admin sees all entries (no userId filter)", async () => {
    await setAuthSession(mockAdminSession());
    mockPrisma.timeEntry.findMany.mockResolvedValue(mockEntries);
    mockPrisma.timeEntry.count.mockResolvedValue(2);

    const req = createRequest("GET", BASE_URL);
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.timeEntries).toHaveLength(2);

    // Admin has time-entries:read-all, so no userId filter applied
    expect(mockPrisma.timeEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: "test-org-id" },
      })
    );
  });

  it("manager sees all entries (has time-entries:read-all)", async () => {
    await setAuthSession(mockManagerSession());
    mockPrisma.timeEntry.findMany.mockResolvedValue(mockEntries);
    mockPrisma.timeEntry.count.mockResolvedValue(2);

    const req = createRequest("GET", BASE_URL);
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.timeEntries).toHaveLength(2);
  });

  it("supports date range filtering", async () => {
    await setAuthSession(mockAdminSession());
    mockPrisma.timeEntry.findMany.mockResolvedValue([]);
    mockPrisma.timeEntry.count.mockResolvedValue(0);

    const from = "2024-06-01T00:00:00.000Z";
    const to = "2024-06-30T23:59:59.000Z";
    const req = createRequest("GET", `${BASE_URL}?from=${from}&to=${to}`);
    const res = await GET(req);
    expect(res.status).toBe(200);

    expect(mockPrisma.timeEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          clockIn: {
            gte: new Date(from),
            lte: new Date(to),
          },
        }),
      })
    );
  });

  it("supports pagination via limit and offset", async () => {
    await setAuthSession(mockAdminSession());
    mockPrisma.timeEntry.findMany.mockResolvedValue([mockEntries[0]]);
    mockPrisma.timeEntry.count.mockResolvedValue(10);

    const req = createRequest("GET", `${BASE_URL}?limit=1&offset=0`);
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.pagination).toEqual({
      total: 10,
      limit: 1,
      offset: 0,
      hasMore: true,
    });

    expect(mockPrisma.timeEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 1,
        skip: 0,
      })
    );
  });

  it("returns hasMore false when no more results", async () => {
    await setAuthSession(mockAdminSession());
    mockPrisma.timeEntry.findMany.mockResolvedValue(mockEntries);
    mockPrisma.timeEntry.count.mockResolvedValue(2);

    const req = createRequest("GET", `${BASE_URL}?limit=50&offset=0`);
    const res = await GET(req);
    const data = await res.json();
    expect(data.pagination.hasMore).toBe(false);
  });
});
