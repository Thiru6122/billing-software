const mongoose = require('mongoose');
const {
  reversePurchaseStock,
  shouldReversePurchaseStock,
} = require('@/services/stockService');

const Model = mongoose.model('Purchase');

const remove = async (req, res) => {
  const purchase = await Model.findOne({ _id: req.params.id, removed: false, store: req.storeId });
  if (!purchase) {
    return res.status(404).json({
      success: false,
      result: null,
      message: 'Purchase not found',
    });
  }

  if (purchase.stockAdded) {
    await reversePurchaseStock(purchase, req.storeId, req.admin._id);
  }

  const deleted = await Model.findOneAndUpdate(
    { _id: req.params.id, removed: false },
    { $set: { removed: true } },
    { new: true }
  ).exec();

  return res.status(200).json({
    success: true,
    result: deleted,
    message: 'Purchase deleted successfully',
  });
};

module.exports = remove;
