require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });
const { globSync } = require('glob');
const fs = require('fs');
const { generate: uniqueId } = require('shortid');

const mongoose = require('mongoose');
mongoose.connect(process.env.DATABASE);

async function setupApp() {
  try {
    const Store = require('../models/coreModels/Store');
    const Admin = require('../models/coreModels/Admin');
    const AdminPassword = require('../models/coreModels/AdminPassword');
    const Setting = require('../models/coreModels/Setting');
    const PaymentMode = require('../models/appModels/PaymentMode');
    const Taxes = require('../models/appModels/Taxes');

    const store = await Store.findOneAndUpdate(
      { slug: 'main' },
      {
        name: 'Main Store',
        slug: 'main',
        subscriptionPlan: 'professional',
        subscriptionStatus: 'active',
        removed: false,
      },
      { upsert: true, new: true }
    );
    console.log('👍 Store created : Done! (slug: main)');

    const newAdminPassword = new AdminPassword();
    const salt = uniqueId();
    const passwordHash = newAdminPassword.generateHash(salt, 'admin123');

    const demoAdmin = {
      email: 'admin@admin.com',
      name: 'Saltum',
      surname: 'Admin',
      enabled: true,
      role: 'owner',
      store: store._id,
    };
    const result = await new Admin(demoAdmin).save();

    await new AdminPassword({
      password: passwordHash,
      emailVerified: true,
      salt,
      user: result._id,
    }).save();
    console.log('👍 Admin created : Done! (Login: admin@admin.com / Store: main)');

    const settingFiles = [];
    const settingsFiles = globSync('./src/setup/defaultSettings/**/*.json');
    for (const filePath of settingsFiles) {
      const file = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      settingFiles.push(...file);
    }
    const settingsWithStore = settingFiles.map((s) => ({ ...s, store: store._id }));
    await Setting.insertMany(settingsWithStore);
    console.log('👍 Settings created : Done!');

    await Taxes.insertMany([
      { taxName: 'Tax 0%', taxValue: 0, isDefault: true, store: store._id },
    ]);
    console.log('👍 Taxes created : Done!');

    await PaymentMode.insertMany([
      {
        name: 'Default Payment',
        description: 'Default Payment Mode (Cash, Wire Transfer)',
        isDefault: true,
        store: store._id,
      },
    ]);
    console.log('👍 PaymentMode created : Done!');

    console.log('🥳 Setup completed! Login with Store: main, Email: admin@admin.com, Password: admin123');
    process.exit();
  } catch (e) {
    console.log('\n🚫 Error! The Error info is below');
    console.log(e);
    process.exit();
  }
}

setupApp();
