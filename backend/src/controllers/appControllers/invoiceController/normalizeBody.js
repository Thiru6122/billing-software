function refId(value) {
  if (!value) return value;
  if (typeof value === 'object') return value._id || value.id || undefined;
  return value;
}

function normalizeInvoiceBody(body = {}) {
  const next = { ...body };

  if (next.client) {
    const clientId = refId(next.client);
    if (clientId) next.client = clientId;
    else delete next.client;
  }

  if (next.notes == null) next.notes = '';

  if (Array.isArray(next.items)) {
    next.items = next.items.map((item) => {
      if (!item) return item;
      const row = {
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
      if (row.product) {
        const productId = refId(row.product);
        if (productId) row.product = String(productId);
        else delete row.product;
      }
      if (row.description == null) row.description = '';
      if (row._id != null) row._id = String(row._id);
      return row;
    });
  }

  return next;
}

module.exports = { normalizeInvoiceBody };
