const mongoose = require('mongoose');

const Model = mongoose.model('Expense');

const summary = async (req, res) => {
  const match = { removed: false };
  if (req.storeId) match.store = req.storeId;

  const statuses = ['pending', 'paid', 'cancelled'];

  const [totals, statusBreakdown, categoryBreakdown] = await Promise.all([
    Model.aggregate([
      { $match: { ...match, status: { $ne: 'cancelled' } } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
    Model.aggregate([
      { $match: match },
      { $group: { _id: '$status', count: { $sum: 1 }, total_amount: { $sum: '$amount' } } },
    ]),
    Model.aggregate([
      { $match: { ...match, status: { $ne: 'cancelled' } } },
      {
        $group: {
          _id: { $ifNull: ['$categoryName', 'Uncategorized'] },
          count: { $sum: 1 },
          total_amount: { $sum: '$amount' },
        },
      },
      { $sort: { total_amount: -1 } },
      { $limit: 10 },
    ]),
  ]);

  const totalData = totals[0] || { total: 0, count: 0 };
  const totalCount = statusBreakdown.reduce((acc, item) => acc + item.count, 0) || 1;

  const performance = statuses.map((status) => {
    const found = statusBreakdown.find((item) => item._id === status);
    return {
      status,
      count: found?.count || 0,
      percentage: Math.round(((found?.count || 0) / totalCount) * 100),
      total_amount: found?.total_amount || 0,
    };
  });

  return res.status(200).json({
    success: true,
    result: {
      total: totalData.total,
      count: totalData.count,
      performance,
      byCategory: categoryBreakdown.map((item) => ({
        category: item._id,
        count: item.count,
        total: item.total_amount,
      })),
    },
    message: 'Expense summary loaded successfully',
  });
};

module.exports = summary;
