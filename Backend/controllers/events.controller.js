const eventsModel = require('../models/events.model');
const settingsModel = require('../models/settings.model');
const notificationsModel = require('../models/notifications.model');
const { sendEmail } = require('../utils/mailer');
const { validateEventPayload, ValidationError } = require('../utils/validation');

/** Sends + logs the "genuine creation" email for a newly-active event. */
async function sendCreationEmail(event) {
  const settings = await settingsModel.getSettings();
  if (!settings) return;

  const subject = `New event: ${event.title}`;
  const content = `"${event.title}" is scheduled for ${event.event_date} at ${event.event_time}.\n\n${event.description}`;

  await sendEmail({ to: settings.email, subject, text: content });
  await notificationsModel.logEmail({
    related_item_type: 'event',
    related_item_id: event.id,
    email_subject: subject,
    email_content: content,
  });
}

async function create(req, res, next) {
  try {
    validateEventPayload(req.body, { asDraft: false });
    const event = await eventsModel.create({ ...req.body, status: 'active' });
    await sendCreationEmail(event);
    res.status(201).json(event);
  } catch (err) { next(err); }
}

async function saveDraft(req, res, next) {
  try {
    validateEventPayload(req.body, { asDraft: true });
    const event = await eventsModel.create({ ...req.body, status: 'draft' });
    res.status(201).json(event);
  } catch (err) { next(err); }
}

async function getAll(req, res, next) {
  try {
    const events = await eventsModel.getAllActive();
    res.json(events);
  } catch (err) { next(err); }
}

async function getOne(req, res, next) {
  try {
    const event = await eventsModel.getById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    res.json(event);
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const existing = await eventsModel.getById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Event not found' });

    if (existing.status === 'draft') {
      // Editing a draft keeps it a draft unless the client explicitly publishes it.
      validateEventPayload({ ...existing, ...req.body }, { asDraft: true });
      const event = await eventsModel.update(req.params.id, req.body);
      return res.json(event);
    }

    validateEventPayload({ ...existing, ...req.body }, { asDraft: false });
    const event = await eventsModel.update(req.params.id, req.body);
    res.json(event);
  } catch (err) { next(err); }
}

/** Promotes a draft event to active. Fires the creation email. */
async function publishDraft(req, res, next) {
  try {
    const existing = await eventsModel.getById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Event not found' });
    if (existing.status !== 'draft') {
      return res.status(400).json({ error: 'Only draft events can be published' });
    }

    const merged = { ...existing, ...req.body };
    validateEventPayload(merged, { asDraft: false });

    const event = await eventsModel.promoteToActive(req.params.id, req.body);
    await sendCreationEmail(event);
    res.json(event);
  } catch (err) { next(err); }
}

/**
 * Delete: soft-delete (status='trashed') per spec.
 * Confirmation is expected from the frontend, not enforced here.
 */
async function remove(req, res, next) {
  try {
    const event = await eventsModel.softDelete(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    res.json(event);
  } catch (err) { next(err); }
}

module.exports = { create, saveDraft, getAll, getOne, update, publishDraft, remove };
