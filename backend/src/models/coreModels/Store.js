const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const storeSchema = new Schema({
  removed: { type: Boolean, default: false },
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  logo: { type: String },
  // Subscription for multi-tenant SaaS
  subscriptionPlan: {
    type: String,
    enum: ['free', 'starter', 'professional', 'enterprise'],
    default: 'free',
  },
  subscriptionStatus: {
    type: String,
    enum: ['active', 'trialing', 'past_due', 'cancelled', 'incomplete'],
    default: 'active',
  },
  subscriptionCurrentPeriodEnd: { type: Date },
  // Optional limits (enforced in API when needed)
  limitUsers: { type: Number, default: 5 },
  limitInvoices: { type: Number, default: 100 },
  created: { type: Date, default: Date.now },
  updated: { type: Date, default: Date.now },
});

storeSchema.index({ slug: 1 });
storeSchema.index({ subscriptionStatus: 1 });

module.exports = mongoose.model('Store', storeSchema);
