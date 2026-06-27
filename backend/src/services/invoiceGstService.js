const {
  computeInvoiceGstFromItems,
  inferGstType,
  isValidGstin,
} = require('@/utils/indianGst');

function calculateInvoiceTotals(body, companyState) {
  const items = body.items || [];
  const placeOfSupply = body.placeOfSupply || companyState || '';
  const gstType = body.gstType || inferGstType(placeOfSupply, companyState);

  if (body.customerGstin && !isValidGstin(body.customerGstin)) {
    const err = new Error('Invalid customer GSTIN format.');
    err.code = 'INVALID_GSTIN';
    throw err;
  }

  const totals = computeInvoiceGstFromItems(items, gstType);

  body.subTotal = totals.subTotal;
  body.taxTotal = totals.taxTotal;
  body.cgstTotal = totals.cgstTotal;
  body.sgstTotal = totals.sgstTotal;
  body.igstTotal = totals.igstTotal;
  body.gstType = totals.gstType;
  body.taxRate = totals.taxRate;
  body.placeOfSupply = placeOfSupply;
  body.total = totals.total;
  body.items = totals.items;

  if (body.customerGstin) {
    body.customerGstin = String(body.customerGstin).trim().toUpperCase();
  }

  return body;
}

module.exports = { calculateInvoiceTotals };
