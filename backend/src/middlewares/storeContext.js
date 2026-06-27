/**
 * Sets req.storeId from authenticated admin (after isValidAuthToken).
 * Used by all store-scoped CRUD to filter data by store.
 */
function setStoreFromAuth(req, res, next) {
  if (req.admin) {
    req.storeId = req.admin.store && (req.admin.store._id || req.admin.store) || req.admin.storeId;
  }
  next();
}

module.exports = { setStoreFromAuth };
