const {
  computePurchaseGstFromItems,
  inferGstType,
  isValidGstin,
} = require('@/utils/indianGst');

function calculatePurchaseTotals(body, companyState) {
  const placeOfSupply = body.placeOfSupply || companyState || '';
  const gstType = body.gstType || inferGstType(placeOfSupply, companyState);

  if (body.supplierGstin && !isValidGstin(body.supplierGstin)) {
    const err = new Error('Invalid supplier GSTIN format.');
    err.code = 'INVALID_GSTIN';
    throw err;
  }

  const totals = computePurchaseGstFromItems(body.items || [], gstType);

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

  if (body.supplierGstin) {
    body.supplierGstin = String(body.supplierGstin).trim().toUpperCase();
  }

  return body;
}

module.exports = { calculatePurchaseTotals };
