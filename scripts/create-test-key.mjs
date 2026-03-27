// Generate a test API key for the Go agent
// Usage: node scripts/create-test-key.mjs
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaClient } from "../src/generated/prisma/index.js";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const org = await prisma.organization.findFirst();
  if (!org) {
    console.error("No organization found. Register first at /register");
    process.exit(1);
  }

  const admin = await prisma.user.findFirst({
    where: { organizationId: org.id, role: "ADMIN" },
  });
  if (!admin) {
    console.error("No admin user found");
    process.exit(1);
  }

  const randomBytes = crypto.randomBytes(32).toString("hex");
  const plainTextKey = `mdx_${randomBytes}`;
  const keyPrefix = plainTextKey.slice(0, 8);
  const keyHash = await bcrypt.hash(plainTextKey, 10);

  const key = await prisma.agentApiKey.create({
    data: {
      organizationId: org.id,
      name: "Test Agent Key",
      keyHash,
      keyPrefix,
      permissions: ["telemetry:write", "commands:read", "commands:write"],
      isActive: true,
      createdBy: admin.id,
    },
  });

  console.log("============================================================");
  console.log("  Agent API Key Created");
  console.log("============================================================");
  console.log(`  Key:    ${plainTextKey}`);
  console.log(`  ID:     ${key.id}`);
  console.log(`  Org:    ${org.name} (${org.id})`);
  console.log("============================================================");
  console.log("");
  console.log("Test the agent:");
  console.log(`  cd mydex-agent`);
  console.log(`  ./mydex-agent.exe --api-key="${plainTextKey}" --server="https://antifascist.work"`);

  await prisma.$disconnect();
  await pool.end();
}

main().catch(console.error);
