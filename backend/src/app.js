const express = require('express');

const cors = require('cors');
const compression = require('compression');
const path = require('path');
const fs = require('fs');

const cookieParser = require('cookie-parser');

const coreAuthRouter = require('./routes/coreRoutes/coreAuth');
const coreLicenseRouter = require('./routes/coreRoutes/coreLicense');
const coreApiRouter = require('./routes/coreRoutes/coreApi');
const coreDownloadRouter = require('./routes/coreRoutes/coreDownloadRouter');
const corePublicRouter = require('./routes/coreRoutes/corePublicRouter');
const adminAuth = require('./controllers/coreControllers/adminAuth');
const licenseLockMiddleware = require('./middleware/licenseLockMiddleware');

const errorHandlers = require('./handlers/errorHandlers');
const erpApiRouter = require('./routes/appRoutes/appApi');

const fileUpload = require('express-fileupload');
// create our Express app
const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(compression());

// // default options
// app.use(fileUpload());

// Here our API Routes

app.use('/api', coreAuthRouter);
app.use('/api', coreLicenseRouter);
app.use('/api', adminAuth.isValidAuthToken, licenseLockMiddleware, coreApiRouter);
app.use('/api', adminAuth.isValidAuthToken, licenseLockMiddleware, erpApiRouter);
app.use('/download', coreDownloadRouter);
app.use('/public', corePublicRouter);

const frontendDist = path.join(__dirname, '../../frontend/dist');
const serveFrontend =
  process.env.SERVE_FRONTEND === 'true' ||
  (process.env.NODE_ENV === 'production' && fs.existsSync(frontendDist));

if (serveFrontend) {
  app.use(express.static(frontendDist));
  app.get(/^(?!\/api|\/download|\/public).*/, (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    res.sendFile(path.join(frontendDist, 'index.html'), (err) => {
      if (err) next(err);
    });
  });
}

// If that above routes didnt work, we 404 them and forward to error handler
app.use(errorHandlers.notFound);

// production error handler
app.use(errorHandlers.productionErrors);

// done! we export it so we can start the site in start.js
module.exports = app;
