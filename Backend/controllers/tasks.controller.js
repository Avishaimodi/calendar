const tasksModel = require('../models/tasks.model');
const settingsModel = require('../models/settings.model');
const notificationsModel = require('../models/notifications.model');
const { sendEmail } = require('../utils/mailer');
const { validateTaskPayload } = require('../utils/validation');
const { computeUrgencyAndScore } = require('../utils/matrixScore');

/** Only normal tasks get urgency/score; daily tasks always carry null for both. */
function withComputedFields(body) {
  if (body.task_type === 'normal' && body.due_date && body.difficulty) {
    const { urgency_band, matrix_score } = computeUrgencyAndScore(body.due_date, body.difficulty);
    return { ...body, urgency_band, matrix_score };
  }
  return { ...body, urgency_band: null, matrix_score: null };
}

/** Sends + logs the "genuine creation" email — normal tasks only, never daily. */
async function sendCreationEmail(task) {
  if (task.task_type !== 'normal') return;
  const settings = await settingsModel.getSettings();
  if (!settings) return;

  const subject = `New task: ${task.title}`;
  const content = `"${task.title}" is due ${task.due_date} at ${task.due_time} (${task.difficulty}).\n\n${task.description}`;

  await sendEmail({ to: settings.email, subject, text: content });
  await notificationsModel.logEmail({
    related_item_type: 'task',
    related_item_id: task.id,
    email_subject: subject,
    email_content: content,
  });
}

async function create(req, res, next) {
  try {
    validateTaskPayload(req.body, { asDraft: false });
    const payload = withComputedFields(req.body);
    const task = await tasksModel.create({ ...payload, status: 'active' });
    await sendCreationEmail(task);
    res.status(201).json(task);
  } catch (err) { next(err); }
}

async function saveDraft(req, res, next) {
  try {
    validateTaskPayload(req.body, { asDraft: true });
    const payload = withComputedFields(req.body);
    const task = await tasksModel.create({ ...payload, status: 'draft' });
    res.status(201).json(task);
  } catch (err) { next(err); }
}

async function getAll(req, res, next) {
  try {
    const { daily, normal } = await tasksModel.getAllActiveSplit();
    res.json({ daily, normal });
  } catch (err) { next(err); }
}

async function getOne(req, res, next) {
  try {
    const task = await tasksModel.getById(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json(task);
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const existing = await tasksModel.getById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Task not found' });

    const merged = { ...existing, ...req.body };

    if (existing.status === 'draft') {
      validateTaskPayload(merged, { asDraft: true });
      const payload = withComputedFields(merged);
      const task = await tasksModel.update(req.params.id, payload);
      return res.json(task);
    }

    validateTaskPayload(merged, { asDraft: false });
    const payload = withComputedFields(merged);
    const task = await tasksModel.update(req.params.id, payload);
    res.json(task);
  } catch (err) { next(err); }
}

/** Promotes a draft task to active. Fires the creation email (normal tasks only). */
async function publishDraft(req, res, next) {
  try {
    const existing = await tasksModel.getById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Task not found' });
    if (existing.status !== 'draft') {
      return res.status(400).json({ error: 'Only draft tasks can be published' });
    }

    const merged = { ...existing, ...req.body };
    validateTaskPayload(merged, { asDraft: false });
    const payload = withComputedFields(merged);

    const task = await tasksModel.promoteToActive(req.params.id, payload);
    await sendCreationEmail(task);
    res.json(task);
  } catch (err) { next(err); }
}

async function setCompleted(req, res, next) {
  try {
    const { is_completed } = req.body;
    if (typeof is_completed !== 'boolean') {
      return res.status(400).json({ error: 'is_completed (boolean) is required' });
    }
    const task = await tasksModel.setCompleted(req.params.id, is_completed);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json(task);
  } catch (err) { next(err); }
}

/**
 * Delete: daily tasks are hard-deleted; normal tasks are soft-deleted (trashed).
 * Confirmation is expected from the frontend, not enforced here.
 */
async function remove(req, res, next) {
  try {
    const existing = await tasksModel.getById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Task not found' });

    if (existing.task_type === 'daily') {
      await tasksModel.hardDeleteDaily(req.params.id);
      return res.status(204).send();
    }

    const task = await tasksModel.softDelete(req.params.id);
    res.json(task);
  } catch (err) { next(err); }
}

module.exports = { create, saveDraft, getAll, getOne, update, publishDraft, setCompleted, remove };
