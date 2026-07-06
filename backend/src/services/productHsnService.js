const mongoose = require('mongoose');
const { lookupHsnByProductName } = require('@/services/hsnLookupService');

const DEFAULT_CATEGORY_HSN = [
  { match: /oil|castor|coconut|mustard|sesame|hair oil/i, hsnCode: '1515', taxRate: 5 },
  { match: /soap|shampoo|cosmetic|cream|lotion|beauty|pure/i, hsnCode: '3305', taxRate: 18 },
  { match: /medicine|tablet|capsule|syrup|pharma|drug/i, hsnCode: '3004', taxRate: 12 },
  { match: /food|grocery|grain|rice|flour|spice|masala/i, hsnCode: '2106', taxRate: 5 },
  { match: /garment|cloth|textile|shirt|dress|fabric/i, hsnCode: '6109', taxRate: 5 },
  { match: /plastic|container|bottle|packaging/i, hsnCode: '3923', taxRate: 18 },
];

function normalizeHsnCode(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  if (![4, 6, 8].includes(digits.length)) {
    throw new Error('HSN code must be 4, 6, or 8 digits.');
  }
  return digits;
}

function lookupDefaultHsn(text) {
  const source = String(text || '').trim();
  if (!source) return null;

  for (const row of DEFAULT_CATEGORY_HSN) {
    if (row.match.test(source)) {
      return { hsnCode: row.hsnCode, taxRate: row.taxRate };
    }
  }
  return null;
}

async function findCategoryMapping(storeId, categoryName) {
  const name = String(categoryName || '').trim();
  if (!name) return null;

  const ProductCategory = mongoose.model('ProductCategory');
  const match = await ProductCategory.findOne({
    store: storeId,
    name: { $regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    removed: false,
    enabled: true,
  }).lean();

  if (match?.hsnCode) {
    return {
      hsnCode: match.hsnCode,
      taxRate: Number(match.taxRate) || 0,
    };
  }

  const Product = mongoose.model('Product');
  const sibling = await Product.findOne({
    store: storeId,
    category: name,
    hsnCode: { $exists: true, $nin: ['', null] },
    removed: false,
  })
    .sort({ updated: -1 })
    .lean();

  if (sibling?.hsnCode) {
    return {
      hsnCode: sibling.hsnCode,
      taxRate: Number(sibling.taxRate) || 0,
    };
  }

  return lookupDefaultHsn(name);
}

async function resolveProductHsn({ storeId, hsnCode, category, taxRate, name }) {
  const userTaxRate =
    taxRate !== undefined && taxRate !== null && taxRate !== '' ? Number(taxRate) : null;
  const normalizedInput = String(hsnCode || '').trim();

  if (normalizedInput) {
    return {
      hsnCode: normalizeHsnCode(normalizedInput),
      ...(userTaxRate != null && !Number.isNaN(userTaxRate) ? { taxRate: userTaxRate } : {}),
    };
  }

  const fromCategory = await findCategoryMapping(storeId, category);
  if (fromCategory) {
    return {
      hsnCode: normalizeHsnCode(fromCategory.hsnCode),
      taxRate: userTaxRate != null && !Number.isNaN(userTaxRate) ? userTaxRate : fromCategory.taxRate || 0,
    };
  }

  const fromName = lookupDefaultHsn(name);
  if (fromName) {
    return {
      hsnCode: normalizeHsnCode(fromName.hsnCode),
      taxRate: userTaxRate != null && !Number.isNaN(userTaxRate) ? userTaxRate : fromName.taxRate || 0,
    };
  }

  const fromDatabase = lookupHsnByProductName(name, category);
  if (fromDatabase?.hsnCode) {
    return {
      hsnCode: normalizeHsnCode(fromDatabase.hsnCode),
      taxRate:
        userTaxRate != null && !Number.isNaN(userTaxRate) ? userTaxRate : fromDatabase.taxRate || 0,
    };
  }

  return {
    hsnCode: '',
    ...(userTaxRate != null && !Number.isNaN(userTaxRate) ? { taxRate: userTaxRate } : { taxRate: 0 }),
  };
}

async function resolveHsnCodeOnly({ storeId, name, category }) {
  const fromCategory = await findCategoryMapping(storeId, category);
  if (fromCategory?.hsnCode) {
    return normalizeHsnCode(fromCategory.hsnCode);
  }

  const fromName = lookupDefaultHsn(name);
  if (fromName?.hsnCode) {
    return normalizeHsnCode(fromName.hsnCode);
  }

  const fromDatabase = lookupHsnByProductName(name, category);
  if (fromDatabase?.hsnCode) {
    return normalizeHsnCode(fromDatabase.hsnCode);
  }

  return '';
}

module.exports = {
  normalizeHsnCode,
  lookupDefaultHsn,
  resolveProductHsn,
  resolveHsnCodeOnly,
};
