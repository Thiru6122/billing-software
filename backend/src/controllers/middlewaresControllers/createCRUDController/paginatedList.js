const { runPaginatedList } = require('@/utils/paginatedListQuery');

const paginatedList = async (Model, req, res) => {
  return runPaginatedList(Model, req, res, { populate: true });
};

module.exports = paginatedList;
