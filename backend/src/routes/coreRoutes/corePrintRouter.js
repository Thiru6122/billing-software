const printDocument = require('@/handlers/downloadHandler/printDocument');
const express = require('express');

const router = express.Router();

router.route('/:directory/:id').get(function (req, res) {
  try {
    const { directory, id } = req.params;
    printDocument(req, res, { directory, id });
  } catch (error) {
    return res.status(503).json({
      success: false,
      result: null,
      message: error.message,
      error,
    });
  }
});

module.exports = router;
