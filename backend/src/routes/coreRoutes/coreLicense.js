const express = require('express');
const router = express.Router();
const { catchErrors } = require('@/handlers/errorHandlers');
const licenseController = require('@/controllers/coreControllers/licenseController');

router.route('/license/status').get(catchErrors(licenseController.status));
router.route('/license/request-otp').post(catchErrors(licenseController.requestOtp));
router.route('/license/unlock-otp').post(catchErrors(licenseController.unlockOtp));

module.exports = router;
