import { Router } from 'express';
import authRoutes from './auth.routes.js';
import catalogueRoutes from './catalogue.routes.js';
import pricingRoutes from './pricing.routes.js';
import requestRoutes from './request.routes.js';
import enquiryRoutes from './enquiry.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import geoRoutes from './geo.routes.js';
import employeeRoutes from './employee.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/catalogue', catalogueRoutes);
router.use('/pricing', pricingRoutes);
router.use('/requests', requestRoutes);
router.use('/enquiries', enquiryRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/geo', geoRoutes);
router.use('/employees', employeeRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'HEALTHY',
    service: 'Genie Backend API',
    timestamp: new Date().toISOString(),
    uptimeSeconds: process.uptime(),
  });
});

export default router;

