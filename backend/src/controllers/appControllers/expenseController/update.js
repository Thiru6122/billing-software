const mongoose = require('mongoose');

const Model = mongoose.model('Expense');
const ExpenseCategory = mongoose.model('ExpenseCategory');

const update = async (req, res) => {
  const body = { ...req.body };
  body.updated = new Date();

  if (body.amount !== undefined) {
    body.amount = Number(body.amount);
    if (!Number.isFinite(body.amount) || body.amount <= 0) {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'Expense amount must be greater than 0',
      });
    }
  }

  if (body.date) body.date = new Date(body.date);
  if (body.currency) body.currency = String(body.currency).toUpperCase();

  if (body.category === '') delete body.category;
  if (body.paymentMode === '') delete body.paymentMode;

  if (body.category) {
    const cat = await ExpenseCategory.findOne({ _id: body.category, removed: false }).lean();
    if (cat?.name) body.categoryName = cat.name;
  }

  delete body.number;
  delete body.year;
  delete body.store;
  delete body.createdBy;

  const result = await Model.findOneAndUpdate(
    { _id: req.params.id, removed: false },
    { $set: body },
    { new: true, runValidators: true }
  ).exec();

  if (!result) {
    return res.status(404).json({
      success: false,
      result: null,
      message: 'Expense not found',
    });
  }

  return res.status(200).json({
    success: true,
    result,
    message: 'Expense updated successfully',
  });
};

module.exports = update;
