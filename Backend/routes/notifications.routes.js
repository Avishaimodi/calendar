const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/notifications.controller');

router.get('/due-soon', ctrl.dueSoon);

module.exports = router;
