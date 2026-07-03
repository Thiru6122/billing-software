const mongoose = require('mongoose');

const Model = mongoose.model('Invoice');

const custom = require('@/controllers/pdfController');

const { calculate } = require('@/helpers');
const { loadSettings } = require('@/middlewares/settings');
const schema = require('./schemaValidate');
const { normalizeInvoiceBody } = require('./normalizeBody');
const { calculateInvoiceTotals } = require('@/services/invoiceGstService');
const {
  checkInvoiceStock,
  deductInvoiceStock,
  restoreInvoiceStock,
  shouldDeductStock,
  shouldRestoreStock,
} = require('@/services/stockService');

const update = async (req, res) => {
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

  const previousInvoice = await Model.findOne({
    _id: req.params.id,
    removed: false,
  });

  const { credit } = previousInvoice;

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

  body['pdf'] = 'invoice-' + req.params.id + '.pdf';
  if (body.hasOwnProperty('currency')) {
    delete body.currency;
  }
  // Find document by id and updates with the required fields

  let paymentStatus =
    calculate.sub(body.total, discount) === credit ? 'paid' : credit > 0 ? 'partially' : 'unpaid';
  body['paymentStatus'] = paymentStatus;

  if (!body.client || body.client === '') {
    delete body.client;
  }
  if (body.customerName) {
    body.customerName = String(body.customerName).trim();
    if (!body.customerName) delete body.customerName;
  }

  if (shouldRestoreStock(body) && previousInvoice.stockDeducted) {
    await restoreInvoiceStock(previousInvoice, req.storeId, req.admin._id);
  }

  const willDeduct =
    shouldDeductStock(body) && !previousInvoice.stockDeducted && !shouldRestoreStock(body);

  if (willDeduct) {
    const stockErrors = await checkInvoiceStock(items, req.storeId);
    if (stockErrors.length) {
      return res.status(400).json({
        success: false,
        result: null,
        message: stockErrors.join('; '),
      });
    }
  }

  const result = await Model.findOneAndUpdate({ _id: req.params.id, removed: false }, body, {
    new: true, // return the new result instead of the old one
  }).exec();

  if (willDeduct) {
    await deductInvoiceStock(result, req.storeId, req.admin._id);
    result.stockDeducted = true;
  }

  // Returning successfull response

  return res.status(200).json({
    success: true,
    result,
    message: 'we update this document ',
  });
};

module.exports = update;
