import { Router } from 'express';
import { GeoController } from '../controllers/GeoController.js';
import { geoLookupLimiter, pincodeAreasLimiter } from '../middlewares/rateLimiter.middleware.js';

const router = Router();

router.get('/states', GeoController.getStates);
router.get('/cities', GeoController.getCities);
router.get('/pincode/:pincode', GeoController.lookupPincode);
router.get('/reverse', geoLookupLimiter, GeoController.reverseGeocode);
router.get('/areas/:pincode', pincodeAreasLimiter, GeoController.pincodeAreas);

export default router;

