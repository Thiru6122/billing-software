const mongoose = require('mongoose');

const list = async (req, res) => {
  const AuditLog = mongoose.model('AuditLog');
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.items) || 20, 100);
  const skip = (page - 1) * limit;
  const sortBy = req.query.sortBy || 'created';
  const sortValue = req.query.sortValue === '1' ? 1 : -1;
  const { resource, action, userId, from, to } = req.query;

  const query = {};
  if (resource) query.resource = resource;
  if (action) query.action = action;
  if (userId) query.user = userId;
  if (from || to) {
    query.created = {};
    if (from) query.created.$gte = new Date(from);
    if (to) query.created.$lte = new Date(to);
  }

  const [result, count] = await Promise.all([
    AuditLog.find(query).skip(skip).limit(limit).sort({ [sortBy]: sortValue }).lean().exec(),
    AuditLog.countDocuments(query),
  ]);

  const pages = Math.ceil(count / limit);
  return res.status(200).json({
    success: true,
    result,
    pagination: { page, pages, count },
    message: 'Successfully found audit logs',
  });
};

module.exports = { list };
