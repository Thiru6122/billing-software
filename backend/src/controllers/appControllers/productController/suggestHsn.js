const { suggestHsnMatches, lookupHsnByProductName } = require('@/services/hsnLookupService');

const suggestHsn = async (req, res) => {
  const name = String(req.query.name || req.query.q || '').trim();
  const category = String(req.query.category || '').trim();

  if (!name) {
    return res.status(400).json({
      success: false,
      result: null,
      message: 'Product name is required.',
    });
  }

  const suggestions = suggestHsnMatches(name, category, 8);
  const best = lookupHsnByProductName(name, category);

  return res.status(200).json({
    success: true,
    result: {
      best,
      suggestions,
    },
    message: best
      ? `Suggested HSN ${best.hsnCode} from official GST database.`
      : 'No HSN match found for this product name.',
  });
};

module.exports = suggestHsn;
