const mongoose = require('mongoose');

const expenseCategorySchema = new mongoose.Schema({
  removed: { type: Boolean, default: false },
  enabled: { type: Boolean, default: true },
  store: { type: mongoose.Schema.ObjectId, ref: 'Store', required: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  created: { type: Date, default: Date.now },
  updated: { type: Date, default: Date.now },
});

expenseCategorySchema.index({ store: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('ExpenseCategory', expenseCategorySchema);
