import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  const result = await prisma.realtimeEvent.deleteMany({
    where: { createdAt: { lt: fiveMinutesAgo } },
  });

  return NextResponse.json({
    deleted: result.count,
    timestamp: new Date().toISOString(),
  });
}
