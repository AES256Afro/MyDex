import { GET, POST } from "@/app/api/v1/attendance/route";
import { createRequest } from "../../helpers/request";
import {
  setAuthSession,
  mockAdminSession,
  mockEmployeeSession,
  mockManagerSession,
} from "../../helpers/mock-auth";
import { mockPrisma } from "../../helpers/mock-prisma";

const BASE_URL = "/api/v1/attendance";

const mockRecord = {
  id: "att-1",
  userId: "user-1",
  organizationId: "test-org-id",
  date: new Date("2024-06-15"),
  status: "PRESENT",
  checkIn: new Date("2024-06-15T09:00:00Z"),
  checkOut: new Date("2024-06-15T17:00:00Z"),
  notes: null,
  source: "manual",
  user: { id: "user-1", name: "John Doe", email: "john@example.com", department: "Engineering" },
};

describe("GET /api/v1/attendance", () => {
  it("returns 401 when unauthenticated", async () => {
    await setAuthSession(null);
    const req = createRequest("GET", BASE_URL);
    const res = await GET(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe("Unauthorized");
  });

  it("employee only sees own records (attendance:read but not attendance:read-all)", async () => {
    await setAuthSession(mockEmployeeSession());
    mockPrisma.attendanceRecord.findMany.mockResolvedValue([mockRecord]);
    mockPrisma.attendanceRecord.count.mockResolvedValue(1);

    const req = createRequest("GET", BASE_URL);
    const res = await GET(req);
    expect(res.status).toBe(200);

    // Employee lacks attendance:read-all, so userId is forced
    expect(mockPrisma.attendanceRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "test-employee-id",
        }),
      })
    );
  });

  it("admin sees all records (has attendance:read-all)", async () => {
    await setAuthSession(mockAdminSession());
    mockPrisma.attendanceRecord.findMany.mockResolvedValue([mockRecord]);
    mockPrisma.attendanceRecord.count.mockResolvedValue(1);

    const req = createRequest("GET", BASE_URL);
    const res = await GET(req);
    expect(res.status).toBe(200);

    expect(mockPrisma.attendanceRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: "test-org-id" },
      })
    );
  });

  it("manager sees all records (has attendance:read-all)", async () => {
    await setAuthSession(mockManagerSession());
    mockPrisma.attendanceRecord.findMany.mockResolvedValue([mockRecord]);
    mockPrisma.attendanceRecord.count.mockResolvedValue(1);

    const req = createRequest("GET", BASE_URL);
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.records).toHaveLength(1);
  });

  it("supports date range and status filtering", async () => {
    await setAuthSession(mockAdminSession());
    mockPrisma.attendanceRecord.findMany.mockResolvedValue([]);
    mockPrisma.attendanceRecord.count.mockResolvedValue(0);

    const req = createRequest(
      "GET",
      `${BASE_URL}?from=2024-06-01&to=2024-06-30&status=PRESENT`
    );
    const res = await GET(req);
    expect(res.status).toBe(200);

    expect(mockPrisma.attendanceRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "PRESENT",
          date: {
            gte: new Date("2024-06-01"),
            lte: new Date("2024-06-30"),
          },
        }),
      })
    );
  });

  it("returns pagination info", async () => {
    await setAuthSession(mockAdminSession());
    mockPrisma.attendanceRecord.findMany.mockResolvedValue([mockRecord]);
    mockPrisma.attendanceRecord.count.mockResolvedValue(50);

    const req = createRequest("GET", `${BASE_URL}?limit=10&offset=0`);
    const res = await GET(req);
    const data = await res.json();

    expect(data.pagination).toEqual({
      total: 50,
      limit: 10,
      offset: 0,
      hasMore: true,
    });
  });
});

describe("POST /api/v1/attendance", () => {
  it("returns 401 when unauthenticated", async () => {
    await setAuthSession(null);
    const req = createRequest("POST", BASE_URL, {
      body: { userId: "user-1", date: "2024-06-15", status: "PRESENT" },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 403 for employee (no attendance:write)", async () => {
    await setAuthSession(mockEmployeeSession());
    const req = createRequest("POST", BASE_URL, {
      body: { userId: "user-1", date: "2024-06-15", status: "PRESENT" },
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe("Forbidden");
  });

  it("creates attendance record with valid body", async () => {
    await setAuthSession(mockAdminSession());
    mockPrisma.user.findFirst.mockResolvedValue({
      id: "user-1",
      organizationId: "test-org-id",
    });
    mockPrisma.attendanceRecord.upsert.mockResolvedValue(mockRecord);

    const req = createRequest("POST", BASE_URL, {
      body: {
        userId: "user-1",
        date: "2024-06-15",
        status: "PRESENT",
        checkIn: "2024-06-15T09:00:00.000Z",
        checkOut: "2024-06-15T17:00:00.000Z",
      },
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.record.status).toBe("PRESENT");
    expect(mockPrisma.attendanceRecord.upsert).toHaveBeenCalled();
  });

  it("returns 400 for invalid body (missing required fields)", async () => {
    await setAuthSession(mockAdminSession());
    const req = createRequest("POST", BASE_URL, {
      body: { date: "2024-06-15" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid request body");
  });

  it("returns 400 for invalid status value", async () => {
    await setAuthSession(mockAdminSession());
    const req = createRequest("POST", BASE_URL, {
      body: { userId: "user-1", date: "2024-06-15", status: "INVALID_STATUS" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 404 when target user not in org", async () => {
    await setAuthSession(mockAdminSession());
    mockPrisma.user.findFirst.mockResolvedValue(null);

    const req = createRequest("POST", BASE_URL, {
      body: { userId: "user-other-org", date: "2024-06-15", status: "PRESENT" },
    });
    const res = await POST(req);
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe("User not found in your organization");
  });
});
