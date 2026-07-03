const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  removed: { type: Boolean, default: false },
  enabled: { type: Boolean, default: true },
  store: { type: mongoose.Schema.ObjectId, ref: 'Store', required: true },
  name: { type: String, required: true, trim: true },
  sku: { type: String, trim: true },
  barcode: { type: String, trim: true },
  enterpriseLine1: { type: String, trim: true },
  companyName: { type: String, trim: true },
  packDate: { type: String, trim: true },
  expiryText: { type: String, trim: true },
  description: { type: String },
  category: { type: String, trim: true },
  unit: { type: String, default: 'pcs', trim: true },
  price: { type: Number, required: true, default: 0 },
  cost: { type: Number, default: 0 },
  quantity: { type: Number, default: 0, min: 0 },
  minQuantity: { type: Number, default: 0, min: 0 },
  hsnCode: { type: String, trim: true },
  taxRate: { type: Number, default: 0 },
  created: { type: Date, default: Date.now },
  updated: { type: Date, default: Date.now },
});

productSchema.index({ store: 1, sku: 1 });
productSchema.index({ store: 1, name: 1 });
productSchema.index({ store: 1, barcode: 1 });

module.exports = mongoose.model('Product', productSchema);
