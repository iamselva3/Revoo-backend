import { Router } from 'express';
import { BuybackRequestController } from '../controllers/BuybackRequestController.js';
import { authenticateCustomer, authenticateAdmin } from '../middlewares/auth.middleware.js';
import { upload } from '../../infrastructure/storage/StorageService.js';

const router = Router();

// File upload
router.post('/upload', upload.single('image'), BuybackRequestController.uploadDeviceImage);

// Customer endpoints
router.post('/', authenticateCustomer, BuybackRequestController.submitRequest);
router.get('/my', authenticateCustomer, BuybackRequestController.getMyRequests);
router.get('/my/:id', authenticateCustomer, BuybackRequestController.getMyRequestDetails);
router.post('/my/:id/decision', authenticateCustomer, BuybackRequestController.handleCustomerOfferDecision);

// Admin endpoints
router.get('/admin', authenticateAdmin, BuybackRequestController.adminListRequests);
router.get('/admin/:id', authenticateAdmin, BuybackRequestController.adminGetRequestDetails);
router.post('/admin/:id/assign-collection', authenticateAdmin, BuybackRequestController.adminAssignCollection);
router.put('/admin/:id/collection-status', authenticateAdmin, BuybackRequestController.adminUpdateCollectionStatus);
router.post('/admin/:id/inspection', authenticateAdmin, BuybackRequestController.adminSubmitInspection);
router.post('/admin/:id/final-offer', authenticateAdmin, BuybackRequestController.adminGenerateFinalOffer);
router.post('/admin/:id/payments', authenticateAdmin, BuybackRequestController.adminRecordPayment);
router.post('/admin/:id/returns', authenticateAdmin, BuybackRequestController.adminInitiateReturn);
router.put('/admin/:id/complete-return', authenticateAdmin, BuybackRequestController.adminCompleteReturn);

export default router;

