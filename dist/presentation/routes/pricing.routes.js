"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const PricingController_js_1 = require("../controllers/PricingController.js");
const auth_middleware_js_1 = require("../middlewares/auth.middleware.js");
const router = (0, express_1.Router)();
router.get('/model/:modelId', auth_middleware_js_1.authenticateAdmin, PricingController_js_1.PricingController.getPricingRuleForModel);
router.put('/model/:modelId', auth_middleware_js_1.authenticateAdmin, PricingController_js_1.PricingController.updatePricingRule);
router.get('/history/:modelId', auth_middleware_js_1.authenticateAdmin, PricingController_js_1.PricingController.getPricingHistory);
exports.default = router;
//# sourceMappingURL=pricing.routes.js.map