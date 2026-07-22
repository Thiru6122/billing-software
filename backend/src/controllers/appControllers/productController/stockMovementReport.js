const mongoose = require('mongoose');
const moment = require('moment');

const Invoice = mongoose.model('Invoice');

const MOVEMENT_TYPES = ['sale', 'return'];
const RETURN_STATUSES = ['cancelled', 'refunded'];

function buildStoreMatch(req) {
  const match = { removed: false };
  if (req.storeId) {
    match.store = new mongoose.Types.ObjectId(req.storeId);
  }
  return match;
}

function resolveDateRange(query) {
  const period = query.period || 'month';

  if (period === 'range' && query.startDate && query.endDate) {
    const start = moment(query.startDate);
    const end = moment(query.endDate);
    if (!start.isValid() || !end.isValid() || end.isBefore(start)) {
      return null;
    }
    return {
      startDate: start.startOf('day').toDate(),
      endDate: end.endOf('day').toDate(),
      period: 'range',
      groupBy: 'day',
      label: `${start.format('YYYY-MM-DD')} — ${end.format('YYYY-MM-DD')}`,
    };
  }

  if (period === 'year') {
    const year = parseInt(query.year, 10) || moment().year();
    return {
      startDate: moment().year(year).startOf('year').toDate(),
      endDate: moment().year(year).endOf('year').toDate(),
      period: 'year',
      groupBy: 'month',
      year,
      label: String(year),
    };
  }

  const month = parseInt(query.month, 10) || moment().month() + 1;
  const year = parseInt(query.year, 10) || moment().year();
  const monthMoment = moment().year(year).month(month - 1);

  return {
    startDate: monthMoment.clone().startOf('month').toDate(),
    endDate: monthMoment.clone().endOf('month').toDate(),
    period: 'month',
    groupBy: 'day',
    month,
    year,
    label: monthMoment.format('MMMM YYYY'),
  };
}

function emptyByType() {
  return { sale: 0, return: 0 };
}

function buildInvoiceLineStages(filters = {}) {
  const stages = [
    { $unwind: '$items' },
    {
      $addFields: {
        movementType: {
          $cond: [{ $in: ['$status', RETURN_STATUSES] }, 'return', 'sale'],
        },
        quantityChange: {
          $cond: [
            { $in: ['$status', RETURN_STATUSES] },
            '$items.quantity',
            { $multiply: ['$items.quantity', -1] },
          ],
        },
        movementDate: '$date',
        lineValue: {
          $ifNull: ['$items.total', { $multiply: ['$items.quantity', '$items.price'] }],
        },
      },
    },
    {
      $addFields: {
        valueChange: {
          $cond: [
            { $in: ['$status', RETURN_STATUSES] },
            '$lineValue',
            { $multiply: ['$lineValue', -1] },
          ],
        },
        product: '$items.product',
        itemName: '$items.itemName',
        itemPrice: '$items.price',
        itemTotal: '$lineValue',
        invoiceId: '$_id',
        invoiceNumber: '$number',
        invoiceYear: '$year',
        invoiceStatus: '$status',
        customerName: '$customerName',
        reference: { $concat: ['invoice:', { $toString: '$_id' }] },
        note: {
          $concat: [
            'Invoice #',
            { $toString: '$number' },
            '/',
            { $toString: '$year' },
            ' — ',
            '$items.itemName',
          ],
        },
        lineId: {
          $concat: [
            { $toString: '$_id' },
            '-',
            { $toString: { $ifNull: ['$items._id', '$items.itemName'] } },
          ],
        },
      },
    },
  ];

  if (filters.productId && mongoose.Types.ObjectId.isValid(filters.productId)) {
    stages.push({
      $match: {
        product: new mongoose.Types.ObjectId(filters.productId),
      },
    });
  }

  if (filters.movementType && MOVEMENT_TYPES.includes(filters.movementType)) {
    stages.push({ $match: { movementType: filters.movementType } });
  } else if (filters.movementType) {
    stages.push({ $match: { movementType: '__none__' } });
  }

  return stages;
}

function typeSumField(type) {
  return {
    $sum: {
      $cond: [{ $eq: ['$movementType', type] }, '$quantityChange', 0],
    },
  };
}

function buildPeriodAggregation(groupFormat) {
  return [
    {
      $group: {
        _id: { $dateToString: { format: groupFormat, date: '$movementDate' } },
        totalIn: {
          $sum: { $cond: [{ $gt: ['$quantityChange', 0] }, '$quantityChange', 0] },
        },
        totalOut: {
          $sum: {
            $cond: [{ $lt: ['$quantityChange', 0] }, { $abs: '$quantityChange' }, 0],
          },
        },
        netChange: { $sum: '$quantityChange' },
        valueIn: {
          $sum: { $cond: [{ $gt: ['$valueChange', 0] }, '$valueChange', 0] },
        },
        valueOut: {
          $sum: {
            $cond: [{ $lt: ['$valueChange', 0] }, { $abs: '$valueChange' }, 0],
          },
        },
        count: { $sum: 1 },
        sale: typeSumField('sale'),
        returnQty: typeSumField('return'),
      },
    },
    {
      $project: {
        _id: 0,
        period: '$_id',
        totalIn: 1,
        totalOut: 1,
        netChange: 1,
        valueIn: 1,
        valueOut: 1,
        count: 1,
        byType: {
          sale: '$sale',
          return: '$returnQty',
        },
      },
    },
    { $sort: { period: 1 } },
  ];
}

