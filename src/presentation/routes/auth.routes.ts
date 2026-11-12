import { Router } from 'express';
import { AuthController } from '../controllers/AuthController.js';
import { authenticateCustomer, authenticateAdmin } from '../middlewares/auth.middleware.js';
import { authLimiter, otpLimiter } from '../middlewares/rateLimiter.middleware.js';

const router = Router();

// Customer Auth
router.post('/customer/request-otp', otpLimiter, AuthController.requestCustomerOtp);
router.post('/customer/verify-otp', authLimiter, AuthController.verifyCustomerOtp);
router.post('/customer/login-password', authLimiter, AuthController.customerPasswordLogin);
router.post('/customer/signup', authLimiter, AuthController.customerSignup);
router.post('/customer/google', authLimiter, AuthController.customerGoogleAuth);
router.post('/customer/refresh-token', AuthController.refreshCustomerToken);
// No access-token guard: logout must work after the access token has expired
router.post('/customer/logout', AuthController.customerLogout);
router.get('/customer/profile', authenticateCustomer, AuthController.getCustomerProfile);
router.put('/customer/profile', authenticateCustomer, AuthController.updateCustomerProfile);
router.get('/customer/referral', authenticateCustomer, AuthController.getCustomerReferral);

// Admin Auth
router.post('/admin/login', authLimiter, AuthController.adminLogin);
router.post('/admin/refresh-token', AuthController.adminRefreshToken);
// No access-token guard: logout must work after the access token has expired
router.post('/admin/logout', AuthController.adminLogout);
router.get('/admin/profile', authenticateAdmin, AuthController.getAdminProfile);

export default router;

