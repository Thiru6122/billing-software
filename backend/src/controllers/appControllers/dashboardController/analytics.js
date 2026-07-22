const mongoose = require('mongoose');
const moment = require('moment');

const Invoice = mongoose.model('Invoice');
const Client = mongoose.model('Client');
const Supplier = mongoose.model('Supplier');
const Expense = mongoose.model('Expense');

function buildStoreMatch(req) {
  const match = { removed: false };
  if (req.storeId) {
    match.store = new mongoose.Types.ObjectId(req.storeId);
  }
  return match;
}

function expenseMatch(req) {
  return { ...buildStoreMatch(req), status: { $ne: 'cancelled' } };
}

function groupByDay(collection, dateField, storeMatch, startDate, endDate, extraMatch = {}) {
  return collection.aggregate([
    {
      $match: {
        ...storeMatch,
        ...extraMatch,
        [dateField]: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: `$${dateField}` } },
        count: { $sum: 1 },
      },
    },
    { $project: { _id: 0, date: '$_id', count: 1 } },
    { $sort: { date: 1 } },
  ]);
}

function groupExpenseAmountByDay(storeMatch, startDate, endDate) {
  return Expense.aggregate([
    {
      $match: {
        ...storeMatch,
        status: { $ne: 'cancelled' },
        date: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
        count: { $sum: 1 },
        total: { $sum: '$amount' },
      },
    },
    { $project: { _id: 0, date: '$_id', count: 1, total: 1 } },
    { $sort: { date: 1 } },
  ]);
}

