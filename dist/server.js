"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_js_1 = __importDefault(require("./app.js"));
const index_js_1 = require("./config/index.js");
const connection_js_1 = require("./infrastructure/database/connection.js");
const AdminUser_js_1 = require("./infrastructure/database/models/AdminUser.js");
const seed_js_1 = require("./infrastructure/database/seeds/seed.js");
const geoSeed_js_1 = require("./infrastructure/database/seeds/geoSeed.js");
const employeeSeed_js_1 = require("./infrastructure/database/seeds/employeeSeed.js");
async function bootstrap() {
    try {
        console.log('[REVOO Server] Initializing platform backend...');
        await (0, connection_js_1.connectDatabase)();
        // Check if initial seeding is required
        try {
            const adminCount = await AdminUser_js_1.AdminUserModel.countDocuments();
            if (adminCount === 0) {
                console.log('[REVOO Server] Fresh database detected. Running initial seed...');
                await (0, seed_js_1.seedDatabase)();
                console.log('[REVOO Server] Database initialized with default admin accounts and catalogue.');
            }
            else {
                console.log(`[REVOO Server] Connected database verified with ${adminCount} admin accounts.`);
            }
            // Ensure India States, Cities, and Pincodes are seeded in DB
            await (0, geoSeed_js_1.seedGeoDataIfNeeded)();
            // Ensure Collection Partners & Employees are seeded across Tamil Nadu
            await (0, employeeSeed_js_1.seedEmployeesIfNeeded)();
        }
        catch (seedErr) {
            console.error('[REVOO Server] Error verifying/seeding database:', seedErr);
        }
        const server = app_js_1.default.listen(index_js_1.config.port, () => {
            console.log(`[REVOO Server] Running in ${index_js_1.config.nodeEnv} mode on port ${index_js_1.config.port}`);
            console.log(`[REVOO Server] API base URL: http://localhost:${index_js_1.config.port}/api/v1`);
            console.log(`[REVOO Server] Health check: http://localhost:${index_js_1.config.port}/api/v1/health`);
        });
        const shutdown = async (signal) => {
            console.log(`\n[REVOO Server] Received ${signal}. Gracefully shutting down...`);
            server.close(() => {
                console.log('[REVOO Server] HTTP server closed.');
                process.exit(0);
            });
        };
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));
    }
    catch (err) {
        console.error('[REVOO Server] Failed to bootstrap application:', err);
        process.exit(1);
    }
}
bootstrap();
//# sourceMappingURL=server.js.map