const mongoose = require('mongoose');
const { ROLES, hasPermission, RESOURCES, ACTIONS } = require('@/config/permissions');
const { logAudit } = require('@/services/auditService');
const { generate: uniqueId } = require('shortid');

const list = async (req, res) => {
  if (!hasPermission(req.admin.role, RESOURCES.admin, ACTIONS.list)) {
    return res.status(403).json({ success: false, result: null, message: 'Permission denied.' });
  }
  const Admin = mongoose.model('Admin');
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.items) || 20, 100);
  const skip = (page - 1) * limit;
  const storeFilter = req.storeId ? { store: req.storeId } : {};
  const [result, count] = await Promise.all([
    Admin.find({ removed: false, ...storeFilter })
      .select('name surname email role enabled photo created')
      .skip(skip)
      .limit(limit)
      .sort({ created: -1 })
      .lean()
      .exec(),
    Admin.countDocuments({ removed: false, ...storeFilter }),
  ]);
  const pages = Math.ceil(count / limit);
  return res.status(200).json({
    success: true,
    result,
    pagination: { page, pages, count },
    message: 'Successfully found admins',
  });
};

const create = async (req, res) => {
  if (!hasPermission(req.admin.role, RESOURCES.admin, ACTIONS.create)) {
    return res.status(403).json({ success: false, result: null, message: 'Permission denied.' });
  }
  const Admin = mongoose.model('Admin');
  const AdminPassword = mongoose.model('AdminPassword');
  const { email, name, surname, role, password, enabled } = req.body;
  if (!email || !name || !password) {
    return res.status(400).json({
      success: false,
      result: null,
      message: 'Email, name and password are required.',
    });
  }
  const allowedRoles = Object.values(ROLES);
  const assignRole = role && allowedRoles.includes(role) ? role : ROLES.viewer;
  if (assignRole === ROLES.owner && req.admin.role !== ROLES.owner) {
    return res.status(403).json({ success: false, result: null, message: 'Only owner can create owner accounts.' });
  }
  const existingQuery = { email: email.toLowerCase(), removed: false };
  if (req.storeId) existingQuery.store = req.storeId;
  const existing = await Admin.findOne(existingQuery);
  if (existing) {
    return res.status(409).json({ success: false, result: null, message: 'An admin with this email already exists.' });
  }
  const newAdmin = await Admin.create({
    email: email.toLowerCase(),
    name,
    surname: surname || '',
    role: assignRole,
    enabled: enabled !== false,
    removed: false,
    store: req.storeId,
  });
  const salt = uniqueId();
  const hash = require('bcryptjs').hashSync(salt + password);
  await AdminPassword.create({
    user: newAdmin._id,
    password: hash,
    salt,
    emailVerified: false,
    removed: false,
  });
  logAudit({
    userId: req.admin._id,
    email: req.admin.email,
    role: req.admin.role,
    action: 'create',
    resource: 'admin',
    resourceId: String(newAdmin._id),
    details: { email: newAdmin.email, role: assignRole },
    ip: req.ip || req.connection?.remoteAddress,
    userAgent: req.get('user-agent'),
    requestId: req.id,
  }).catch(() => {});

  const result = await Admin.findById(newAdmin._id).select('name surname email role enabled photo created').lean();
  return res.status(200).json({
    success: true,
    result: { ...result, _id: newAdmin._id },
    message: 'Admin created successfully.',
  });
};

const update = async (req, res) => {
  if (!hasPermission(req.admin.role, RESOURCES.admin, ACTIONS.update)) {
    return res.status(403).json({ success: false, result: null, message: 'Permission denied.' });
  }
  const Admin = mongoose.model('Admin');
  const targetId = req.params.id;
  if (String(req.admin._id) === String(targetId)) {
    return res.status(400).json({ success: false, result: null, message: 'Use profile to update yourself.' });
  }
  const targetQuery = { _id: targetId, removed: false };
  if (req.storeId) targetQuery.store = req.storeId;
  const target = await Admin.findOne(targetQuery);
  if (!target) {
    return res.status(404).json({ success: false, result: null, message: 'Admin not found.' });
  }
  if (target.role === ROLES.owner && req.admin.role !== ROLES.owner) {
    return res.status(403).json({ success: false, result: null, message: 'Only owner can modify owner accounts.' });
  }
  const { name, surname, role, enabled } = req.body;
  const updates = {};
  if (name !== undefined) updates.name = name;
  if (surname !== undefined) updates.surname = surname;
  if (enabled !== undefined) updates.enabled = enabled;
  if (role !== undefined) {
    if (target.role === ROLES.owner && role !== ROLES.owner) {
      return res.status(403).json({ success: false, result: null, message: 'Cannot demote the only owner.' });
    }
    if (role === ROLES.owner && req.admin.role !== ROLES.owner) {
      return res.status(403).json({ success: false, result: null, message: 'Only owner can assign owner role.' });
    }
    if (Object.values(ROLES).includes(role)) updates.role = role;
  }
  const result = await Admin.findByIdAndUpdate(targetId, updates, { new: true, runValidators: true })
    .select('name surname email role enabled photo created')
    .lean();
  logAudit({
    userId: req.admin._id,
    email: req.admin.email,
    role: req.admin.role,
    action: 'update',
    resource: 'admin',
    resourceId: targetId,
    details: updates,
    ip: req.ip || req.connection?.remoteAddress,
    userAgent: req.get('user-agent'),
    requestId: req.id,
  }).catch(() => {});
  return res.status(200).json({ success: true, result, message: 'Admin updated successfully.' });
};

const remove = async (req, res) => {
  if (!hasPermission(req.admin.role, RESOURCES.admin, ACTIONS.delete)) {
    return res.status(403).json({ success: false, result: null, message: 'Permission denied.' });
  }
  const Admin = mongoose.model('Admin');
  const targetId = req.params.id;
  if (String(req.admin._id) === String(targetId)) {
    return res.status(400).json({ success: false, result: null, message: 'You cannot delete your own account.' });
  }
  const targetQuery = { _id: targetId, removed: false };
  if (req.storeId) targetQuery.store = req.storeId;
  const target = await Admin.findOne(targetQuery);
  if (!target) {
    return res.status(404).json({ success: false, result: null, message: 'Admin not found.' });
  }
  if (target.role === ROLES.owner) {
    const ownerCountQuery = { role: ROLES.owner, removed: false };
    if (req.storeId) ownerCountQuery.store = req.storeId;
    const ownerCount = await Admin.countDocuments(ownerCountQuery);
    if (ownerCount <= 1) {
      return res.status(403).json({ success: false, result: null, message: 'Cannot delete the last owner.' });
    }
    if (req.admin.role !== ROLES.owner) {
      return res.status(403).json({ success: false, result: null, message: 'Only owner can delete owner accounts.' });
    }
  }
  await Admin.findByIdAndUpdate(targetId, { $set: { removed: true } });
  logAudit({
    userId: req.admin._id,
    email: req.admin.email,
    role: req.admin.role,
    action: 'delete',
    resource: 'admin',
    resourceId: targetId,
    ip: req.ip || req.connection?.remoteAddress,
    userAgent: req.get('user-agent'),
    requestId: req.id,
  }).catch(() => {});
  return res.status(200).json({ success: true, result: { _id: targetId }, message: 'Admin removed successfully.' });
};

module.exports = { list, create, update, remove };
