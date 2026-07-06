const mongoose = require('mongoose');
const { resolveHsnCodeOnly } = require('@/services/productHsnService');

const backfillHsn = async (req, res) => {
  const Product = mongoose.model('Product');
  const { productIds, overwrite = false } = req.body || {};

  const query = { removed: false };
  if (req.storeId) query.store = req.storeId;

  if (!overwrite) {
    query.$or = [{ hsnCode: { $exists: false } }, { hsnCode: null }, { hsnCode: '' }];
  }

  if (Array.isArray(productIds) && productIds.length > 0) {
    query._id = { $in: productIds };
  }

  const products = await Product.find(query).sort({ name: 1 });

  if (!products.length) {
    return res.status(200).json({
      success: true,
      result: { updated: 0, skipped: 0, failed: [] },
      message: overwrite
        ? 'No products found to refresh.'
        : 'All products already have HSN codes.',
    });
  }

  let updated = 0;
  let skipped = 0;
  const failed = [];

  for (const product of products) {
    try {
      const hsnCode = await resolveHsnCodeOnly({
        storeId: req.storeId,
        name: product.name,
        category: product.category,
      });

      if (!hsnCode) {
        skipped += 1;
        continue;
      }

      product.hsnCode = hsnCode;
      product.updated = new Date();
      await product.save();
      updated += 1;
    } catch (err) {
      failed.push({
        id: product._id,
        name: product.name,
        error: err.message,
      });
    }
  }

  const parts = [`HSN codes set for ${updated} product(s).`];
  if (skipped > 0) parts.push(`${skipped} had no match.`);
  if (failed.length > 0) parts.push(`${failed.length} failed.`);

  return res.status(200).json({
    success: true,
    result: { updated, skipped, failed },
    message: parts.join(' '),
  });
};

module.exports = backfillHsn;
