import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { hasMinRole } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;
  const orgId = session.user.organizationId;
  const role = session.user.role;

  // Determine channels this user subscribes to
  const channels = [`org:${orgId}`, `user:${userId}`];
  if (hasMinRole(role, "MANAGER")) channels.push(`managers:${orgId}`);
  if (hasMinRole(role, "ADMIN")) channels.push(`admins:${orgId}`);

  // Get Last-Event-ID for resumability
  const lastEventId = request.headers.get("Last-Event-ID");

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let lastId = lastEventId || "";
      const startTime = Date.now();
      const MAX_DURATION = 25000; // 25 seconds (Vercel limit)
      const POLL_INTERVAL = 2000; // 2 seconds

      const sendEvent = (id: string, eventType: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(
            `id: ${id}\nevent: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`
          )
        );
      };

      const sendKeepAlive = () => {
        controller.enqueue(encoder.encode(": keepalive\n\n"));
      };

      try {
        while (Date.now() - startTime < MAX_DURATION) {
          // Query new events since lastId
          const where: Record<string, unknown> = {
            channel: { in: channels },
            organizationId: orgId,
          };
          if (lastId) {
            // Find the createdAt of the last event to use as cursor
            const lastEvent = await prisma.realtimeEvent.findUnique({
              where: { id: lastId },
            });
            if (lastEvent) {
              where.createdAt = { gt: lastEvent.createdAt };
            }
          } else {
            // On first connect, only get events from last 10 seconds
            where.createdAt = { gt: new Date(Date.now() - 10000) };
          }

          const events = await prisma.realtimeEvent.findMany({
            where,
            orderBy: { createdAt: "asc" },
            take: 50,
          });

          for (const event of events) {
            sendEvent(event.id, event.eventType, event.payload);
            lastId = event.id;
          }

          if (events.length === 0) {
            sendKeepAlive();
          }

          // Wait before next poll
          await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
        }
      } catch (err) {
        console.error("[SSE] Stream error:", err);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
