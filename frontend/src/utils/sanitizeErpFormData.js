export function refId(value) {
  if (!value) return value;
  if (typeof value === 'object') return value._id || value.id || undefined;
  return value;
}

export function sanitizeErpItem(item) {
  if (!item) return item;
  const next = {
    _id: item._id,
    product: item.product,
    itemName: item.itemName,
    hsnCode: item.hsnCode,
    gstRate: item.gstRate,
    description: item.description,
    quantity: item.quantity,
    price: item.price,
    total: item.total,
  };
  const productId = refId(next.product);
  if (productId) next.product = productId;
  else delete next.product;
  if (next.description == null) next.description = '';
  if (next._id != null) next._id = String(next._id);
  return next;
}

export function sanitizeErpFormData(data = {}) {
  const next = { ...data };
  const clientId = refId(next.client);
  if (clientId) next.client = clientId;
  else if (next.client) delete next.client;

  const supplierId = refId(next.supplier);
  if (supplierId) next.supplier = supplierId;
  else if (next.supplier) delete next.supplier;

  if (next.notes == null) next.notes = '';

  if (Array.isArray(next.items)) {
    next.items = next.items.map(sanitizeErpItem);
  }

  return next;
}

export function normalizeErpFormValues(data = {}) {
  const next = { ...data };
  const clientId = refId(next.client);
  if (clientId) next.client = clientId;

  const supplierId = refId(next.supplier);
  if (supplierId) next.supplier = supplierId;

  if (next.notes == null) next.notes = '';

  if (Array.isArray(next.items)) {
    next.items = next.items.map((item) => {
      if (!item) return item;
      const row = { ...item };
      const productId = refId(row.product);
      if (productId) row.product = productId;
      else delete row.product;
      if (row.description == null) row.description = '';
      return row;
    });
  }

  return next;
}
