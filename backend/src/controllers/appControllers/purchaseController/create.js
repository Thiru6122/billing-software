const mongoose = require('mongoose');

const Model = mongoose.model('Purchase');
const { increaseBySettingKey, loadSettings } = require('@/middlewares/settings');
const schema = require('./schemaValidate');
const { calculatePurchaseTotals } = require('@/services/purchaseGstService');
const {
  addPurchaseStock,
  shouldAddPurchaseStock,
} = require('@/services/stockService');

const create = async (req, res) => {
  let body = req.body;

  const { error, value } = schema.validate(body);
  if (error) {
    return res.status(400).json({
      success: false,
      result: null,
      message: error.details[0]?.message,
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

  body.createdBy = req.admin._id;
  if (req.storeId) body.store = req.storeId;
  body.currency = body.currency || 'INR';

  if (!body.supplier || body.supplier === '') delete body.supplier;
  if (body.supplierName) {
    body.supplierName = String(body.supplierName).trim();
    if (!body.supplierName) delete body.supplierName;
  }

  const result = await new Model(body).save();

  if (shouldAddPurchaseStock(body)) {
    await addPurchaseStock(result, req.storeId, req.admin._id);
    result.stockAdded = true;
  }

  increaseBySettingKey({ settingKey: 'last_purchase_number', storeId: req.storeId });

  return res.status(200).json({
    success: true,
    result,
    message: 'Purchase created successfully',
  });
};

module.exports = create;
