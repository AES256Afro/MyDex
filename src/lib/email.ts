import { Resend } from "resend";
import { notificationEmailTemplate } from "./email-templates";

let resendInstance: Resend | null = null;

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!resendInstance) {
    resendInstance = new Resend(process.env.RESEND_API_KEY);
  }
  return resendInstance;
}

function getFromEmail(): string {
  return process.env.RESEND_FROM_EMAIL || "MyDex <noreply@mydexnow.com>";
}

export async function sendEmail(params: {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
}): Promise<{ success: boolean; error?: string }> {
  const resend = getResend();
  if (!resend) {
    console.log("[email] RESEND_API_KEY not set, skipping email:", params.subject);
    return { success: false, error: "Email service not configured" };
  }

  try {
    await resend.emails.send({
      from: getFromEmail(),
      to: params.to,
      subject: params.subject,
      html: params.html,
      ...(params.replyTo ? { replyTo: params.replyTo } : {}),
    });
    return { success: true };
  } catch (error) {
    console.error("[email] Failed to send:", error);
    return { success: false, error: String(error) };
  }
}

// Convenience: send a styled notification email
export async function sendNotificationEmail(params: {
  to: string | string[];
  title: string;
  message: string;
  ctaText?: string;
  ctaUrl?: string;
  subject?: string;
}): Promise<{ success: boolean; error?: string }> {
  const html = notificationEmailTemplate({
    title: params.title,
    message: params.message,
    ctaText: params.ctaText,
    ctaUrl: params.ctaUrl,
  });

  return sendEmail({
    to: params.to,
    subject: params.subject || params.title,
    html,
  });
}

// Send welcome email to new user
export async function sendWelcomeEmail(params: {
  to: string;
  name: string;
  organizationName: string;
  loginUrl: string;
}): Promise<{ success: boolean; error?: string }> {
  return sendNotificationEmail({
    to: params.to,
    subject: `Welcome to MyDex, ${params.name}!`,
    title: `Welcome to MyDex!`,
    message: `Hi ${params.name},<br/><br/>You've been added to <strong>${params.organizationName}</strong> on MyDex. You can now sign in to access your dashboard, track your time, and view your team's activity.<br/><br/>If you have any questions, reach out to your administrator.`,
    ctaText: "Sign In to MyDex",
    ctaUrl: params.loginUrl,
  });
}

// Send security alert email to admins
export async function sendSecurityAlertEmail(params: {
  to: string[];
  alertType: string;
  severity: string;
  message: string;
  dashboardUrl: string;
}): Promise<{ success: boolean; error?: string }> {
  const severityColors: Record<string, string> = {
    CRITICAL: "#EF4444",
    HIGH: "#F59E0B",
    MEDIUM: "#3B82F6",
    LOW: "#6B7280",
  };
  const color = severityColors[params.severity] || "#6B7280";

  return sendNotificationEmail({
    to: params.to,
    subject: `[${params.severity}] Security Alert: ${params.alertType}`,
    title: `Security Alert — ${params.severity}`,
    message: `<div style="border-left:4px solid ${color};padding-left:12px;margin-bottom:16px;"><strong>${params.alertType}</strong><br/>${params.message}</div>`,
    ctaText: "View in Security Dashboard",
    ctaUrl: params.dashboardUrl,
  });
}

// Send leave request status update
export async function sendLeaveStatusEmail(params: {
  to: string;
  employeeName: string;
  status: "APPROVED" | "REJECTED";
  leaveType: string;
  startDate: string;
  endDate: string;
  reviewerName: string;
  dashboardUrl: string;
}): Promise<{ success: boolean; error?: string }> {
  const isApproved = params.status === "APPROVED";
  return sendNotificationEmail({
    to: params.to,
    subject: `Leave Request ${isApproved ? "Approved" : "Rejected"}: ${params.leaveType}`,
    title: `Leave Request ${isApproved ? "Approved" : "Rejected"}`,
    message: `Hi ${params.employeeName},<br/><br/>Your <strong>${params.leaveType}</strong> request for <strong>${params.startDate} — ${params.endDate}</strong> has been <strong style="color:${isApproved ? "#22C55E" : "#EF4444"};">${params.status.toLowerCase()}</strong> by ${params.reviewerName}.`,
    ctaText: "View in Dashboard",
    ctaUrl: params.dashboardUrl,
  });
}
