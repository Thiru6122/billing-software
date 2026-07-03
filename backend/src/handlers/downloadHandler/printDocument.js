const mongoose = require('mongoose');
const { buildDocumentHtml, wrapHtmlForPrint } = require('@/controllers/pdfController');

const SUPPORTED = new Set(['invoice', 'quote', 'payment', 'offer']);

module.exports = printDocument = async (req, res, { directory, id }) => {
  try {
    const dir = String(directory || '').toLowerCase();
    if (!SUPPORTED.has(dir)) {
      return res.status(404).json({
        success: false,
        result: null,
        message: `Print is not supported for '${directory}'`,
      });
    }

    const modelName = dir.slice(0, 1).toUpperCase() + dir.slice(1);
    if (!mongoose.models[modelName]) {
      return res.status(404).json({
        success: false,
        result: null,
        message: `Model '${modelName}' does not exist`,
      });
    }

    const Model = mongoose.model(modelName);
    const result = await Model.findOne({ _id: id }).exec();
    if (!result) {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'Document not found',
      });
    }

    const html = await buildDocumentHtml(modelName, result);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(wrapHtmlForPrint(html));
  } catch (error) {
    if (error.name === 'BSONTypeError') {
      return res.status(400).json({
        success: false,
        result: null,
        error: error.message,
        message: 'Invalid ID',
      });
    }

    return res.status(500).json({
      success: false,
      result: null,
      error: error.message,
      message: error.message,
      controller: 'printDocument.js',
    });
  }
};
