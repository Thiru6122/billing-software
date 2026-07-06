function buildSearchFields(req) {
  const fieldsArray = req.query.fields ? String(req.query.fields).split(',') : [];
  const queryText = String(req.query.q || '').trim();

  if (!fieldsArray.length || !queryText) return {};

  const fields = { $or: [] };
  for (const field of fieldsArray) {
    const key = String(field || '').trim();
    if (!key) continue;
    fields.$or.push({ [key]: { $regex: new RegExp(queryText, 'i') } });
  }

  return fields.$or.length ? fields : {};
}

function buildFilterQuery(req) {
  const { filter, equal } = req.query;
  if (filter && equal !== undefined && equal !== null && equal !== '') {
    return { [filter]: equal };
  }
  return {};
}

function getDefaultSortField(Model) {
  const schema = Model.schema.paths;
  const candidates = ['created', 'date', 'updated', 'number', 'name', 'enabled'];
  for (const field of candidates) {
    if (schema[field]) return field;
  }
  return '_id';
}

function buildSortQuery(Model, req, defaultSort) {
  const schema = Model.schema.paths;
  const direction = parseInt(req.query.sortValue, 10) === 1 ? 1 : -1;
  let sortBy = String(req.query.sortBy || '').trim();

  if (!sortBy || !schema[sortBy]) {
    if (defaultSort) return defaultSort;
    sortBy = getDefaultSortField(Model);
    return { [sortBy]: direction, _id: -1 };
  }

  return { [sortBy]: direction, _id: -1 };
}

function buildBaseQuery(Model, req) {
  const baseQuery = {
    removed: false,
    ...buildFilterQuery(req),
    ...buildSearchFields(req),
  };

  if (req.storeId && Model.schema.paths.store) {
    baseQuery.store = req.storeId;
  }

  return baseQuery;
}

function getPaginationParams(req) {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(req.query.items, 10) || 10));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

async function runPaginatedList(Model, req, res, { populate, defaultSort } = {}) {
  const { page, limit, skip } = getPaginationParams(req);
  const baseQuery = buildBaseQuery(Model, req);
  const sort = buildSortQuery(Model, req, defaultSort);

  let query = Model.find(baseQuery).skip(skip).limit(limit).sort(sort);

  if (Array.isArray(populate) && populate.length) {
    populate.forEach((spec) => {
      query = query.populate(spec);
    });
  } else if (populate === true) {
    query = query.populate();
  }

  const [result, count] = await Promise.all([query.exec(), Model.countDocuments(baseQuery)]);
  const pages = Math.ceil(count / limit) || 0;
  const pagination = { page, pages, count };

  if (count > 0) {
    return res.status(200).json({
      success: true,
      result,
      pagination,
      message: 'Successfully found all documents',
    });
  }

  return res.status(203).json({
    success: true,
    result: [],
    pagination,
    message: 'Collection is Empty',
  });
}

module.exports = {
  buildSearchFields,
  buildFilterQuery,
  buildSortQuery,
  buildBaseQuery,
  getPaginationParams,
  runPaginatedList,
};
