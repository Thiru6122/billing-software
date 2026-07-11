const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  removed: { type: Boolean, default: false },
  enabled: { type: Boolean, default: true },
  store: { type: mongoose.Schema.ObjectId, ref: 'Store', required: true },
  name: {
    type: String,
    required: true,
  },
  phone: String,
  gpay: { type: String, trim: true },
  country: String,
  address: String,
  state: String,
  gstin: { type: String, trim: true, uppercase: true },
  email: String,
  createdBy: { type: mongoose.Schema.ObjectId, ref: 'Admin' },
  assigned: { type: mongoose.Schema.ObjectId, ref: 'Admin' },
  created: {
    type: Date,
    default: Date.now,
  },
  updated: {
    type: Date,
    default: Date.now,
  },
});

schema.plugin(require('mongoose-autopopulate'));

module.exports = mongoose.model('Client', schema);
