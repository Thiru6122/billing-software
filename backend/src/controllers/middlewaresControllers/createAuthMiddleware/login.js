const Joi = require('joi');
const mongoose = require('mongoose');
const authUser = require('./authUser');

const login = async (req, res, { userModel }) => {
  const UserPasswordModel = mongoose.model(userModel + 'Password');
  const UserModel = mongoose.model(userModel);
  const Store = mongoose.model('Store');
  const { storeSlug, store: storeIdOrSlug, email, password } = req.body;
  let slug = (storeSlug || storeIdOrSlug || '').toString().toLowerCase().trim();
  if (!slug) slug = 'main';

  const objectSchema = Joi.object({
    email: Joi.string().email({ tlds: { allow: true } }).required(),
    password: Joi.string().required(),
  });

  const { error } = objectSchema.validate({ email, password });
  if (error) {
    return res.status(409).json({
      success: false,
      result: null,
      message: 'Email and password are required.',
      errorMessage: error.message,
    });
  }

  let store = await Store.findOne({ slug, removed: false });
  if (!store) {
    store = await Store.findOne({ removed: false });
  }
  if (!store) {
    return res.status(404).json({
      success: false,
      result: null,
      message: 'No store found. Run setup first: in the backend folder run "npm run setup"',
    });
  }

  if (store.subscriptionStatus !== 'active' && store.subscriptionStatus !== 'trialing') {
    return res.status(403).json({
      success: false,
      result: null,
      message: 'This store subscription is not active. Please renew to continue.',
    });
  }

  let user = await UserModel.findOne({ store: store._id, email: email.toLowerCase(), removed: false });
  if (!user) {
    user = await UserModel.findOne({ email: email.toLowerCase(), removed: false });
    if (user) {
      if (!user.store) {
        await UserModel.findByIdAndUpdate(user._id, { $set: { store: store._id } });
        user.store = store._id;
      } else {
        store = await Store.findById(user.store);
        if (!store || store.removed) store = await Store.findOne({ removed: false });
      }
    }
  }
  if (!user) {
    return res.status(404).json({
      success: false,
      result: null,
      message: 'No account with this email found. Use the correct store name, or run "npm run setup" in the backend folder.',
    });
  }

  const databasePassword = await UserPasswordModel.findOne({ user: user._id, removed: false });
  if (!databasePassword) {
    return res.status(401).json({
      success: false,
      result: null,
      message: 'Invalid credentials.',
    });
  }

  if (!user.enabled) {
    return res.status(409).json({
      success: false,
      result: null,
      message: 'Your account is disabled. Contact your store administrator.',
    });
  }

  authUser(req, res, {
    user,
    databasePassword,
    password,
    UserPasswordModel,
    store,
  });
};

module.exports = login;
