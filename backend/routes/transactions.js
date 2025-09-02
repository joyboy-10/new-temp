const express = require('express');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { validateTransactionCreation } = require('../middleware/validation');
const Transaction = require('../models/Transaction');
const Institution = require('../models/Institution');
const Auditor = require('../models/Auditor');
const eoaService = require('../services/eoa');

const router = express.Router();

router.post('/', authenticateToken, requireRole('associate'), validateTransactionCreation, async (req, res) => {
  try {
    const { receiver, amountEther, purpose, comment, deadline, priority } = req.body || {};
    const { institutionId, userId } = req.user;

    const inst = await Institution.findById(institutionId).lean();
    if (!inst) return res.status(404).json({ error: 'Institution not found' });

    try {
      const balEth = await eoaService.getInstitutionBalance(institutionId);
      if (parseFloat(balEth) < parseFloat(amountEther)) {}
    } catch (_) {}

    const fullComment = `${comment || ''}\nDeadline: ${deadline || 'N/A'}\nPriority: ${priority || 'medium'}`.trim();
    const txId = 'OFF' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString().padStart(4, '0');

    await Transaction.create({
      _id: txId,
      institutionOnchainId: String(inst.onchainId),
      creatorId: userId,
      receiver,
      amount: String(parseFloat(amountEther)),
      purpose,
      comment: fullComment,
      deadline: deadline ? new Date(deadline) : null,
      priority: priority || 'medium',
      status: 0,
      reviewTxHash: null,
      createdAt: new Date(),
    });

    res.json({ success: true, txId, txHash: null });
  } catch (error) {
    console.error('Create transaction error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/:txId/review', authenticateToken, requireRole('auditor'), async (req, res) => {
  try {
    const { txId } = req.params;
    const { decision, auditorComment, auditorPassword } = req.body || {};
    const { institutionId } = req.user;

    const tx = await Transaction.findById(txId);
    if (!tx) return res.status(404).json({ error: 'Transaction not found' });

    const inst = await Institution.findById(institutionId).lean();
    if (!inst) return res.status(404).json({ error: 'Institution not found' });

    if (String(tx.institutionOnchainId) !== String(inst.onchainId)) {
      return res.status(403).json({ error: 'Access denied to this transaction' });
    }

    if (decision === 'Approved') {
      if (!auditorPassword) return res.status(400).json({ error: 'Auditor password required' });
      const auditor = await Auditor.findOne({ institutionId }).lean();
      if (!auditor || auditor.password !== auditorPassword) {
        return res.status(401).json({ error: 'Invalid auditor password' });
      }

      const balEth = await eoaService.getInstitutionBalance(institutionId);
      if (parseFloat(balEth) < parseFloat(tx.amount)) {
        return res.status(400).json({ error: 'Insufficient EOA balance. Deposit and retry.' });
      }

      const txHash = await eoaService.sendFromInstitution(institutionId, tx.receiver, tx.amount);
      tx.status = 1;
      tx.auditorComment = auditorComment || '';
      tx.reviewedAt = new Date();
      tx.reviewTxHash = txHash;
      await tx.save();

      return res.json({ success: true, txId, decision, txHash });
    } else if (decision === 'Declined') {
      tx.status = 2;
      tx.auditorComment = auditorComment || '';
      tx.reviewedAt = new Date();
      await tx.save();
      return res.json({ success: true, txId, decision });
    } else if (decision === 'Review') {
      tx.status = 3;
      tx.auditorComment = auditorComment || '';
      tx.reviewedAt = new Date();
      await tx.save();
      return res.json({ success: true, txId, decision });
    }

    return res.status(400).json({ error: 'Invalid decision' });
  } catch (error) {
    console.error('Review transaction error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/', authenticateToken, async (req, res) => {
  try {
    const { institutionId } = req.user;
    const inst = await Institution.findById(institutionId).lean();
    if (!inst) return res.status(404).json({ error: 'Institution not found' });

    const txs = await Transaction.find({ institutionOnchainId: String(inst.onchainId) })
      .sort({ reviewedAt: -1, createdAt: -1 })
      .lean();

    res.json({
      transactions: txs.map(t => ({
        id: t._id,
        institutionId: t.institutionOnchainId,
        creatorId: t.creatorId,
        receiver: t.receiver,
        amount: t.amount,
        purpose: t.purpose,
        comment: t.comment,
        deadline: t.deadline,
        priority: t.priority,
        status: t.status,
        txHash: t.reviewTxHash,
        createdAt: t.createdAt,
        reviewedAt: t.reviewedAt,
        auditorComment: t.auditorComment,
      }))
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
