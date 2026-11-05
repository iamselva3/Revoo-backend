"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const path_1 = __importDefault(require("path"));
const index_js_1 = require("./config/index.js");
const index_js_2 = __importDefault(require("./presentation/routes/index.js"));
const errorHandler_middleware_js_1 = require("./presentation/middlewares/errorHandler.middleware.js");
const rateLimiter_middleware_js_1 = require("./presentation/middlewares/rateLimiter.middleware.js");
const types_js_1 = require("./shared/types.js");
const app = (0, express_1.default)();
// Trust reverse proxies (Render, Cloudflare, load balancers) for accurate client IP & rate limiting
app.set('trust proxy', 1);
// Security headers
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
// CORS policy
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow requests with no origin (like native mobile apps, curl, Postman)
        if (!origin)
            return callback(null, true);
        if (index_js_1.config.cors.origin.includes('*') ||
            index_js_1.config.cors.origin.includes(origin) ||
            !index_js_1.config.isProduction) {
            return callback(null, true);
        }
        return callback(new types_js_1.AppError('Blocked by CORS policy', 403));
    },
    credentials: true,
}));
// UptimeRobot & Service Health Check (exempt from rate limits for 24/7 monitoring)
app.get(['/health', '/'], (req, res) => {
    res.status(200).json({
        status: 'HEALTHY',
        service: 'REVOO Backend API',
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.floor(process.uptime()),
        environment: index_js_1.config.nodeEnv,
    });
});
// Rate limiting
app.use(rateLimiter_middleware_js_1.globalLimiter);
// Request body parsers (supports high-res image uploads & base64 data URLs)
app.use(express_1.default.json({ limit: '50mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '50mb' }));
// Request logging
if (index_js_1.config.nodeEnv !== 'test') {
    app.use((0, morgan_1.default)('combined'));
}
// Serve uploaded static files
const uploadBasePath = path_1.default.resolve(process.cwd(), index_js_1.config.storage.uploadDir);
app.use('/uploads', express_1.default.static(uploadBasePath));
// Mount REST API (both /api/v1 and root / for seamless compatibility)
app.use('/api/v1', index_js_2.default);
app.use('/', index_js_2.default);
// Centralized error handling middleware
app.use(errorHandler_middleware_js_1.errorHandler);
exports.default = app;
//# sourceMappingURL=app.js.map