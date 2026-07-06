const mongoose = require('mongoose');

async function getMaxDocumentNumber(Model, { storeId, year }) {
  const filter = { store: storeId, removed: false };
  if (year != null) filter.year = year;

  const maxDoc = await Model.findOne(filter).sort({ number: -1 }).select('number').lean();
  return maxDoc?.number || 0;
}

async function readSettingValue(settingKey, storeId) {
  const Setting = mongoose.model('Setting');
  const filter = { settingKey, removed: false };
  if (storeId) filter.store = storeId;

  const doc = await Setting.findOne(filter).select('settingValue').lean();
  const value = Number(doc?.settingValue);
  return Number.isFinite(value) ? value : 0;
}

async function bumpSetting(settingKey, storeId, minimum) {
  const Setting = mongoose.model('Setting');
  const filter = { settingKey, removed: false };
  if (storeId) filter.store = storeId;

  await Setting.findOneAndUpdate(filter, { $max: { settingValue: minimum } });

  const updated = await Setting.findOneAndUpdate(filter, { $inc: { settingValue: 1 } }, { new: true });

  if (!updated) {
    const err = new Error(`Setting not found: ${settingKey}`);
    err.code = 'SETTING_NOT_FOUND';
    throw err;
  }

  return Number(updated.settingValue);
}

async function isNumberTaken(Model, { storeId, year, number, excludeId }) {
  const filter = { store: storeId, year, number, removed: false };
  if (excludeId) filter._id = { $ne: excludeId };

  const existing = await Model.findOne(filter).select('_id').lean();
  return Boolean(existing);
}

async function peekNextNumber({ storeId, settingKey, Model, year }) {
  const maxInDb = await getMaxDocumentNumber(Model, { storeId, year });
  const settingValue = await readSettingValue(settingKey, storeId);
  return Math.max(maxInDb, settingValue) + 1;
}

async function reserveNextNumber({ storeId, settingKey, Model, year }) {
  const Setting = mongoose.model('Setting');
  const settingFilter = { settingKey, removed: false };
  if (storeId) settingFilter.store = storeId;

  for (let attempt = 0; attempt < 10; attempt++) {
    const maxInDb = await getMaxDocumentNumber(Model, { storeId, year });
    const settingValue = await readSettingValue(settingKey, storeId);
    const floor = Math.max(maxInDb, settingValue);
    const number = await bumpSetting(settingKey, storeId, floor);

    const taken = await isNumberTaken(Model, { storeId, year, number });
    if (!taken) return number;

    await Setting.findOneAndUpdate(settingFilter, { $set: { settingValue: number } });
  }

  const err = new Error('Could not reserve a unique document number');
  err.code = 'NUMBER_RESERVE_FAILED';
  throw err;
}

async function assertNumberAvailable(Model, { storeId, year, number, excludeId }) {
  const taken = await isNumberTaken(Model, { storeId, year, number, excludeId });
  if (!taken) return;

  const err = new Error(`Number ${number} already exists for year ${year}`);
  err.code = 'DUPLICATE_NUMBER';
  err.status = 400;
  throw err;
}

module.exports = {
  getMaxDocumentNumber,
  peekNextNumber,
  reserveNextNumber,
  assertNumberAvailable,
};
