const mongoose = require('mongoose');
const { adjustProductStock } = require('@/services/stockService');

const adjustStock = async (req, res) => {
  const { productId, quantityChange, note, movementType } = req.body;
  if (!productId || quantityChange === undefined || quantityChange === null) {
    return res.status(400).json({
      success: false,
      result: null,
      message: 'productId and quantityChange are required.',
    });
  }

  const delta = Number(quantityChange);
  if (Number.isNaN(delta) || delta === 0) {
    return res.status(400).json({
      success: false,
      result: null,
      message: 'quantityChange must be a non-zero number.',
    });
  }

  try {
    const product = await adjustProductStock({
      productId,
      storeId: req.storeId,
      delta,
      movementType: movementType || (delta > 0 ? 'in' : 'out'),
      note: note || 'Manual stock adjustment',
      adminId: req.admin?._id,
    });

    return res.status(200).json({
      success: true,
      result: product,
      message: 'Stock updated successfully.',
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      result: null,
      message: err.message,
    });
  }
};

module.exports = adjustStock;
