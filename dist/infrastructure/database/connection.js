"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDatabase = connectDatabase;
exports.disconnectDatabase = disconnectDatabase;
const mongoose_1 = __importDefault(require("mongoose"));
const index_js_1 = require("../../config/index.js");
let memoryServerInstance = null;
async function connectDatabase(uri) {
    const mongoUri = uri || index_js_1.config.mongoUri;
    try {
        const conn = await mongoose_1.default.connect(mongoUri, {
            autoIndex: true,
            serverSelectionTimeoutMS: 7000,
        });
        console.log(`[Database] MongoDB connected successfully to ${conn.connection.host}/${conn.connection.name}`);
        return conn;
    }
    catch (err) {
        console.error('[Database] MongoDB connection error:', err?.message || err);
        if (!index_js_1.config.isProduction) {
            console.warn('[Database] Attempting fallback to in-memory MongoDB for development...');
            try {
                const { MongoMemoryServer } = await import('mongodb-memory-server');
                memoryServerInstance = await MongoMemoryServer.create();
                const memUri = memoryServerInstance.getUri();
                const conn = await mongoose_1.default.connect(memUri, { autoIndex: true });
                console.log(`[Database] Connected to fallback in-memory MongoDB at ${memUri}`);
                return conn;
            }
            catch (memErr) {
                console.error('[Database] In-memory fallback failed:', memErr);
                throw err;
            }
        }
        throw err;
    }
}
async function disconnectDatabase() {
    await mongoose_1.default.disconnect();
    if (memoryServerInstance) {
        await memoryServerInstance.stop();
        memoryServerInstance = null;
    }
}
//# sourceMappingURL=connection.js.map