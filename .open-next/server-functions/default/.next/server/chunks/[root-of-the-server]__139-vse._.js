module.exports=[193695,(t,e,a)=>{e.exports=t.x("next/dist/shared/lib/no-fallback-error.external.js",()=>require("next/dist/shared/lib/no-fallback-error.external.js"))},918622,(t,e,a)=>{e.exports=t.x("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js",()=>require("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js"))},556704,(t,e,a)=>{e.exports=t.x("next/dist/server/app-render/work-async-storage.external.js",()=>require("next/dist/server/app-render/work-async-storage.external.js"))},832319,(t,e,a)=>{e.exports=t.x("next/dist/server/app-render/work-unit-async-storage.external.js",()=>require("next/dist/server/app-render/work-unit-async-storage.external.js"))},324725,(t,e,a)=>{e.exports=t.x("next/dist/server/app-render/after-task-async-storage.external.js",()=>require("next/dist/server/app-render/after-task-async-storage.external.js"))},814747,(t,e,a)=>{e.exports=t.x("path",()=>require("path"))},270406,(t,e,a)=>{e.exports=t.x("next/dist/compiled/@opentelemetry/api",()=>require("next/dist/compiled/@opentelemetry/api"))},478500,(t,e,a)=>{e.exports=t.x("node:async_hooks",()=>require("node:async_hooks"))},951615,(t,e,a)=>{e.exports=t.x("node:buffer",()=>require("node:buffer"))},666680,(t,e,a)=>{e.exports=t.x("node:crypto",()=>require("node:crypto"))},750227,(t,e,a)=>{e.exports=t.x("node:path",()=>require("node:path"))},902157,(t,e,a)=>{e.exports=t.x("node:fs",()=>require("node:fs"))},687769,(t,e,a)=>{e.exports=t.x("node:events",()=>require("node:events"))},660526,(t,e,a)=>{e.exports=t.x("node:os",()=>require("node:os"))},723862,t=>t.a(async(e,a)=>{try{let e=await t.y("pg-587764f78a6c7a9c");t.n(e),a()}catch(t){a(t)}},!0),848782,t=>{"use strict";function e(t){return`
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
              ${t}
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
</html>`.trim()}t.s(["contactEmailTemplate",0,function(t){return e(`
    <h2 style="margin:0 0 16px;font-size:20px;font-weight:600;color:#fafafa;">New Contact Form Submission</h2>
    <table style="border-collapse:collapse;width:100%;">
      ${t.tableRows}
    </table>
    <hr style="border:none;border-top:1px solid #27272a;margin:24px 0;" />
    <p style="margin:0;font-size:12px;color:#52525b;">Submitted from the MyDex contact page</p>
  `)},"notificationEmailTemplate",0,function(t){let a=t.ctaUrl?`
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px auto;">
      <tr>
        <td style="border-radius:8px;background-color:#6d28d9;">
          <a href="${t.ctaUrl}" target="_blank" style="display:inline-block;padding:12px 32px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
            ${t.ctaText||"View in MyDex"}
          </a>
        </td>
      </tr>
    </table>`:"";return e(`
    <h2 style="margin:0 0 16px;font-size:20px;font-weight:600;color:#fafafa;">${t.title}</h2>
    <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#a1a1aa;">${t.message}</p>
    ${a}
  `)},"reportEmailTemplate",0,function(t){return e(`
    <h2 style="margin:0 0 16px;font-size:20px;font-weight:600;color:#fafafa;">${t.reportName}</h2>
    <p style="margin:0 0 8px;font-size:13px;color:#71717a;">Period: ${t.dateRange}</p>
    <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#a1a1aa;">${t.summaryFields}</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
      <tr>
        <td style="border-radius:8px;background-color:#6d28d9;">
          <a href="${t.appUrl}/reports" target="_blank" style="display:inline-block;padding:12px 32px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
            View Full Report
          </a>
        </td>
      </tr>
    </table>
    <hr style="border:none;border-top:1px solid #27272a;margin:24px 0;" />
    <p style="margin:0;font-size:12px;color:#52525b;">This is an automated report from MyDex.</p>
  `)}])},228699,t=>t.a(async(e,a)=>{try{var r=t.i(698043),n=e([r]);async function o(t,e){let a=await r.prisma.integration.findUnique({where:{organizationId_provider:{organizationId:t,provider:"slack"}}});if(!a?.enabled||!a.webhookUrl)return!1;let n=[{type:"header",text:{type:"plain_text",text:e.title,emoji:!0}},{type:"section",text:{type:"mrkdwn",text:e.message}}];e.fields&&e.fields.length>0&&n.push({type:"section",fields:e.fields.map(t=>({type:"mrkdwn",text:`*${t.label}*
${t.value}`}))}),e.link&&n.push({type:"actions",elements:[{type:"button",text:{type:"plain_text",text:"View in MyDex"},url:e.link,style:"primary"}]});try{return(await fetch(a.webhookUrl,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({attachments:[{color:e.color||"#4F46E5",blocks:n}]})})).ok}catch{return!1}}async function i(t,e){let a=await r.prisma.integration.findUnique({where:{organizationId_provider:{organizationId:t,provider:"teams"}}});if(!a?.enabled||!a.webhookUrl)return!1;let n=(e.fields||[]).map(t=>({title:t.label,value:t.value})),o={type:"message",attachments:[{contentType:"application/vnd.microsoft.card.adaptive",content:{$schema:"http://adaptivecards.io/schemas/adaptive-card.json",type:"AdaptiveCard",version:"1.4",body:[{type:"TextBlock",text:e.title,weight:"Bolder",size:"Medium",color:"Accent"},{type:"TextBlock",text:e.message,wrap:!0},...n.length>0?[{type:"FactSet",facts:n}]:[]],...e.link?{actions:[{type:"Action.OpenUrl",title:"View in MyDex",url:e.link}]}:{}}}]};try{return(await fetch(a.webhookUrl,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(o)})).ok}catch{return!1}}async function s(t,e){await Promise.allSettled([o(t,e),i(t,e)])}[r]=n.then?(await n)():n,t.s(["sendIntegrationMessage",0,s,"sendSlackMessage",0,o,"sendTeamsMessage",0,i]),a()}catch(t){a(t)}},!1),609730,438220,874321,t=>{"use strict";let e=Symbol.for("constructDateFrom");function a(t,a){return"function"==typeof t?t(a):t&&"object"==typeof t&&e in t?t[e](a):t instanceof Date?new t.constructor(a):new Date(a)}t.s(["constructFromSymbol",0,e,"millisecondsInDay",0,864e5,"millisecondsInWeek",0,6048e5],438220),t.s(["constructFrom",0,a],874321),t.s(["toDate",0,function(t,e){return a(e||t,t)}],609730)},968422,t=>{"use strict";var e=t.i(609730);t.s(["startOfDay",0,function(t,a){let r=(0,e.toDate)(t,a?.in);return r.setHours(0,0,0,0),r}])},842523,t=>{"use strict";var e=t.i(609730);t.s(["endOfDay",0,function(t,a){let r=(0,e.toDate)(t,a?.in);return r.setHours(23,59,59,999),r}])},938790,t=>{"use strict";var e=t.i(874321),a=t.i(609730);t.s(["subDays",0,function(t,r,n){var o;let i;return o=-r,i=(0,a.toDate)(t,n?.in),isNaN(o)?(0,e.constructFrom)(n?.in||t,NaN):(o&&i.setDate(i.getDate()+o),i)}],938790)},572063,t=>{"use strict";function e(t){return t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function a(t,a){return`<div class="summary-card"><div class="value">${e(String(a))}</div><div class="label">${e(t)}</div></div>`}function r(){return`<div style="text-align:center;padding:40px 0;color:#94a3b8;">
    <p style="font-size:15px;">No data found for the selected date range.</p>
  </div>`}t.s(["generateReportHTML",0,function(t){let{title:n,orgName:o,logoUrl:i,dateRange:s,generatedAt:d,summary:l,reportType:p}=t,c=function(t,e){switch(t){case"productivity":return[a("Employees",e.totalEmployees||0),a("Avg Score",null!=e.avgProductivityScore?`${e.avgProductivityScore}%`:"--"),a("Records",e.totalRecords||0)].join("\n");case"attendance":return[a("Employees",e.uniqueEmployees||0),a("Attendance Rate",null!=e.attendanceRate?`${e.attendanceRate}%`:"--"),a("Total Records",e.totalRecords||0)].join("\n");case"security":return[a("Total Alerts",e.totalAlerts||0),a("Critical",e.bySeverity?.CRITICAL||0),a("High",e.bySeverity?.HIGH||0),a("Open",e.byStatus?.OPEN||0)].join("\n");case"time-tracking":return[a("Employees",e.totalEmployees||0),a("Total Hours",e.totalOrgFormatted||`${e.totalHoursOrg||0}h`),a("Clock Entries",e.totalEntries||0)].join("\n");default:return""}}(p,l),g=function(t,a){let n=a.employees||[],o=a.recentAlerts||[];switch(t){case"productivity":{if(0===n.length)return r();let t=n.map(t=>{var a;return`<tr>
          <td>${e(t.name)}</td>
          <td>${e(t.department)}</td>
          <td class="text-right">${null!=t.avgScore?(a=t.avgScore,`<span class="badge ${a>=70?"badge-green":a>=40?"badge-amber":"badge-red"}">${a}%</span>`):"--"}</td>
          <td class="text-right">${e(t.activeFormatted)}</td>
          <td class="text-right">${t.daysTracked}</td>
        </tr>`}).join("\n");return`<table class="data-table">
        <thead><tr>
          <th>Employee</th><th>Department</th>
          <th class="text-right">Avg Score</th><th class="text-right">Active Time</th><th class="text-right">Days</th>
        </tr></thead>
        <tbody>${t}</tbody>
      </table>`}case"attendance":{if(0===n.length)return r();let t=n.map(t=>{var a;return`<tr>
          <td>${e(t.name)}</td>
          <td>${e(t.department)}</td>
          <td class="text-right">${t.present}</td>
          <td class="text-right">${t.absent}</td>
          <td class="text-right">${t.late}</td>
          <td class="text-right">${a=t.rate,`<span class="badge ${a>=90?"badge-green":a>=70?"badge-amber":"badge-red"}">${a}%</span>`}</td>
        </tr>`}).join("\n");return`<table class="data-table">
        <thead><tr>
          <th>Employee</th><th>Department</th>
          <th class="text-right">Present</th><th class="text-right">Absent</th>
          <th class="text-right">Late</th><th class="text-right">Rate</th>
        </tr></thead>
        <tbody>${t}</tbody>
      </table>`}case"security":{if(0===o.length)return r();let t=o.map(t=>{var a;let r;return`<tr>
          <td>${e(t.title)}</td>
          <td>${r="CRITICAL"===(a=t.severity)?"badge-red":"HIGH"===a?"badge-amber":"badge-blue",`<span class="badge ${r}">${e(a)}</span>`}</td>
          <td><span class="badge badge-gray">${e(t.status)}</span></td>
          <td>${e(t.user)}</td>
          <td>${e(new Date(t.createdAt).toLocaleDateString())}</td>
        </tr>`}).join("\n");return`<table class="data-table">
        <thead><tr>
          <th>Alert</th><th>Severity</th><th>Status</th><th>User</th><th>Date</th>
        </tr></thead>
        <tbody>${t}</tbody>
      </table>`}case"time-tracking":{if(0===n.length)return r();let t=n.map(t=>`<tr>
          <td>${e(t.name)}</td>
          <td>${e(t.department)}</td>
          <td class="text-right">${e(t.totalFormatted)}</td>
          <td class="text-right">${e(t.activeFormatted)}</td>
          <td class="text-right">${e(t.idleFormatted)}</td>
          <td class="text-right">${t.entries}</td>
        </tr>`).join("\n");return`<table class="data-table">
        <thead><tr>
          <th>Employee</th><th>Department</th>
          <th class="text-right">Total</th><th class="text-right">Active</th>
          <th class="text-right">Idle</th><th class="text-right">Entries</th>
        </tr></thead>
        <tbody>${t}</tbody>
      </table>`}default:return""}}(p,l);return`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${e(n)} - ${e(o)}</title>
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
        ${i?`<img src="${e(i)}" alt="" class="header-logo" />`:""}
        <span class="header-org">${e(o)}</span>
      </div>
      <div class="header-right">
        Generated ${e(d)}
      </div>
    </div>

    <div class="title-section">
      <h1>${e(n)}</h1>
      <div class="date-range">${e(s)}</div>
    </div>

    <div class="summary-grid">
      ${c}
    </div>

    ${g}

    <div class="footer">
      <span>Generated by MyDex</span>
      <span>${e(d)}</span>
    </div>
  </div>
</body>
</html>`}])},70729,t=>{t.v(t=>Promise.resolve().then(()=>t(666680)))}];

//# sourceMappingURL=%5Broot-of-the-server%5D__139-vse._.js.map