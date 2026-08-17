const trashModel = require('../models/trash.model');
const eventsModel = require('../models/events.model');
const tasksModel = require('../models/tasks.model');

async function list(req, res, next) {
  try {
    const items = await trashModel.listTrashed();
    res.json(items);
  } catch (err) { next(err); }
}

function modelFor(itemType) {
  if (itemType === 'event') return eventsModel;
  if (itemType === 'task') return tasksModel;
  return null;
}

async function restore(req, res, next) {
  try {
    const { itemType, id } = req.params;
    const model = modelFor(itemType);
    if (!model) return res.status(400).json({ error: 'itemType must be "event" or "task"' });

    const item = await model.restore(id);
    if (!item) return res.status(404).json({ error: `${itemType} not found` });
    res.json(item);
  } catch (err) { next(err); }
}

async function permanentlyDelete(req, res, next) {
  try {
    const { itemType, id } = req.params;
    const model = modelFor(itemType);
    if (!model) return res.status(400).json({ error: 'itemType must be "event" or "task"' });

    const deleted = await model.permanentlyDelete(id);
    if (!deleted) return res.status(404).json({ error: `${itemType} not found` });
    res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = { list, restore, permanentlyDelete };
