const { eventCategories, taskCategories } = require('../models/categories.model');

function makeCategoryController(model) {
  async function getAll(req, res, next) {
    try {
      res.json(await model.getAll());
    } catch (err) { next(err); }
  }

  async function create(req, res, next) {
    try {
      const { title, color_hex } = req.body;
      if (!title || !title.trim()) return res.status(400).json({ error: 'title is required' });
      if (!color_hex || !color_hex.trim()) return res.status(400).json({ error: 'color_hex is required' });

      const category = await model.create({ title: title.trim(), color_hex: color_hex.trim() });
      res.status(201).json(category);
    } catch (err) { next(err); }
  }

  async function remove(req, res, next) {
    try {
      const result = await model.remove(req.params.id);
      if (result.notFound) return res.status(404).json({ error: 'Category not found' });
      if (result.forbidden) return res.status(400).json({ error: 'The default Uncategorized category cannot be deleted' });
      res.status(204).send();
    } catch (err) { next(err); }
  }

  return { getAll, create, remove };
}

module.exports = {
  eventCategories: makeCategoryController(eventCategories),
  taskCategories: makeCategoryController(taskCategories),
};
