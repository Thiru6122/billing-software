const mongoose = require('mongoose');

const summary = async (req, res) => {
  const Product = mongoose.model('Product');
  const query = { removed: false };
  if (req.storeId) query.store = req.storeId;

  const [totalProducts, lowStockCount] = await Promise.all([
    Product.countDocuments(query),
    Product.countDocuments({ ...query, $expr: { $lte: ['$quantity', '$minQuantity'] } }),
  ]);

  return res.status(200).json({
    success: true,
    result: { total: totalProducts, lowStock: lowStockCount },
    message: 'Product summary',
  });
};

module.exports = summary;