function fillPeriodGaps(rows, startDate, endDate, groupBy) {
  const map = Object.fromEntries(rows.map((row) => [row.period, row]));
  const filled = [];
  const cursor = moment(startDate);
  const end = moment(endDate);

  if (groupBy === 'month') {
    cursor.startOf('month');
    end.startOf('month');
    while (cursor.isSameOrBefore(end, 'month')) {
      const key = cursor.format('YYYY-MM');
      filled.push(
        map[key] || {
          period: key,
          totalIn: 0,
          totalOut: 0,
          netChange: 0,
          valueIn: 0,
          valueOut: 0,
          count: 0,
          byType: emptyByType(),
        }
      );
      cursor.add(1, 'month');
    }
    return filled;
  }

  cursor.startOf('day');
  end.startOf('day');
  while (cursor.isSameOrBefore(end, 'day')) {
    const key = cursor.format('YYYY-MM-DD');
    filled.push(
      map[key] || {
        period: key,
        totalIn: 0,
        totalOut: 0,
        netChange: 0,
        valueIn: 0,
        valueOut: 0,
        count: 0,
        byType: emptyByType(),
      }
    );
    cursor.add(1, 'day');
  }
  return filled;
}

function summarizeRows(rows) {
  const summary = {
    totalIn: 0,
    totalOut: 0,
    netChange: 0,
    valueIn: 0,
    valueOut: 0,
    movementCount: 0,
    byType: emptyByType(),
  };

  rows.forEach((row) => {
    summary.totalIn += row.totalIn || 0;
    summary.totalOut += row.totalOut || 0;
    summary.netChange += row.netChange || 0;
    summary.valueIn += row.valueIn || 0;
    summary.valueOut += row.valueOut || 0;
    summary.movementCount += row.count || 0;
    MOVEMENT_TYPES.forEach((type) => {
      summary.byType[type] += row.byType?.[type] || 0;
    });
  });

  return summary;
}

function mapMovementRow(row) {
  const productDoc = row.productDoc?.[0];
  const adminDoc = row.createdByDoc?.[0];

  return {
    _id: row.lineId,
    created: row.movementDate,
    product: productDoc
      ? {
          _id: productDoc._id,
          name: productDoc.name || row.itemName,
          sku: productDoc.sku,
          cost: productDoc.cost,
          price: productDoc.price,
        }
      : { name: row.itemName },
    movementType: row.movementType,
    quantityChange: row.quantityChange,
    valueChange: row.valueChange,
    reference: row.reference,
    note: row.note,
    itemName: row.itemName,
    itemPrice: row.itemPrice,
    itemTotal: row.itemTotal,
    invoiceId: row.invoiceId,
    invoiceNumber: row.invoiceNumber,
    invoiceYear: row.invoiceYear,
    invoiceStatus: row.invoiceStatus,
    customerName: row.customerName,
    createdByName: adminDoc
      ? [adminDoc.name, adminDoc.surname].filter(Boolean).join(' ')
      : null,
  };
}

