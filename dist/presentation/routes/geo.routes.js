"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const GeoController_js_1 = require("../controllers/GeoController.js");
const rateLimiter_middleware_js_1 = require("../middlewares/rateLimiter.middleware.js");
const router = (0, express_1.Router)();
router.get('/states', GeoController_js_1.GeoController.getStates);
router.get('/cities', GeoController_js_1.GeoController.getCities);
router.get('/pincode/:pincode', GeoController_js_1.GeoController.lookupPincode);
router.get('/reverse', rateLimiter_middleware_js_1.geoLookupLimiter, GeoController_js_1.GeoController.reverseGeocode);
exports.default = router;
//# sourceMappingURL=geo.routes.js.map