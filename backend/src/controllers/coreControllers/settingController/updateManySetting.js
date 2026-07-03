const mongoose = require('mongoose');

const Model = mongoose.model('Setting');

const KEY_CATEGORY = {
  company_pan: 'company_settings',
  company_bank_account_name: 'company_settings',
  company_bank_account_number: 'company_settings',
  company_bank_name: 'company_settings',
  company_bank_ifsc: 'company_settings',
  company_bank_branch: 'company_settings',
  invoice_terms_conditions: 'company_settings',
};

const updateManySetting = async (req, res) => {
  let settingsHasError = false;
  const updateDataArray = [];
  const { settings, settingsCategory = 'company_settings' } = req.body;

  if (!Array.isArray(settings)) {
    return res.status(202).json({
      success: false,
      result: null,
      message: 'No settings provided ',
    });
  }

  for (const setting of settings) {
    if (!Object.prototype.hasOwnProperty.call(setting, 'settingKey')) {
      settingsHasError = true;
      break;
    }

    const { settingKey, settingValue } = setting;
    const filter = { settingKey };
    if (req.storeId) filter.store = req.storeId;

    const category = KEY_CATEGORY[settingKey] || settingsCategory;

    updateDataArray.push({
      updateOne: {
        filter,
        update: {
          $set: { settingValue: settingValue ?? '' },
          $setOnInsert: {
            settingCategory: category,
            valueType: 'string',
            enabled: true,
            removed: false,
            ...(req.storeId ? { store: req.storeId } : {}),
          },
        },
        upsert: true,
      },
    });
  }

  if (updateDataArray.length === 0) {
    return res.status(202).json({
      success: false,
      result: null,
      message: 'No settings provided ',
    });
  }

  if (settingsHasError) {
    return res.status(202).json({
      success: false,
      result: null,
      message: 'Settings provided has Error',
    });
  }

  await Model.bulkWrite(updateDataArray);

  return res.status(200).json({
    success: true,
    result: [],
    message: 'we update all settings',
  });
};

module.exports = updateManySetting;
