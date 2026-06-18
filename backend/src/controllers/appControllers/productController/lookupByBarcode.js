const mongoose = require('mongoose');

const lookupByBarcode = async (req, res) => {
  const Product = mongoose.model('Product');
  const code = (req.params.code || '').trim();

  if (!code) {
    return res.status(400).json({
      success: false,
      result: null,
      message: 'Barcode is required.',
    });
  }

  const query = { barcode: code, removed: false, enabled: true };
  if (req.storeId) query.store = req.storeId;

  const product = await Product.findOne(query).lean();

  if (!product) {
    return res.status(404).json({
      success: false,
      result: null,
      message: `No product found for barcode: ${code}`,
    });
  }

  return res.status(200).json({
    success: true,
    result: product,
    message: 'Product found',
  });
};

module.exports = lookupByBarcode;
