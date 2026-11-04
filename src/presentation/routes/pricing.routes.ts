import { Router } from 'express';
import { PricingController } from '../controllers/PricingController.js';
import { authenticateAdmin } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/model/:modelId', authenticateAdmin, PricingController.getPricingRuleForModel);
router.put('/model/:modelId', authenticateAdmin, PricingController.updatePricingRule);
router.get('/history/:modelId', authenticateAdmin, PricingController.getPricingHistory);

export default router;

