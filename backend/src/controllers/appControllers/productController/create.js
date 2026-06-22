const mongoose = require('mongoose');
const { logAudit } = require('@/services/auditService');
const { assignBarcodeToProduct } = require('@/services/barcodeLabelService');

const create = async (req, res) => {
  const Model = mongoose.model('Product');

  req.body.removed = false;
  if (req.storeId && Model.schema.paths.store) req.body.store = req.storeId;

  const barcode = String(req.body.barcode || '').trim();
  if (!barcode) {
    return res.status(400).json({
      success: false,
      result: null,
      message: 'Scan a printed barcode label before saving the product.',
    });
  }
  req.body.barcode = barcode;

  let result;
  try {
    result = await new Model({ ...req.body }).save();
    await assignBarcodeToProduct({
      storeId: req.storeId,
      barcode,
      productId: result._id,
    });
  } catch (err) {
    if (result?._id) {
      await Model.findByIdAndDelete(result._id);
    }
    return res.status(400).json({
      success: false,
      result: null,
      message: err.message,
    });
  }

  if (req.admin) {
    logAudit({
      userId: req.admin._id,
      email: req.admin.email,
      role: req.admin.role,
      action: 'create',
      resource: Model.modelName.toLowerCase(),
      resourceId: result._id ? String(result._id) : undefined,
      ip: req.ip || req.connection?.remoteAddress,
      userAgent: req.get('user-agent'),
      requestId: req.id,
    }).catch(() => {});
  }

  return res.status(200).json({
    success: true,
    result,
    message: 'Product saved and barcode mapped successfully.',
  });
};

module.exports = create;
