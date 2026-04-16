module.exports=[270406,(e,t,r)=>{t.exports=e.x("next/dist/compiled/@opentelemetry/api",()=>require("next/dist/compiled/@opentelemetry/api"))},814747,(e,t,r)=>{t.exports=e.x("path",()=>require("path"))},918622,(e,t,r)=>{t.exports=e.x("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js",()=>require("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js"))},556704,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-async-storage.external.js",()=>require("next/dist/server/app-render/work-async-storage.external.js"))},832319,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-unit-async-storage.external.js",()=>require("next/dist/server/app-render/work-unit-async-storage.external.js"))},120635,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/action-async-storage.external.js",()=>require("next/dist/server/app-render/action-async-storage.external.js"))},324725,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/after-task-async-storage.external.js",()=>require("next/dist/server/app-render/after-task-async-storage.external.js"))},193695,(e,t,r)=>{t.exports=e.x("next/dist/shared/lib/no-fallback-error.external.js",()=>require("next/dist/shared/lib/no-fallback-error.external.js"))},478500,(e,t,r)=>{t.exports=e.x("node:async_hooks",()=>require("node:async_hooks"))},951615,(e,t,r)=>{t.exports=e.x("node:buffer",()=>require("node:buffer"))},666680,(e,t,r)=>{t.exports=e.x("node:crypto",()=>require("node:crypto"))},750227,(e,t,r)=>{t.exports=e.x("node:path",()=>require("node:path"))},902157,(e,t,r)=>{t.exports=e.x("node:fs",()=>require("node:fs"))},687769,(e,t,r)=>{t.exports=e.x("node:events",()=>require("node:events"))},660526,(e,t,r)=>{t.exports=e.x("node:os",()=>require("node:os"))},723862,e=>e.a(async(t,r)=>{try{let t=await e.y("pg-587764f78a6c7a9c");e.n(t),r()}catch(e){r(e)}},!0),254799,(e,t,r)=>{t.exports=e.x("crypto",()=>require("crypto"))},189104,e=>{"use strict";let t=new Map;setInterval(()=>{let e=Date.now();for(let[r,a]of t.entries())a.timestamps=a.timestamps.filter(t=>e-t<9e5),0===a.timestamps.length&&t.delete(r)},3e5),e.s(["RATE_LIMITS",0,{login:{maxRequests:5,windowSeconds:900},register:{maxRequests:3,windowSeconds:3600},api:{maxRequests:100,windowSeconds:60},mfa:{maxRequests:5,windowSeconds:300},passwordReset:{maxRequests:3,windowSeconds:3600},agentAuth:{maxRequests:10,windowSeconds:60}},"checkRateLimit",0,function(e,r){let a=Date.now(),s=1e3*r.windowSeconds,o=t.get(e);return(o||(o={timestamps:[]},t.set(e,o)),o.timestamps=o.timestamps.filter(e=>a-e<s),o.timestamps.length>=r.maxRequests)?{allowed:!1,remaining:0,retryAfterSeconds:Math.ceil((s-(a-o.timestamps[0]))/1e3)}:(o.timestamps.push(a),{allowed:!0,remaining:r.maxRequests-o.timestamps.length,retryAfterSeconds:0})}])},720583,e=>e.a(async(t,r)=>{try{var a=e.i(698043),s=t([a]);async function o(){let e=process.env.REGISTRATION_MODE,t=process.env.ALLOWED_EMAILS?.split(",").map(e=>e.trim().toLowerCase()).filter(Boolean),r=process.env.ALLOWED_DOMAINS?.split(",").map(e=>e.trim().toLowerCase()).filter(Boolean),s=process.env.ALLOWED_DEVICES?.split(",").map(e=>e.trim().toLowerCase()).filter(Boolean);if(e)return{registrationMode:e,allowedEmails:t||[],allowedDomains:r||[],allowedDevices:s||[],deviceAllowlistEnabled:"true"===process.env.DEVICE_ALLOWLIST_ENABLED,requireApproval:"true"===process.env.REQUIRE_APPROVAL};try{let e=await a.prisma.organization.findFirst({orderBy:{createdAt:"asc"},select:{settings:!0}}),t=e?.settings||{};return{registrationMode:t.registrationMode||"open",allowedEmails:t.allowedEmails||[],allowedDomains:t.allowedDomains||[],allowedDevices:t.allowedDevices||[],deviceAllowlistEnabled:t.deviceAllowlistEnabled||!1,requireApproval:t.requireApproval||!1}}catch{return{registrationMode:"open",allowedEmails:[],allowedDomains:[],allowedDevices:[],deviceAllowlistEnabled:!1}}}async function i(e){let t=await o(),r=e.toLowerCase().trim(),s=r.split("@")[1];if("open"===t.registrationMode)return{allowed:!0};if("closed"===t.registrationMode)return await a.prisma.user.findUnique({where:{email:r}})?{allowed:!0}:{allowed:!1,reason:"Registration is currently closed"};if("allowlist"===t.registrationMode){if(await a.prisma.user.findUnique({where:{email:r}}))return{allowed:!0};let e=(t.allowedEmails||[]).map(e=>e.toLowerCase()),o=(t.allowedDomains||[]).map(e=>e.toLowerCase());return e.includes(r)||s&&o.includes(s)?{allowed:!0}:{allowed:!1,reason:"Your email is not on the allowed list. Contact your administrator."}}return{allowed:!0}}async function n(e,t){try{let r=await a.prisma.organization.findUnique({where:{id:e},select:{settings:!0}}),s=r?.settings||{},o=s.allowedEmails||[],i=t.toLowerCase().trim();if(o.some(e=>e.toLowerCase()===i))return;await a.prisma.organization.update({where:{id:e},data:{settings:{...s,allowedEmails:[...o,i]}}})}catch(e){console.error("Failed to add email to allowlist:",e)}}async function l(e){let t=await o();if(!t.deviceAllowlistEnabled)return{allowed:!0};let r=(t.allowedDevices||[]).map(e=>e.toLowerCase());if(0===r.length)return{allowed:!1,reason:"Device allowlist is enabled but no devices are configured. Contact your administrator."};let a=e.toLowerCase().trim();if(r.includes(a))return{allowed:!0};for(let e of r)if(e.includes("*")&&RegExp("^"+e.replace(/\*/g,".*")+"$","i").test(a))return{allowed:!0};return{allowed:!1,reason:"This device is not on the allowed list. Contact your administrator."}}async function d(){return(await o()).requireApproval||!1}[a]=s.then?(await s)():s,e.s(["addToAllowlist",0,n,"isDeviceAllowed",0,l,"isEmailAllowed",0,i,"needsApproval",0,d]),r()}catch(e){r(e)}},!1),548886,e=>{"use strict";let t={SUPER_ADMIN:4,ADMIN:3,MANAGER:2,EMPLOYEE:1},r={SUPER_ADMIN:["employees:read","employees:write","employees:invite","time-entries:read","time-entries:read-all","time-entries:write","attendance:read","attendance:read-all","attendance:write","leave:approve","activity:read","activity:read-all","projects:read","projects:write","tasks:read","tasks:write","tasks:assign","security:read","security:manage","reports:read","reports:create","reports:schedule","settings:read","settings:write","team:manage","mdm:read","mdm:write","mdm:actions","patch-notes:read","patch-notes:write"],ADMIN:["employees:read","employees:write","employees:invite","time-entries:read","time-entries:read-all","time-entries:write","attendance:read","attendance:read-all","attendance:write","leave:approve","activity:read","activity:read-all","projects:read","projects:write","tasks:read","tasks:write","tasks:assign","security:read","security:manage","reports:read","reports:create","reports:schedule","settings:read","settings:write","team:manage","mdm:read","mdm:write","mdm:actions","patch-notes:read","patch-notes:write"],MANAGER:["employees:read","time-entries:read","time-entries:read-all","time-entries:write","attendance:read","attendance:read-all","leave:approve","activity:read","activity:read-all","projects:read","projects:write","tasks:read","tasks:write","tasks:assign","security:read","reports:read","reports:create","settings:read","patch-notes:read"],EMPLOYEE:["time-entries:read","time-entries:write","attendance:read","activity:read","projects:read","tasks:read","tasks:write","reports:read","settings:read","patch-notes:read"]};e.s(["hasMinRole",0,function(e,r){return t[e]>=t[r]},"hasPermission",0,function(e,t){return r[e]?.includes(t)??!1}])},848782,e=>{"use strict";function t(e){return`
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
              ${e}
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
</html>`.trim()}e.s(["contactEmailTemplate",0,function(e){return t(`
    <h2 style="margin:0 0 16px;font-size:20px;font-weight:600;color:#fafafa;">New Contact Form Submission</h2>
    <table style="border-collapse:collapse;width:100%;">
      ${e.tableRows}
    </table>
    <hr style="border:none;border-top:1px solid #27272a;margin:24px 0;" />
    <p style="margin:0;font-size:12px;color:#52525b;">Submitted from the MyDex contact page</p>
  `)},"notificationEmailTemplate",0,function(e){let r=e.ctaUrl?`
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px auto;">
      <tr>
        <td style="border-radius:8px;background-color:#6d28d9;">
          <a href="${e.ctaUrl}" target="_blank" style="display:inline-block;padding:12px 32px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
            ${e.ctaText||"View in MyDex"}
          </a>
        </td>
      </tr>
    </table>`:"";return t(`
    <h2 style="margin:0 0 16px;font-size:20px;font-weight:600;color:#fafafa;">${e.title}</h2>
    <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#a1a1aa;">${e.message}</p>
    ${r}
  `)},"reportEmailTemplate",0,function(e){return t(`
    <h2 style="margin:0 0 16px;font-size:20px;font-weight:600;color:#fafafa;">${e.reportName}</h2>
    <p style="margin:0 0 8px;font-size:13px;color:#71717a;">Period: ${e.dateRange}</p>
    <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#a1a1aa;">${e.summaryFields}</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
      <tr>
        <td style="border-radius:8px;background-color:#6d28d9;">
          <a href="${e.appUrl}/reports" target="_blank" style="display:inline-block;padding:12px 32px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
            View Full Report
          </a>
        </td>
      </tr>
    </table>
    <hr style="border:none;border-top:1px solid #27272a;margin:24px 0;" />
    <p style="margin:0;font-size:12px;color:#52525b;">This is an automated report from MyDex.</p>
  `)}])},492749,e=>{"use strict";var t=e.i(246245),r=e.i(848782);let a=null;async function s(e){let r=process.env.RESEND_API_KEY?(a||(a=new t.Resend(process.env.RESEND_API_KEY)),a):null;if(!r)return console.log("[email] RESEND_API_KEY not set, skipping email:",e.subject),{success:!1,error:"Email service not configured"};try{return await r.emails.send({from:process.env.RESEND_FROM_EMAIL||"MyDex <noreply@mydexnow.com>",to:e.to,subject:e.subject,html:e.html,...e.replyTo?{replyTo:e.replyTo}:{}}),{success:!0}}catch(e){return console.error("[email] Failed to send:",e),{success:!1,error:String(e)}}}async function o(e){let t=(0,r.notificationEmailTemplate)({title:e.title,message:e.message,ctaText:e.ctaText,ctaUrl:e.ctaUrl});return s({to:e.to,subject:e.subject||e.title,html:t})}async function i(e){return o({to:e.to,subject:`Welcome to MyDex, ${e.name}!`,title:"Welcome to MyDex!",message:`Hi ${e.name},<br/><br/>You've been added to <strong>${e.organizationName}</strong> on MyDex. You can now sign in to access your dashboard, track your time, and view your team's activity.<br/><br/>If you have any questions, reach out to your administrator.`,ctaText:"Sign In to MyDex",ctaUrl:e.loginUrl})}async function n(e){let t={CRITICAL:"#EF4444",HIGH:"#F59E0B",MEDIUM:"#3B82F6",LOW:"#6B7280"}[e.severity]||"#6B7280";return o({to:e.to,subject:`[${e.severity}] Security Alert: ${e.alertType}`,title:`Security Alert — ${e.severity}`,message:`<div style="border-left:4px solid ${t};padding-left:12px;margin-bottom:16px;"><strong>${e.alertType}</strong><br/>${e.message}</div>`,ctaText:"View in Security Dashboard",ctaUrl:e.dashboardUrl})}async function l(e){let t="APPROVED"===e.status;return o({to:e.to,subject:`Leave Request ${t?"Approved":"Rejected"}: ${e.leaveType}`,title:`Leave Request ${t?"Approved":"Rejected"}`,message:`Hi ${e.employeeName},<br/><br/>Your <strong>${e.leaveType}</strong> request for <strong>${e.startDate} — ${e.endDate}</strong> has been <strong style="color:${t?"#22C55E":"#EF4444"};">${e.status.toLowerCase()}</strong> by ${e.reviewerName}.`,ctaText:"View in Dashboard",ctaUrl:e.dashboardUrl})}e.s(["sendLeaveStatusEmail",0,l,"sendNotificationEmail",0,o,"sendSecurityAlertEmail",0,n,"sendWelcomeEmail",0,i])},70729,e=>{e.v(e=>Promise.resolve().then(()=>e(666680)))}];

//# sourceMappingURL=%5Broot-of-the-server%5D__0w8zn9c._.js.map