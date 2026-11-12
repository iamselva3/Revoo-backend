"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const BuybackRequestController_js_1 = require("../controllers/BuybackRequestController.js");
const auth_middleware_js_1 = require("../middlewares/auth.middleware.js");
const StorageService_js_1 = require("../../infrastructure/storage/StorageService.js");
const router = (0, express_1.Router)();
// File upload
router.post('/upload', StorageService_js_1.upload.single('image'), BuybackRequestController_js_1.BuybackRequestController.uploadDeviceImage);
// Customer endpoints
router.post('/', auth_middleware_js_1.authenticateCustomer, BuybackRequestController_js_1.BuybackRequestController.submitRequest);
router.get('/my', auth_middleware_js_1.authenticateCustomer, BuybackRequestController_js_1.BuybackRequestController.getMyRequests);
router.get('/my/:id', auth_middleware_js_1.authenticateCustomer, BuybackRequestController_js_1.BuybackRequestController.getMyRequestDetails);
router.post('/my/:id/decision', auth_middleware_js_1.authenticateCustomer, BuybackRequestController_js_1.BuybackRequestController.handleCustomerOfferDecision);
// Admin endpoints
router.get('/admin', auth_middleware_js_1.authenticateAdmin, BuybackRequestController_js_1.BuybackRequestController.adminListRequests);
router.get('/admin/:id', auth_middleware_js_1.authenticateAdmin, BuybackRequestController_js_1.BuybackRequestController.adminGetRequestDetails);
router.post('/admin/:id/assign-collection', auth_middleware_js_1.authenticateAdmin, BuybackRequestController_js_1.BuybackRequestController.adminAssignCollection);
router.put('/admin/:id/collection-status', auth_middleware_js_1.authenticateAdmin, BuybackRequestController_js_1.BuybackRequestController.adminUpdateCollectionStatus);
router.post('/admin/:id/inspection', auth_middleware_js_1.authenticateAdmin, BuybackRequestController_js_1.BuybackRequestController.adminSubmitInspection);
router.post('/admin/:id/final-offer', auth_middleware_js_1.authenticateAdmin, BuybackRequestController_js_1.BuybackRequestController.adminGenerateFinalOffer);
router.post('/admin/:id/payments', auth_middleware_js_1.authenticateAdmin, (0, StorageService_js_1.persistBodyImages)('payments', ['paymentProofUrl']), BuybackRequestController_js_1.BuybackRequestController.adminRecordPayment);
router.post('/admin/:id/returns', auth_middleware_js_1.authenticateAdmin, BuybackRequestController_js_1.BuybackRequestController.adminInitiateReturn);
router.put('/admin/:id/complete-return', auth_middleware_js_1.authenticateAdmin, BuybackRequestController_js_1.BuybackRequestController.adminCompleteReturn);
exports.default = router;
//# sourceMappingURL=request.routes.js.map