module.exports=[270406,(e,t,a)=>{t.exports=e.x("next/dist/compiled/@opentelemetry/api",()=>require("next/dist/compiled/@opentelemetry/api"))},814747,(e,t,a)=>{t.exports=e.x("path",()=>require("path"))},918622,(e,t,a)=>{t.exports=e.x("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js",()=>require("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js"))},556704,(e,t,a)=>{t.exports=e.x("next/dist/server/app-render/work-async-storage.external.js",()=>require("next/dist/server/app-render/work-async-storage.external.js"))},832319,(e,t,a)=>{t.exports=e.x("next/dist/server/app-render/work-unit-async-storage.external.js",()=>require("next/dist/server/app-render/work-unit-async-storage.external.js"))},120635,(e,t,a)=>{t.exports=e.x("next/dist/server/app-render/action-async-storage.external.js",()=>require("next/dist/server/app-render/action-async-storage.external.js"))},324725,(e,t,a)=>{t.exports=e.x("next/dist/server/app-render/after-task-async-storage.external.js",()=>require("next/dist/server/app-render/after-task-async-storage.external.js"))},193695,(e,t,a)=>{t.exports=e.x("next/dist/shared/lib/no-fallback-error.external.js",()=>require("next/dist/shared/lib/no-fallback-error.external.js"))},478500,(e,t,a)=>{t.exports=e.x("node:async_hooks",()=>require("node:async_hooks"))},951615,(e,t,a)=>{t.exports=e.x("node:buffer",()=>require("node:buffer"))},666680,(e,t,a)=>{t.exports=e.x("node:crypto",()=>require("node:crypto"))},750227,(e,t,a)=>{t.exports=e.x("node:path",()=>require("node:path"))},902157,(e,t,a)=>{t.exports=e.x("node:fs",()=>require("node:fs"))},687769,(e,t,a)=>{t.exports=e.x("node:events",()=>require("node:events"))},660526,(e,t,a)=>{t.exports=e.x("node:os",()=>require("node:os"))},723862,e=>e.a(async(t,a)=>{try{let t=await e.y("pg-587764f78a6c7a9c");e.n(t),a()}catch(e){a(e)}},!0),254799,(e,t,a)=>{t.exports=e.x("crypto",()=>require("crypto"))},189104,e=>{"use strict";let t=new Map;setInterval(()=>{let e=Date.now();for(let[a,r]of t.entries())r.timestamps=r.timestamps.filter(t=>e-t<9e5),0===r.timestamps.length&&t.delete(a)},3e5),e.s(["RATE_LIMITS",0,{login:{maxRequests:5,windowSeconds:900},register:{maxRequests:3,windowSeconds:3600},api:{maxRequests:100,windowSeconds:60},mfa:{maxRequests:5,windowSeconds:300},passwordReset:{maxRequests:3,windowSeconds:3600},agentAuth:{maxRequests:10,windowSeconds:60}},"checkRateLimit",0,function(e,a){let r=Date.now(),s=1e3*a.windowSeconds,i=t.get(e);return(i||(i={timestamps:[]},t.set(e,i)),i.timestamps=i.timestamps.filter(e=>r-e<s),i.timestamps.length>=a.maxRequests)?{allowed:!1,remaining:0,retryAfterSeconds:Math.ceil((s-(r-i.timestamps[0]))/1e3)}:(i.timestamps.push(r),{allowed:!0,remaining:a.maxRequests-i.timestamps.length,retryAfterSeconds:0})}])},720583,e=>e.a(async(t,a)=>{try{var r=e.i(698043),s=t([r]);async function i(){let e=process.env.REGISTRATION_MODE,t=process.env.ALLOWED_EMAILS?.split(",").map(e=>e.trim().toLowerCase()).filter(Boolean),a=process.env.ALLOWED_DOMAINS?.split(",").map(e=>e.trim().toLowerCase()).filter(Boolean),s=process.env.ALLOWED_DEVICES?.split(",").map(e=>e.trim().toLowerCase()).filter(Boolean);if(e)return{registrationMode:e,allowedEmails:t||[],allowedDomains:a||[],allowedDevices:s||[],deviceAllowlistEnabled:"true"===process.env.DEVICE_ALLOWLIST_ENABLED,requireApproval:"true"===process.env.REQUIRE_APPROVAL};try{let e=await r.prisma.organization.findFirst({orderBy:{createdAt:"asc"},select:{settings:!0}}),t=e?.settings||{};return{registrationMode:t.registrationMode||"open",allowedEmails:t.allowedEmails||[],allowedDomains:t.allowedDomains||[],allowedDevices:t.allowedDevices||[],deviceAllowlistEnabled:t.deviceAllowlistEnabled||!1,requireApproval:t.requireApproval||!1}}catch{return{registrationMode:"open",allowedEmails:[],allowedDomains:[],allowedDevices:[],deviceAllowlistEnabled:!1}}}async function o(e){let t=await i(),a=e.toLowerCase().trim(),s=a.split("@")[1];if("open"===t.registrationMode)return{allowed:!0};if("closed"===t.registrationMode)return await r.prisma.user.findUnique({where:{email:a}})?{allowed:!0}:{allowed:!1,reason:"Registration is currently closed"};if("allowlist"===t.registrationMode){if(await r.prisma.user.findUnique({where:{email:a}}))return{allowed:!0};let e=(t.allowedEmails||[]).map(e=>e.toLowerCase()),i=(t.allowedDomains||[]).map(e=>e.toLowerCase());return e.includes(a)||s&&i.includes(s)?{allowed:!0}:{allowed:!1,reason:"Your email is not on the allowed list. Contact your administrator."}}return{allowed:!0}}async function n(e,t){try{let a=await r.prisma.organization.findUnique({where:{id:e},select:{settings:!0}}),s=a?.settings||{},i=s.allowedEmails||[],o=t.toLowerCase().trim();if(i.some(e=>e.toLowerCase()===o))return;await r.prisma.organization.update({where:{id:e},data:{settings:{...s,allowedEmails:[...i,o]}}})}catch(e){console.error("Failed to add email to allowlist:",e)}}async function d(e){let t=await i();if(!t.deviceAllowlistEnabled)return{allowed:!0};let a=(t.allowedDevices||[]).map(e=>e.toLowerCase());if(0===a.length)return{allowed:!1,reason:"Device allowlist is enabled but no devices are configured. Contact your administrator."};let r=e.toLowerCase().trim();if(a.includes(r))return{allowed:!0};for(let e of a)if(e.includes("*")&&RegExp("^"+e.replace(/\*/g,".*")+"$","i").test(r))return{allowed:!0};return{allowed:!1,reason:"This device is not on the allowed list. Contact your administrator."}}async function l(){return(await i()).requireApproval||!1}[r]=s.then?(await s)():s,e.s(["addToAllowlist",0,n,"isDeviceAllowed",0,d,"isEmailAllowed",0,o,"needsApproval",0,l]),a()}catch(e){a(e)}},!1),548886,e=>{"use strict";let t={SUPER_ADMIN:4,ADMIN:3,MANAGER:2,EMPLOYEE:1},a={SUPER_ADMIN:["employees:read","employees:write","employees:invite","time-entries:read","time-entries:read-all","time-entries:write","attendance:read","attendance:read-all","attendance:write","leave:approve","activity:read","activity:read-all","projects:read","projects:write","tasks:read","tasks:write","tasks:assign","security:read","security:manage","reports:read","reports:create","reports:schedule","settings:read","settings:write","team:manage","mdm:read","mdm:write","mdm:actions","patch-notes:read","patch-notes:write"],ADMIN:["employees:read","employees:write","employees:invite","time-entries:read","time-entries:read-all","time-entries:write","attendance:read","attendance:read-all","attendance:write","leave:approve","activity:read","activity:read-all","projects:read","projects:write","tasks:read","tasks:write","tasks:assign","security:read","security:manage","reports:read","reports:create","reports:schedule","settings:read","settings:write","team:manage","mdm:read","mdm:write","mdm:actions","patch-notes:read","patch-notes:write"],MANAGER:["employees:read","time-entries:read","time-entries:read-all","time-entries:write","attendance:read","attendance:read-all","leave:approve","activity:read","activity:read-all","projects:read","projects:write","tasks:read","tasks:write","tasks:assign","security:read","reports:read","reports:create","settings:read","patch-notes:read"],EMPLOYEE:["time-entries:read","time-entries:write","attendance:read","activity:read","projects:read","tasks:read","tasks:write","reports:read","settings:read","patch-notes:read"]};e.s(["hasMinRole",0,function(e,a){return t[e]>=t[a]},"hasPermission",0,function(e,t){return a[e]?.includes(t)??!1}])},609730,438220,874321,e=>{"use strict";let t=Symbol.for("constructDateFrom");function a(e,a){return"function"==typeof e?e(a):e&&"object"==typeof e&&t in e?e[t](a):e instanceof Date?new e.constructor(a):new Date(a)}e.s(["constructFromSymbol",0,t,"millisecondsInDay",0,864e5,"millisecondsInWeek",0,6048e5],438220),e.s(["constructFrom",0,a],874321),e.s(["toDate",0,function(e,t){return a(t||e,e)}],609730)},968422,e=>{"use strict";var t=e.i(609730);e.s(["startOfDay",0,function(e,a){let r=(0,t.toDate)(e,a?.in);return r.setHours(0,0,0,0),r}])},842523,e=>{"use strict";var t=e.i(609730);e.s(["endOfDay",0,function(e,a){let r=(0,t.toDate)(e,a?.in);return r.setHours(23,59,59,999),r}])},572063,e=>{"use strict";function t(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function a(e,a){return`<div class="summary-card"><div class="value">${t(String(a))}</div><div class="label">${t(e)}</div></div>`}function r(){return`<div style="text-align:center;padding:40px 0;color:#94a3b8;">
    <p style="font-size:15px;">No data found for the selected date range.</p>
  </div>`}e.s(["generateReportHTML",0,function(e){let{title:s,orgName:i,logoUrl:o,dateRange:n,generatedAt:d,summary:l,reportType:c}=e,p=function(e,t){switch(e){case"productivity":return[a("Employees",t.totalEmployees||0),a("Avg Score",null!=t.avgProductivityScore?`${t.avgProductivityScore}%`:"--"),a("Records",t.totalRecords||0)].join("\n");case"attendance":return[a("Employees",t.uniqueEmployees||0),a("Attendance Rate",null!=t.attendanceRate?`${t.attendanceRate}%`:"--"),a("Total Records",t.totalRecords||0)].join("\n");case"security":return[a("Total Alerts",t.totalAlerts||0),a("Critical",t.bySeverity?.CRITICAL||0),a("High",t.bySeverity?.HIGH||0),a("Open",t.byStatus?.OPEN||0)].join("\n");case"time-tracking":return[a("Employees",t.totalEmployees||0),a("Total Hours",t.totalOrgFormatted||`${t.totalHoursOrg||0}h`),a("Clock Entries",t.totalEntries||0)].join("\n");default:return""}}(c,l),m=function(e,a){let s=a.employees||[],i=a.recentAlerts||[];switch(e){case"productivity":{if(0===s.length)return r();let e=s.map(e=>{var a;return`<tr>
          <td>${t(e.name)}</td>
          <td>${t(e.department)}</td>
          <td class="text-right">${null!=e.avgScore?(a=e.avgScore,`<span class="badge ${a>=70?"badge-green":a>=40?"badge-amber":"badge-red"}">${a}%</span>`):"--"}</td>
          <td class="text-right">${t(e.activeFormatted)}</td>
          <td class="text-right">${e.daysTracked}</td>
        </tr>`}).join("\n");return`<table class="data-table">
        <thead><tr>
          <th>Employee</th><th>Department</th>
          <th class="text-right">Avg Score</th><th class="text-right">Active Time</th><th class="text-right">Days</th>
        </tr></thead>
        <tbody>${e}</tbody>
      </table>`}case"attendance":{if(0===s.length)return r();let e=s.map(e=>{var a;return`<tr>
          <td>${t(e.name)}</td>
          <td>${t(e.department)}</td>
          <td class="text-right">${e.present}</td>
          <td class="text-right">${e.absent}</td>
          <td class="text-right">${e.late}</td>
          <td class="text-right">${a=e.rate,`<span class="badge ${a>=90?"badge-green":a>=70?"badge-amber":"badge-red"}">${a}%</span>`}</td>
        </tr>`}).join("\n");return`<table class="data-table">
        <thead><tr>
          <th>Employee</th><th>Department</th>
          <th class="text-right">Present</th><th class="text-right">Absent</th>
          <th class="text-right">Late</th><th class="text-right">Rate</th>
        </tr></thead>
        <tbody>${e}</tbody>
      </table>`}case"security":{if(0===i.length)return r();let e=i.map(e=>{var a;let r;return`<tr>
          <td>${t(e.title)}</td>
          <td>${r="CRITICAL"===(a=e.severity)?"badge-red":"HIGH"===a?"badge-amber":"badge-blue",`<span class="badge ${r}">${t(a)}</span>`}</td>
          <td><span class="badge badge-gray">${t(e.status)}</span></td>
          <td>${t(e.user)}</td>
          <td>${t(new Date(e.createdAt).toLocaleDateString())}</td>
        </tr>`}).join("\n");return`<table class="data-table">
        <thead><tr>
          <th>Alert</th><th>Severity</th><th>Status</th><th>User</th><th>Date</th>
        </tr></thead>
        <tbody>${e}</tbody>
      </table>`}case"time-tracking":{if(0===s.length)return r();let e=s.map(e=>`<tr>
          <td>${t(e.name)}</td>
          <td>${t(e.department)}</td>
          <td class="text-right">${t(e.totalFormatted)}</td>
          <td class="text-right">${t(e.activeFormatted)}</td>
          <td class="text-right">${t(e.idleFormatted)}</td>
          <td class="text-right">${e.entries}</td>
        </tr>`).join("\n");return`<table class="data-table">
        <thead><tr>
          <th>Employee</th><th>Department</th>
          <th class="text-right">Total</th><th class="text-right">Active</th>
          <th class="text-right">Idle</th><th class="text-right">Entries</th>
        </tr></thead>
        <tbody>${e}</tbody>
      </table>`}default:return""}}(c,l);return`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${t(s)} - ${t(i)}</title>
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
        ${o?`<img src="${t(o)}" alt="" class="header-logo" />`:""}
        <span class="header-org">${t(i)}</span>
      </div>
      <div class="header-right">
        Generated ${t(d)}
      </div>
    </div>

    <div class="title-section">
      <h1>${t(s)}</h1>
      <div class="date-range">${t(n)}</div>
    </div>

    <div class="summary-grid">
      ${p}
    </div>

    ${m}

    <div class="footer">
      <span>Generated by MyDex</span>
      <span>${t(d)}</span>
    </div>
  </div>
</body>
</html>`}])},70729,e=>{e.v(e=>Promise.resolve().then(()=>e(666680)))}];

//# sourceMappingURL=%5Broot-of-the-server%5D__0na6p.j._.js.map