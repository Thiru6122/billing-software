const createCRUDController = require('@/controllers/middlewaresControllers/createCRUDController');
const methods = createCRUDController('Purchase');

const create = require('./create');
const update = require('./update');
const remove = require('./remove');
const summary = require('./summary');

methods.create = create;
methods.update = update;
methods.delete = remove;
methods.summary = summary;

module.exports = methods;
