const mongoose = require('mongoose');

function generateBarcodeValue(index = 0) {
  const six = String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0');
  return `89${six}`;
}

async function productBarcodeExists(storeId, code, excludeProductId) {
  const Product = mongoose.model('Product');
  const query = { store: storeId, barcode: code, removed: false };
  if (excludeProductId) query._id = { $ne: excludeProductId };
  return !!(await Product.findOne(query));
}

async function codeExists(storeId, code) {
  const BarcodeLabel = mongoose.model('BarcodeLabel');
  const [label, productUsed] = await Promise.all([
    BarcodeLabel.findOne({ store: storeId, code }),
    productBarcodeExists(storeId, code),
  ]);
  return !!(label || productUsed);
}

async function generateUniqueProductBarcode(storeId, excludeProductId) {
  for (let i = 0; i < 15; i++) {
    const code = generateBarcodeValue(i);
    // eslint-disable-next-line no-await-in-loop
    if (!(await productBarcodeExists(storeId, code, excludeProductId))) return code;
  }
  throw new Error('Could not generate a unique barcode. Try again.');
}

async function resolveProductBarcode({ storeId, barcode, productId }) {
  const code = String(barcode || '').trim();
  if (code) {
    const used = await productBarcodeExists(storeId, code, productId);
    if (used) {
      throw new Error(`Barcode "${code}" is already used by another product.`);
    }
    return code;
  }
  return generateUniqueProductBarcode(storeId, productId);
}

async function generateUniqueCode(storeId, index = 0) {
  for (let i = 0; i < 15; i++) {
    const code = generateBarcodeValue(index + i);
    // eslint-disable-next-line no-await-in-loop
    if (!(await codeExists(storeId, code))) return code;
  }
  throw new Error('Could not generate a unique barcode. Try again.');
}

async function generateLabelBatch(storeId, count) {
  const BarcodeLabel = mongoose.model('BarcodeLabel');
  const labels = [];
  const total = Math.max(1, Math.min(Number(count) || 1, 200));

  for (let i = 0; i < total; i++) {
    const code = await generateUniqueCode(storeId, i);
    const label = await BarcodeLabel.create({ store: storeId, code, assigned: false });
    labels.push(label);
  }

  return labels;
}

async function assignBarcodeToProduct({ storeId, barcode, productId, previousBarcode }) {
  const BarcodeLabel = mongoose.model('BarcodeLabel');
  const Product = mongoose.model('Product');
  const code = String(barcode || '').trim();

  if (!code) {
    throw new Error('Scan a printed barcode label before saving the product.');
  }

  const usedByOther = await Product.findOne({
    store: storeId,
    barcode: code,
    removed: false,
    _id: { $ne: productId },
  });
  if (usedByOther) {
    throw new Error(`Barcode already mapped to product "${usedByOther.name}".`);
  }

  if (previousBarcode && previousBarcode === code) {
    return;
  }

  const poolLabel = await BarcodeLabel.findOne({ store: storeId, code, assigned: false });
  if (!poolLabel) {
    const alreadyOwned = await BarcodeLabel.findOne({ store: storeId, code, product: productId });
    if (alreadyOwned) return;
    throw new Error(
      'This barcode is not in your printed label pool. Print labels first from Barcode Labels, stick on the product, then scan here.'
    );
  }

  poolLabel.assigned = true;
  poolLabel.product = productId;
  poolLabel.assignedAt = new Date();
  await poolLabel.save();
}

async function getLabelPoolSummary(storeId) {
  const BarcodeLabel = mongoose.model('BarcodeLabel');
  const [unassigned, assigned, recentUnassigned] = await Promise.all([
    BarcodeLabel.countDocuments({ store: storeId, assigned: false }),
    BarcodeLabel.countDocuments({ store: storeId, assigned: true }),
    BarcodeLabel.find({ store: storeId, assigned: false }).sort({ created: -1 }).limit(100).lean(),
  ]);

  return { unassigned, assigned, recentUnassigned };
}

module.exports = {
  generateBarcodeValue,
  generateUniqueProductBarcode,
  resolveProductBarcode,
  generateLabelBatch,
  assignBarcodeToProduct,
  getLabelPoolSummary,
};
