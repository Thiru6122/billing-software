const mongoose = require('mongoose');
const { logAudit } = require('@/services/auditService');
const { resolveProductBarcode } = require('@/services/barcodeLabelService');
const { applyProductLabelDefaults } = require('@/utils/productLabelDefaults');

const create = async (req, res) => {
  const Model = mongoose.model('Product');

  req.body.removed = false;
  if (req.storeId && Model.schema.paths.store) req.body.store = req.storeId;

  let barcode;
  try {
    barcode = await resolveProductBarcode({
      storeId: req.storeId,
      barcode: req.body.barcode,
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      result: null,
      message: err.message,
    });
  }
  req.body.barcode = barcode;
  Object.assign(req.body, applyProductLabelDefaults(req.body));

  const result = await new Model({ ...req.body }).save();

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
    message: 'Product saved successfully.',
  });
};

module.exports = create;
