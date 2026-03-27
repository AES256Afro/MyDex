import { authenticateAgent } from "@/lib/agent-auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// GET - Agent fetches its effective merged policy
export async function GET(request: NextRequest) {
  const agentAuth = await authenticateAgent(request);
  if (!agentAuth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { deviceId, organizationId } = agentAuth;

  try {
    // Get host group memberships for this device
    const memberships = await prisma.hostGroupMember.findMany({
      where: { deviceId },
      select: { hostGroupId: true },
    });
    const hostGroupIds = memberships.map((m) => m.hostGroupId);

    // Fetch org-wide policies (no hostGroupId)
    const orgPolicies = await prisma.agentPolicy.findMany({
      where: {
        organizationId,
        hostGroupId: null,
        isActive: true,
      },
      orderBy: { priority: "desc" },
    });

    // Fetch host group-specific policies
    const groupPolicies =
      hostGroupIds.length > 0
        ? await prisma.agentPolicy.findMany({
            where: {
              organizationId,
              hostGroupId: { in: hostGroupIds },
              isActive: true,
            },
            orderBy: { priority: "desc" },
          })
        : [];

    // Fetch domain blocklists linked via HostGroupPolicy for this device's groups
    const hostGroupPolicies =
      hostGroupIds.length > 0
        ? await prisma.hostGroupPolicy.findMany({
            where: {
              hostGroupId: { in: hostGroupIds },
              isActive: true,
            },
            include: {
              blocklist: {
                select: {
                  id: true,
                  name: true,
                  category: true,
                  domains: true,
                  isActive: true,
                },
              },
            },
          })
        : [];

    // Build merged policy config: org-wide is the base, group policies override
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let mergedConfig: Record<string, any> = {};
    let maxVersion = 0;

    // Apply org-wide policies first (lower priority = base)
    for (const policy of orgPolicies) {
      const config =
        typeof policy.config === "object" && policy.config !== null
          ? (policy.config as Record<string, unknown>)
          : {};
      mergedConfig = { ...mergedConfig, ...config };
      if (policy.version > maxVersion) maxVersion = policy.version;
    }

    // Apply group policies on top (higher priority overrides)
    for (const policy of groupPolicies) {
      const config =
        typeof policy.config === "object" && policy.config !== null
          ? (policy.config as Record<string, unknown>)
          : {};
      mergedConfig = { ...mergedConfig, ...config };
      if (policy.version > maxVersion) maxVersion = policy.version;
    }

    // Collect all active blocked domains from linked blocklists
    const blockedDomains: string[] = [];
    const firewallRules: object[] = [];

    for (const hgp of hostGroupPolicies) {
      if (hgp.policyType === "DOMAIN_BLOCK" && hgp.blocklist?.isActive) {
        const domains = Array.isArray(hgp.blocklist.domains)
          ? (hgp.blocklist.domains as string[])
          : [];
        blockedDomains.push(...domains);
      }

      if (hgp.policyType === "FIREWALL") {
        firewallRules.push({
          direction: hgp.direction,
          protocol: hgp.protocol,
          port: hgp.port,
          remoteAddress: hgp.remoteAddress,
          action: hgp.action,
          description: hgp.description,
        });
      }
    }

    // Deduplicate blocked domains
    const uniqueBlockedDomains = [...new Set(blockedDomains.map((d) => d.toLowerCase()))];

    return NextResponse.json({
      version: maxVersion,
      deviceId,
      organizationId,
      hostGroupIds,
      config: mergedConfig,
      domainBlocklist: uniqueBlockedDomains,
      firewallRules,
    });
  } catch (error) {
    console.error("Error fetching agent policy:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch policy", detail: message },
      { status: 500 }
    );
  }
}
