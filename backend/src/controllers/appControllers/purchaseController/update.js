const mongoose = require('mongoose');

const Model = mongoose.model('Purchase');
const { loadSettings } = require('@/middlewares/settings');
const schema = require('./schemaValidate');
const { calculatePurchaseTotals } = require('@/services/purchaseGstService');
const {
  addPurchaseStock,
  reversePurchaseStock,
  shouldAddPurchaseStock,
  shouldReversePurchaseStock,
} = require('@/services/stockService');

const update = async (req, res) => {
  let body = req.body;

  const { error, value } = schema.validate(body);
  if (error) {
    return res.status(400).json({
      success: false,
      result: null,
      message: error.details[0]?.message,
    });
  }

  const previous = await Model.findOne({ _id: req.params.id, removed: false, store: req.storeId });
  if (!previous) {
    return res.status(404).json({
      success: false,
      result: null,
      message: 'Purchase not found',
    });
  }

  body = { ...value, taxRate: Number(value.taxRate) || 0, discount: Number(value.discount) || 0 };

  try {
    const settings = await loadSettings();
    body = calculatePurchaseTotals(body, settings.company_state);
  } catch (err) {
    if (err.code === 'INVALID_GSTIN') {
      return res.status(400).json({ success: false, result: null, message: err.message });
    }
    throw err;
  }

  if (body.currency) delete body.currency;

  if (!body.supplier || body.supplier === '') delete body.supplier;
  if (body.supplierName) {
    body.supplierName = String(body.supplierName).trim();
    if (!body.supplierName) delete body.supplierName;
  }

  if (shouldReversePurchaseStock(body) && previous.stockAdded) {
    await reversePurchaseStock(previous, req.storeId, req.admin._id);
  }

  const willAdd =
    shouldAddPurchaseStock(body) && !previous.stockAdded && !shouldReversePurchaseStock(body);

  const result = await Model.findOneAndUpdate(
    { _id: req.params.id, removed: false, store: req.storeId },
    body,
    { new: true }
  ).exec();

  if (willAdd) {
    await addPurchaseStock(result, req.storeId, req.admin._id);
    result.stockAdded = true;
  }

  return res.status(200).json({
    success: true,
    result,
    message: 'Purchase updated successfully',
  });
};

module.exports = update;
