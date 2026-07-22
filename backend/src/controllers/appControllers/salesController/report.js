const mongoose = require('mongoose');
const moment = require('moment');

const Invoice = mongoose.model('Invoice');

const INVOICE_VOID = ['cancelled', 'refunded'];
const QUOTE_VOID = ['cancelled', 'declined'];

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

function buildDocumentLineStages(source) {
  const isInvoice = source === 'invoice';

  return [
    { $unwind: '$items' },
    {
      $addFields: {
        source: { $literal: source },
        lineDate: '$date',
        documentId: '$_id',
        documentNumber: '$number',
        documentYear: '$year',
        documentStatus: '$status',
        paymentStatus: isInvoice ? '$paymentStatus' : null,
        customerName: '$customerName',
        clientId: '$client',
        product: '$items.product',
        itemName: '$items.itemName',
        hsnCode: '$items.hsnCode',
        gstRate: isInvoice ? '$items.gstRate' : null,
        quantity: '$items.quantity',
        itemPrice: '$items.price',
        itemTotal: {
          $ifNull: ['$items.total', { $multiply: ['$items.quantity', '$items.price'] }],
        },
        taxableValue: isInvoice ? '$items.taxableValue' : null,
        gstAmount: isInvoice ? '$items.gstAmount' : null,
        documentTotal: '$total',
        documentSubTotal: '$subTotal',
        documentTaxTotal: '$taxTotal',
        currency: '$currency',
        converted: isInvoice ? null : '$converted',
        createdBy: '$createdBy',
        lineId: {
          $concat: [
            { $literal: `${source}:` },
            { $toString: '$_id' },
            '-',
            { $toString: { $ifNull: ['$items._id', '$items.itemName'] } },
          ],
        },
        isActive: {
          $cond: [
            isInvoice
              ? { $not: { $in: ['$status', INVOICE_VOID] } }
              : { $not: { $in: ['$status', QUOTE_VOID] } },
            true,
            false,
          ],
        },
        effectiveRevenue: {
          $cond: [
            isInvoice
              ? { $not: { $in: ['$status', INVOICE_VOID] } }
              : { $not: { $in: ['$status', QUOTE_VOID] } },
            { $ifNull: ['$items.total', { $multiply: ['$items.quantity', '$items.price'] }] },
            0,
          ],
        },
      },
    },
  ];
}

function buildUnifiedPipeline(dateMatch, filters = {}) {
  const quoteMatch = { ...dateMatch };

  const pipeline = [
    { $match: dateMatch },
    ...buildDocumentLineStages('invoice'),
    {
      $unionWith: {
        coll: 'quotes',
        pipeline: [{ $match: quoteMatch }, ...buildDocumentLineStages('quote')],
      },
    },
  ];

  if (filters.source === 'invoice' || filters.source === 'quote') {
    pipeline.push({ $match: { source: filters.source } });
  }

  if (filters.productId && mongoose.Types.ObjectId.isValid(filters.productId)) {
    pipeline.push({
      $match: { product: new mongoose.Types.ObjectId(filters.productId) },
    });
  }

  if (filters.status) {
    pipeline.push({ $match: { documentStatus: filters.status } });
  }

  if (filters.clientId && mongoose.Types.ObjectId.isValid(filters.clientId)) {
    pipeline.push({
      $match: { clientId: new mongoose.Types.ObjectId(filters.clientId) },
    });
  }

  return pipeline;
}

