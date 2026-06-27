const Joi = require('joi');
const schema = Joi.object({
  client: Joi.alternatives().try(Joi.string(), Joi.object()).allow('', null).optional(),
  customerName: Joi.string().allow('', null).optional(),
  customerGstin: Joi.string().allow('', null).optional(),
  placeOfSupply: Joi.string().allow('', null).optional(),
  gstType: Joi.string().valid('intra', 'inter').optional(),
  number: Joi.number().required(),
  year: Joi.number().required(),
  status: Joi.string().required(),
  notes: Joi.string().allow(''),
  expiredDate: Joi.date().required(),
  date: Joi.date().required(),
  items: Joi.array()
    .items(
      Joi.object({
        _id: Joi.string().allow('').optional(),
        product: Joi.string().allow('').optional(),
        itemName: Joi.string().required(),
        hsnCode: Joi.string().allow('').optional(),
        gstRate: Joi.alternatives().try(Joi.number(), Joi.string()).optional(),
        description: Joi.string().allow(''),
        quantity: Joi.number().required(),
        price: Joi.number().required(),
        total: Joi.number().required(),
      }).required()
    )
    .required(),
  taxRate: Joi.alternatives().try(Joi.number(), Joi.string()).required(),
});

module.exports = schema;
