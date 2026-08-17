const dayjs = require('dayjs');
const tasksModel = require('../models/tasks.model');
const trashModel = require('../models/trash.model');
const { computeUrgencyAndScore } = require('../utils/matrixScore');

async function run() {
  const today = dayjs().format('YYYY-MM-DD');
  console.log(`[nightlyJob] starting for ${today}`);

  // 1. Log + reset completed daily tasks
  const completedDaily = await tasksModel.getCompletedDailyTasks();
  for (const task of completedDaily) {
    await tasksModel.logCompletion(task.id, today);
  }
  await tasksModel.resetAllDailyTasks();
  console.log(`[nightlyJob] reset ${completedDaily.length} completed daily tasks (logged to task_completion_log)`);

  // 2. Recompute urgency_band + matrix_score for every active normal task
  const normalTasks = await tasksModel.getAllActiveNormalWithDueDate();
  for (const task of normalTasks) {
    const { urgency_band, matrix_score } = computeUrgencyAndScore(task.due_date, task.difficulty, today);
    await tasksModel.writeUrgencyAndScore(task.id, urgency_band, matrix_score);
  }
  console.log(`[nightlyJob] recomputed urgency/score for ${normalTasks.length} normal tasks`);

  // 3. Expire drafts older than 72h -> trashed
  const expired = await trashModel.expireStaleDrafts();
  console.log(`[nightlyJob] expired stale drafts: ${JSON.stringify(expired)}`);

  // 4. Purge anything trashed for over 7 days
  const purged = await trashModel.purgeOldTrash();
  console.log(`[nightlyJob] purged old trash: ${JSON.stringify(purged)}`);

  console.log('[nightlyJob] done');
}

module.exports = { run };
