const express = require('express');
const { catchErrors } = require('@/handlers/errorHandlers');
const router = express.Router();

const appControllers = require('@/controllers/appControllers');
const dashboardController = require('@/controllers/appControllers/dashboardController');
const { routesList } = require('@/models/utils');

const routerApp = (entity, controller) => {
  router.route(`/${entity}/create`).post(catchErrors(controller['create']));
  router.route(`/${entity}/read/:id`).get(catchErrors(controller['read']));
  router.route(`/${entity}/update/:id`).patch(catchErrors(controller['update']));
  router.route(`/${entity}/delete/:id`).delete(catchErrors(controller['delete']));
  router.route(`/${entity}/search`).get(catchErrors(controller['search']));
  router.route(`/${entity}/list`).get(catchErrors(controller['list']));
  router.route(`/${entity}/listAll`).get(catchErrors(controller['listAll']));
  router.route(`/${entity}/filter`).get(catchErrors(controller['filter']));
  router.route(`/${entity}/summary`).get(catchErrors(controller['summary']));

  if (entity === 'invoice' || entity === 'quote' || entity === 'payment') {
    router.route(`/${entity}/mail`).post(catchErrors(controller['mail']));
  }

  if (entity === 'invoice') {
    router.route(`/${entity}/nextNumber`).get(catchErrors(controller['nextNumber']));
  }

  if (entity === 'quote') {
    router.route(`/${entity}/convert/:id`).get(catchErrors(controller['convert']));
  }

  if (entity === 'product') {
    router.route(`/${entity}/suggestHsn`).get(catchErrors(controller['suggestHsn']));
    router.route(`/${entity}/backfillHsn`).post(catchErrors(controller['backfillHsn']));
    router.route(`/${entity}/barcode/:code`).get(catchErrors(controller['lookupByBarcode']));
    router.route(`/${entity}/generateLabelBatch`).post(catchErrors(controller['generateLabelBatch']));
    router.route(`/${entity}/labelPool`).get(catchErrors(controller['labelPool']));
    router.route(`/${entity}/printBarcodeLabels`).post(catchErrors(controller['printBarcodeLabels']));
    router.route(`/${entity}/generateBarcodes`).post(catchErrors(controller['generateBarcodes']));
    router.route(`/${entity}/inventorySummary`).get(catchErrors(controller['inventorySummary']));
    router.route(`/${entity}/stockMovementReport`).get(catchErrors(controller['stockMovementReport']));
    router.route(`/${entity}/adjustStock`).post(catchErrors(controller['adjustStock']));
    router.route(`/${entity}/import`).post(catchErrors(controller['importProducts']));
  }
};

routesList.forEach(({ entity, controllerName }) => {
  const controller = appControllers[controllerName];
  routerApp(entity, controller);
});

router.route('/dashboard/analytics').get(catchErrors(dashboardController.analytics));

const salesController = require('@/controllers/appControllers/salesController');
router.route('/sales/report').get(catchErrors(salesController.report));

module.exports = router;
