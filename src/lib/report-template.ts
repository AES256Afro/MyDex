/**
 * Generates a complete HTML document for a printable report.
 * The output is designed to be opened in a browser tab and printed to PDF via Ctrl+P.
 */
export function generateReportHTML(params: {
  title: string;
  orgName: string;
  logoUrl?: string;
  dateRange: string;
  generatedAt: string;
  summary: Record<string, unknown>;
  reportType: string;
}): string {
  const { title, orgName, logoUrl, dateRange, generatedAt, summary, reportType } = params;

  const summaryCards = buildSummaryCards(reportType, summary);
  const tableHTML = buildDataTable(reportType, summary);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)} - ${escapeHtml(orgName)}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #1a1a2e;
      background: #fff;
      font-size: 14px;
      line-height: 1.5;
      padding: 0;
    }

    .page {
      max-width: 900px;
      margin: 0 auto;
      padding: 40px 48px;
    }

    /* Header */
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 3px solid #1a1a2e;
      padding-bottom: 20px;
      margin-bottom: 32px;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .header-logo {
      height: 48px;
      width: auto;
      border-radius: 6px;
    }
    .header-org {
      font-size: 22px;
      font-weight: 700;
      color: #1a1a2e;
    }
    .header-right {
      text-align: right;
      color: #64748b;
      font-size: 12px;
    }

    /* Title section */
    .title-section {
      margin-bottom: 28px;
    }
    .title-section h1 {
      font-size: 26px;
      font-weight: 700;
      color: #1a1a2e;
      margin-bottom: 4px;
    }
    .title-section .date-range {
      font-size: 15px;
      color: #64748b;
    }

    /* Summary cards */
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 16px;
      margin-bottom: 32px;
    }
    .summary-card {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 16px;
      text-align: center;
      background: #f8fafc;
    }
    .summary-card .value {
      font-size: 28px;
      font-weight: 700;
      color: #1a1a2e;
    }
    .summary-card .label {
      font-size: 12px;
      color: #64748b;
      margin-top: 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* Data table */
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 32px;
      font-size: 13px;
    }
    .data-table thead th {
      background: #1a1a2e;
      color: #fff;
      padding: 10px 14px;
      text-align: left;
      font-weight: 600;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .data-table thead th.text-right {
      text-align: right;
    }
    .data-table tbody td {
      padding: 10px 14px;
      border-bottom: 1px solid #e2e8f0;
    }
    .data-table tbody td.text-right {
      text-align: right;
    }
    .data-table tbody tr:nth-child(even) {
      background: #f8fafc;
    }
    .data-table tbody tr:hover {
      background: #f1f5f9;
    }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 600;
    }
    .badge-green { background: #dcfce7; color: #166534; }
    .badge-amber { background: #fef3c7; color: #92400e; }
    .badge-red   { background: #fee2e2; color: #991b1b; }
    .badge-blue  { background: #dbeafe; color: #1e40af; }
    .badge-gray  { background: #f1f5f9; color: #475569; }

    /* Footer */
    .footer {
      border-top: 1px solid #e2e8f0;
      padding-top: 16px;
      margin-top: 40px;
      display: flex;
      justify-content: space-between;
      color: #94a3b8;
      font-size: 11px;
    }

    /* Print styles */
    @media print {
      body { padding: 0; font-size: 12px; }
      .page { padding: 20px 24px; max-width: none; }
      .header { border-bottom-width: 2px; }
      .summary-card { break-inside: avoid; }
      .data-table { break-inside: auto; }
      .data-table thead { display: table-header-group; }
      .data-table tr { break-inside: avoid; }
      .footer { position: fixed; bottom: 0; left: 0; right: 0; padding: 8px 24px; }
      @page { margin: 0.5in; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="header-left">
        ${logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="" class="header-logo" />` : ""}
        <span class="header-org">${escapeHtml(orgName)}</span>
      </div>
      <div class="header-right">
        Generated ${escapeHtml(generatedAt)}
      </div>
    </div>

    <div class="title-section">
      <h1>${escapeHtml(title)}</h1>
      <div class="date-range">${escapeHtml(dateRange)}</div>
    </div>

    <div class="summary-grid">
      ${summaryCards}
    </div>

    ${tableHTML}

    <div class="footer">
      <span>Generated by MyDex</span>
      <span>${escapeHtml(generatedAt)}</span>
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function summaryCard(label: string, value: string | number): string {
  return `<div class="summary-card"><div class="value">${escapeHtml(String(value))}</div><div class="label">${escapeHtml(label)}</div></div>`;
}

function buildSummaryCards(reportType: string, summary: Record<string, unknown>): string {
  switch (reportType) {
    case "productivity":
      return [
        summaryCard("Employees", (summary.totalEmployees as number) || 0),
        summaryCard("Avg Score", summary.avgProductivityScore != null ? `${summary.avgProductivityScore}%` : "--"),
        summaryCard("Records", (summary.totalRecords as number) || 0),
      ].join("\n");

    case "attendance":
      return [
        summaryCard("Employees", (summary.uniqueEmployees as number) || 0),
        summaryCard("Attendance Rate", summary.attendanceRate != null ? `${summary.attendanceRate}%` : "--"),
        summaryCard("Total Records", (summary.totalRecords as number) || 0),
      ].join("\n");

    case "security":
      return [
        summaryCard("Total Alerts", (summary.totalAlerts as number) || 0),
        summaryCard("Critical", ((summary.bySeverity as Record<string, number>)?.CRITICAL) || 0),
        summaryCard("High", ((summary.bySeverity as Record<string, number>)?.HIGH) || 0),
        summaryCard("Open", ((summary.byStatus as Record<string, number>)?.OPEN) || 0),
      ].join("\n");

    case "time-tracking":
      return [
        summaryCard("Employees", (summary.totalEmployees as number) || 0),
        summaryCard("Total Hours", (summary.totalOrgFormatted as string) || `${summary.totalHoursOrg || 0}h`),
        summaryCard("Clock Entries", (summary.totalEntries as number) || 0),
      ].join("\n");

    default:
      return "";
  }
}

function scoreBadge(score: number): string {
  const cls = score >= 70 ? "badge-green" : score >= 40 ? "badge-amber" : "badge-red";
  return `<span class="badge ${cls}">${score}%</span>`;
}

function rateBadge(rate: number): string {
  const cls = rate >= 90 ? "badge-green" : rate >= 70 ? "badge-amber" : "badge-red";
  return `<span class="badge ${cls}">${rate}%</span>`;
}

function severityBadge(severity: string): string {
  const cls = severity === "CRITICAL" ? "badge-red" : severity === "HIGH" ? "badge-amber" : "badge-blue";
  return `<span class="badge ${cls}">${escapeHtml(severity)}</span>`;
}

function buildDataTable(reportType: string, summary: Record<string, unknown>): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const employees = (summary.employees as any[]) || [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const alerts = (summary.recentAlerts as any[]) || [];

  switch (reportType) {
    case "productivity": {
      if (employees.length === 0) return noDataMessage();
      const rows = employees
        .map(
          (e) => `<tr>
          <td>${escapeHtml(e.name)}</td>
          <td>${escapeHtml(e.department)}</td>
          <td class="text-right">${e.avgScore != null ? scoreBadge(e.avgScore) : "--"}</td>
          <td class="text-right">${escapeHtml(e.activeFormatted)}</td>
          <td class="text-right">${e.daysTracked}</td>
        </tr>`
        )
        .join("\n");
      return `<table class="data-table">
        <thead><tr>
          <th>Employee</th><th>Department</th>
          <th class="text-right">Avg Score</th><th class="text-right">Active Time</th><th class="text-right">Days</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
    }

    case "attendance": {
      if (employees.length === 0) return noDataMessage();
      const rows = employees
        .map(
          (e) => `<tr>
          <td>${escapeHtml(e.name)}</td>
          <td>${escapeHtml(e.department)}</td>
          <td class="text-right">${e.present}</td>
          <td class="text-right">${e.absent}</td>
          <td class="text-right">${e.late}</td>
          <td class="text-right">${rateBadge(e.rate)}</td>
        </tr>`
        )
        .join("\n");
      return `<table class="data-table">
        <thead><tr>
          <th>Employee</th><th>Department</th>
          <th class="text-right">Present</th><th class="text-right">Absent</th>
          <th class="text-right">Late</th><th class="text-right">Rate</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
    }

    case "security": {
      if (alerts.length === 0) return noDataMessage();
      const rows = alerts
        .map(
          (a) => `<tr>
          <td>${escapeHtml(a.title)}</td>
          <td>${severityBadge(a.severity)}</td>
          <td><span class="badge badge-gray">${escapeHtml(a.status)}</span></td>
          <td>${escapeHtml(a.user)}</td>
          <td>${escapeHtml(new Date(a.createdAt).toLocaleDateString())}</td>
        </tr>`
        )
        .join("\n");
      return `<table class="data-table">
        <thead><tr>
          <th>Alert</th><th>Severity</th><th>Status</th><th>User</th><th>Date</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
    }

    case "time-tracking": {
      if (employees.length === 0) return noDataMessage();
      const rows = employees
        .map(
          (e) => `<tr>
          <td>${escapeHtml(e.name)}</td>
          <td>${escapeHtml(e.department)}</td>
          <td class="text-right">${escapeHtml(e.totalFormatted)}</td>
          <td class="text-right">${escapeHtml(e.activeFormatted)}</td>
          <td class="text-right">${escapeHtml(e.idleFormatted)}</td>
          <td class="text-right">${e.entries}</td>
        </tr>`
        )
        .join("\n");
      return `<table class="data-table">
        <thead><tr>
          <th>Employee</th><th>Department</th>
          <th class="text-right">Total</th><th class="text-right">Active</th>
          <th class="text-right">Idle</th><th class="text-right">Entries</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
    }

    default:
      return "";
  }
}

function noDataMessage(): string {
  return `<div style="text-align:center;padding:40px 0;color:#94a3b8;">
    <p style="font-size:15px;">No data found for the selected date range.</p>
  </div>`;
}
