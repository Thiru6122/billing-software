const licenseService = require('@/services/licenseService');

const licenseLockMiddleware = async (req, res, next) => {
  try {
    const lockInfo = await licenseService.isLocked();
    if (!lockInfo.locked) return next();

    return res.status(423).json({
      success: false,
      result: lockInfo,
      message: lockInfo.message,
      licenseLocked: true,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = licenseLockMiddleware;
