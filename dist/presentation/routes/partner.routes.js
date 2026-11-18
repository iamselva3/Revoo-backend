"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const PartnerController_js_1 = require("../controllers/PartnerController.js");
const auth_middleware_js_1 = require("../middlewares/auth.middleware.js");
const rateLimiter_middleware_js_1 = require("../middlewares/rateLimiter.middleware.js");
/**
 * Pickup partner app (genietn.in/partner): partners check the device at the customer's door and
 * finalise the price. Separate from the customer flow; the admin sees every check.
 */
const router = (0, express_1.Router)();
// Admin (registered first so "admin" is never read as a request number)
router.get('/admin/checks', auth_middleware_js_1.authenticateAdmin, PartnerController_js_1.PartnerController.adminListChecks);
router.get('/admin/requests/:id/checks', auth_middleware_js_1.authenticateAdmin, PartnerController_js_1.PartnerController.adminRequestChecks);
router.put('/admin/employees/:id/access', auth_middleware_js_1.authenticateAdmin, PartnerController_js_1.PartnerController.adminSetAccess);
// Partner
router.post('/login', rateLimiter_middleware_js_1.authLimiter, PartnerController_js_1.PartnerController.login);
router.get('/me', auth_middleware_js_1.authenticatePartner, PartnerController_js_1.PartnerController.me);
router.get('/checks', auth_middleware_js_1.authenticatePartner, PartnerController_js_1.PartnerController.myChecks);
router.get('/requests/:ref', auth_middleware_js_1.authenticatePartner, PartnerController_js_1.PartnerController.getRequest);
router.post('/requests/:ref/price', auth_middleware_js_1.authenticatePartner, PartnerController_js_1.PartnerController.price);
router.post('/requests/:ref/checks', auth_middleware_js_1.authenticatePartner, PartnerController_js_1.PartnerController.submitCheck);
exports.default = router;
//# sourceMappingURL=partner.routes.js.map