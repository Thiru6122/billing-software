import calculate from '@/utils/calculate';

export function buildInvoiceLineItem(product, quantity = 1, taxRate = 0) {
  const price = Number(product.price) || 0;
  const qty = Number(quantity) || 1;
  return {
    product: product._id,
    itemName: product.name,
    hsnCode: product.hsnCode || '',
    gstRate: Number(product.taxRate) || Number(taxRate) || 0,
    price,
    quantity: qty,
    total: Number.parseFloat(calculate.multiply(price, qty)),
    description: '',
  };
}

export function addProductToInvoice({ form, add, product, taxRate = 0 }) {
  const items = (form.getFieldValue('items') || []).filter((row) => row && row.itemName);

  const existingIndex = items.findIndex(
    (row) =>
      String(row.product) === String(product._id) ||
      String(row.product?._id) === String(product._id)
  );

  if (existingIndex >= 0) {
    const currentQty = Number(items[existingIndex].quantity) || 1;
    const nextQty = currentQty + 1;
    const price = Number(items[existingIndex].price) || Number(product.price) || 0;

    form.setFieldValue(['items', existingIndex, 'quantity'], nextQty);
    form.setFieldValue(['items', existingIndex, 'total'], calculate.multiply(price, nextQty));
  } else if (typeof add === 'function') {
    add(buildInvoiceLineItem(product, 1, taxRate));
  } else {
    form.setFieldValue('items', [...items, buildInvoiceLineItem(product, 1, taxRate)]);
  }

  return existingIndex >= 0;
}
