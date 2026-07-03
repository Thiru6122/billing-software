function getProductLabelDefaults(companyName = '') {
  const now = new Date();
  const month = now.toLocaleString('en-US', { month: 'short' }).toUpperCase();
  const day = now.getDate();

  return {
    enterpriseLine1: 'Ashwin',
    companyName: companyName || 'PURE',
    packDate: `${month} ${day}`,
    expiryText: '12 MONTHS',
  };
}

function applyProductLabelDefaults(body = {}, companyName = '') {
  const defaults = getProductLabelDefaults(companyName);
  return {
    enterpriseLine1: String(body.enterpriseLine1 || '').trim() || defaults.enterpriseLine1,
    companyName: String(body.companyName || '').trim() || defaults.companyName,
    packDate: String(body.packDate || '').trim() || defaults.packDate,
    expiryText: String(body.expiryText || '').trim() || defaults.expiryText,
  };
}

module.exports = {
  getProductLabelDefaults,
  applyProductLabelDefaults,
};
