import { Router } from 'express';
import { GeoController } from '../controllers/GeoController.js';

const router = Router();

router.get('/states', GeoController.getStates);
router.get('/cities', GeoController.getCities);
router.get('/pincode/:pincode', GeoController.lookupPincode);

export default router;

