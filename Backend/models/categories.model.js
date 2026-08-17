const pool = require('../config/db.config');

/**
 * Builds a set of model functions for a categories table.
 * @param {'event_categories'|'task_categories'} tableName
 * @param {'events'|'tasks'} itemsTable - the table that references this category
 * @param {'event_category_id'|'task_category_id'} fkColumn
 */
function makeCategoryModel(tableName, itemsTable, fkColumn) {
  async function getAll() {
    const { rows } = await pool.query(`SELECT * FROM ${tableName} ORDER BY is_default DESC, title ASC`);
    return rows;
  }

  async function getById(id) {
    const { rows } = await pool.query(`SELECT * FROM ${tableName} WHERE id = $1`, [id]);
    return rows[0] || null;
  }

  async function getDefault() {
    const { rows } = await pool.query(`SELECT * FROM ${tableName} WHERE is_default = true LIMIT 1`);
    return rows[0] || null;
  }

  async function create({ title, color_hex }) {
    const { rows } = await pool.query(
      `INSERT INTO ${tableName} (title, color_hex, is_default) VALUES ($1, $2, false) RETURNING *`,
      [title, color_hex]
    );
    return rows[0];
  }

  /**
   * Deletes a category, reassigning every item that used it to the
   * default "Uncategorized" category first (the FK is ON DELETE RESTRICT).
   * Refuses to delete the default category itself.
   */
  async function remove(id) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { rows: catRows } = await client.query(`SELECT * FROM ${tableName} WHERE id = $1 FOR UPDATE`, [id]);
      const category = catRows[0];
      if (!category) {
        await client.query('ROLLBACK');
        return { notFound: true };
      }
      if (category.is_default) {
        await client.query('ROLLBACK');
        return { forbidden: true };
      }

      const { rows: defaultRows } = await client.query(`SELECT id FROM ${tableName} WHERE is_default = true LIMIT 1`);
      const defaultCategory = defaultRows[0];
      if (!defaultCategory) {
        throw new Error(`No default category found in ${tableName} — cannot reassign items before delete`);
      }

      await client.query(
        `UPDATE ${itemsTable} SET ${fkColumn} = $1 WHERE ${fkColumn} = $2`,
        [defaultCategory.id, id]
      );

      await client.query(`DELETE FROM ${tableName} WHERE id = $1`, [id]);

      await client.query('COMMIT');
      return { deleted: true };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  return { getAll, getById, getDefault, create, remove };
}

const eventCategories = makeCategoryModel('event_categories', 'events', 'event_category_id');
const taskCategories = makeCategoryModel('task_categories', 'tasks', 'task_category_id');

module.exports = { eventCategories, taskCategories };
