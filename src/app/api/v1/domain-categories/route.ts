import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const upsertSchema = z.object({
  domain: z.string().min(1).max(255),
  category: z.enum(["productive", "neutral", "unproductive"]),
  label: z.string().max(100).optional().nullable(),
});

const bulkSchema = z.object({
  domains: z.array(z.string().min(1).max(255)).min(1),
  category: z.enum(["productive", "neutral", "unproductive"]),
});

// GET - List all domain categories for the org
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "settings:write")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const categories = await prisma.domainCategory.findMany({
      where: { organizationId: session.user.organizationId },
      orderBy: { domain: "asc" },
    });

    // Also fetch top domains from ActivitySummary for suggestions
    const summaries = await prisma.activitySummary.findMany({
      where: { organizationId: session.user.organizationId },
      select: { topDomains: true },
      orderBy: { date: "desc" },
      take: 100,
    });

    // Aggregate top domains
    const domainCounts: Record<string, number> = {};
    for (const s of summaries) {
      const domains = s.topDomains as Array<{ domain: string; seconds?: number; count?: number }> | null;
      if (Array.isArray(domains)) {
        for (const d of domains) {
          if (d.domain) {
            domainCounts[d.domain] = (domainCounts[d.domain] || 0) + (d.seconds || d.count || 1);
          }
        }
      }
    }

    const categorizedDomains = new Set(categories.map((c) => c.domain));
    const suggestions = Object.entries(domainCounts)
      .filter(([domain]) => !categorizedDomains.has(domain))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([domain, count]) => ({ domain, count }));

    return NextResponse.json({ categories, suggestions });
  } catch (error) {
    console.error("Failed to fetch domain categories:", error);
    return NextResponse.json({ error: "Failed to fetch domain categories" }, { status: 500 });
  }
}

// POST - Create/upsert a domain category (single or bulk)
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "settings:write")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();

    // Check for bulk import
    if (body.domains && Array.isArray(body.domains)) {
      const parsed = bulkSchema.parse(body);
      const results = await Promise.all(
        parsed.domains.map((domain) =>
          prisma.domainCategory.upsert({
            where: {
              organizationId_domain: {
                organizationId: session.user.organizationId,
                domain: domain.toLowerCase().trim(),
              },
            },
            update: { category: parsed.category },
            create: {
              organizationId: session.user.organizationId,
              domain: domain.toLowerCase().trim(),
              category: parsed.category,
            },
          })
        )
      );
      return NextResponse.json({ count: results.length, categories: results });
    }

    // Single upsert
    const parsed = upsertSchema.parse(body);
    const category = await prisma.domainCategory.upsert({
      where: {
        organizationId_domain: {
          organizationId: session.user.organizationId,
          domain: parsed.domain.toLowerCase().trim(),
        },
      },
      update: {
        category: parsed.category,
        label: parsed.label ?? null,
      },
      create: {
        organizationId: session.user.organizationId,
        domain: parsed.domain.toLowerCase().trim(),
        category: parsed.category,
        label: parsed.label ?? null,
      },
    });

    return NextResponse.json(category);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input", details: error.issues }, { status: 400 });
    }
    console.error("Failed to upsert domain category:", error);
    return NextResponse.json({ error: "Failed to save domain category" }, { status: 500 });
  }
}

// DELETE - Remove a domain category
export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "settings:write")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const domain = searchParams.get("domain");

  if (!domain) {
    return NextResponse.json({ error: "domain query parameter required" }, { status: 400 });
  }

  try {
    await prisma.domainCategory.delete({
      where: {
        organizationId_domain: {
          organizationId: session.user.organizationId,
          domain: domain.toLowerCase().trim(),
        },
      },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete domain category:", error);
    return NextResponse.json({ error: "Failed to delete domain category" }, { status: 500 });
  }
}
