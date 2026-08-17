const notificationsModel = require('../models/notifications.model');

/** GET /notifications/due-soon — lets the frontend poll for today's due-soon notices. */
async function dueSoon(req, res, next) {
  try {
    const items = await notificationsModel.getTodaysDueSoonNotifications();
    res.json(items);
  } catch (err) { next(err); }
}

module.exports = { dueSoon };
