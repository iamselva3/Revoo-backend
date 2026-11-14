"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const EmployeeController_js_1 = require("../controllers/EmployeeController.js");
const auth_middleware_js_1 = require("../middlewares/auth.middleware.js");
const router = (0, express_1.Router)();
// Recommendation endpoint for buyback pickup staff assignment
// Staff names, phones and emails: admin only
router.get('/recommend', auth_middleware_js_1.authenticateAdmin, EmployeeController_js_1.EmployeeController.recommendStaff);
// Management CRUD routes
router.get('/', auth_middleware_js_1.authenticateAdmin, EmployeeController_js_1.EmployeeController.listEmployees);
router.post('/', auth_middleware_js_1.authenticateAdmin, EmployeeController_js_1.EmployeeController.createEmployee);
router.put('/:id', auth_middleware_js_1.authenticateAdmin, EmployeeController_js_1.EmployeeController.updateEmployee);
router.delete('/:id', auth_middleware_js_1.authenticateAdmin, EmployeeController_js_1.EmployeeController.deleteEmployee);
exports.default = router;
//# sourceMappingURL=employee.routes.js.map