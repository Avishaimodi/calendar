const eventsModel = require('../models/events.model');
const tasksModel = require('../models/tasks.model');
const notificationsModel = require('../models/notifications.model');

// A draft expires 72h after creation. Fire a reminder once remaining time
// drops to/below each threshold: reminder_type '24h' fires once elapsed >= 48h
// (i.e. 24h remaining), '8h' once elapsed >= 64h, '1h' once elapsed >= 71h.
const THRESHOLDS = [
  { reminderType: '24h', elapsedHours: 48 },
  { reminderType: '8h', elapsedHours: 64 },
  { reminderType: '1h', elapsedHours: 71 },
];

async function processItemType(itemType, model) {
  let fired = 0;

  for (const { reminderType, elapsedHours } of THRESHOLDS) {
    const drafts = await model.getDraftsOlderThan(elapsedHours);
    for (const draft of drafts) {
      const result = await notificationsModel.logDraftReminder(itemType, draft.id, reminderType);
      if (result) {
        fired += 1;
        console.log(`[draftReminderJob] fired ${reminderType} reminder for ${itemType} #${draft.id}`);
      }
      // null result means this exact (item_type, item_id, reminder_type) was already logged — skip silently.
    }
  }

  return fired;
}

async function run() {
  const eventsFired = await processItemType('event', eventsModel);
  const tasksFired = await processItemType('task', tasksModel);
  console.log(`[draftReminderJob] done — fired ${eventsFired} event reminders, ${tasksFired} task reminders`);
}

module.exports = { run };
