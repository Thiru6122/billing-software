const mongoose = require('mongoose');

async function recordMovement({ storeId, productId, movementType, quantityChange, quantityBefore, quantityAfter, reference, note, adminId }) {
  const StockMovement = mongoose.model('StockMovement');
  await StockMovement.create({
    store: storeId,
    product: productId,
    movementType,
    quantityChange,
    quantityBefore,
    quantityAfter,
    reference,
    note,
    createdBy: adminId,
  });
}

async function adjustProductStock({ productId, storeId, delta, movementType, reference, note, adminId }) {
  const Product = mongoose.model('Product');
  const product = await Product.findOne({ _id: productId, store: storeId, removed: false });
  if (!product) throw new Error(`Product not found: ${productId}`);

  const quantityBefore = product.quantity || 0;
  const quantityAfter = Math.max(0, quantityBefore + delta);
  if (quantityBefore + delta < 0) {
    throw new Error(`Insufficient stock for "${product.name}". Available: ${quantityBefore}, requested: ${Math.abs(delta)}`);
  }

  product.quantity = quantityAfter;
  product.updated = new Date();
  await product.save();

  await recordMovement({
    storeId,
    productId: product._id,
    movementType,
    quantityChange: delta,
    quantityBefore,
    quantityAfter,
    reference,
    note,
    adminId,
  });

  return product;
}

async function checkInvoiceStock(items, storeId) {
  const Product = mongoose.model('Product');
  const errors = [];
  for (const item of items) {
    if (!item.product) continue;
    const product = await Product.findOne({ _id: item.product, store: storeId, removed: false });
    if (!product) {
      errors.push(`Product not found for line: ${item.itemName}`);
      continue;
    }
    if ((product.quantity || 0) < item.quantity) {
      errors.push(`Insufficient stock for "${product.name}". Available: ${product.quantity}, needed: ${item.quantity}`);
    }
  }
  return errors;
}

async function deductInvoiceStock(invoice, storeId, adminId) {
  if (invoice.stockDeducted) return;
  const items = invoice.items || [];
  for (const item of items) {
    if (!item.product) continue;
    await adjustProductStock({
      productId: item.product,
      storeId,
      delta: -item.quantity,
      movementType: 'sale',
      reference: `invoice:${invoice._id}`,
      note: `Invoice #${invoice.number}`,
      adminId,
    });
  }
  const Invoice = mongoose.model('Invoice');
  await Invoice.findByIdAndUpdate(invoice._id, { stockDeducted: true });
}

async function restoreInvoiceStock(invoice, storeId, adminId) {
  if (!invoice.stockDeducted) return;
  const items = invoice.items || [];
  for (const item of items) {
    if (!item.product) continue;
    await adjustProductStock({
      productId: item.product,
      storeId,
      delta: item.quantity,
      movementType: 'return',
      reference: `invoice:${invoice._id}`,
      note: `Restored from invoice #${invoice.number}`,
      adminId,
    });
  }
  const Invoice = mongoose.model('Invoice');
  await Invoice.findByIdAndUpdate(invoice._id, { stockDeducted: false });
}

function shouldDeductStock(invoice) {
  return invoice.status === 'sent' || invoice.paymentStatus === 'paid';
}

function shouldRestoreStock(invoice) {
  return invoice.status === 'cancelled';
}

module.exports = {
  adjustProductStock,
  recordMovement,
  checkInvoiceStock,
  deductInvoiceStock,
  restoreInvoiceStock,
  shouldDeductStock,
  shouldRestoreStock,
};
