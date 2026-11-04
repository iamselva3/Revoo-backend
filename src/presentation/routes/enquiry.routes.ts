import { Router } from 'express';
import { EnquiryController } from '../controllers/EnquiryController.js';
import { authenticateAdmin } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/', EnquiryController.submitEnquiry);
router.get('/admin', authenticateAdmin, EnquiryController.adminListEnquiries);
router.put('/admin/:id/respond', authenticateAdmin, EnquiryController.adminRespondEnquiry);

export default router;

