const pool = require('../config/db.config');

// ---------------- emails ----------------
async function logEmail({ related_item_type, related_item_id, email_subject, email_content }) {
  const { rows } = await pool.query(
    `INSERT INTO emails (related_item_type, related_item_id, email_subject, email_content)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [related_item_type, related_item_id, email_subject, email_content]
  );
  return rows[0];
}

// ---------------- due_soon_notifications ----------------
async function getTodaysDueSoonNotifications() {
  const { rows } = await pool.query(
    `SELECT n.*, t.title, t.due_date, t.due_time
     FROM due_soon_notifications n
     JOIN tasks t ON t.id = n.task_id
     WHERE n.notified_on = CURRENT_DATE
     ORDER BY n.sent_at DESC`
  );
  return rows;
}

/** Insert-or-skip, respecting the unique (task_id, notified_on) constraint. */
async function logDueSoonNotification(taskId) {
  const { rows } = await pool.query(
    `INSERT INTO due_soon_notifications (task_id, notified_on)
     VALUES ($1, CURRENT_DATE)
     ON CONFLICT (task_id, notified_on) DO NOTHING
     RETURNING *`,
    [taskId]
  );
  return rows[0] || null; // null means it was already logged today
}

// ---------------- draft_reminders ----------------
/** Insert-or-skip, respecting the unique (item_type, item_id, reminder_type) constraint. */
async function logDraftReminder(itemType, itemId, reminderType) {
  const { rows } = await pool.query(
    `INSERT INTO draft_reminders (item_type, item_id, reminder_type)
     VALUES ($1, $2, $3)
     ON CONFLICT (item_type, item_id, reminder_type) DO NOTHING
     RETURNING *`,
    [itemType, itemId, reminderType]
  );
  return rows[0] || null;
}

async function hasDraftReminder(itemType, itemId, reminderType) {
  const { rows } = await pool.query(
    `SELECT 1 FROM draft_reminders WHERE item_type = $1 AND item_id = $2 AND reminder_type = $3`,
    [itemType, itemId, reminderType]
  );
  return rows.length > 0;
}

module.exports = {
  logEmail,
  getTodaysDueSoonNotifications, logDueSoonNotification,
  logDraftReminder, hasDraftReminder,
};