function buildPeriodAggregation(groupFormat) {
  return [
    {
      $group: {
        _id: { $dateToString: { format: groupFormat, date: '$lineDate' } },
        invoiceRevenue: {
          $sum: {
            $cond: [{ $eq: ['$source', 'invoice'] }, '$effectiveRevenue', 0],
          },
        },
        quoteRevenue: {
          $sum: {
            $cond: [{ $eq: ['$source', 'quote'] }, '$effectiveRevenue', 0],
          },
        },
        totalRevenue: { $sum: '$effectiveRevenue' },
        invoiceQuantity: {
          $sum: { $cond: [{ $eq: ['$source', 'invoice'] }, '$quantity', 0] },
        },
        quoteQuantity: {
          $sum: { $cond: [{ $eq: ['$source', 'quote'] }, '$quantity', 0] },
        },
        totalQuantity: { $sum: '$quantity' },
        invoiceLines: {
          $sum: { $cond: [{ $eq: ['$source', 'invoice'] }, 1, 0] },
        },
        quoteLines: {
          $sum: { $cond: [{ $eq: ['$source', 'quote'] }, 1, 0] },
        },
        totalLines: { $sum: 1 },
        invoiceDocuments: {
          $addToSet: {
            $cond: [{ $eq: ['$source', 'invoice'] }, '$documentId', '$$REMOVE'],
          },
        },
        quoteDocuments: {
          $addToSet: {
            $cond: [{ $eq: ['$source', 'quote'] }, '$documentId', '$$REMOVE'],
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        period: '$_id',
        invoiceRevenue: 1,
        quoteRevenue: 1,
        totalRevenue: 1,
        invoiceQuantity: 1,
        quoteQuantity: 1,
        totalQuantity: 1,
        invoiceLines: 1,
        quoteLines: 1,
        totalLines: 1,
        invoiceDocuments: { $size: '$invoiceDocuments' },
        quoteDocuments: { $size: '$quoteDocuments' },
      },
    },
    { $sort: { period: 1 } },
  ];
}

function emptyPeriodRow(period) {
  return {
    period,
    invoiceRevenue: 0,
    quoteRevenue: 0,
    totalRevenue: 0,
    invoiceQuantity: 0,
    quoteQuantity: 0,
    totalQuantity: 0,
    invoiceLines: 0,
    quoteLines: 0,
    totalLines: 0,
    invoiceDocuments: 0,
    quoteDocuments: 0,
  };
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
      filled.push(map[key] || emptyPeriodRow(key));
      cursor.add(1, 'month');
    }
    return filled;
  }

  cursor.startOf('day');
  end.startOf('day');
  while (cursor.isSameOrBefore(end, 'day')) {
    const key = cursor.format('YYYY-MM-DD');
    filled.push(map[key] || emptyPeriodRow(key));
    cursor.add(1, 'day');
  }
  return filled;
}

function summarizePeriodRows(rows) {
  return rows.reduce(
    (acc, row) => ({
      invoiceRevenue: acc.invoiceRevenue + (row.invoiceRevenue || 0),
      quoteRevenue: acc.quoteRevenue + (row.quoteRevenue || 0),
      totalRevenue: acc.totalRevenue + (row.totalRevenue || 0),
      invoiceQuantity: acc.invoiceQuantity + (row.invoiceQuantity || 0),
      quoteQuantity: acc.quoteQuantity + (row.quoteQuantity || 0),
      totalQuantity: acc.totalQuantity + (row.totalQuantity || 0),
      invoiceLines: acc.invoiceLines + (row.invoiceLines || 0),
      quoteLines: acc.quoteLines + (row.quoteLines || 0),
      totalLines: acc.totalLines + (row.totalLines || 0),
      invoiceDocuments: acc.invoiceDocuments + (row.invoiceDocuments || 0),
      quoteDocuments: acc.quoteDocuments + (row.quoteDocuments || 0),
    }),
    {
      invoiceRevenue: 0,
      quoteRevenue: 0,
      totalRevenue: 0,
      invoiceQuantity: 0,
      quoteQuantity: 0,
      totalQuantity: 0,
      invoiceLines: 0,
      quoteLines: 0,
      totalLines: 0,
      invoiceDocuments: 0,
      quoteDocuments: 0,
    }
  );
}

function mapLineRow(row) {
  const productDoc = row.productDoc?.[0];
  const adminDoc = row.createdByDoc?.[0];
  const clientDoc = row.clientDoc?.[0];

  return {
    _id: row.lineId,
    lineDate: row.lineDate,
    source: row.source,
    documentId: row.documentId,
    documentNumber: row.documentNumber,
    documentYear: row.documentYear,
    documentStatus: row.documentStatus,
    paymentStatus: row.paymentStatus,
    customerName: row.customerName || clientDoc?.name || null,
    clientId: row.clientId,
    product: productDoc
      ? {
          _id: productDoc._id,
          name: productDoc.name || row.itemName,
          sku: productDoc.sku,
        }
      : { name: row.itemName },
    itemName: row.itemName,
    hsnCode: row.hsnCode,
    gstRate: row.gstRate,
    quantity: row.quantity,
    itemPrice: row.itemPrice,
    itemTotal: row.itemTotal,
    taxableValue: row.taxableValue,
    gstAmount: row.gstAmount,
    effectiveRevenue: row.effectiveRevenue,
    documentTotal: row.documentTotal,
    documentSubTotal: row.documentSubTotal,
    documentTaxTotal: row.documentTaxTotal,
    currency: row.currency,
    converted: row.converted,
    isActive: row.isActive,
    createdByName: adminDoc
      ? [adminDoc.name, adminDoc.surname].filter(Boolean).join(' ')
      : null,
  };
}

