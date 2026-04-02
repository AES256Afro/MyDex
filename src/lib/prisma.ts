import { PrismaClient } from "@/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL || process.env.DIRECT_URL;
  const pool = new pg.Pool({
    connectionString,
    max: 3, // Low pool size for serverless — prevents "too many clients" on Supabase
    idleTimeoutMillis: 20000, // Close idle connections after 20s
    connectionTimeoutMillis: 10000, // Fail fast if can't connect in 10s
  });
  const adapter = new PrismaPg(pool as any);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// Cache the singleton globally in ALL environments to prevent duplicate pools
globalForPrisma.prisma = prisma;
