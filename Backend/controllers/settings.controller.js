const settingsModel = require('../models/settings.model');

async function getSettings(req, res, next) {
  try {
    const settings = await settingsModel.getSettings();
    if (!settings) return res.status(404).json({ error: 'No settings row exists yet' });
    res.json(settings);
  } catch (err) { next(err); }
}

async function updateSettings(req, res, next) {
  try {
    const { email } = req.body;
    if (!email || !email.trim()) return res.status(400).json({ error: 'email is required' });
    const settings = await settingsModel.updateSettings({ email: email.trim() });
    res.json(settings);
  } catch (err) { next(err); }
}

module.exports = { getSettings, updateSettings };
