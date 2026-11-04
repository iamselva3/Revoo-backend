import { Router } from 'express';
import { DashboardController } from '../controllers/DashboardController.js';
import { authenticateAdmin } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/stats', authenticateAdmin, DashboardController.getOperationalStats);
router.get('/audits', authenticateAdmin, DashboardController.getAuditLogs);

export default router;

