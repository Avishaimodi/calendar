const express = require('express');
const router = express.Router();

router.use('/events', require('./events.routes'));
router.use('/tasks', require('./tasks.routes'));
router.use('/trash', require('./trash.routes'));
router.use('/', require('./categories.routes')); // /event-categories, /task-categories
router.use('/settings', require('./settings.routes'));
router.use('/notifications', require('./notifications.routes'));

module.exports = router;
