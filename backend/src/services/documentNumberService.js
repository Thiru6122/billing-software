const mongoose = require('mongoose');

function buildDocumentNumberMatch({ storeId, year }) {
  const match = { removed: false };
  if (storeId) match.store = storeId;

  if (year != null) {
    const y = Number(year);
    match.$or = [{ year: y }, { year: String(y) }];
  }

  return match;
}

async function getMaxDocumentNumber(Model, { storeId, year }) {
  const match = buildDocumentNumberMatch({ storeId, year });

  const [result] = await Model.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        maxNumber: {
          $max: {
            $convert: {
              input: '$number',
              to: 'double',
              onError: 0,
              onNull: 0,
            },
          },
        },
      },
    },
  ]);

  const maxNumber = result?.maxNumber;
  return Number.isFinite(maxNumber) ? maxNumber : 0;
}

async function syncSettingValue(settingKey, storeId, value) {
  const num = Number(value);
  if (!settingKey || !Number.isFinite(num) || num < 0) return;

  const Setting = mongoose.model('Setting');
  const filter = { settingKey, removed: false };
  if (storeId) filter.store = storeId;

  await Setting.findOneAndUpdate(filter, { $set: { settingValue: num } });
}

async function isNumberTaken(Model, { storeId, year, number, excludeId }) {
  const numericNumber = Number(number);
  const numericYear = Number(year);
  const filter = {
    removed: false,
    $and: [
      { $or: [{ number: numericNumber }, { number: String(numericNumber) }] },
      { $or: [{ year: numericYear }, { year: String(numericYear) }] },
    ],
  };

  if (storeId) filter.store = storeId;
  if (excludeId) filter._id = { $ne: excludeId };

  const existing = await Model.findOne(filter).select('_id').lean();
  return Boolean(existing);
}

async function peekNextNumber({ storeId, Model, year }) {
  const maxInDb = await getMaxDocumentNumber(Model, { storeId, year });
  return maxInDb + 1;
}

async function reserveNextNumber({ storeId, settingKey, Model, year }) {
  for (let attempt = 0; attempt < 10; attempt++) {
    const maxInDb = await getMaxDocumentNumber(Model, { storeId, year });
    const number = maxInDb + 1;

    const taken = await isNumberTaken(Model, { storeId, year, number });
    if (!taken) {
      await syncSettingValue(settingKey, storeId, number);
      return number;
    }
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
  syncSettingValue,
};
