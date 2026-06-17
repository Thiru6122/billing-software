/**
 * One-time migration: add Store and set store on all existing documents.
 * Run: node src/setup/migrateAddStore.js
 * Use this if you had data before multi-tenant (store) was added.
 */
require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');
const path = require('path');
const { globSync } = require('glob');
const fs = require('fs');

mongoose.connect(process.env.DATABASE);

async function migrate() {
  const Store = require('../models/coreModels/Store');
  const Admin = require('../models/coreModels/Admin');
  const Setting = require('../models/coreModels/Setting');
  const Client = require('../models/appModels/Client');
  const Invoice = require('../models/appModels/Invoice');
  const Quote = require('../models/appModels/Quote');
  const Payment = require('../models/appModels/Payment');
  const PaymentMode = require('../models/appModels/PaymentMode');
  const Taxes = require('../models/appModels/Taxes');

  let store = await Store.findOne({ slug: 'main' });
  if (!store) {
    store = await Store.create({
      name: 'Main Store',
      slug: 'main',
      subscriptionPlan: 'professional',
      subscriptionStatus: 'active',
      removed: false,
    });
    console.log('Created store: main');
  }
  const storeId = store._id;

  const adminUpdated = await Admin.updateMany(
    { $or: [{ store: { $exists: false } }, { store: null }] },
    { $set: { store: storeId } }
  );
  if (adminUpdated.modifiedCount) console.log('Updated Admins:', adminUpdated.modifiedCount);

  for (const Model of [Setting, Client, Invoice, Quote, Payment, PaymentMode, Taxes]) {
    if (!Model.schema.paths.store) continue;
    const r = await Model.updateMany(
      { $or: [{ store: { $exists: false } }, { store: null }] },
      { $set: { store: storeId } }
    );
    if (r.modifiedCount) console.log(`${Model.modelName} updated:`, r.modifiedCount);
  }

  console.log('Migration done. Login with store: main');
  process.exit(0);
}

migrate().catch((e) => {
  console.error(e);
  process.exit(1);
});
