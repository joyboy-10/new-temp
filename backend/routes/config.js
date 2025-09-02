const express = require('express');
const { authenticateToken, requireRole } = require('../middleware/auth');
const Config = require('../models/config');

const router = express.Router();

router.get('/theme', async (req, res) => {
  try {
    let cfg = await Config.findById('global').lean();
    if (!cfg) cfg = { theme: 'system' };
    res.json({ theme: cfg.theme || 'system' });
  } catch (error) {
    console.error('Get theme error:', error?.message || error);
    res.status(500).json({ error: 'Failed to get theme configuration' });
  }
});

router.post('/theme', authenticateToken, requireRole('auditor'), async (req, res) => {
  try {
    const { theme } = req.body || {};
    if (!theme || !['system', 'dark', 'light'].includes(theme)) {
      return res.status(400).json({ error: 'Invalid theme. Must be: system, dark, or light' });
    }
    const doc = await Config.findByIdAndUpdate(
      'global',
      { $set: { theme, lastUpdated: new Date() } },
      { upsert: true, new: true }
    ).lean();
    res.json({ success: true, theme: doc.theme });
  } catch (error) {
    console.error('Set theme error:', error?.message || error);
    res.status(500).json({ error: 'Failed to update theme configuration' });
  }
});

module.exports = router;
