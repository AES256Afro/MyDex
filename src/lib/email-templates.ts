export function baseEmailTemplate(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#0a0a0b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0b;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#18181b;border-radius:12px;border:1px solid #27272a;overflow:hidden;">
          <tr>
            <td style="padding:32px 32px 0;text-align:center;">
              <h1 style="margin:0;font-size:28px;font-weight:700;color:#6d28d9;letter-spacing:-0.5px;">MyDex</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px 32px;">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 24px;text-align:center;">
              <p style="margin:0;font-size:11px;color:#3f3f46;">
                &copy; ${new Date().getFullYear()} MyDex. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

export function notificationEmailTemplate(params: {
  title: string;
  message: string;
  ctaText?: string;
  ctaUrl?: string;
}): string {
  const cta = params.ctaUrl ? `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px auto;">
      <tr>
        <td style="border-radius:8px;background-color:#6d28d9;">
          <a href="${params.ctaUrl}" target="_blank" style="display:inline-block;padding:12px 32px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
            ${params.ctaText || "View in MyDex"}
          </a>
        </td>
      </tr>
    </table>` : "";

  return baseEmailTemplate(`
    <h2 style="margin:0 0 16px;font-size:20px;font-weight:600;color:#fafafa;">${params.title}</h2>
    <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#a1a1aa;">${params.message}</p>
    ${cta}
  `);
}

export function reportEmailTemplate(params: {
  reportName: string;
  dateRange: string;
  summaryFields: string;
  appUrl: string;
}): string {
  return baseEmailTemplate(`
    <h2 style="margin:0 0 16px;font-size:20px;font-weight:600;color:#fafafa;">${params.reportName}</h2>
    <p style="margin:0 0 8px;font-size:13px;color:#71717a;">Period: ${params.dateRange}</p>
    <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#a1a1aa;">${params.summaryFields}</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
      <tr>
        <td style="border-radius:8px;background-color:#6d28d9;">
          <a href="${params.appUrl}/reports" target="_blank" style="display:inline-block;padding:12px 32px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
            View Full Report
          </a>
        </td>
      </tr>
    </table>
    <hr style="border:none;border-top:1px solid #27272a;margin:24px 0;" />
    <p style="margin:0;font-size:12px;color:#52525b;">This is an automated report from MyDex.</p>
  `);
}

export function contactEmailTemplate(params: {
  tableRows: string;
}): string {
  return baseEmailTemplate(`
    <h2 style="margin:0 0 16px;font-size:20px;font-weight:600;color:#fafafa;">New Contact Form Submission</h2>
    <table style="border-collapse:collapse;width:100%;">
      ${params.tableRows}
    </table>
    <hr style="border:none;border-top:1px solid #27272a;margin:24px 0;" />
    <p style="margin:0;font-size:12px;color:#52525b;">Submitted from the MyDex contact page</p>
  `);
}
