const mongoose = require('mongoose');

/**
 * Pre-printed barcode labels (not linked to a product until scanned on product save).
 */
const barcodeLabelSchema = new mongoose.Schema({
  store: { type: mongoose.Schema.ObjectId, ref: 'Store', required: true },
  code: { type: String, required: true, trim: true },
  assigned: { type: Boolean, default: false },
  product: { type: mongoose.Schema.ObjectId, ref: 'Product' },
  assignedAt: { type: Date },
  created: { type: Date, default: Date.now },
});

barcodeLabelSchema.index({ store: 1, code: 1 }, { unique: true });
barcodeLabelSchema.index({ store: 1, assigned: 1 });

module.exports = mongoose.model('BarcodeLabel', barcodeLabelSchema);
