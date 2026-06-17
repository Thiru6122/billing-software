/**
 * Vercel serverless entry: mounts the Express API at /api
 * Set env vars in Vercel: DATABASE, JWT_SECRET, etc.
 */
const path = require('path');
const backendDir = path.join(__dirname, '..', 'backend');

process.chdir(backendDir);
require(path.join(backendDir, 'node_modules/dotenv/config'));
require(path.join(backendDir, 'node_modules/module-alias/register'));

const mongoose = require('mongoose');
const { globSync } = require('glob');
const serverless = require('serverless-http');

let app;
let cachedConnection;

function loadModels() {
  const modelsFiles = globSync('./src/models/**/*.js');
  for (const filePath of modelsFiles) {
    require(path.resolve(backendDir, filePath));
  }
}

function getApp() {
  if (app) return app;
  loadModels();
  app = require(path.join(backendDir, 'src/app'));
  return app;
}

module.exports = async (req, res) => {
  if (!cachedConnection && process.env.DATABASE) {
    try {
      await mongoose.connect(process.env.DATABASE);
      cachedConnection = true;
    } catch (e) {
      console.error('MongoDB connect error:', e.message);
      res.status(503).json({ success: false, message: 'Service unavailable' });
      return;
    }
  }
  const expressApp = getApp();
  const handler = serverless(expressApp, { binary: ['image/*', 'application/pdf'] });
  return handler(req, res);
};
