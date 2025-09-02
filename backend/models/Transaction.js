const { Schema, model } = require('mongoose');

const TransactionSchema = new Schema({
  _id: { type: String }, // OFF...
  institutionOnchainId: { type: String, required: true, index: true },
  creatorId: { type: String, required: true },
  receiver: { type: String, required: true },
  amount: { type: String, required: true },
  purpose: { type: String, required: true },
  comment: { type: String, default: '' },
  deadline: { type: Date, default: null },
  priority: { type: String, default: 'medium' },
  status: { type: Number, default: 0 }, // 0 pending,1 approved,2 declined,3 review
  reviewTxHash: { type: String, default: null },
  auditorComment: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  reviewedAt: { type: Date, default: null },
});

module.exports = model('Transaction', TransactionSchema, 'transactions');
