import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";

const contactSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  companyName: z.string().min(1),
  jobTitle: z.string().min(1),
  country: z.string().min(1),
  phone: z.string().min(1),
  companySize: z.string().optional(),
  message: z.string().optional(),
  turnstileToken: z.string().optional(),
});

async function verifyTurnstile(token: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // Skip verification if not configured

  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret, response: token }),
  });
  const data = await res.json();
  return data.success === true;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = contactSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Verify Cloudflare Turnstile token
    if (data.turnstileToken) {
      const valid = await verifyTurnstile(data.turnstileToken);
      if (!valid) {
        return NextResponse.json({ error: "Bot verification failed" }, { status: 403 });
      }
    }

    // If RESEND_API_KEY is configured, send via Resend
    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);

      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || "MyDex <noreply@mydexnow.com>",
        to: ["sales@mydexnow.com"],
        replyTo: data.email,
        subject: `New Contact Request from ${data.firstName} ${data.lastName} at ${data.companyName}`,
        html: `
          <h2>New Contact Form Submission</h2>
          <table style="border-collapse:collapse;width:100%;max-width:600px;">
            <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:600;width:140px;">Name</td><td style="padding:8px;border-bottom:1px solid #eee;">${data.firstName} ${data.lastName}</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:600;">Email</td><td style="padding:8px;border-bottom:1px solid #eee;"><a href="mailto:${data.email}">${data.email}</a></td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:600;">Company</td><td style="padding:8px;border-bottom:1px solid #eee;">${data.companyName}</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:600;">Job Title</td><td style="padding:8px;border-bottom:1px solid #eee;">${data.jobTitle}</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:600;">Country</td><td style="padding:8px;border-bottom:1px solid #eee;">${data.country}</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:600;">Phone</td><td style="padding:8px;border-bottom:1px solid #eee;">${data.phone}</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:600;">Company Size</td><td style="padding:8px;border-bottom:1px solid #eee;">${data.companySize || "Not specified"}</td></tr>
            ${data.message ? `<tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:600;">Message</td><td style="padding:8px;border-bottom:1px solid #eee;">${data.message}</td></tr>` : ""}
          </table>
          <p style="margin-top:20px;color:#666;font-size:12px;">Submitted from the MyDex contact page</p>
        `,
      });
    } else {
      // Log to console in development when Resend is not configured
      console.log("📬 Contact form submission (RESEND_API_KEY not set):", data);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Contact form error:", error);
    return NextResponse.json(
      { error: "Failed to submit contact form" },
      { status: 500 }
    );
  }
}
