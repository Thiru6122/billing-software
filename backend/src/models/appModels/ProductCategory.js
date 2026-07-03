const mongoose = require('mongoose');

const productCategorySchema = new mongoose.Schema({
  removed: { type: Boolean, default: false },
  enabled: { type: Boolean, default: true },
  store: { type: mongoose.Schema.ObjectId, ref: 'Store', required: true },
  name: { type: String, required: true, trim: true },
  hsnCode: { type: String, required: true, trim: true },
  taxRate: { type: Number, default: 0, min: 0, max: 100 },
  description: { type: String, trim: true },
  created: { type: Date, default: Date.now },
  updated: { type: Date, default: Date.now },
});

productCategorySchema.index({ store: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('ProductCategory', productCategorySchema);
