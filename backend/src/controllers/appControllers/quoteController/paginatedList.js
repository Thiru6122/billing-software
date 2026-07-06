const mongoose = require('mongoose');
const { runPaginatedList } = require('@/utils/paginatedListQuery');

const Model = mongoose.model('Quote');

const paginatedList = async (req, res) => {
  return runPaginatedList(Model, req, res, {
    populate: [{ path: 'createdBy', select: 'name' }],
  });
};

module.exports = paginatedList;
