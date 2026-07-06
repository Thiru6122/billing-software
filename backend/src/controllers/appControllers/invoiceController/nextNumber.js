const mongoose = require('mongoose');

const Model = mongoose.model('Invoice');
const { peekNextNumber } = require('@/services/documentNumberService');

const nextNumber = async (req, res) => {
  const year = parseInt(req.query.year, 10) || new Date().getFullYear();

  const number = await peekNextNumber({
    storeId: req.storeId,
    settingKey: 'last_invoice_number',
    Model,
    year,
  });

  return res.status(200).json({
    success: true,
    result: { number, year },
    message: 'Next invoice number',
  });
};

module.exports = nextNumber;
