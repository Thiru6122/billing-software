const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { logAudit } = require('@/services/auditService');

const authUser = async (req, res, { user, databasePassword, password, UserPasswordModel, store }) => {
  const isMatch = await bcrypt.compare(databasePassword.salt + password, databasePassword.password);

  if (!isMatch)
    return res.status(403).json({
      success: false,
      result: null,
      message: 'Invalid credentials.',
    });

  if (isMatch === true) {
    const storeId = store ? store._id : (user.store && (user.store._id || user.store));
    const token = jwt.sign(
      { id: user._id, storeId: storeId ? String(storeId) : undefined },
      process.env.JWT_SECRET,
      { expiresIn: req.body.remember ? 365 * 24 + 'h' : '24h' }
    );

    await UserPasswordModel.findOneAndUpdate(
      { user: user._id },
      { $push: { loggedSessions: token } },
      { new: true }
    ).exec();

    logAudit({
      userId: user._id,
      email: user.email,
      role: user.role,
      action: 'login',
      resource: 'auth',
      ip: req.ip || req.connection?.remoteAddress,
      userAgent: req.get('user-agent'),
      requestId: req.id,
    }).catch(() => {});

    const storeInfo = store
      ? {
          _id: store._id,
          name: store.name,
          slug: store.slug,
          subscriptionPlan: store.subscriptionPlan,
          subscriptionStatus: store.subscriptionStatus,
        }
      : undefined;

    res.status(200).json({
      success: true,
      result: {
        _id: user._id,
        name: user.name,
        surname: user.surname,
        role: user.role,
        email: user.email,
        photo: user.photo,
        token,
        store: storeInfo,
        maxAge: req.body.remember ? 365 : null,
      },
      message: 'Successfully logged in',
    });
  } else {
    return res.status(403).json({
      success: false,
      result: null,
      message: 'Invalid credentials.',
    });
  }
};

module.exports = authUser;
