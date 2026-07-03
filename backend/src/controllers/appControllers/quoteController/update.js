const mongoose = require('mongoose');

const Model = mongoose.model('Quote');

const custom = require('@/controllers/pdfController');

const { calculate } = require('@/helpers');

const update = async (req, res) => {
  const { items = [], taxRate = 0, discount = 0 } = req.body;

  if (items.length === 0) {
    return res.status(400).json({
      success: false,
      result: null,
      message: 'Items cannot be empty',
    });
  }
  // default
  let subTotal = 0;
  let taxTotal = 0;
  let total = 0;
  // let credit = 0;

  //Calculate the items array with subTotal, total, taxTotal
  items.map((item) => {
    let total = calculate.multiply(item['quantity'], item['price']);
    //sub total
    subTotal = calculate.add(subTotal, total);
    //item total
    item['total'] = total;
  });
  taxTotal = 0;
  total = calculate.sub(subTotal, discount);

  let body = req.body;

  if (body.client && typeof body.client === 'object') {
    body.client = body.client._id || body.client.id;
  }
  if (!body.client || body.client === '') {
    delete body.client;
  }
  if (body.customerName) {
    body.customerName = String(body.customerName).trim();
    if (!body.customerName) delete body.customerName;
  }
  if (body.notes == null) body.notes = '';
  if (Array.isArray(body.items)) {
    body.items = body.items.map((item) => {
      if (!item) return item;
      const row = { ...item };
      if (row.product && typeof row.product === 'object') {
        row.product = row.product._id || row.product.id;
      }
      if (row.description == null) row.description = '';
      return row;
    });
  }

  body['subTotal'] = subTotal;
  body['taxTotal'] = taxTotal;
  body['total'] = total;
  body['items'] = items;
  body['pdf'] = 'quote-' + req.params.id + '.pdf';

  if (body.hasOwnProperty('currency')) {
    delete body.currency;
  }
  // Find document by id and updates with the required fields

  const result = await Model.findOneAndUpdate({ _id: req.params.id, removed: false }, body, {
    new: true, // return the new result instead of the old one
  }).exec();

  // Returning successfull response

  return res.status(200).json({
    success: true,
    result,
    message: 'we update this document ',
  });
};
module.exports = update;
