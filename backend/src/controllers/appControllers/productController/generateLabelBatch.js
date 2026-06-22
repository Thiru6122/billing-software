const { generateLabelBatch } = require('@/services/barcodeLabelService');

const generateLabelBatchHandler = async (req, res) => {
  const { count = 30 } = req.body || {};

  try {
    const labels = await generateLabelBatch(req.storeId, count);
    return res.status(200).json({
      success: true,
      result: labels.map((l) => ({ _id: l._id, code: l.code })),
      message: `Created ${labels.length} barcode label(s). Print them and stick on products before scanning.`,
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      result: null,
      message: err.message,
    });
  }
};

module.exports = generateLabelBatchHandler;
