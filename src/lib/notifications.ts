import { prisma } from "@/lib/prisma";
import { emitRealtimeEvent, userChannel, adminsChannel } from "@/lib/realtime";

export async function createNotification(params: {
  organizationId: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  link?: string;
}) {
  const notification = await prisma.notification.create({ data: params });

  emitRealtimeEvent({
    organizationId: params.organizationId,
    channel: userChannel(params.userId),
    eventType: "NOTIFICATION",
    payload: {
      id: notification.id,
      title: params.title,
      message: params.message,
      type: params.type,
      link: params.link,
    },
  }).catch(() => {});

  return notification;
}

export async function notifyAdmins(params: {
  organizationId: string;
  type: string;
  title: string;
  message: string;
  link?: string;
}) {
  const admins = await prisma.user.findMany({
    where: {
      organizationId: params.organizationId,
      role: { in: ["ADMIN", "SUPER_ADMIN"] },
      status: "ACTIVE",
    },
    select: { id: true },
  });
  if (admins.length === 0) return;
  await prisma.notification.createMany({
    data: admins.map((a) => ({
      organizationId: params.organizationId,
      userId: a.id,
      type: params.type,
      title: params.title,
      message: params.message,
      link: params.link,
    })),
  });

  emitRealtimeEvent({
    organizationId: params.organizationId,
    channel: adminsChannel(params.organizationId),
    eventType: "NOTIFICATION",
    payload: {
      title: params.title,
      message: params.message,
      type: params.type,
      link: params.link,
    },
  }).catch(() => {});
}
