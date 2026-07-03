const mongoose = require('mongoose');

const Model = mongoose.model('Invoice');

const { calculate } = require('@/helpers');
const { increaseBySettingKey, loadSettings } = require('@/middlewares/settings');
const schema = require('./schemaValidate');
const { normalizeInvoiceBody } = require('./normalizeBody');
const { calculateInvoiceTotals } = require('@/services/invoiceGstService');
const {
  checkInvoiceStock,
  deductInvoiceStock,
  shouldDeductStock,
} = require('@/services/stockService');

const create = async (req, res) => {
  let body = normalizeInvoiceBody(req.body);

  const { error, value } = schema.validate(body, { stripUnknown: true });
  if (error) {
    const { details } = error;
    return res.status(400).json({
      success: false,
      result: null,
      message: details[0]?.message,
    });
  }

  const { items = [], taxRate = 0, discount = 0 } = value;

  body = { ...value, taxRate: Number(taxRate) || 0, discount };

  try {
    const settings = await loadSettings();
    body = calculateInvoiceTotals(body, settings.company_state);
  } catch (err) {
    if (err.code === 'INVALID_GSTIN') {
      return res.status(400).json({ success: false, result: null, message: err.message });
    }
    throw err;
  }

  let paymentStatus = calculate.sub(body.total, discount) === 0 ? 'paid' : 'unpaid';

  body['paymentStatus'] = paymentStatus;
  body['createdBy'] = req.admin._id;
  if (req.storeId) body['store'] = req.storeId;

  if (!body.client || body.client === '') {
    delete body.client;
  }
  if (body.customerName) {
    body.customerName = String(body.customerName).trim();
    if (!body.customerName) delete body.customerName;
  }

  if (shouldDeductStock(body)) {
    const stockErrors = await checkInvoiceStock(items, req.storeId);
    if (stockErrors.length) {
      return res.status(400).json({
        success: false,
        result: null,
        message: stockErrors.join('; '),
      });
    }
  }

  const result = await new Model(body).save();
  const fileId = 'invoice-' + result._id + '.pdf';
  const updateResult = await Model.findOneAndUpdate(
    { _id: result._id },
    { pdf: fileId },
    {
      new: true,
    }
  ).exec();

  if (shouldDeductStock(body)) {
    await deductInvoiceStock(updateResult, req.storeId, req.admin._id);
    updateResult.stockDeducted = true;
  }

  increaseBySettingKey({ settingKey: 'last_invoice_number', storeId: req.storeId });

  // Returning successfull response
  return res.status(200).json({
    success: true,
    result: updateResult,
    message: 'Invoice created successfully',
  });
};

module.exports = create;
