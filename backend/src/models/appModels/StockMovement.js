const mongoose = require('mongoose');

const stockMovementSchema = new mongoose.Schema({
  store: { type: mongoose.Schema.ObjectId, ref: 'Store', required: true },
  product: { type: mongoose.Schema.ObjectId, ref: 'Product', required: true },
  movementType: {
    type: String,
    enum: ['in', 'out', 'sale', 'return', 'adjust', 'import', 'purchase'],
    required: true,
  },
  quantityChange: { type: Number, required: true },
  quantityBefore: { type: Number, required: true },
  quantityAfter: { type: Number, required: true },
  reference: { type: String },
  note: { type: String },
  createdBy: { type: mongoose.Schema.ObjectId, ref: 'Admin' },
  created: { type: Date, default: Date.now },
});

stockMovementSchema.index({ store: 1, product: 1, created: -1 });
stockMovementSchema.index({ store: 1, created: -1 });

module.exports = mongoose.model('StockMovement', stockMovementSchema);
