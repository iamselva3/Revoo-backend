import { Router } from 'express';
import { EmployeeController } from '../controllers/EmployeeController.js';
import { authenticateAdmin } from '../middlewares/auth.middleware.js';

const router = Router();

// Recommendation endpoint for buyback pickup staff assignment
// Staff names, phones and emails: admin only
router.get('/recommend', authenticateAdmin, EmployeeController.recommendStaff);

// Management CRUD routes
router.get('/', authenticateAdmin, EmployeeController.listEmployees);
router.post('/', authenticateAdmin, EmployeeController.createEmployee);
router.put('/:id', authenticateAdmin, EmployeeController.updateEmployee);
router.delete('/:id', authenticateAdmin, EmployeeController.deleteEmployee);

export default router;

