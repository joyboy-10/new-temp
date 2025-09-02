const { Schema, model } = require('mongoose');

const InstitutionSchema = new Schema({
  _id: { type: String }, // institutionId
  name: { type: String, required: true },
  location: { type: String, required: true },
  onchainId: { type: String, required: true },
  walletAddress: { type: String, default: null },
  walletKeyEnc: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
});

module.exports = model('Institution', InstitutionSchema, 'institutions');
