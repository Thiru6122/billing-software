const { logAudit } = require('@/services/auditService');

const update = async (Model, req, res) => {
  // Find document by id and updates with the required fields
  req.body.removed = false;
  const filterQuery = { _id: req.params.id, removed: false };
  if (req.storeId && Model.schema.paths.store) filterQuery.store = req.storeId;
  const result = await Model.findOneAndUpdate(
    filterQuery,
    req.body,
    {
      new: true, // return the new result instead of the old one
      runValidators: true,
    }
  ).exec();
  if (!result) {
    return res.status(404).json({
      success: false,
      result: null,
      message: 'No document found ',
    });
  }
  if (req.admin) {
    logAudit({
      userId: req.admin._id,
      email: req.admin.email,
      role: req.admin.role,
      action: 'update',
      resource: Model.modelName.toLowerCase(),
      resourceId: req.params.id,
      ip: req.ip || req.connection?.remoteAddress,
      userAgent: req.get('user-agent'),
      requestId: req.id,
    }).catch(() => {});
  }
  return res.status(200).json({
    success: true,
    result,
    message: 'we update this document ',
  });
};

module.exports = update;
