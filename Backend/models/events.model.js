const pool = require('../config/db.config');

const EVENT_COLUMNS = ['title', 'description', 'event_category_id', 'event_date', 'event_time'];

async function create({ title, description, event_category_id, event_date, event_time, status = 'active' }) {
  const draft_created_at = status === 'draft' ? new Date() : null;
  const { rows } = await pool.query(
    `INSERT INTO events (title, description, event_category_id, event_date, event_time, status, draft_created_at)
     VALUES ($1, $2, $3, $4, COALESCE($5, '18:00'), $6, $7)
     RETURNING *`,
    [title ?? null, description ?? null, event_category_id ?? null, event_date ?? null, event_time ?? null, status, draft_created_at]
  );
  return rows[0];
}

async function getAllActive() {
  const { rows } = await pool.query(
    `SELECT e.*, c.title AS category_title, c.color_hex AS category_color
     FROM events e
     JOIN event_categories c ON c.id = e.event_category_id
     WHERE e.status = 'active'
     ORDER BY e.event_date ASC, e.event_time ASC`
  );
  return rows;
}

async function getById(id) {
  const { rows } = await pool.query('SELECT * FROM events WHERE id = $1', [id]);
  return rows[0] || null;
}

async function listByStatus(status) {
  const { rows } = await pool.query('SELECT * FROM events WHERE status = $1 ORDER BY updated_at DESC', [status]);
  return rows;
}

/** Partial update — only touches columns present in `fields`. */
async function update(id, fields) {
  const keys = Object.keys(fields).filter((k) => EVENT_COLUMNS.includes(k));
  if (keys.length === 0) return getById(id);

  const setClauses = keys.map((k, i) => `${k} = $${i + 2}`);
  const values = keys.map((k) => fields[k]);

  const { rows } = await pool.query(
    `UPDATE events SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *`,
    [id, ...values]
  );
  return rows[0] || null;
}

/** Promote a draft to active (fires "genuine creation" email upstream). */
async function promoteToActive(id, fields) {
  const keys = Object.keys(fields).filter((k) => EVENT_COLUMNS.includes(k));
  const setClauses = keys.map((k, i) => `${k} = $${i + 2}`);
  const values = keys.map((k) => fields[k]);

  const setSql = setClauses.length ? `${setClauses.join(', ')}, ` : '';
  const { rows } = await pool.query(
    `UPDATE events SET ${setSql} status = 'active', draft_created_at = NULL WHERE id = $1 RETURNING *`,
    [id, ...values]
  );
  return rows[0] || null;
}

async function softDelete(id) {
  const { rows } = await pool.query(
    `UPDATE events SET status = 'trashed', trashed_at = now() WHERE id = $1 RETURNING *`,
    [id]
  );
  return rows[0] || null;
}

async function restore(id) {
  const { rows } = await pool.query(
    `UPDATE events SET status = 'active', trashed_at = NULL WHERE id = $1 RETURNING *`,
    [id]
  );
  return rows[0] || null;
}

async function permanentlyDelete(id) {
  const { rows } = await pool.query('DELETE FROM events WHERE id = $1 RETURNING id', [id]);
  return rows[0] || null;
}

/** Drafts older than a given age, for the reminder job. */
async function getDraftsOlderThan(hours) {
  const { rows } = await pool.query(
    `SELECT id, draft_created_at FROM events
     WHERE status = 'draft' AND draft_created_at <= now() - ($1 || ' hours')::interval`,
    [hours]
  );
  return rows;
}

module.exports = {
  create, getAllActive, getById, listByStatus, update,
  promoteToActive, softDelete, restore, permanentlyDelete,
  getDraftsOlderThan,
};
