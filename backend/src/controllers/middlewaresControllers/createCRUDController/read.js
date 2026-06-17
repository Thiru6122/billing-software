const read = async (Model, req, res) => {
  const query = { _id: req.params.id, removed: false };
  if (req.storeId && Model.schema.paths.store) query.store = req.storeId;
  const result = await Model.findOne(query).exec();
  // If no results found, return document not found
  if (!result) {
    return res.status(404).json({
      success: false,
      result: null,
      message: 'No document found ',
    });
  } else {
    // Return success resposne
    return res.status(200).json({
      success: true,
      result,
      message: 'we found this document ',
    });
  }
};

module.exports = read;
