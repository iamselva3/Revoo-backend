import { Router } from 'express';
import { PartnerController } from '../controllers/PartnerController.js';
import { authenticateAdmin, authenticatePartner } from '../middlewares/auth.middleware.js';
import { authLimiter } from '../middlewares/rateLimiter.middleware.js';

/**
 * Pickup partner app (genietn.in/partner): partners check the device at the customer's door and
 * finalise the price. Separate from the customer flow; the admin sees every check.
 */
const router = Router();

// Admin (registered first so "admin" is never read as a request number)
router.get('/admin/checks', authenticateAdmin, PartnerController.adminListChecks);
router.get('/admin/requests/:id/checks', authenticateAdmin, PartnerController.adminRequestChecks);
router.put('/admin/employees/:id/access', authenticateAdmin, PartnerController.adminSetAccess);

// Partner
router.post('/login', authLimiter, PartnerController.login);
router.get('/me', authenticatePartner, PartnerController.me);
router.get('/checks', authenticatePartner, PartnerController.myChecks);
router.get('/requests/:ref', authenticatePartner, PartnerController.getRequest);
router.post('/requests/:ref/price', authenticatePartner, PartnerController.price);
router.post('/requests/:ref/checks', authenticatePartner, PartnerController.submitCheck);

export default router;
