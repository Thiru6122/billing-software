const { calculateInvoiceTotals } = require('@/services/invoiceGstService');

function calculatePurchaseTotals(body, companyState) {
  const mapped = {
    ...body,
    customerGstin: body.supplierGstin,
  };
  const result = calculateInvoiceTotals(mapped, companyState);
  if (body.supplierGstin) {
    result.supplierGstin = String(body.supplierGstin).trim().toUpperCase();
  }
  return result;
}

module.exports = { calculatePurchaseTotals };
