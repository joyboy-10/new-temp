const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const Transaction = require('../models/Transaction');
const Institution = require('../models/Institution');
const { getInstitutionBalance } = require('../services/eoa');
const router = express.Router();

router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const onchainId = req.query.onchainId;
    if (!onchainId) return res.status(400).json({ error: 'onchainId required' });

    const pipe = [
      { $match: { institutionOnchainId: String(onchainId) } },
      {
        $facet: {
          counts: [
            { $group: { _id: '$status', n: { $sum: 1 }, amt: { $sum: { $toDouble: '$amount' } } } }
          ],
          perAssociate: [
            { $group: { _id: '$creatorId', n: { $sum: 1 }, amt: { $sum: { $toDouble: '$amount' } } } },
            { $sort: { amt: -1 } },
            { $limit: 10 }
          ],
          monthly: [
            { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, n: { $sum: 1 }, amt: { $sum: { $toDouble: '$amount' } } } },
            { $sort: { _id: 1 } }
          ],
          tta: [
            { $match: { reviewedAt: { $ne: null } } },
            { $project: { diff: { $divide: [{ $subtract: ['$reviewedAt', '$createdAt'] }, 60000] } } }, // minutes
            { $group: { _id: null, avgMins: { $avg: '$diff' } } }
          ],
          mostExpensive: [
            { $sort: { amount: -1 } },
            { $limit: 1 }
          ]
        }
      }
    ];

    const [result] = await Transaction.aggregate(pipe);
    const mapCount = (s) => result.counts.find(x => x._id === s)?.n || 0;
    const mapAmt = (s) => result.counts.find(x => x._id === s)?.amt || 0;
    const total = (result.counts || []).reduce((s, x) => s + x.n, 0);
    const totalAmt = (result.counts || []).reduce((s, x) => s + x.amt, 0);

    // “Deposited” and “spent” approximations are not fully traceable without deposit tracking.
    // Here, we define:
    // - avgMoneySpent: average of approved tx amounts
    // - avgMoneyRequested: average of requested amounts
    const approvedCount = mapCount(1);
    const pendingCount = mapCount(0) + mapCount(3);
    const declinedCount = mapCount(2);

    const approvedAmt = mapAmt(1);
    const requestedAmt = totalAmt;
    const avgMoneySpent = approvedCount ? approvedAmt / approvedCount : 0;
    const avgMoneyRequested = total ? requestedAmt / total : 0;

    // Get available balance by querying Institution wallet
    // Need institutionId to compute balance:
    const inst = await Institution.findOne({ onchainId: String(onchainId) }).lean();
    let availableBalance = '0';
    if (inst?._id) availableBalance = await getInstitutionBalance(inst._id);

    const mostExpensiveTx = (result.mostExpensive && result.mostExpensive) || null;

    res.json({
      totals: {
        totalRequests: total,
        totalAmount: totalAmt,
        approved: approvedCount,
        declined: declinedCount,
        pending: pendingCount,
        approvalRate: total ? (approvedCount / total) : 0
      },
      financials: {
        avgMoneyRequested,
        avgMoneySpent,
        availableBalance: Number(availableBalance)
      },
      perAssociate: result.perAssociate || [],
      monthly: result.monthly || [],
      timeToApprovalMins: (result.tta?.avgMins) || 0,
      mostExpensive: mostExpensiveTx ? {
        id: mostExpensiveTx._id,
        creatorId: mostExpensiveTx.creatorId,
        receiver: mostExpensiveTx.receiver,
        amount: mostExpensiveTx.amount,
        purpose: mostExpensiveTx.purpose,
        status: mostExpensiveTx.status,
        txHash: mostExpensiveTx.reviewTxHash,
        createdAt: mostExpensiveTx.createdAt,
        reviewedAt: mostExpensiveTx.reviewedAt
      } : null
    });
  } catch (e) {
    console.error('Analytics summary error:', e);
    res.status(500).json({ error: 'Failed analytics' });
  }
});

module.exports = router;
