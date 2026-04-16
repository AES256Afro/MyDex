module.exports=[748033,e=>e.a(async(t,a)=>{try{var n=e.i(79832),i=e.i(698043),o=e.i(548886),r=e.i(89171),s=t([n,i]);async function l(){let e=await (0,n.auth)();if(!e)return r.NextResponse.json({error:"Unauthorized"},{status:401});if(!(0,o.hasPermission)(e.user.role,"patch-notes:write"))return r.NextResponse.json({error:"Forbidden"},{status:403});let t=e.user.organizationId,a=e.user.id,s=await i.prisma.patchNote.findMany({where:{organizationId:t},select:{version:!0}}),l=new Set(s.map(e=>e.version).filter(Boolean)),c=[{title:"MyDex Platform Launch",version:"v0.1.0",tags:["feature","infrastructure"],createdAt:new Date("2026-03-27T00:07:00-05:00"),content:`Initial release of the MyDex Digital Employee Experience platform.

**Core Platform**
- Multi-tenant SaaS with role-based access control (Super Admin, Admin, Manager, Employee)
- Authentication with credentials and OAuth support
- Dashboard shell with responsive sidebar navigation
- Registration flow with organization creation
- Employee directory and user management

**Time Tracking & Attendance**
- Clock in/out with real-time elapsed timer
- Timesheet views (daily/weekly)
- Attendance calendar and leave request management

**Activity Monitoring**
- App usage, website visits, and file activity tracking
- Hourly activity heatmaps
- Productivity scoring with configurable categories`},{title:"Endpoint Agent & Device Management",version:"v0.2.0",tags:["feature","agent","security"],createdAt:new Date("2026-03-27T05:00:00-05:00"),content:`Cross-platform endpoint agent and comprehensive device management.

**Endpoint Agent**
- Go-based agent for Windows and macOS
- JWT authentication with API key management
- Real-time device heartbeat and diagnostics
- Hardware inventory collection (CPU, RAM, GPU, disk, network)
- Security posture reporting: AV, firewall, Defender, pending updates, BSOD tracking

**Device Management**
- Host Groups for organizing devices with policy assignment
- Domain blocklists with public list import support
- Agent Setup & Deployment page with installation guides
- Software Inventory with version distribution charts
- CVE tracking with applicability assessment

**Security**
- MFA (TOTP) enrollment and login flow
- SSO provider management
- Rate limiting and security hardening
- DLP policy engine with templates (SSN, credit cards, API keys)`},{title:"IT Support, Compliance & Project Management",version:"v0.3.0",tags:["feature","compliance","ui"],createdAt:new Date("2026-03-27T14:00:00-05:00"),content:`Full IT support ticketing, SOC 2 compliance, and project management.

**IT Support**
- Two-way ticketing system with SLA tracking
- Self-service remediation portal (20+ scripts)
- Admin remediation console with live command execution
- Satisfaction ratings and IT staff performance metrics
- Device-targeted remediations with platform-aware scripts

**SOC 2 Compliance**
- Trust Service Criteria mapped to AICPA controls (CC6-CC9, A1, C1)
- Compliance health dashboard with scoring and trend charts
- Per-device compliance audit
- One-click remediation scripts for compliance gaps

**Project Management**
- Projects with Kanban board view
- Task management with subtasks, priorities, assignees
- Milestone progress tracking

**Fleet Health**
- Digital Friction scoring across the fleet
- Device health grid with per-device breakdown
- Extended agent telemetry collection`},{title:"Ticketing Improvements & Homepage Redesign",version:"v0.3.1",tags:["improvement","ui","bugfix"],createdAt:new Date("2026-03-28T10:00:00-05:00"),content:`Major ticketing system improvements and public-facing redesign.

**Ticket System**
- Open/Resolved/Closed section tabs with counts
- Ticket assignment to IT staff members
- Reporter and Support labels on messages
- Resolution flow: rate first, visible stars, required feedback
- Refresh console and resolve comment prompts
- User status controls and submitter/device info

**Homepage & Branding**
- Complete homepage redesign with feature showcase
- Custom branding per organization (logo, company name, alongside mode)
- Contact page with captcha protection
- Tiered licensing page with cost calculator

**Reports Overhaul**
- Enhanced report generation and scheduling
- Report history tracking

**MDM Integration Foundation**
- Schema for Microsoft Intune, Jamf Pro, and Kandji
- Auto-assignment framework for MDM-enrolled devices`},{title:"DEX Scores, Analytics Dashboards & Dark Theme",version:"v0.4.0",tags:["feature","ui","security","improvement"],createdAt:new Date("2026-03-28T20:27:00-05:00"),content:`DEX scoring, professional analytics dashboards, monitoring policies, and dark theme.

**DEX Scoring & Fleet Health**
- Per-device DEX scores (0-100) computed from 9+ health signals
- Org-wide DEX dashboard on the main admin dashboard
- Proactive health alerts for reboot pending, BSODs, offline agents
- Alert threshold configuration with auto-remediation toggles

**Analytics Dashboards**
- Security Operations Center with 24h event trends, severity donut, event log
- IT Financial Analytics with budget forecasting and ROI tracking
- Software License Optimization with utilization tracking
- Hardware Lifecycle management with replacement forecasts
- Sustainability / Green IT: carbon emissions, energy, e-waste tracking

**Monitoring Policies**
- Monitoring modes: Always, Clocked-In Only, User-Controlled
- Device ownership classification: Business, Contractor, BYOD
- Agent-gated clock-in (no running agent = no clock-in)
- Full monitoring change log for audit and reporting

**Dark Theme**
- Light / Dark / System theme toggle
- Slate gray dark palette (not pure black)
- Theme toggle in topbar and My Account settings

**Employee Drill-Down**
- Click any employee for detailed metrics view
- KPIs, device info, activity timeline, 14-day trend, tickets, compliance`},{title:"Branding, Patch Notes & Logo Upload",version:"v0.4.1",tags:["feature","ui","improvement"],createdAt:new Date("2026-03-28T22:00:00-05:00"),content:`Organization branding customization and platform changelog system.

**Branding**
- Upload company logo (PNG/JPEG/SVG/WebP/GIF, max 512KB)
- Upload sidebar banner image with option to keep default
- Fetch favicon from any website URL
- Company name and brand color customization
- Display mode: replace MyDex or show alongside
- Live sidebar preview on settings page

**Patch Notes**
- Full changelog system with CRUD API
- Timeline UI grouped by month with expand/collapse
- 9 color-coded tags (feature, bugfix, security, improvement, etc.)
- Authorship tracking with edit/delete for admins
- Seed endpoint for initial platform history`},{title:"Cost Optimization & Sustainability Dashboards",version:"v0.5.0",tags:["feature","infrastructure","compliance"],createdAt:new Date("2026-03-29T02:00:00-05:00"),content:`Real, functional IT cost tracking and sustainability dashboards with full CRUD.

**Cost Optimization**
- Software license management: add, edit, delete licenses with seat tracking
- Auto-calculated utilization rates, waste identification, and potential savings
- IT budget tracking: actual spend, planned budget, and forecasts by category
- Budget vs actual visualization with category breakdown
- License table with per-seat cost, utilization bars, and waste calculations

**Sustainability & Green IT**
- Monthly energy reading input with kWh, cost, and source tracking
- Auto-calculated carbon emissions using EPA emission factors
- Energy consumption and carbon trend charts
- Sustainability goal setting with progress tracking
- Support for energy reduction, carbon reduction, sleep compliance, and green score goals
- Year-over-year filtering and month-over-month trend analysis

**Insights Category**
- New sidebar category grouping Cost Optimization, Sustainability, and Patch Notes
- TrendingUp and Leaf icons for quick visual identification`},{title:"Timezone Fix & Activity Monitoring Improvements",version:"v0.5.1",tags:["bugfix","improvement"],createdAt:new Date("2026-03-29T04:00:00-05:00"),content:`Fixed timezone display and improved activity data collection.

**Timezone Fix**
- Time tracking clock in/out times now display in user's local timezone instead of UTC
- Fleet health device "last seen" timestamps converted to local time
- All server-rendered date/time values use client-side formatting component

**Activity Monitoring**
- Desktop agent now extracts domain info from browser window titles for WEBSITE_VISIT events
- Site Visit Timeline shows page titles when domain is unavailable
- Improved domain aggregation for agent-reported website visits
- Hourly Activity heatmap works with both app and website event data`}].filter(e=>!l.has(e.version));if(0===c.length)return r.NextResponse.json({message:"All patch notes already exist",count:s.length});try{for(let e of c)await i.prisma.patchNote.create({data:{organizationId:t,authorId:a,title:e.title,version:e.version,content:e.content,tags:e.tags,isPublished:!0,createdAt:e.createdAt}});return r.NextResponse.json({message:`Added ${c.length} new patch notes`,added:c.length,total:s.length+c.length},{status:201})}catch(e){return console.error("Error seeding patch notes:",e),r.NextResponse.json({error:"Failed to seed patch notes"},{status:500})}}[n,i]=s.then?(await s)():s,e.s(["POST",0,l]),a()}catch(e){a(e)}},!1),737830,e=>e.a(async(t,a)=>{try{var n=e.i(747909),i=e.i(174017),o=e.i(996250),r=e.i(759756),s=e.i(561916),l=e.i(174677),c=e.i(869741),d=e.i(316795),p=e.i(487718),u=e.i(995169),g=e.i(47587),m=e.i(666012),h=e.i(570101),v=e.i(626937),w=e.i(10372),f=e.i(193695);e.i(52474);var y=e.i(600220),b=e.i(748033),A=t([b]);[b]=A.then?(await A)():A;let C=new n.AppRouteRouteModule({definition:{kind:i.RouteKind.APP_ROUTE,page:"/api/v1/patch-notes/seed/route",pathname:"/api/v1/patch-notes/seed",filename:"route",bundlePath:""},distDir:".next",relativeProjectDir:"",resolvedPagePath:"[project]/src/app/api/v1/patch-notes/seed/route.ts",nextConfigOutput:"standalone",userland:b}),{workAsyncStorage:T,workUnitAsyncStorage:k,serverHooks:S}=C;async function R(e,t,a){a.requestMeta&&(0,r.setRequestMeta)(e,a.requestMeta),C.isDev&&(0,r.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let n="/api/v1/patch-notes/seed/route";n=n.replace(/\/index$/,"")||"/";let o=await C.prepare(e,t,{srcPage:n,multiZoneDraftMode:!1});if(!o)return t.statusCode=400,t.end("Bad Request"),null==a.waitUntil||a.waitUntil.call(a,Promise.resolve()),null;let{buildId:b,params:A,nextConfig:R,parsedUrl:T,isDraftMode:k,prerenderManifest:S,routerServerContext:E,isOnDemandRevalidate:D,revalidateOnlyGenerated:P,resolvedPathname:x,clientReferenceManifest:I,serverActionsManifest:O}=o,M=(0,c.normalizeAppPath)(n),N=!!(S.dynamicRoutes[M]||S.routes[x]),U=async()=>((null==E?void 0:E.render404)?await E.render404(e,t,T,!1):t.end("This page could not be found"),null);if(N&&!k){let e=!!S.routes[x],t=S.dynamicRoutes[M];if(t&&!1===t.fallback&&!e){if(R.adapterPath)return await U();throw new f.NoFallbackError}}let H=null;!N||C.isDev||k||(H=x,H="/index"===H?"/":H);let F=!0===C.isDev||!N,z=N&&!F;O&&I&&(0,l.setManifestsSingleton)({page:n,clientReferenceManifest:I,serverActionsManifest:O});let _=e.method||"GET",q=(0,s.getTracer)(),j=q.getActiveScopeSpan(),B=!!(null==E?void 0:E.isWrappedByNextServer),L=!!(0,r.getRequestMeta)(e,"minimalMode"),G=(0,r.getRequestMeta)(e,"incrementalCache")||await C.getIncrementalCache(e,R,S,L);null==G||G.resetRequestCache(),globalThis.__incrementalCache=G;let K={params:A,previewProps:S.preview,renderOpts:{experimental:{authInterrupts:!!R.experimental.authInterrupts},cacheComponents:!!R.cacheComponents,supportsDynamicResponse:F,incrementalCache:G,cacheLifeProfiles:R.cacheLife,waitUntil:a.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,a,n,i)=>C.onRequestError(e,t,n,i,E)},sharedContext:{buildId:b}},$=new d.NodeNextRequest(e),V=new d.NodeNextResponse(t),W=p.NextRequestAdapter.fromNodeNextRequest($,(0,p.signalFromNodeResponse)(t));try{let o,r=async e=>C.handle(W,K).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let a=q.getRootSpanAttributes();if(!a)return;if(a.get("next.span_type")!==u.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${a.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let i=a.get("next.route");if(i){let t=`${_} ${i}`;e.setAttributes({"next.route":i,"http.route":i,"next.span_name":t}),e.updateName(t),o&&o!==e&&(o.setAttribute("http.route",i),o.updateName(t))}else e.updateName(`${_} ${n}`)}),l=async o=>{var s,l;let c=async({previousCacheEntry:i})=>{try{if(!L&&D&&P&&!i)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let n=await r(o);e.fetchMetrics=K.renderOpts.fetchMetrics;let s=K.renderOpts.pendingWaitUntil;s&&a.waitUntil&&(a.waitUntil(s),s=void 0);let l=K.renderOpts.collectedTags;if(!N)return await (0,m.sendResponse)($,V,n,K.renderOpts.pendingWaitUntil),null;{let e=await n.blob(),t=(0,h.toNodeOutgoingHttpHeaders)(n.headers);l&&(t[w.NEXT_CACHE_TAGS_HEADER]=l),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let a=void 0!==K.renderOpts.collectedRevalidate&&!(K.renderOpts.collectedRevalidate>=w.INFINITE_CACHE)&&K.renderOpts.collectedRevalidate,i=void 0===K.renderOpts.collectedExpire||K.renderOpts.collectedExpire>=w.INFINITE_CACHE?void 0:K.renderOpts.collectedExpire;return{value:{kind:y.CachedRouteKind.APP_ROUTE,status:n.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:a,expire:i}}}}catch(t){throw(null==i?void 0:i.isStale)&&await C.onRequestError(e,t,{routerKind:"App Router",routePath:n,routeType:"route",revalidateReason:(0,g.getRevalidateReason)({isStaticGeneration:z,isOnDemandRevalidate:D})},!1,E),t}},d=await C.handleResponse({req:e,nextConfig:R,cacheKey:H,routeKind:i.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:S,isRoutePPREnabled:!1,isOnDemandRevalidate:D,revalidateOnlyGenerated:P,responseGenerator:c,waitUntil:a.waitUntil,isMinimalMode:L});if(!N)return null;if((null==d||null==(s=d.value)?void 0:s.kind)!==y.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==d||null==(l=d.value)?void 0:l.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});L||t.setHeader("x-nextjs-cache",D?"REVALIDATED":d.isMiss?"MISS":d.isStale?"STALE":"HIT"),k&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let p=(0,h.fromNodeOutgoingHttpHeaders)(d.value.headers);return L&&N||p.delete(w.NEXT_CACHE_TAGS_HEADER),!d.cacheControl||t.getHeader("Cache-Control")||p.get("Cache-Control")||p.set("Cache-Control",(0,v.getCacheControlHeader)(d.cacheControl)),await (0,m.sendResponse)($,V,new Response(d.value.body,{headers:p,status:d.value.status||200})),null};B&&j?await l(j):(o=q.getActiveScopeSpan(),await q.withPropagatedContext(e.headers,()=>q.trace(u.BaseServerSpan.handleRequest,{spanName:`${_} ${n}`,kind:s.SpanKind.SERVER,attributes:{"http.method":_,"http.target":e.url}},l),void 0,!B))}catch(t){if(t instanceof f.NoFallbackError||await C.onRequestError(e,t,{routerKind:"App Router",routePath:M,routeType:"route",revalidateReason:(0,g.getRevalidateReason)({isStaticGeneration:z,isOnDemandRevalidate:D})},!1,E),N)throw t;return await (0,m.sendResponse)($,V,new Response(null,{status:500})),null}}e.s(["handler",0,R,"patchFetch",0,function(){return(0,o.patchFetch)({workAsyncStorage:T,workUnitAsyncStorage:k})},"routeModule",0,C,"serverHooks",0,S,"workAsyncStorage",0,T,"workUnitAsyncStorage",0,k]),a()}catch(e){a(e)}},!1)];

//# sourceMappingURL=_0frvm1z._.js.map