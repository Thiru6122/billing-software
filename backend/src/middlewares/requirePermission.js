const { hasPermission, RESOURCES } = require('@/config/permissions');

/**
 * Require permission for a resource and action.
 * Use after adminAuth.isValidAuthToken so req.admin exists.
 * @param {string} resource - RESOURCES.*
 * @param {string} action - create|read|update|delete|list|manage
 */
function requirePermission(resource, action) {
  return (req, res, next) => {
    const admin = req.admin;
    if (!admin) {
      return res.status(401).json({
        success: false,
        result: null,
        message: 'Authentication required.',
        jwtExpired: true,
      });
    }
    const role = admin.role || 'viewer';
    if (hasPermission(role, resource, action)) {
      return next();
    }
    return res.status(403).json({
      success: false,
      result: null,
      message: 'You do not have permission to perform this action.',
    });
  };
}

module.exports = { requirePermission, RESOURCES };
