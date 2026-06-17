const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const auditLogSchema = new Schema({
  user: { type: mongoose.Schema.ObjectId, ref: 'Admin' },
  userId: { type: mongoose.Schema.Types.ObjectId },
  email: { type: String },
  role: { type: String },
  action: { type: String, required: true }, // create, update, delete, login, logout
  resource: { type: String, required: true }, // client, invoice, quote, payment, admin, setting, etc.
  resourceId: { type: String },
  details: { type: Schema.Types.Mixed },
  ip: { type: String },
  userAgent: { type: String },
  requestId: { type: String },
  created: { type: Date, default: Date.now },
});

auditLogSchema.index({ created: -1 });
auditLogSchema.index({ resource: 1, resourceId: 1 });
auditLogSchema.index({ user: 1, created: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
