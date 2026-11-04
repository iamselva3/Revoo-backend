"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const DashboardController_js_1 = require("../controllers/DashboardController.js");
const auth_middleware_js_1 = require("../middlewares/auth.middleware.js");
const router = (0, express_1.Router)();
router.get('/stats', auth_middleware_js_1.authenticateAdmin, DashboardController_js_1.DashboardController.getOperationalStats);
router.get('/audits', auth_middleware_js_1.authenticateAdmin, DashboardController_js_1.DashboardController.getAuditLogs);
exports.default = router;
//# sourceMappingURL=dashboard.routes.js.map