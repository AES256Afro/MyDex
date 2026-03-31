/// <reference types="vitest/globals" />

// Mock Prisma globally
vi.mock("@/lib/prisma", async () => ({
  prisma: (await import("./helpers/mock-prisma")).mockPrisma,
}));

// Mock auth globally
vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue(null),
}));

// Mock integrations (prevent real webhook calls)
vi.mock("@/lib/integrations", () => ({
  sendIntegrationMessage: vi.fn().mockResolvedValue(true),
  sendSlackMessage: vi.fn().mockResolvedValue(true),
  sendTeamsMessage: vi.fn().mockResolvedValue(true),
}));

// Mock notifications
vi.mock("@/lib/notifications", () => ({
  createNotification: vi.fn().mockResolvedValue(undefined),
  notifyAdmins: vi.fn().mockResolvedValue(undefined),
}));

// Set dummy env vars
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
process.env.NEXTAUTH_SECRET = "test-secret";
process.env.NEXTAUTH_URL = "http://localhost:3000";
process.env.CRON_SECRET = "test-cron-secret";

beforeEach(() => {
  vi.clearAllMocks();
});
