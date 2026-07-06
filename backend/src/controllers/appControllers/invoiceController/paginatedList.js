const mongoose = require('mongoose');
const { runPaginatedList } = require('@/utils/paginatedListQuery');

const Model = mongoose.model('Invoice');

const paginatedList = async (req, res) => {
  return runPaginatedList(Model, req, res, {
    populate: [{ path: 'createdBy', select: 'name' }],
    defaultSort: { year: -1, number: -1, _id: -1 },
  });
};

module.exports = paginatedList;
