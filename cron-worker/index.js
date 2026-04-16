// MyDex Cron Worker — calls the app's cron endpoints on schedule
// CRON_SECRET must be set via: wrangler secret put CRON_SECRET

const SCHEDULE_MAP = {
  '0 8 * * *':     '/api/v1/reports/cron',
  '0 6 * * *':     '/api/v1/mdm/sync/cron',
  '0 7 * * *':     '/api/v1/activity/aggregate',
  '0 3 * * *':     '/api/v1/events/cleanup',
  '0 21 * * 1-5':  '/api/v1/attendance/auto-absent',
};

export default {
  async scheduled(event, env) {
    const path = SCHEDULE_MAP[event.cron];
    if (!path) return;

    try {
      const resp = await fetch(env.APP_URL + path, {
        method: 'GET',
        headers: { 'Authorization': 'Bearer ' + env.CRON_SECRET },
      });
      if (!resp.ok) {
        console.error(`Cron ${event.cron} → ${path} failed: ${resp.status}`);
      }
    } catch (e) {
      console.error(`Cron ${event.cron} → ${path} error: ${e.message}`);
    }
  },
};
