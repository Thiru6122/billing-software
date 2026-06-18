const mongoose = require('mongoose');
const { logAudit } = require('@/services/auditService');

function generateBarcode() {
  const suffix = Math.floor(Math.random() * 900 + 100);
  return `890${Date.now()}${suffix}`;
}

const create = async (req, res) => {
  const Model = mongoose.model('Product');

  req.body.removed = false;
  if (req.storeId && Model.schema.paths.store) req.body.store = req.storeId;

  if (!req.body.barcode || !String(req.body.barcode).trim()) {
    req.body.barcode = generateBarcode();
  } else {
    req.body.barcode = String(req.body.barcode).trim();
  }

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
    message: 'Product created successfully',
  });
};

module.exports = create;
