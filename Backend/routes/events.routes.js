const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/events.controller');

router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getOne);
router.post('/', ctrl.create);
router.post('/draft', ctrl.saveDraft);
router.post('/:id/publish', ctrl.publishDraft);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
