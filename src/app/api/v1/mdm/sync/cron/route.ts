import { prisma } from "@/lib/prisma";
import { syncMdmProvider } from "@/lib/mdm/sync";
import { NextRequest, NextResponse } from "next/server";

// GET - cron-triggered sync (authenticated via CRON_SECRET)
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find all active providers due for sync
  const providers = await prisma.mdmProvider.findMany({
    where: {
      isActive: true,
      lastSyncStatus: { not: "SYNCING" },
    },
    select: {
      id: true,
      syncIntervalMinutes: true,
      lastSyncAt: true,
    },
  });

  const now = Date.now();
  const results: { providerId: string; synced: boolean; error?: string }[] = [];

  for (const provider of providers) {
    const lastSync = provider.lastSyncAt?.getTime() || 0;
    const intervalMs = provider.syncIntervalMinutes * 60 * 1000;

    if (now - lastSync < intervalMs) {
      results.push({ providerId: provider.id, synced: false });
      continue;
    }

    try {
      const result = await syncMdmProvider(provider.id);
      results.push({
        providerId: provider.id,
        synced: true,
        error: result.errors.length > 0 ? result.errors.join("; ") : undefined,
      });
    } catch (e) {
      results.push({
        providerId: provider.id,
        synced: true,
        error: e instanceof Error ? e.message : "Unknown error",
      });
    }
  }

  return NextResponse.json({ results });
}
