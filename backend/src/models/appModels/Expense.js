const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  removed: { type: Boolean, default: false },
  store: { type: mongoose.Schema.ObjectId, ref: 'Store', required: true },
  createdBy: { type: mongoose.Schema.ObjectId, ref: 'Admin', required: true },
  number: { type: Number, required: true },
  year: { type: Number, required: true },
  date: { type: Date, required: true, default: Date.now },
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'INR', uppercase: true, required: true },
  category: { type: mongoose.Schema.ObjectId, ref: 'ExpenseCategory', autopopulate: true },
  categoryName: { type: String, trim: true },
  paymentMode: { type: mongoose.Schema.ObjectId, ref: 'PaymentMode', autopopulate: true },
  ref: { type: String, trim: true },
  description: { type: String, trim: true },
  status: {
    type: String,
    enum: ['pending', 'paid', 'cancelled'],
    default: 'paid',
  },
  created: { type: Date, default: Date.now },
  updated: { type: Date, default: Date.now },
});

expenseSchema.plugin(require('mongoose-autopopulate'));

module.exports = mongoose.model('Expense', expenseSchema);
