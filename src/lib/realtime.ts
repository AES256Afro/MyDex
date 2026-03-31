import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma";

export async function emitRealtimeEvent(params: {
  organizationId: string;
  channel: string;
  eventType: string;
  payload: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.realtimeEvent.create({
      data: {
        organizationId: params.organizationId,
        channel: params.channel,
        eventType: params.eventType,
        payload: params.payload as Prisma.InputJsonValue,
      },
    });
  } catch (err) {
    console.error("[Realtime] Failed to emit event:", err);
  }
}

// Channel helpers
export function orgChannel(orgId: string) {
  return `org:${orgId}`;
}
export function userChannel(userId: string) {
  return `user:${userId}`;
}
export function managersChannel(orgId: string) {
  return `managers:${orgId}`;
}
export function adminsChannel(orgId: string) {
  return `admins:${orgId}`;
}
