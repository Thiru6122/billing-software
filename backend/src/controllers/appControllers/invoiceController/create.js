const mongoose = require('mongoose');

const Model = mongoose.model('Invoice');

const { calculate } = require('@/helpers');
const { loadSettings } = require('@/middlewares/settings');
const schema = require('./schemaValidate');
const { normalizeInvoiceBody } = require('./normalizeBody');
const { calculateInvoiceTotals } = require('@/services/invoiceGstService');
const {
  checkInvoiceStock,
  deductInvoiceStock,
  shouldDeductStock,
} = require('@/services/stockService');
const { reserveNextNumber } = require('@/services/documentNumberService');

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

  const year = Number(body.year) || new Date().getFullYear();
  body.year = year;

  try {
    body.number = await reserveNextNumber({
      storeId: req.storeId,
      settingKey: 'last_invoice_number',
      Model,
      year,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      result: null,
      message: err.message || 'Could not assign invoice number',
    });
  }

  let result;
  try {
    result = await new Model(body).save();
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        result: null,
        message: `Invoice number ${body.number} already exists for year ${year}`,
      });
    }
    throw err;
  }
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

  // Returning successfull response
  return res.status(200).json({
    success: true,
    result: updateResult,
    message: 'Invoice created successfully',
  });
};

module.exports = create;
