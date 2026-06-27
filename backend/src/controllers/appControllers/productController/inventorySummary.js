const mongoose = require('mongoose');

const inventorySummary = async (req, res) => {
  const Product = mongoose.model('Product');
  const StockMovement = mongoose.model('StockMovement');
  const query = { removed: false, enabled: true };
  if (req.storeId) query.store = req.storeId;

  const products = await Product.find(query).lean();
  const totalProducts = products.length;
  const totalStockValue = products.reduce((sum, p) => sum + (p.quantity || 0) * (p.cost || p.price || 0), 0);
  const totalRetailValue = products.reduce((sum, p) => sum + (p.quantity || 0) * (p.price || 0), 0);
  const lowStockItems = products
    .filter((p) => (p.quantity || 0) <= (p.minQuantity || 0))
    .sort((a, b) => (a.quantity || 0) - (b.quantity || 0))
    .slice(0, 50);

  const movementQuery = {};
  if (req.storeId) movementQuery.store = req.storeId;
  const recentMovements = await StockMovement.find(movementQuery)
    .sort({ created: -1 })
    .limit(20)
    .populate('product', 'name sku')
    .lean();

  return res.status(200).json({
    success: true,
    result: {
      totalProducts,
      totalStockValue,
      totalRetailValue,
      lowStockCount: lowStockItems.length,
      lowStockItems,
      recentMovements,
    },
    message: 'Inventory summary',
  });
};

module.exports = inventorySummary;
