const tasksModel = require('../models/tasks.model');
const notificationsModel = require('../models/notifications.model');

/**
 * For every active normal task with urgency_band='urgent_3_days' that hasn't
 * already been logged today, log a due-soon notification. The frontend picks
 * these up by polling GET /notifications/due-soon.
 */
async function run() {
  const urgentTasks = await tasksModel.getUrgentUnnotifiedTasks();
  let logged = 0;

  for (const task of urgentTasks) {
    const result = await notificationsModel.logDueSoonNotification(task.id);
    if (result) logged += 1; // null means it was already logged today (race-safe via ON CONFLICT)
  }

  console.log(`[dueSoonJob] found ${urgentTasks.length} urgent tasks, logged ${logged} new notifications`);
}

module.exports = { run };
