const createCRUDController = require('@/controllers/middlewaresControllers/createCRUDController');

const create = require('./create');
const update = require('./update');
const summary = require('./summary');

const methods = createCRUDController('Expense');
methods.create = create;
methods.update = update;
methods.summary = summary;

module.exports = methods;
