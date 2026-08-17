const cron = require('node-cron');
const nightlyJob = require('./nightlyJob');
const dueSoonJob = require('./dueSoonJob');
const draftReminderJob = require('./draftReminderJob');

const TZ = process.env.TZ_NAME || 'Asia/Singapore';

function wrap(name, fn) {
  return async () => {
    try {
      await fn();
    } catch (err) {
      console.error(`[jobs] ${name} failed:`, err);
    }
  };
}

function startJobs() {
  // Nightly at 00:00 SGT
  cron.schedule('0 0 * * *', wrap('nightlyJob', nightlyJob.run), { timezone: TZ });

  // Daily at 09:00 SGT
  cron.schedule('0 9 * * *', wrap('dueSoonJob', dueSoonJob.run), { timezone: TZ });

  // Hourly, on the hour
  cron.schedule('0 * * * *', wrap('draftReminderJob', draftReminderJob.run), { timezone: TZ });

  console.log(`[jobs] scheduled: nightly@00:00, due-soon@09:00, draft-reminders hourly (tz=${TZ})`);
}

module.exports = { startJobs };