const salesReport = async (req, res) => {
  const range = resolveDateRange(req.query);
  if (!range) {
    return res.status(400).json({
      success: false,
      message: 'Invalid date range. Provide valid startDate and endDate.',
    });
  }

  const filters = {
    source: req.query.source,
    productId: req.query.productId,
    status: req.query.status,
    clientId: req.query.clientId,
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
  const linePipeline = buildUnifiedPipeline(dateMatch, filters);
  const allTimeStoreMatch = { ...storeMatch };
  const allTimePipeline = buildUnifiedPipeline(
    { ...allTimeStoreMatch, date: { $exists: true } },
    filters
  );

  const [
    periodRows,
    sourceBreakdown,
    statusBreakdown,
    productBreakdown,
    customerBreakdown,
    yearlyRollup,
    lineTotalResult,
    lineRows,
  ] = await Promise.all([
    Invoice.aggregate([...linePipeline, ...buildPeriodAggregation(groupFormat)]),
    Invoice.aggregate([
      ...linePipeline,
      {
        $group: {
          _id: '$source',
          revenue: { $sum: '$effectiveRevenue' },
          quantity: { $sum: '$quantity' },
          lineCount: { $sum: 1 },
          documents: { $addToSet: '$documentId' },
          activeLines: { $sum: { $cond: ['$isActive', 1, 0] } },
        },
      },
      {
        $project: {
          _id: 0,
          source: '$_id',
          revenue: 1,
          quantity: 1,
          lineCount: 1,
          documentCount: { $size: '$documents' },
          activeLines: 1,
        },
      },
      { $sort: { source: 1 } },
    ]),
    Invoice.aggregate([
      ...linePipeline,
      {
        $group: {
          _id: { source: '$source', status: '$documentStatus' },
          revenue: { $sum: '$effectiveRevenue' },
          quantity: { $sum: '$quantity' },
          lineCount: { $sum: 1 },
          documents: { $addToSet: '$documentId' },
        },
      },
      {
        $project: {
          _id: 0,
          source: '$_id.source',
          status: '$_id.status',
          revenue: 1,
          quantity: 1,
          lineCount: 1,
          documentCount: { $size: '$documents' },
        },
      },
      { $sort: { source: 1, lineCount: -1 } },
    ]),
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
          invoiceRevenue: {
            $sum: {
              $cond: [{ $eq: ['$source', 'invoice'] }, '$effectiveRevenue', 0],
            },
          },
          quoteRevenue: {
            $sum: {
              $cond: [{ $eq: ['$source', 'quote'] }, '$effectiveRevenue', 0],
            },
          },
          totalRevenue: { $sum: '$effectiveRevenue' },
          invoiceQuantity: {
            $sum: { $cond: [{ $eq: ['$source', 'invoice'] }, '$quantity', 0] },
          },
          quoteQuantity: {
            $sum: { $cond: [{ $eq: ['$source', 'quote'] }, '$quantity', 0] },
          },
          totalQuantity: { $sum: '$quantity' },
          lineCount: { $sum: 1 },
          productName: { $first: { $arrayElemAt: ['$productDoc.name', 0] } },
          productSku: { $first: { $arrayElemAt: ['$productDoc.sku', 0] } },
        },
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 50 },
      {
        $project: {
          _id: 0,
          productId: '$_id.product',
          productName: { $ifNull: ['$productName', '$_id.itemName'] },
          productSku: 1,
          invoiceRevenue: 1,
          quoteRevenue: 1,
          totalRevenue: 1,
          invoiceQuantity: 1,
          quoteQuantity: 1,
          totalQuantity: 1,
          lineCount: 1,
        },
      },
    ]),
    Invoice.aggregate([
      ...linePipeline,
      {
        $group: {
          _id: { customerName: '$customerName', clientId: '$clientId' },
          invoiceRevenue: {
            $sum: {
              $cond: [{ $eq: ['$source', 'invoice'] }, '$effectiveRevenue', 0],
            },
          },
          quoteRevenue: {
            $sum: {
              $cond: [{ $eq: ['$source', 'quote'] }, '$effectiveRevenue', 0],
            },
          },
          totalRevenue: { $sum: '$effectiveRevenue' },
          lineCount: { $sum: 1 },
          documents: { $addToSet: '$documentId' },
        },
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 50 },
      {
        $project: {
          _id: 0,
          customerName: {
            $ifNull: ['$_id.customerName', 'Walk-in Customer'],
          },
          clientId: '$_id.clientId',
          invoiceRevenue: 1,
          quoteRevenue: 1,
          totalRevenue: 1,
          lineCount: 1,
          documentCount: { $size: '$documents' },
        },
      },
    ]),
    Invoice.aggregate([
      ...allTimePipeline,
      {
        $group: {
          _id: { $year: '$lineDate' },
          invoiceRevenue: {
            $sum: {
              $cond: [{ $eq: ['$source', 'invoice'] }, '$effectiveRevenue', 0],
            },
          },
          quoteRevenue: {
            $sum: {
              $cond: [{ $eq: ['$source', 'quote'] }, '$effectiveRevenue', 0],
            },
          },
          totalRevenue: { $sum: '$effectiveRevenue' },
          invoiceQuantity: {
            $sum: { $cond: [{ $eq: ['$source', 'invoice'] }, '$quantity', 0] },
          },
          quoteQuantity: {
            $sum: { $cond: [{ $eq: ['$source', 'quote'] }, '$quantity', 0] },
          },
          totalQuantity: { $sum: '$quantity' },
          invoiceLines: {
            $sum: { $cond: [{ $eq: ['$source', 'invoice'] }, 1, 0] },
          },
          quoteLines: {
            $sum: { $cond: [{ $eq: ['$source', 'quote'] }, 1, 0] },
          },
          totalLines: { $sum: 1 },
          invoiceDocuments: {
            $addToSet: {
              $cond: [{ $eq: ['$source', 'invoice'] }, '$documentId', '$$REMOVE'],
            },
          },
          quoteDocuments: {
            $addToSet: {
              $cond: [{ $eq: ['$source', 'quote'] }, '$documentId', '$$REMOVE'],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          year: '$_id',
          invoiceRevenue: 1,
          quoteRevenue: 1,
          totalRevenue: 1,
          invoiceQuantity: 1,
          quoteQuantity: 1,
          totalQuantity: 1,
          invoiceLines: 1,
          quoteLines: 1,
          totalLines: 1,
          invoiceDocuments: { $size: '$invoiceDocuments' },
          quoteDocuments: { $size: '$quoteDocuments' },
        },
      },
      { $sort: { year: -1 } },
    ]),
    Invoice.aggregate([...linePipeline, { $count: 'total' }]),
    Invoice.aggregate([
      ...linePipeline,
      { $sort: { lineDate: -1, documentNumber: -1 } },
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
      {
        $lookup: {
          from: 'clients',
          localField: 'clientId',
          foreignField: '_id',
          as: 'clientDoc',
        },
      },
    ]),
  ]);

  const periodStats = fillPeriodGaps(
    periodRows,
    range.startDate,
    range.endDate,
    range.groupBy
  );

  const summary = summarizePeriodRows(periodStats);
  const lineTotal = lineTotalResult[0]?.total || 0;
  const lines = lineRows.map(mapLineRow);

  return res.status(200).json({
    success: true,
    result: {
      sources: ['invoice', 'quote'],
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
      sourceBreakdown,
      statusBreakdown,
      productBreakdown,
      customerBreakdown,
      yearlyRollup,
      lines,
      pagination: {
        page,
        limit,
        total: lineTotal,
        pages: Math.ceil(lineTotal / limit) || 1,
      },
    },
    message: 'Sales report loaded successfully',
  });
};

module.exports = salesReport;
