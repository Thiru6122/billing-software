const mongoose = require('mongoose');
const moment = require('moment');

const Model = mongoose.model('Purchase');

const summary = async (req, res) => {
  let defaultType = 'month';
  const { type } = req.query;

  if (type) {
    if (['week', 'month', 'year'].includes(type)) {
      defaultType = type;
    } else {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'Invalid type',
      });
    }
  }

  const statuses = ['draft', 'ordered', 'received', 'cancelled'];

  const result = await Model.aggregate([
    {
      $match: {
        removed: false,
      },
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        total_amount: { $sum: '$total' },
      },
    },
    {
      $group: {
        _id: null,
        total_count: { $sum: '$count' },
        results: { $push: '$$ROOT' },
      },
    },
    { $unwind: '$results' },
    {
      $project: {
        _id: 0,
        status: '$results._id',
        count: '$results.count',
        percentage: {
          $round: [{ $multiply: [{ $divide: ['$results.count', '$total_count'] }, 100] }, 0],
        },
        total_amount: '$results.total_amount',
      },
    },
    { $sort: { status: 1 } },
  ]);

  statuses.forEach((status) => {
    const found = result.find((item) => item.status === status);
    if (!found) {
      result.push({
        status,
        count: 0,
        percentage: 0,
        total_amount: 0,
      });
    }
  });

  const total = result.reduce((acc, item) => acc + (item.total_amount || 0), 0);

  return res.status(200).json({
    success: true,
    result: {
      total,
      type: defaultType,
      performance: result,
    },
    message: `Successfully found all purchases for the last ${defaultType}`,
  });
};

module.exports = summary;
