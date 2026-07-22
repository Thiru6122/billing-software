const mongoose = require('mongoose');

const Model = mongoose.model('Expense');
const ExpenseCategory = mongoose.model('ExpenseCategory');
const { reserveNextNumber } = require('@/services/documentNumberService');

const create = async (req, res) => {
  const body = { ...req.body };

  if (!body.amount || Number(body.amount) <= 0) {
    return res.status(400).json({
      success: false,
      result: null,
      message: 'Expense amount must be greater than 0',
    });
  }

  body.createdBy = req.admin._id;
  if (req.storeId) body.store = req.storeId;
  body.currency = (body.currency || 'INR').toUpperCase();
  body.amount = Number(body.amount);

  const expenseDate = body.date ? new Date(body.date) : new Date();
  body.date = expenseDate;
  body.year = Number(body.year) || expenseDate.getFullYear();

  if (!body.category || body.category === '') delete body.category;
  if (body.categoryName) {
    body.categoryName = String(body.categoryName).trim();
    if (!body.categoryName) delete body.categoryName;
  }

  if (!body.paymentMode || body.paymentMode === '') delete body.paymentMode;

  if (body.category && !body.categoryName) {
    const cat = await ExpenseCategory.findOne({ _id: body.category, removed: false }).lean();
    if (cat?.name) body.categoryName = cat.name;
  }

  body.number = await reserveNextNumber({
    storeId: req.storeId,
    settingKey: 'last_expense_number',
    Model,
    year: body.year,
  });

  const result = await Model.create(body);

  return res.status(200).json({
    success: true,
    result,
    message: 'Expense created successfully',
  });
};

module.exports = create;
