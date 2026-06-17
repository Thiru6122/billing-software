const { logAudit } = require('@/services/auditService');

const create = async (Model, req, res) => {
  req.body.removed = false;
  if (req.storeId && Model.schema.paths.store) req.body.store = req.storeId;
  const result = await new Model({
    ...req.body,
  }).save();

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

  // Returning successfull response
  return res.status(200).json({
    success: true,
    result,
    message: 'Successfully Created the document in Model ',
  });
};

module.exports = create;
