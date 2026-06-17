const mongoose = require('mongoose');

async function logAudit(options) {
  const AuditLog = mongoose.model('AuditLog');
  const doc = {
    user: options.userId,
    userId: options.userId,
    email: options.email,
    role: options.role,
    action: options.action,
    resource: options.resource,
    resourceId: options.resourceId || undefined,
    details: options.details || undefined,
    ip: options.ip,
    userAgent: options.userAgent,
    requestId: options.requestId,
  };
  try {
    await AuditLog.create(doc);
  } catch (err) {
    console.error('Audit log write failed:', err.message);
  }
}

function auditMiddleware(options) {
  const { resource, getResourceId } = options;
  return (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = function (body) {
      const status = res.statusCode;
      if (status >= 200 && status < 300 && req.admin) {
        const action = getAction(req.method);
        const resourceId = getResourceId ? getResourceId(req, body) : (req.params && req.params.id) || (body && body.result && body.result._id && String(body.result._id));
        logAudit({
          userId: req.admin._id,
          email: req.admin.email,
          role: req.admin.role,
          action,
          resource,
          resourceId,
          details: body && body.result ? { success: true } : undefined,
          ip: req.ip || req.connection?.remoteAddress,
          userAgent: req.get('user-agent'),
          requestId: req.id,
        }).catch(() => {});
      }
      return originalJson(body);
    };
    next();
  };
}

function getAction(method) {
  const map = { POST: 'create', PATCH: 'update', PUT: 'update', DELETE: 'delete', GET: 'read' };
  return map[method] || method;
}

module.exports = { logAudit, auditMiddleware, getAction };
