const { Schema, model } = require('mongoose');

const AuditorSchema = new Schema({
  _id: { type: String }, // auditor id
  institutionId: { type: String, required: true, index: true },
  password: { type: String, required: true }, // plain per concept
  createdAt: { type: Date, default: Date.now },
});

module.exports = model('Auditor', AuditorSchema, 'auditors');
