"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.otpLimiter = exports.authLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
// Only abuse-prone auth routes are rate limited; there is deliberately no app-wide limiter.
exports.authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // max 20 auth attempts per IP
    standardHeaders: true,
    legacyHeaders: false,
    validate: { xForwardedForHeader: false },
    message: {
        success: false,
        message: 'Too many authentication attempts. Please try again after 15 minutes.',
    },
});
exports.otpLimiter = (0, express_rate_limit_1.default)({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 5, // max 5 OTP requests
    standardHeaders: true,
    legacyHeaders: false,
    validate: { xForwardedForHeader: false },
    message: {
        success: false,
        message: 'Too many OTP requests. Please wait before requesting another code.',
    },
});
//# sourceMappingURL=rateLimiter.middleware.js.map