const createCRUDController = require('@/controllers/middlewaresControllers/createCRUDController');
const { adjustProductStock } = require('@/services/stockService');

const summary = require('./summary');
const inventorySummary = require('./inventorySummary');
const adjustStock = require('./adjustStock');
const importProducts = require('./importProducts');
const lookupByBarcode = require('./lookupByBarcode');
const generateBarcodes = require('./generateBarcodes');
const generateLabelBatch = require('./generateLabelBatch');
const labelPool = require('./labelPool');
const printBarcodeLabels = require('./printBarcodeLabels');
const create = require('./create');
const update = require('./update');

function modelController() {
  const methods = createCRUDController('Product');
  methods.create = create;
  methods.update = update;
  methods.summary = (req, res) => summary(req, res);
  methods.inventorySummary = (req, res) => inventorySummary(req, res);
  methods.adjustStock = (req, res) => adjustStock(req, res);
  methods.importProducts = (req, res) => importProducts(req, res);
  methods.lookupByBarcode = (req, res) => lookupByBarcode(req, res);
  methods.generateBarcodes = (req, res) => generateBarcodes(req, res);
  methods.generateLabelBatch = (req, res) => generateLabelBatch(req, res);
  methods.labelPool = (req, res) => labelPool(req, res);
  methods.printBarcodeLabels = (req, res) => printBarcodeLabels(req, res);
  return methods;
}

module.exports = modelController();
