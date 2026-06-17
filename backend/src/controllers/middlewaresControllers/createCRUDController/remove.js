const { logAudit } = require('@/services/auditService');

const remove = async (Model, req, res) => {
  // Find the document by id and delete it
  let updates = {
    removed: true,
  };
  const filterQuery = { _id: req.params.id };
  if (req.storeId && Model.schema.paths.store) filterQuery.store = req.storeId;
  const result = await Model.findOneAndUpdate(
    filterQuery,
    { $set: updates },
    {
      new: true,
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
      action: 'delete',
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
    message: 'Successfully Deleted the document ',
  });
};

module.exports = remove;
