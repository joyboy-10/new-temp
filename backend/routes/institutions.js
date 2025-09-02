const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const Institution = require('../models/Institution');
const Associate = require('../models/Associate');
const Transaction = require('../models/Transaction');
const { getInstitutionBalance } = require('../services/eoa');

const router = express.Router();

router.get('/:institutionId/summary', authenticateToken, async (req, res) => {
  try {
    const { institutionId } = req.params;
    const inst = await Institution.findById(institutionId).lean();
    if (!inst) return res.status(404).json({ error: 'Institution not found' });

    const balance = await getInstitutionBalance(institutionId);
    const total = await Transaction.countDocuments({ institutionOnchainId: String(inst.onchainId) });

    res.json({
      institution: { id: inst._id, name: inst.name, walletAddress: inst.walletAddress },
      balance,
      metrics: { total }
    });
  } catch (e) {
    console.error('Summary error:', e);
    res.status(500).json({ error: 'Failed to get summary' });
  }
});

router.get('/:institutionId/associates', authenticateToken, async (req, res) => {
  try {
    const { institutionId } = req.params;
    const list = await Associate.find({ institutionId }).lean();
    const items = (list || []).map(a => ({ id: a._id }));
    res.json({ items });
  } catch (e) {
    console.error('Associates list error:', e);
    res.status(500).json({ error: 'Failed to list associates' });
  }
});

module.exports = router;
