const { Schema, model } = require('mongoose');

const ConfigSchema = new Schema({
  _id: { type: String, default: 'global' },
  theme: { type: String, default: 'system' },
  lastUpdated: { type: Date, default: Date.now },
});

module.exports = model('Config', ConfigSchema, 'config');
