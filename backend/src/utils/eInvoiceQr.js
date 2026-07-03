const QRCode = require('qrcode');

function buildEInvoiceQrPayload(model, settings, customer) {
  const sellerGstin = settings.company_gstin || settings.company_tax_number || '';
  const buyerGstin = customer?.gstin || model.customerGstin || '';
  const docNo = `${model.number}/${model.year || ''}`;
  const docDt = model.date ? new Date(model.date).toISOString().slice(0, 10) : '';
  const totInvVal = Number(model.total) || 0;

  return JSON.stringify({
    SellerGstin: sellerGstin,
    BuyerGstin: buyerGstin,
    DocNo: docNo,
    DocDt: docDt,
    TotInvVal: totInvVal,
    Irn: model.irn || '',
    AckNo: model.ackNo || '',
    AckDt: model.ackDate || '',
  });
}

async function generateEInvoiceQrDataUrl(model, settings, customer) {
  const payload = buildEInvoiceQrPayload(model, settings, customer);
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 120,
  });
}

module.exports = {
  buildEInvoiceQrPayload,
  generateEInvoiceQrDataUrl,
};
