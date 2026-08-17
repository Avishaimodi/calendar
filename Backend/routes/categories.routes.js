const express = require('express');
const router = express.Router();
const { eventCategories, taskCategories } = require('../controllers/categories.controller');

const eventRouter = express.Router();
eventRouter.get('/', eventCategories.getAll);
eventRouter.post('/', eventCategories.create);
eventRouter.delete('/:id', eventCategories.remove);

const taskRouter = express.Router();
taskRouter.get('/', taskCategories.getAll);
taskRouter.post('/', taskCategories.create);
taskRouter.delete('/:id', taskCategories.remove);

router.use('/event-categories', eventRouter);
router.use('/task-categories', taskRouter);

module.exports = router;
