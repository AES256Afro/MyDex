module.exports=[666680,(e,t,r)=>{t.exports=e.x("node:crypto",()=>require("node:crypto"))},193695,(e,t,r)=>{t.exports=e.x("next/dist/shared/lib/no-fallback-error.external.js",()=>require("next/dist/shared/lib/no-fallback-error.external.js"))},918622,(e,t,r)=>{t.exports=e.x("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js",()=>require("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js"))},556704,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-async-storage.external.js",()=>require("next/dist/server/app-render/work-async-storage.external.js"))},832319,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-unit-async-storage.external.js",()=>require("next/dist/server/app-render/work-unit-async-storage.external.js"))},324725,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/after-task-async-storage.external.js",()=>require("next/dist/server/app-render/after-task-async-storage.external.js"))},270406,(e,t,r)=>{t.exports=e.x("next/dist/compiled/@opentelemetry/api",()=>require("next/dist/compiled/@opentelemetry/api"))},848782,e=>{"use strict";function t(e){return`
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
  `)}])},141939,e=>{"use strict";var t=e.i(747909),r=e.i(174017),a=e.i(996250),n=e.i(759756),o=e.i(561916),s=e.i(174677),i=e.i(869741),l=e.i(316795),d=e.i(487718),p=e.i(995169),c=e.i(47587),u=e.i(666012),m=e.i(570101),x=e.i(626937),f=e.i(10372),g=e.i(193695);e.i(52474);var h=e.i(600220),y=e.i(89171),b=e.i(246245),R=e.i(469719),v=e.i(848782);function w(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;")}let E=R.z.object({email:R.z.string().email(),firstName:R.z.string().min(1),lastName:R.z.string().min(1),companyName:R.z.string().min(1),jobTitle:R.z.string().min(1),country:R.z.string().min(1),phone:R.z.string().min(1),companySize:R.z.string().optional(),message:R.z.string().optional(),turnstileToken:R.z.string().optional()});async function $(e){let t=process.env.TURNSTILE_SECRET_KEY;if(!t)return!0;let r=await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({secret:t,response:e})});return!0===(await r.json()).success}async function N(e){try{let t=await e.json(),r=E.safeParse(t);if(!r.success)return y.NextResponse.json({error:"Invalid input",details:r.error.flatten()},{status:400});let a=r.data;if(a.turnstileToken&&!await $(a.turnstileToken))return y.NextResponse.json({error:"Bot verification failed"},{status:403});if(process.env.RESEND_API_KEY){let e=new b.Resend(process.env.RESEND_API_KEY),t="padding:8px 0;border-bottom:1px solid #27272a;",r=`${t}font-weight:600;color:#a1a1aa;width:140px;font-size:13px;`,n=`${t}color:#fafafa;font-size:14px;`,o=`
        <tr><td style="${r}">Name</td><td style="${n}">${w(a.firstName)} ${w(a.lastName)}</td></tr>
        <tr><td style="${r}">Email</td><td style="${n}"><a href="mailto:${w(a.email)}" style="color:#6d28d9;text-decoration:none;">${w(a.email)}</a></td></tr>
        <tr><td style="${r}">Company</td><td style="${n}">${w(a.companyName)}</td></tr>
        <tr><td style="${r}">Job Title</td><td style="${n}">${w(a.jobTitle)}</td></tr>
        <tr><td style="${r}">Country</td><td style="${n}">${w(a.country)}</td></tr>
        <tr><td style="${r}">Phone</td><td style="${n}">${w(a.phone)}</td></tr>
        <tr><td style="${r}">Company Size</td><td style="${n}">${w(a.companySize||"Not specified")}</td></tr>
        ${a.message?`<tr><td style="${r}">Message</td><td style="${n}">${w(a.message)}</td></tr>`:""}
      `;await e.emails.send({from:process.env.RESEND_FROM_EMAIL||"MyDex <noreply@mydexnow.com>",to:["sales@mydexnow.com"],replyTo:a.email,subject:`New Contact Request from ${a.firstName} ${a.lastName} at ${a.companyName}`,html:(0,v.contactEmailTemplate)({tableRows:o})})}else console.log("📬 Contact form submission (RESEND_API_KEY not set):",a);return y.NextResponse.json({success:!0})}catch(e){return console.error("Contact form error:",e),y.NextResponse.json({error:"Failed to submit contact form"},{status:500})}}e.s(["POST",0,N],157115);var C=e.i(157115);let T=new t.AppRouteRouteModule({definition:{kind:r.RouteKind.APP_ROUTE,page:"/api/v1/contact/route",pathname:"/api/v1/contact",filename:"route",bundlePath:""},distDir:".next",relativeProjectDir:"",resolvedPagePath:"[project]/src/app/api/v1/contact/route.ts",nextConfigOutput:"standalone",userland:C}),{workAsyncStorage:S,workUnitAsyncStorage:A,serverHooks:k}=T;async function _(e,t,a){a.requestMeta&&(0,n.setRequestMeta)(e,a.requestMeta),T.isDev&&(0,n.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let y="/api/v1/contact/route";y=y.replace(/\/index$/,"")||"/";let b=await T.prepare(e,t,{srcPage:y,multiZoneDraftMode:!1});if(!b)return t.statusCode=400,t.end("Bad Request"),null==a.waitUntil||a.waitUntil.call(a,Promise.resolve()),null;let{buildId:R,params:v,nextConfig:w,parsedUrl:E,isDraftMode:$,prerenderManifest:N,routerServerContext:C,isOnDemandRevalidate:S,revalidateOnlyGenerated:A,resolvedPathname:k,clientReferenceManifest:_,serverActionsManifest:P}=b,z=(0,i.normalizeAppPath)(y),j=!!(N.dynamicRoutes[z]||N.routes[k]),q=async()=>((null==C?void 0:C.render404)?await C.render404(e,t,E,!1):t.end("This page could not be found"),null);if(j&&!$){let e=!!N.routes[k],t=N.dynamicRoutes[z];if(t&&!1===t.fallback&&!e){if(w.adapterPath)return await q();throw new g.NoFallbackError}}let O=null;!j||T.isDev||$||(O="/index"===(O=k)?"/":O);let D=!0===T.isDev||!j,M=j&&!D;P&&_&&(0,s.setManifestsSingleton)({page:y,clientReferenceManifest:_,serverActionsManifest:P});let I=e.method||"GET",U=(0,o.getTracer)(),H=U.getActiveScopeSpan(),F=!!(null==C?void 0:C.isWrappedByNextServer),K=!!(0,n.getRequestMeta)(e,"minimalMode"),B=(0,n.getRequestMeta)(e,"incrementalCache")||await T.getIncrementalCache(e,w,N,K);null==B||B.resetRequestCache(),globalThis.__incrementalCache=B;let L={params:v,previewProps:N.preview,renderOpts:{experimental:{authInterrupts:!!w.experimental.authInterrupts},cacheComponents:!!w.cacheComponents,supportsDynamicResponse:D,incrementalCache:B,cacheLifeProfiles:w.cacheLife,waitUntil:a.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,r,a,n)=>T.onRequestError(e,t,a,n,C)},sharedContext:{buildId:R}},Y=new l.NodeNextRequest(e),V=new l.NodeNextResponse(t),G=d.NextRequestAdapter.fromNodeNextRequest(Y,(0,d.signalFromNodeResponse)(t));try{let n,s=async e=>T.handle(G,L).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let r=U.getRootSpanAttributes();if(!r)return;if(r.get("next.span_type")!==p.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${r.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let a=r.get("next.route");if(a){let t=`${I} ${a}`;e.setAttributes({"next.route":a,"http.route":a,"next.span_name":t}),e.updateName(t),n&&n!==e&&(n.setAttribute("http.route",a),n.updateName(t))}else e.updateName(`${I} ${y}`)}),i=async n=>{var o,i;let l=async({previousCacheEntry:r})=>{try{if(!K&&S&&A&&!r)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let o=await s(n);e.fetchMetrics=L.renderOpts.fetchMetrics;let i=L.renderOpts.pendingWaitUntil;i&&a.waitUntil&&(a.waitUntil(i),i=void 0);let l=L.renderOpts.collectedTags;if(!j)return await (0,u.sendResponse)(Y,V,o,L.renderOpts.pendingWaitUntil),null;{let e=await o.blob(),t=(0,m.toNodeOutgoingHttpHeaders)(o.headers);l&&(t[f.NEXT_CACHE_TAGS_HEADER]=l),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let r=void 0!==L.renderOpts.collectedRevalidate&&!(L.renderOpts.collectedRevalidate>=f.INFINITE_CACHE)&&L.renderOpts.collectedRevalidate,a=void 0===L.renderOpts.collectedExpire||L.renderOpts.collectedExpire>=f.INFINITE_CACHE?void 0:L.renderOpts.collectedExpire;return{value:{kind:h.CachedRouteKind.APP_ROUTE,status:o.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:r,expire:a}}}}catch(t){throw(null==r?void 0:r.isStale)&&await T.onRequestError(e,t,{routerKind:"App Router",routePath:y,routeType:"route",revalidateReason:(0,c.getRevalidateReason)({isStaticGeneration:M,isOnDemandRevalidate:S})},!1,C),t}},d=await T.handleResponse({req:e,nextConfig:w,cacheKey:O,routeKind:r.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:N,isRoutePPREnabled:!1,isOnDemandRevalidate:S,revalidateOnlyGenerated:A,responseGenerator:l,waitUntil:a.waitUntil,isMinimalMode:K});if(!j)return null;if((null==d||null==(o=d.value)?void 0:o.kind)!==h.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==d||null==(i=d.value)?void 0:i.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});K||t.setHeader("x-nextjs-cache",S?"REVALIDATED":d.isMiss?"MISS":d.isStale?"STALE":"HIT"),$&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let p=(0,m.fromNodeOutgoingHttpHeaders)(d.value.headers);return K&&j||p.delete(f.NEXT_CACHE_TAGS_HEADER),!d.cacheControl||t.getHeader("Cache-Control")||p.get("Cache-Control")||p.set("Cache-Control",(0,x.getCacheControlHeader)(d.cacheControl)),await (0,u.sendResponse)(Y,V,new Response(d.value.body,{headers:p,status:d.value.status||200})),null};F&&H?await i(H):(n=U.getActiveScopeSpan(),await U.withPropagatedContext(e.headers,()=>U.trace(p.BaseServerSpan.handleRequest,{spanName:`${I} ${y}`,kind:o.SpanKind.SERVER,attributes:{"http.method":I,"http.target":e.url}},i),void 0,!F))}catch(t){if(t instanceof g.NoFallbackError||await T.onRequestError(e,t,{routerKind:"App Router",routePath:z,routeType:"route",revalidateReason:(0,c.getRevalidateReason)({isStaticGeneration:M,isOnDemandRevalidate:S})},!1,C),j)throw t;return await (0,u.sendResponse)(Y,V,new Response(null,{status:500})),null}}e.s(["handler",0,_,"patchFetch",0,function(){return(0,a.patchFetch)({workAsyncStorage:S,workUnitAsyncStorage:A})},"routeModule",0,T,"serverHooks",0,k,"workAsyncStorage",0,S,"workUnitAsyncStorage",0,A],141939)}];

//# sourceMappingURL=%5Broot-of-the-server%5D__0-i8z77._.js.map