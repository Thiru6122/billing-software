const { getLabelPoolSummary } = require('@/services/barcodeLabelService');

const labelPool = async (req, res) => {
  const summary = await getLabelPoolSummary(req.storeId);
  return res.status(200).json({
    success: true,
    result: summary,
    message: 'Label pool summary',
  });
};

module.exports = labelPool;
