const jwt = require('jsonwebtoken');

const mongoose = require('mongoose');

const isValidAuthToken = async (req, res, next, { userModel, jwtSecret = 'JWT_SECRET' }) => {
  try {
    const UserPassword = mongoose.model(userModel + 'Password');
    const User = mongoose.model(userModel);

    // const token = req.cookies[`token_${cloud._id}`];
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Extract the token

    if (!token)
      return res.status(401).json({
        success: false,
        result: null,
        message: 'No authentication token, authorization denied.',
        jwtExpired: true,
      });

    const verified = jwt.verify(token, process.env[jwtSecret]);

    if (!verified)
      return res.status(401).json({
        success: false,
        result: null,
        message: 'Token verification failed, authorization denied.',
        jwtExpired: true,
      });

    const query = { _id: verified.id, removed: false };
    if (verified.storeId) query.store = verified.storeId;
    const userPasswordPromise = UserPassword.findOne({ user: verified.id, removed: false });
    const userPromise = User.findOne(query).populate('store');

    const [user, userPassword] = await Promise.all([userPromise, userPasswordPromise]);

    if (!user)
      return res.status(401).json({
        success: false,
        result: null,
        message: "User doesn't exist or store mismatch, authorization denied.",
        jwtExpired: true,
      });

    if (!userPassword || !userPassword.loggedSessions.includes(token))
      return res.status(401).json({
        success: false,
        result: null,
        message: 'Session expired or invalid. Please log in again.',
        jwtExpired: true,
      });

    const reqUserName = userModel.toLowerCase();
    req[reqUserName] = user;
    req.storeId = user.store && (user.store._id || user.store);
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: error.message,
      error: error,
      controller: 'isValidAuthToken',
      jwtExpired: true,
    });
  }
};

module.exports = isValidAuthToken;
