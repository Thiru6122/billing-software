const mongoose = require('mongoose');
const { adjustProductStock } = require('@/services/stockService');

/**
 * Import products from JSON array (parsed CSV on frontend).
 * Body: { products: [{ name, sku, quantity, price, cost, barcode, unit, minQuantity, category }] }
 */
const importProducts = async (req, res) => {
  const Product = mongoose.model('Product');
  const { products } = req.body;

  if (!Array.isArray(products) || products.length === 0) {
    return res.status(400).json({
      success: false,
      result: null,
      message: 'products array is required.',
    });
  }

  const results = { created: 0, updated: 0, errors: [] };

  for (let i = 0; i < products.length; i++) {
    const row = products[i];
    const name = (row.name || row.Name || '').toString().trim();
    if (!name) {
      results.errors.push({ row: i + 1, message: 'Name is required' });
      continue;
    }

    const sku = (row.sku || row.SKU || row.Sku || '').toString().trim();
    const quantity = Number(row.quantity ?? row.Quantity ?? row.qty ?? 0) || 0;
    const price = Number(row.price ?? row.Price ?? 0) || 0;
    const cost = Number(row.cost ?? row.Cost ?? 0) || 0;
    const barcode = (row.barcode || row.Barcode || '').toString().trim();
    const unit = (row.unit || row.Unit || 'pcs').toString().trim();
    const minQuantity = Number(row.minQuantity ?? row.min_quantity ?? row.MinQuantity ?? 0) || 0;
    const category = (row.category || row.Category || '').toString().trim();

    try {
      let product;
      if (sku) {
        product = await Product.findOne({ store: req.storeId, sku, removed: false });
      }
      if (!product) {
        product = await Product.findOne({ store: req.storeId, name, removed: false });
      }

      if (product) {
        product.price = price || product.price;
        product.cost = cost || product.cost;
        if (barcode) product.barcode = barcode;
        if (unit) product.unit = unit;
        product.minQuantity = minQuantity;
        if (category) product.category = category;
        product.updated = new Date();
        await product.save();

        if (quantity !== 0) {
          await adjustProductStock({
            productId: product._id,
            storeId: req.storeId,
            delta: quantity,
            movementType: 'import',
            note: `CSV import row ${i + 1}`,
            adminId: req.admin?._id,
          });
        }
        results.updated++;
      } else {
        product = await Product.create({
          store: req.storeId,
          name,
          sku: sku || undefined,
          barcode: barcode || undefined,
          price,
          cost,
          quantity: 0,
          minQuantity,
          unit,
          category: category || undefined,
          enabled: true,
          removed: false,
        });

        if (quantity > 0) {
          await adjustProductStock({
            productId: product._id,
            storeId: req.storeId,
            delta: quantity,
            movementType: 'import',
            note: `CSV import row ${i + 1}`,
            adminId: req.admin?._id,
          });
        }
        results.created++;
      }
    } catch (err) {
      results.errors.push({ row: i + 1, message: err.message });
    }
  }

  return res.status(200).json({
    success: true,
    result: results,
    message: `Import complete: ${results.created} created, ${results.updated} updated.`,
  });
};

module.exports = importProducts;
