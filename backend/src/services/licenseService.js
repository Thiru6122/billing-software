const crypto = require('crypto');
const LicenseState = require('@/models/coreModels/LicenseState');

const LICENSE_ENABLED = process.env.LICENSE_ENABLED !== 'false';
const LICENSOR_EMAIL = process.env.LICENSOR_EMAIL || 'thiru6122@gmail.com';

function getLockDays() {
  const raw = process.env.LICENSE_LOCK_DAYS || '1,2';
  return raw
    .split(',')
    .map((d) => parseInt(d.trim(), 10))
    .filter((d) => d >= 1 && d <= 31);
}

function isInLockWindow(date = new Date()) {
  const day = date.getDate();
  return getLockDays().includes(day);
}

function endOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

async function getState() {
  let state = await LicenseState.findOne({ key: 'global' });
  if (!state) {
    state = await LicenseState.create({ key: 'global' });
  }
  return state;
}

async function isLocked() {
  if (!LICENSE_ENABLED) {
    return { locked: false, reason: 'disabled' };
  }

  if (!isInLockWindow()) {
    return { locked: false, reason: 'outside_lock_window' };
  }

  const state = await getState();
  if (state.lockBypassUntil && state.lockBypassUntil > new Date()) {
    return { locked: false, reason: 'bypass_active', bypassUntil: state.lockBypassUntil };
  }

  return {
    locked: true,
    reason: 'payment_due',
    lockDays: getLockDays(),
    licensorEmail: LICENSOR_EMAIL,
    message:
      'Monthly subscription verification required. Request an OTP and contact Saltum support after payment.',
  };
}

function hashOtp(otp) {
  return crypto.createHash('sha256').update(String(otp)).digest('hex');
}

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function unlockUntilEndOfMonth(method) {
  const state = await getState();
  state.lockBypassUntil = endOfMonth();
  state.pendingOtpHash = undefined;
  state.pendingOtpExpires = undefined;
  state.lastUnlockAt = new Date();
  state.lastUnlockMethod = method;
  state.updated = new Date();
  await state.save();
  return state.lockBypassUntil;
}

async function createOtpRequest() {
  const otp = generateOtp();
  const state = await getState();
  state.pendingOtpHash = hashOtp(otp);
  state.pendingOtpExpires = new Date(Date.now() + 15 * 60 * 1000);
  state.updated = new Date();
  await state.save();
  return { otp, licensorEmail: LICENSOR_EMAIL };
}

async function verifyOtp(otp) {
  const state = await getState();
  if (!state.pendingOtpHash || !state.pendingOtpExpires) {
    const err = new Error('No OTP was requested. Click "Send OTP to vendor" first.');
    err.code = 'NO_OTP';
    throw err;
  }
  if (state.pendingOtpExpires < new Date()) {
    const err = new Error('OTP has expired. Request a new one.');
    err.code = 'OTP_EXPIRED';
    throw err;
  }
  if (hashOtp(otp) !== state.pendingOtpHash) {
    const err = new Error('Invalid OTP.');
    err.code = 'INVALID_OTP';
    throw err;
  }
  return unlockUntilEndOfMonth('otp');
}

module.exports = {
  LICENSOR_EMAIL,
  getLockDays,
  isInLockWindow,
  isLocked,
  createOtpRequest,
  verifyOtp,
};
