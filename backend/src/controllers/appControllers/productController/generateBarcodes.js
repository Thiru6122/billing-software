const mongoose = require('mongoose');

function generateBarcodeValue() {
  const suffix = Math.floor(Math.random() * 900 + 100);
  return `890${Date.now()}${suffix}`;
}

const generateBarcodes = async (req, res) => {
  const Product = mongoose.model('Product');
  const { productIds } = req.body || {};

  const query = {
    removed: false,
    $or: [{ barcode: { $exists: false } }, { barcode: null }, { barcode: '' }],
  };
  if (req.storeId) query.store = req.storeId;
  if (Array.isArray(productIds) && productIds.length > 0) {
    query._id = { $in: productIds };
  }

  const products = await Product.find(query);
  if (!products.length) {
    return res.status(200).json({
      success: true,
      result: [],
      message: 'All selected products already have barcodes.',
    });
  }

  const updated = [];
  for (const product of products) {
    product.barcode = generateBarcodeValue();
    product.updated = new Date();
    await product.save();
    updated.push(product);
  }

  return res.status(200).json({
    success: true,
    result: updated,
    message: `Generated barcodes for ${updated.length} product(s).`,
  });
};

module.exports = generateBarcodes;
