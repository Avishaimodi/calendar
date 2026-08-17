const pool = require('../config/db.config');

const TASK_COLUMNS = [
  'title', 'description', 'task_category_id', 'task_type',
  'due_date', 'due_time', 'difficulty', 'urgency_band', 'matrix_score',
];

async function create({
  title, description, task_category_id, task_type,
  due_date = null, due_time = null, difficulty = null,
  urgency_band = null, matrix_score = null, status = 'active',
}) {
  const draft_created_at = status === 'draft' ? new Date() : null;
  const { rows } = await pool.query(
    `INSERT INTO tasks (
        title, description, task_category_id, task_type,
        due_date, due_time, difficulty, urgency_band, matrix_score,
        status, draft_created_at
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING *`,
    [
      title ?? null, description ?? null, task_category_id ?? null, task_type,
      due_date, due_time, difficulty, urgency_band, matrix_score,
      status, draft_created_at,
    ]
  );
  return rows[0];
}

async function getAllActiveSplit() {
  const { rows: daily } = await pool.query(
    `SELECT t.*, c.title AS category_title, c.color_hex AS category_color
     FROM tasks t JOIN task_categories c ON c.id = t.task_category_id
     WHERE t.status = 'active' AND t.task_type = 'daily'
     ORDER BY t.created_at ASC`
  );
  const { rows: normal } = await pool.query(
    `SELECT t.*, c.title AS category_title, c.color_hex AS category_color
     FROM tasks t JOIN task_categories c ON c.id = t.task_category_id
     WHERE t.status = 'active' AND t.task_type = 'normal'
     ORDER BY t.matrix_score DESC NULLS LAST, t.due_date ASC`
  );
  return { daily, normal };
}

async function getById(id) {
  const { rows } = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);
  return rows[0] || null;
}

async function listByStatus(status) {
  const { rows } = await pool.query('SELECT * FROM tasks WHERE status = $1 ORDER BY updated_at DESC', [status]);
  return rows;
}

async function update(id, fields) {
  const keys = Object.keys(fields).filter((k) => TASK_COLUMNS.includes(k));
  if (keys.length === 0) return getById(id);

  const setClauses = keys.map((k, i) => `${k} = $${i + 2}`);
  const values = keys.map((k) => fields[k]);

  const { rows } = await pool.query(
    `UPDATE tasks SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *`,
    [id, ...values]
  );
  return rows[0] || null;
}

async function promoteToActive(id, fields) {
  const keys = Object.keys(fields).filter((k) => TASK_COLUMNS.includes(k));
  const setClauses = keys.map((k, i) => `${k} = $${i + 2}`);
  const values = keys.map((k) => fields[k]);

  const setSql = setClauses.length ? `${setClauses.join(', ')}, ` : '';
  const { rows } = await pool.query(
    `UPDATE tasks SET ${setSql} status = 'active', draft_created_at = NULL WHERE id = $1 RETURNING *`,
    [id, ...values]
  );
  return rows[0] || null;
}

async function setCompleted(id, isCompleted) {
  const { rows } = await pool.query(
    'UPDATE tasks SET is_completed = $2 WHERE id = $1 RETURNING *',
    [id, isCompleted]
  );
  return rows[0] || null;
}

/** Daily task delete = hard delete (per spec, no trash for daily tasks). */
async function hardDeleteDaily(id) {
  const { rows } = await pool.query(
    `DELETE FROM tasks WHERE id = $1 AND task_type = 'daily' RETURNING id`,
    [id]
  );
  return rows[0] || null;
}

/** Normal task delete = soft delete (status -> trashed). */
async function softDelete(id) {
  const { rows } = await pool.query(
    `UPDATE tasks SET status = 'trashed', trashed_at = now() WHERE id = $1 RETURNING *`,
    [id]
  );
  return rows[0] || null;
}

async function restore(id) {
  const { rows } = await pool.query(
    `UPDATE tasks SET status = 'active', trashed_at = NULL WHERE id = $1 RETURNING *`,
    [id]
  );
  return rows[0] || null;
}

async function permanentlyDelete(id) {
  const { rows } = await pool.query('DELETE FROM tasks WHERE id = $1 RETURNING id', [id]);
  return rows[0] || null;
}

/** Used by the nightly job to recompute urgency/score for every active normal task. */
async function getAllActiveNormalWithDueDate() {
  const { rows } = await pool.query(
    `SELECT id, due_date, difficulty FROM tasks
     WHERE status = 'active' AND task_type = 'normal' AND due_date IS NOT NULL AND difficulty IS NOT NULL`
  );
  return rows;
}

async function writeUrgencyAndScore(id, urgency_band, matrix_score) {
  await pool.query(
    'UPDATE tasks SET urgency_band = $2, matrix_score = $3 WHERE id = $1',
    [id, urgency_band, matrix_score]
  );
}

/** Used by the nightly job to reset daily tasks, logging any that were completed today. */
async function getCompletedDailyTasks() {
  const { rows } = await pool.query(
    `SELECT id FROM tasks WHERE task_type = 'daily' AND status = 'active' AND is_completed = true`
  );
  return rows;
}

async function resetAllDailyTasks() {
  await pool.query(
    `UPDATE tasks SET is_completed = false WHERE task_type = 'daily' AND status = 'active'`
  );
}

/** Used by the 09:00 job to find urgent, not-yet-notified-today normal tasks. */
async function getUrgentUnnotifiedTasks() {
  const { rows } = await pool.query(
    `SELECT t.* FROM tasks t
     WHERE t.status = 'active' AND t.task_type = 'normal' AND t.urgency_band = 'urgent_3_days'
       AND NOT EXISTS (
         SELECT 1 FROM due_soon_notifications n
         WHERE n.task_id = t.id AND n.notified_on = CURRENT_DATE
       )`
  );
  return rows;
}

async function logCompletion(taskId, completedOn) {
  await pool.query(
    'INSERT INTO task_completion_log (task_id, completed_on) VALUES ($1, $2)',
    [taskId, completedOn]
  );
}

/** Drafts (any type) older than a given age, for the reminder job. */
async function getDraftsOlderThan(hours) {
  const { rows } = await pool.query(
    `SELECT id, draft_created_at FROM tasks
     WHERE status = 'draft' AND draft_created_at <= now() - ($1 || ' hours')::interval`,
    [hours]
  );
  return rows;
}

module.exports = {
  create, getAllActiveSplit, getById, listByStatus, update, promoteToActive,
  setCompleted, hardDeleteDaily, softDelete, restore, permanentlyDelete,
  getAllActiveNormalWithDueDate, writeUrgencyAndScore,
  getCompletedDailyTasks, resetAllDailyTasks, getUrgentUnnotifiedTasks,
  logCompletion, getDraftsOlderThan,
};
