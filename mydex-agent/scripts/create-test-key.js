// Quick script to create a test API key directly in the database
// Usage: node scripts/create-test-key.js
// Run from the MyDex root directory (not mydex-agent/)

const { PrismaClient } = require("../../src/generated/prisma");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

async function main() {
  const prisma = new PrismaClient();

  try {
    // Find the first organization
    const org = await prisma.organization.findFirst();
    if (!org) {
      console.error("No organization found. Register first at /register");
      process.exit(1);
    }

    // Find admin user
    const admin = await prisma.user.findFirst({
      where: { organizationId: org.id, role: "ADMIN" },
    });

    if (!admin) {
      console.error("No admin user found");
      process.exit(1);
    }

    // Generate key
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

    console.log("=".repeat(60));
    console.log("  Agent API Key Created");
    console.log("=".repeat(60));
    console.log(`  Key:    ${plainTextKey}`);
    console.log(`  ID:     ${key.id}`);
    console.log(`  Org:    ${org.name} (${org.id})`);
    console.log("=".repeat(60));
    console.log("");
    console.log("Test the agent with:");
    console.log(`  cd mydex-agent`);
    console.log(`  ./mydex-agent.exe --api-key="${plainTextKey}" --server="https://antifascist.work"`);
    console.log("");
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
