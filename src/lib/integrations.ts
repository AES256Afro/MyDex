import { prisma } from "@/lib/prisma";

export async function sendSlackMessage(orgId: string, payload: {
  title: string;
  message: string;
  color?: string;
  link?: string;
  fields?: { label: string; value: string }[];
}) {
  const integration = await prisma.integration.findUnique({
    where: { organizationId_provider: { organizationId: orgId, provider: "slack" } },
  });
  if (!integration?.enabled || !integration.webhookUrl) return false;

  const blocks: Record<string, unknown>[] = [
    {
      type: "header",
      text: { type: "plain_text", text: payload.title, emoji: true },
    },
    {
      type: "section",
      text: { type: "mrkdwn", text: payload.message },
    },
  ];

  if (payload.fields && payload.fields.length > 0) {
    blocks.push({
      type: "section",
      fields: payload.fields.map((f) => ({
        type: "mrkdwn",
        text: `*${f.label}*\n${f.value}`,
      })),
    });
  }

  if (payload.link) {
    blocks.push({
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "View in MyDex" },
          url: payload.link,
          style: "primary",
        },
      ],
    });
  }

  try {
    const res = await fetch(integration.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        attachments: [{ color: payload.color || "#4F46E5", blocks }],
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function sendTeamsMessage(orgId: string, payload: {
  title: string;
  message: string;
  color?: string;
  link?: string;
  fields?: { label: string; value: string }[];
}) {
  const integration = await prisma.integration.findUnique({
    where: { organizationId_provider: { organizationId: orgId, provider: "teams" } },
  });
  if (!integration?.enabled || !integration.webhookUrl) return false;

  const facts = (payload.fields || []).map((f) => ({ title: f.label, value: f.value }));

  const card = {
    type: "message",
    attachments: [
      {
        contentType: "application/vnd.microsoft.card.adaptive",
        content: {
          $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
          type: "AdaptiveCard",
          version: "1.4",
          body: [
            { type: "TextBlock", text: payload.title, weight: "Bolder", size: "Medium", color: "Accent" },
            { type: "TextBlock", text: payload.message, wrap: true },
            ...(facts.length > 0 ? [{ type: "FactSet", facts }] : []),
          ],
          ...(payload.link
            ? { actions: [{ type: "Action.OpenUrl", title: "View in MyDex", url: payload.link }] }
            : {}),
        },
      },
    ],
  };

  try {
    const res = await fetch(integration.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(card),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function sendIntegrationMessage(orgId: string, payload: {
  title: string;
  message: string;
  color?: string;
  link?: string;
  fields?: { label: string; value: string }[];
}) {
  await Promise.allSettled([
    sendSlackMessage(orgId, payload),
    sendTeamsMessage(orgId, payload),
  ]);
}
