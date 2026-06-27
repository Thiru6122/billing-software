const mongoose = require('mongoose');
const { assignBarcodeToProduct } = require('@/services/barcodeLabelService');

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

  const barcode = String(req.body.barcode || '').trim();
  if (!barcode) {
    return res.status(400).json({
      success: false,
      result: null,
      message: 'Scan a printed barcode label before saving the product.',
    });
  }

  req.body.barcode = barcode;
  if (req.storeId && Model.schema.paths.store) req.body.store = req.storeId;

  try {
    await assignBarcodeToProduct({
      storeId: req.storeId,
      barcode,
      productId: previous._id,
      previousBarcode: previous.barcode,
    });
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
    message: 'Product updated and barcode mapped successfully.',
  });
};

module.exports = update;
