"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const AuthController_js_1 = require("../controllers/AuthController.js");
const auth_middleware_js_1 = require("../middlewares/auth.middleware.js");
const rateLimiter_middleware_js_1 = require("../middlewares/rateLimiter.middleware.js");
const router = (0, express_1.Router)();
// Customer Auth
router.post('/customer/request-otp', rateLimiter_middleware_js_1.otpLimiter, AuthController_js_1.AuthController.requestCustomerOtp);
router.post('/customer/verify-otp', rateLimiter_middleware_js_1.authLimiter, AuthController_js_1.AuthController.verifyCustomerOtp);
router.post('/customer/login-password', rateLimiter_middleware_js_1.authLimiter, AuthController_js_1.AuthController.customerPasswordLogin);
router.post('/customer/signup', rateLimiter_middleware_js_1.authLimiter, AuthController_js_1.AuthController.customerSignup);
router.post('/customer/google', rateLimiter_middleware_js_1.authLimiter, AuthController_js_1.AuthController.customerGoogleAuth);
router.post('/customer/refresh-token', AuthController_js_1.AuthController.refreshCustomerToken);
// No access-token guard: logout must work after the access token has expired
router.post('/customer/logout', AuthController_js_1.AuthController.customerLogout);
router.get('/customer/profile', auth_middleware_js_1.authenticateCustomer, AuthController_js_1.AuthController.getCustomerProfile);
router.put('/customer/profile', auth_middleware_js_1.authenticateCustomer, AuthController_js_1.AuthController.updateCustomerProfile);
router.get('/customer/referral', auth_middleware_js_1.authenticateCustomer, AuthController_js_1.AuthController.getCustomerReferral);
// Admin Auth
router.post('/admin/login', rateLimiter_middleware_js_1.authLimiter, AuthController_js_1.AuthController.adminLogin);
router.post('/admin/refresh-token', AuthController_js_1.AuthController.adminRefreshToken);
// No access-token guard: logout must work after the access token has expired
router.post('/admin/logout', AuthController_js_1.AuthController.adminLogout);
router.get('/admin/profile', auth_middleware_js_1.authenticateAdmin, AuthController_js_1.AuthController.getAdminProfile);
exports.default = router;
//# sourceMappingURL=auth.routes.js.map