const stockMovementReport = async (req, res) => {
  const range = resolveDateRange(req.query);
  if (!range) {
    return res.status(400).json({
      success: false,
      message: 'Invalid date range. Provide valid startDate and endDate.',
    });
  }

  const filters = {
    productId: req.query.productId,
    movementType: req.query.movementType,
  };

  const storeMatch = buildStoreMatch(req);
  const dateMatch = {
    ...storeMatch,
    date: { $gte: range.startDate, $lte: range.endDate },
  };

  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(10, parseInt(req.query.limit, 10) || 25));
  const skip = (page - 1) * limit;

  const groupFormat = range.groupBy === 'month' ? '%Y-%m' : '%Y-%m-%d';
  const lineStages = buildInvoiceLineStages(filters);
  const linePipeline = [{ $match: dateMatch }, ...lineStages];
  const allLinesPipeline = [{ $match: storeMatch }, ...buildInvoiceLineStages(filters)];

  const [
    periodRows,
    productBreakdown,
    typeBreakdown,
    yearlyRollup,
    movementTotalResult,
    movementRows,
  ] = await Promise.all([
    Invoice.aggregate([...linePipeline, ...buildPeriodAggregation(groupFormat)]),
    Invoice.aggregate([
      ...linePipeline,
      {
        $lookup: {
          from: 'products',
          localField: 'product',
          foreignField: '_id',
          as: 'productDoc',
        },
      },
      {
        $group: {
          _id: { product: '$product', itemName: '$itemName' },
          totalIn: {
            $sum: { $cond: [{ $gt: ['$quantityChange', 0] }, '$quantityChange', 0] },
          },
          totalOut: {
            $sum: {
              $cond: [{ $lt: ['$quantityChange', 0] }, { $abs: '$quantityChange' }, 0],
            },
          },
          netChange: { $sum: '$quantityChange' },
          movementCount: { $sum: 1 },
          productName: { $first: { $arrayElemAt: ['$productDoc.name', 0] } },
          productSku: { $first: { $arrayElemAt: ['$productDoc.sku', 0] } },
          valueChange: { $sum: '$valueChange' },
          revenue: { $sum: '$itemTotal' },
        },
      },
      { $sort: { movementCount: -1 } },
      { $limit: 50 },
      {
        $project: {
          _id: 0,
          productId: '$_id.product',
          productName: {
            $ifNull: ['$productName', '$_id.itemName'],
          },
          productSku: 1,
          totalIn: 1,
          totalOut: 1,
          netChange: 1,
          movementCount: 1,
          valueChange: 1,
          revenue: 1,
        },
      },
    ]),
    Invoice.aggregate([
      ...linePipeline,
      {
        $group: {
          _id: '$movementType',
          count: { $sum: 1 },
          quantityTotal: { $sum: '$quantityChange' },
          valueTotal: { $sum: '$valueChange' },
          totalIn: {
            $sum: { $cond: [{ $gt: ['$quantityChange', 0] }, '$quantityChange', 0] },
          },
          totalOut: {
            $sum: {
              $cond: [{ $lt: ['$quantityChange', 0] }, { $abs: '$quantityChange' }, 0],
            },
          },
          revenue: { $sum: '$itemTotal' },
        },
      },
      {
        $project: {
          _id: 0,
          movementType: '$_id',
          count: 1,
          quantityTotal: 1,
          valueTotal: 1,
          totalIn: 1,
          totalOut: 1,
          revenue: 1,
        },
      },
      { $sort: { count: -1 } },
    ]),
    Invoice.aggregate([
      ...allLinesPipeline,
      {
        $group: {
          _id: { $year: '$movementDate' },
          totalIn: {
            $sum: { $cond: [{ $gt: ['$quantityChange', 0] }, '$quantityChange', 0] },
          },
          totalOut: {
            $sum: {
              $cond: [{ $lt: ['$quantityChange', 0] }, { $abs: '$quantityChange' }, 0],
            },
          },
          netChange: { $sum: '$quantityChange' },
          valueIn: {
            $sum: { $cond: [{ $gt: ['$valueChange', 0] }, '$valueChange', 0] },
          },
          valueOut: {
            $sum: {
              $cond: [{ $lt: ['$valueChange', 0] }, { $abs: '$valueChange' }, 0],
            },
          },
          count: { $sum: 1 },
          revenue: { $sum: '$itemTotal' },
        },
      },
      {
        $project: {
          _id: 0,
          year: '$_id',
          totalIn: 1,
          totalOut: 1,
          netChange: 1,
          valueIn: 1,
          valueOut: 1,
          count: 1,
          revenue: 1,
        },
      },
      { $sort: { year: -1 } },
    ]),
    Invoice.aggregate([...linePipeline, { $count: 'total' }]),
    Invoice.aggregate([
      ...linePipeline,
      { $sort: { movementDate: -1, invoiceNumber: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: 'products',
          localField: 'product',
          foreignField: '_id',
          as: 'productDoc',
        },
      },
      {
        $lookup: {
          from: 'admins',
          localField: 'createdBy',
          foreignField: '_id',
          as: 'createdByDoc',
        },
      },
    ]),
  ]);

  const periodStats = fillPeriodGaps(
    periodRows,
    range.startDate,
    range.endDate,
    range.groupBy
  ).map((row) => ({
    ...row,
    date: range.groupBy === 'day' ? row.period : undefined,
    month: range.groupBy === 'month' ? row.period : undefined,
  }));

  const summary = summarizeRows(periodStats);
  const movementTotal = movementTotalResult[0]?.total || 0;
  const movements = movementRows.map(mapMovementRow);

  return res.status(200).json({
    success: true,
    result: {
      source: 'invoice',
      period: {
        type: range.period,
        startDate: range.startDate,
        endDate: range.endDate,
        label: range.label,
        groupBy: range.groupBy,
        month: range.month,
        year: range.year,
      },
      summary,
      periodStats,
      productBreakdown,
      typeBreakdown,
      yearlyRollup,
      movements,
      pagination: {
        page,
        limit,
        total: movementTotal,
        pages: Math.ceil(movementTotal / limit) || 1,
      },
    },
    message: 'Stock movement report loaded from invoices',
  });
};

module.exports = stockMovementReport;
