"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const AiController_js_1 = require("../controllers/AiController.js");
const router = (0, express_1.Router)();
router.post('/chat', AiController_js_1.AiController.chat);
router.get('/status', AiController_js_1.AiController.status);
exports.default = router;
//# sourceMappingURL=ai.routes.js.map