const mongoose = require('mongoose');
const Joi = require('joi');
const { globSync } = require('glob');
const fs = require('fs');
const path = require('path');
const { generate: uniqueId } = require('shortid');
const bcrypt = require('bcryptjs');

const schema = Joi.object({
  storeName: Joi.string().min(2).max(100).required(),
  storeSlug: Joi.string()
    .min(2)
    .max(50)
    .pattern(/^[a-z0-9-]+$/)
    .required(),
  email: Joi.string().email().required(),
  name: Joi.string().min(1).max(80).required(),
  surname: Joi.string().max(80).allow(''),
  password: Joi.string().min(6).required(),
});

async function registerStore(req, res) {
  try {
    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        result: null,
        message: error.details[0].message,
      });
    }

    const Store = mongoose.model('Store');
    const Admin = mongoose.model('Admin');
    const AdminPassword = mongoose.model('AdminPassword');
    const Setting = mongoose.model('Setting');
    const Taxes = mongoose.model('Taxes');
    const PaymentMode = mongoose.model('PaymentMode');

    const slug = value.storeSlug.toLowerCase().trim();
    const existingStore = await Store.findOne({ slug, removed: false });
    if (existingStore) {
      return res.status(409).json({
        success: false,
        result: null,
        message: 'This store name is already taken. Please choose another.',
      });
    }

    const store = await Store.create({
      name: value.storeName,
      slug,
      subscriptionPlan: 'free',
      subscriptionStatus: 'active',
      removed: false,
    });

    const adminPassword = new AdminPassword();
    const salt = uniqueId();
    const passwordHash = bcrypt.hashSync(salt + value.password, 10);

    const admin = await Admin.create({
      email: value.email.toLowerCase(),
      name: value.name,
      surname: value.surname || '',
      role: 'owner',
      enabled: true,
      store: store._id,
      removed: false,
    });

    await AdminPassword.create({
      user: admin._id,
      password: passwordHash,
      salt,
      emailVerified: false,
      removed: false,
    });

    const settingFiles = [];
    const settingsFiles = globSync(path.join(__dirname, '../../../setup/defaultSettings/**/*.json'));
    for (const filePath of settingsFiles) {
      const file = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      settingFiles.push(...file);
    }
    const settingsWithStore = settingFiles.map((s) => ({ ...s, store: store._id }));
    await Setting.insertMany(settingsWithStore);

    await Taxes.create({
      taxName: 'Tax 0%',
      taxValue: 0,
      isDefault: true,
      store: store._id,
    });

    await PaymentMode.create({
      name: 'Default Payment',
      description: 'Default Payment Mode (Cash, Wire Transfer)',
      isDefault: true,
      store: store._id,
    });

    return res.status(200).json({
      success: true,
      result: {
        store: {
          _id: store._id,
          name: store.name,
          slug: store.slug,
          subscriptionPlan: store.subscriptionPlan,
          subscriptionStatus: store.subscriptionStatus,
        },
        message: 'Store registered. You can now log in with your store slug and email.',
      },
      message: 'Store registered successfully',
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      result: null,
      message: err.message || 'Registration failed',
    });
  }
}

module.exports = { registerStore };
