"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const EnquiryController_js_1 = require("../controllers/EnquiryController.js");
const auth_middleware_js_1 = require("../middlewares/auth.middleware.js");
const router = (0, express_1.Router)();
router.post('/', EnquiryController_js_1.EnquiryController.submitEnquiry);
router.get('/admin', auth_middleware_js_1.authenticateAdmin, EnquiryController_js_1.EnquiryController.adminListEnquiries);
router.put('/admin/:id/respond', auth_middleware_js_1.authenticateAdmin, EnquiryController_js_1.EnquiryController.adminRespondEnquiry);
exports.default = router;
//# sourceMappingURL=enquiry.routes.js.map