const analytics = async (req, res) => {
  const days = Math.min(90, Math.max(7, parseInt(req.query.days, 10) || 30));
  const topLimit = Math.min(20, Math.max(5, parseInt(req.query.topLimit, 10) || 10));

  const storeMatch = buildStoreMatch(req);
  const expenseStoreMatch = expenseMatch(req);
  const endDate = moment().endOf('day').toDate();
  const startDate = moment().subtract(days - 1, 'days').startOf('day').toDate();

  const todayStart = moment().startOf('day').toDate();
  const todayEnd = moment().endOf('day').toDate();
  const monthStart = moment().startOf('month').toDate();
  const monthEnd = moment().endOf('month').toDate();
  const yearStart = moment().startOf('year').toDate();
  const yearEnd = moment().endOf('year').toDate();

  const [
    invoiceDaily,
    clientDaily,
    supplierDaily,
    expenseDaily,
    expenseAmountDaily,
    yearlyExpenses,
    topProducts,
    todayCounts,
    monthCounts,
    yearExpenseTotal,
    totals,
  ] = await Promise.all([
    groupByDay(Invoice, 'date', storeMatch, startDate, endDate),
    groupByDay(Client, 'created', storeMatch, startDate, endDate),
    groupByDay(Supplier, 'created', storeMatch, startDate, endDate),
    groupByDay(Expense, 'date', storeMatch, startDate, endDate, { status: { $ne: 'cancelled' } }),
    groupExpenseAmountByDay(storeMatch, startDate, endDate),
    Expense.aggregate([
      { $match: expenseStoreMatch },
      {
        $group: {
          _id: { $year: '$date' },
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $project: { _id: 0, year: '$_id', total: 1, count: 1 } },
      { $sort: { year: -1 } },
    ]),
    Invoice.aggregate([
      { $match: storeMatch },
      { $unwind: '$items' },
      {
        $group: {
          _id: {
            product: '$items.product',
            itemName: '$items.itemName',
          },
          quantitySold: { $sum: '$items.quantity' },
          revenue: { $sum: '$items.total' },
        },
      },
      { $sort: { quantitySold: -1 } },
      { $limit: topLimit },
      {
        $lookup: {
          from: 'products',
          localField: '_id.product',
          foreignField: '_id',
          as: 'productDoc',
        },
      },
      {
        $project: {
          _id: 0,
          productId: '$_id.product',
          itemName: '$_id.itemName',
          productName: {
            $ifNull: [{ $arrayElemAt: ['$productDoc.name', 0] }, '$_id.itemName'],
          },
          quantitySold: 1,
          revenue: 1,
        },
      },
    ]),
    Promise.all([
      Invoice.countDocuments({ ...storeMatch, date: { $gte: todayStart, $lte: todayEnd } }),
      Client.countDocuments({ ...storeMatch, created: { $gte: todayStart, $lte: todayEnd } }),
      Supplier.countDocuments({ ...storeMatch, created: { $gte: todayStart, $lte: todayEnd } }),
      Expense.countDocuments({
        ...expenseStoreMatch,
        date: { $gte: todayStart, $lte: todayEnd },
      }),
    ]),
    Promise.all([
      Invoice.countDocuments({ ...storeMatch, date: { $gte: monthStart, $lte: monthEnd } }),
      Client.countDocuments({ ...storeMatch, created: { $gte: monthStart, $lte: monthEnd } }),
      Supplier.countDocuments({ ...storeMatch, created: { $gte: monthStart, $lte: monthEnd } }),
      Expense.aggregate([
        {
          $match: {
            ...expenseStoreMatch,
            date: { $gte: monthStart, $lte: monthEnd },
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
    ]),
    Expense.aggregate([
      { $match: { ...expenseStoreMatch, date: { $gte: yearStart, $lte: yearEnd } } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
    Promise.all([
      Invoice.countDocuments(storeMatch),
      Client.countDocuments(storeMatch),
      Supplier.countDocuments(storeMatch),
      Expense.aggregate([
        { $match: expenseStoreMatch },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
    ]),
  ]);

  const invoiceMap = Object.fromEntries(invoiceDaily.map((r) => [r.date, r.count]));
  const clientMap = Object.fromEntries(clientDaily.map((r) => [r.date, r.count]));
  const supplierMap = Object.fromEntries(supplierDaily.map((r) => [r.date, r.count]));
  const expenseMap = Object.fromEntries(expenseDaily.map((r) => [r.date, r.count]));
  const expenseAmountMap = Object.fromEntries(
    expenseAmountDaily.map((r) => [r.date, { count: r.count, total: r.total }])
  );

  const dailyStats = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = moment().subtract(i, 'days').format('YYYY-MM-DD');
    dailyStats.push({
      date,
      invoices: invoiceMap[date] || 0,
      customers: clientMap[date] || 0,
      suppliers: supplierMap[date] || 0,
      expenses: expenseMap[date] || 0,
      expenseTotal: expenseAmountMap[date]?.total || 0,
    });
  }

  const monthExpense = monthCounts[3]?.[0] || { total: 0, count: 0 };
  const yearExpense = yearExpenseTotal?.[0] || { total: 0, count: 0 };
  const allTimeExpense = totals[3]?.[0] || { total: 0, count: 0 };

  return res.status(200).json({
    success: true,
    result: {
      dailyStats,
      yearlyExpenses,
      topProducts,
      today: {
        invoices: todayCounts[0],
        customers: todayCounts[1],
        suppliers: todayCounts[2],
        expenses: todayCounts[3],
      },
      thisMonth: {
        invoices: monthCounts[0],
        customers: monthCounts[1],
        suppliers: monthCounts[2],
        expenses: monthExpense.count || 0,
        expenseTotal: monthExpense.total || 0,
      },
      thisYear: {
        expenseTotal: yearExpense.total || 0,
        expenseCount: yearExpense.count || 0,
      },
      totals: {
        invoices: totals[0],
        customers: totals[1],
        suppliers: totals[2],
        expenseTotal: allTimeExpense.total || 0,
        expenseCount: allTimeExpense.count || 0,
      },
    },
    message: 'Dashboard analytics loaded successfully',
  });
};

module.exports = analytics;
