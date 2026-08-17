const pool = require('../config/db.config');

/** Lists everything currently in status='trashed', across both tables. */
async function listTrashed() {
  const { rows: events } = await pool.query(
    `SELECT id, 'event' AS item_type, title, description, trashed_at, updated_at
     FROM events WHERE status = 'trashed' ORDER BY trashed_at DESC NULLS LAST`
  );
  const { rows: tasks } = await pool.query(
    `SELECT id, 'task' AS item_type, title, description, trashed_at, updated_at
     FROM tasks WHERE status = 'trashed' ORDER BY trashed_at DESC NULLS LAST`
  );
  return [...events, ...tasks].sort((a, b) => new Date(b.trashed_at || b.updated_at) - new Date(a.trashed_at || a.updated_at));
}

/** Nightly cleanup: expire stale drafts (>72h old) into trash, across both tables. */
async function expireStaleDrafts() {
  const { rowCount: eventCount } = await pool.query(
    `UPDATE events SET status = 'trashed', trashed_at = now()
     WHERE status = 'draft' AND draft_created_at < now() - interval '72 hours'`
  );
  const { rowCount: taskCount } = await pool.query(
    `UPDATE tasks SET status = 'trashed', trashed_at = now()
     WHERE status = 'draft' AND draft_created_at < now() - interval '72 hours'`
  );
  return { events: eventCount, tasks: taskCount };
}

/** Nightly cleanup: permanently delete anything trashed for over 7 days. */
async function purgeOldTrash() {
  const { rowCount: eventCount } = await pool.query(
    `DELETE FROM events WHERE status = 'trashed' AND trashed_at < now() - interval '7 days'`
  );
  const { rowCount: taskCount } = await pool.query(
    `DELETE FROM tasks WHERE status = 'trashed' AND trashed_at < now() - interval '7 days'`
  );
  return { events: eventCount, tasks: taskCount };
}

module.exports = { listTrashed, expireStaleDrafts, purgeOldTrash };
