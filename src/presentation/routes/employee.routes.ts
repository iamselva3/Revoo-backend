import { Router } from 'express';
import { EmployeeController } from '../controllers/EmployeeController.js';
import { authenticateAdmin } from '../middlewares/auth.middleware.js';

const router = Router();

// Recommendation endpoint for buyback pickup staff assignment
router.get('/recommend', EmployeeController.recommendStaff);

// Management CRUD routes
router.get('/', EmployeeController.listEmployees);
router.post('/', authenticateAdmin, EmployeeController.createEmployee);
router.put('/:id', authenticateAdmin, EmployeeController.updateEmployee);
router.delete('/:id', authenticateAdmin, EmployeeController.deleteEmployee);

export default router;
