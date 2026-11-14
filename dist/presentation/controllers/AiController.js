"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiController = void 0;
const GenieAiService_js_1 = require("../../domain/services/GenieAiService.js");
const index_js_1 = require("../../config/index.js");
class AiController {
    static async chat(req, res, next) {
        try {
            const { messages, context } = req.body;
            if (!messages || !Array.isArray(messages) || messages.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Messages array is required',
                });
            }
            const responseText = await GenieAiService_js_1.GenieAiService.chat(messages, context);
            return res.status(200).json({
                success: true,
                message: responseText,
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async status(req, res, next) {
        try {
            const isConfigured = Boolean(index_js_1.config.groq.apiKey && index_js_1.config.groq.apiKey.length > 5);
            return res.status(200).json({
                success: true,
                configured: isConfigured,
                model: index_js_1.config.groq.model,
            });
        }
        catch (err) {
            next(err);
        }
    }
}
exports.AiController = AiController;
//# sourceMappingURL=AiController.js.map