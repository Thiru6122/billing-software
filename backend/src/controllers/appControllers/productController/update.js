const mongoose = require('mongoose');
const { resolveProductBarcode } = require('@/services/barcodeLabelService');
const { applyProductLabelDefaults } = require('@/utils/productLabelDefaults');
const { resolveProductHsn } = require('@/services/productHsnService');

const update = async (req, res) => {
  const Model = mongoose.model('Product');

  const previous = await Model.findOne({ _id: req.params.id, removed: false, store: req.storeId });
  if (!previous) {
    return res.status(404).json({
      success: false,
      result: null,
      message: 'Product not found',
    });
  }

  let barcode;
  try {
    barcode = await resolveProductBarcode({
      storeId: req.storeId,
      barcode: req.body.barcode ?? previous.barcode,
      productId: previous._id,
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      result: null,
      message: err.message,
    });
  }

  req.body.barcode = barcode;
  if (req.storeId && Model.schema.paths.store) req.body.store = req.storeId;
  Object.assign(req.body, applyProductLabelDefaults({ ...previous.toObject(), ...req.body }));

  try {
    const merged = { ...previous.toObject(), ...req.body };
    const hsnFields = await resolveProductHsn({
      storeId: req.storeId,
      hsnCode: req.body.hsnCode ?? merged.hsnCode,
      category: req.body.category ?? merged.category,
      taxRate: req.body.taxRate ?? merged.taxRate,
      name: req.body.name ?? merged.name,
    });
    Object.assign(req.body, hsnFields);
  } catch (err) {
    return res.status(400).json({
      success: false,
      result: null,
      message: err.message,
    });
  }

  const result = await Model.findOneAndUpdate(
    { _id: req.params.id, removed: false, store: req.storeId },
    req.body,
    { new: true }
  ).exec();

  return res.status(200).json({
    success: true,
    result,
    message: 'Product updated successfully.',
  });
};

module.exports = update;
