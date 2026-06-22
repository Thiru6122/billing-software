const { calculate } = require('@/helpers');
const { computeIndianGstTotals, inferGstType, isValidGstin } = require('@/utils/indianGst');

function calculateInvoiceTotals(body, companyState) {
  const items = body.items || [];
  let subTotal = 0;

  items.forEach((item) => {
    const lineTotal = calculate.multiply(item.quantity, item.price);
    item.total = Number.parseFloat(lineTotal);
    subTotal = calculate.add(subTotal, lineTotal);
  });

  const placeOfSupply = body.placeOfSupply || companyState || '';
  const gstType = body.gstType || inferGstType(placeOfSupply, companyState);
  const taxRate = Number(body.taxRate) || 0;
  const gst = computeIndianGstTotals({ subTotal, taxRate, gstType });

  if (body.customerGstin && !isValidGstin(body.customerGstin)) {
    const err = new Error('Invalid customer GSTIN format.');
    err.code = 'INVALID_GSTIN';
    throw err;
  }

  body.subTotal = Number.parseFloat(subTotal);
  body.taxTotal = gst.taxTotal;
  body.cgstTotal = gst.cgstTotal;
  body.sgstTotal = gst.sgstTotal;
  body.igstTotal = gst.igstTotal;
  body.gstType = gst.gstType;
  body.placeOfSupply = placeOfSupply;
  body.total = Number.parseFloat(calculate.add(subTotal, gst.taxTotal));
  body.items = items;

  if (body.customerGstin) {
    body.customerGstin = String(body.customerGstin).trim().toUpperCase();
  }

  return body;
}

module.exports = { calculateInvoiceTotals };
