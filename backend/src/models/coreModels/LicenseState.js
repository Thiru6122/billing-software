const mongoose = require('mongoose');

const licenseStateSchema = new mongoose.Schema({
  key: { type: String, default: 'global', unique: true },
  lockBypassUntil: { type: Date },
  pendingOtpHash: { type: String },
  pendingOtpExpires: { type: Date },
  lastUnlockAt: { type: Date },
  lastUnlockMethod: { type: String },
  updated: { type: Date, default: Date.now },
});

module.exports = mongoose.model('LicenseState', licenseStateSchema);
