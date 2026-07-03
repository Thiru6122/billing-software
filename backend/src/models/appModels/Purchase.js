const mongoose = require('mongoose');

const purchaseSchema = new mongoose.Schema({
  removed: { type: Boolean, default: false },
  store: { type: mongoose.Schema.ObjectId, ref: 'Store', required: true },
  createdBy: { type: mongoose.Schema.ObjectId, ref: 'Admin', required: true },
  number: { type: Number, required: true },
  year: { type: Number, required: true },
  date: { type: Date, required: true },
  expectedDate: { type: Date },
  supplier: { type: mongoose.Schema.ObjectId, ref: 'Supplier', autopopulate: true },
  supplierName: { type: String, trim: true },
  supplierGstin: { type: String, trim: true, uppercase: true },
  placeOfSupply: { type: String, trim: true },
  gstType: { type: String, enum: ['intra', 'inter'], default: 'intra' },
  items: [
    {
      product: { type: mongoose.Schema.ObjectId, ref: 'Product' },
      itemName: { type: String, required: true },
      hsnCode: { type: String, trim: true },
      gstRate: { type: Number, default: 0 },
      description: { type: String },
      quantity: { type: Number, default: 1, required: true },
      price: { type: Number, required: true },
      taxableValue: { type: Number, default: 0 },
      gstAmount: { type: Number, default: 0 },
      total: { type: Number, required: true },
    },
  ],
  taxRate: { type: Number, default: 0 },
  subTotal: { type: Number, default: 0 },
  taxTotal: { type: Number, default: 0 },
  cgstTotal: { type: Number, default: 0 },
  sgstTotal: { type: Number, default: 0 },
  igstTotal: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  currency: { type: String, default: 'INR', uppercase: true, required: true },
  discount: { type: Number, default: 0 },
  notes: { type: String },
  status: {
    type: String,
    enum: ['draft', 'ordered', 'received', 'cancelled'],
    default: 'draft',
  },
  stockAdded: { type: Boolean, default: false },
  updated: { type: Date, default: Date.now },
  created: { type: Date, default: Date.now },
});

purchaseSchema.plugin(require('mongoose-autopopulate'));

module.exports = mongoose.model('Purchase', purchaseSchema);
