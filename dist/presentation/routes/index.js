"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_routes_js_1 = __importDefault(require("./auth.routes.js"));
const catalogue_routes_js_1 = __importDefault(require("./catalogue.routes.js"));
const pricing_routes_js_1 = __importDefault(require("./pricing.routes.js"));
const request_routes_js_1 = __importDefault(require("./request.routes.js"));
const enquiry_routes_js_1 = __importDefault(require("./enquiry.routes.js"));
const dashboard_routes_js_1 = __importDefault(require("./dashboard.routes.js"));
const router = (0, express_1.Router)();
router.use('/auth', auth_routes_js_1.default);
router.use('/catalogue', catalogue_routes_js_1.default);
router.use('/pricing', pricing_routes_js_1.default);
router.use('/requests', request_routes_js_1.default);
router.use('/enquiries', enquiry_routes_js_1.default);
router.use('/dashboard', dashboard_routes_js_1.default);
// Health check endpoint
router.get('/health', (req, res) => {
    res.status(200).json({
        status: 'HEALTHY',
        service: 'REVOO Backend API',
        timestamp: new Date().toISOString(),
        uptimeSeconds: process.uptime(),
    });
});
exports.default = router;
//# sourceMappingURL=index.js.map