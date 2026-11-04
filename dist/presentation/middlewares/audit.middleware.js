"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logAuditEvent = logAuditEvent;
const AuditLog_js_1 = require("../../infrastructure/database/models/AuditLog.js");
async function logAuditEvent(params) {
    try {
        const ipAddress = params.req.headers['x-forwarded-for'] || params.req.socket.remoteAddress || '';
        const userAgent = params.req.headers['user-agent'] || '';
        await AuditLog_js_1.AuditLogModel.create({
            actorType: params.actorType,
            actorId: params.actorId,
            actorEmail: params.actorEmail,
            action: params.action,
            resourceType: params.resourceType,
            resourceId: params.resourceId,
            diff: params.diff,
            ipAddress: Array.isArray(ipAddress) ? ipAddress[0] : ipAddress,
            userAgent,
        });
    }
    catch (err) {
        console.error('[AuditLog] Failed to record audit log:', err);
    }
}
//# sourceMappingURL=audit.middleware.js.map