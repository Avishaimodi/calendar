const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/trash.controller');

router.get('/', ctrl.list);
router.post('/:itemType/:id/restore', ctrl.restore);
router.delete('/:itemType/:id', ctrl.permanentlyDelete);

module.exports = router;
