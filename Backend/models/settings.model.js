const pool = require('../config/db.config');

async function getSettings() {
  const { rows } = await pool.query('SELECT * FROM app_settings ORDER BY id LIMIT 1');
  return rows[0] || null;
}

async function updateSettings({ email }) {
  const existing = await getSettings();
  if (!existing) {
    const { rows } = await pool.query(
      'INSERT INTO app_settings (email) VALUES ($1) RETURNING *',
      [email]
    );
    return rows[0];
  }
  const { rows } = await pool.query(
    'UPDATE app_settings SET email = $1 WHERE id = $2 RETURNING *',
    [email, existing.id]
  );
  return rows[0];
}

module.exports = { getSettings, updateSettings };
