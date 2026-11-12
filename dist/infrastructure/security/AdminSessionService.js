"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminSessionService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const AdminUser_js_1 = require("../database/models/AdminUser.js");
const tokenService_js_1 = require("./tokenService.js");
const index_js_1 = require("../../config/index.js");
/**
 * Per-device admin sessions (same rules as CustomerSessionService).
 *
 * Before this, an admin account had a single refresh token and any mismatch wiped it. Two refreshes
 * at the same moment (e.g. several requests failing together when the 15-minute access token
 * expired, which happens when the window regains focus after picking a photo) therefore logged the
 * admin out, and staff sharing one login on two computers logged each other out.
 *
 *   - every sign-in gets its own session, so other devices are unaffected;
 *   - presenting the current refresh token rotates it;
 *   - presenting the token rotated away within GRACE_MS returns the SAME successor token again, so
 *     any number of simultaneous refreshes all end up holding the one valid token;
 *   - presenting any older token is treated as reuse and ends that one session only.
 *
 * The successor of a refresh token is derived deterministically from it (salt = HMAC of the old
 * token, issued-at = rotation time), which is what makes repeating a rotation possible without
 * storing raw tokens.
 */
class AdminSessionService {
    static MAX_SESSIONS = 10;
    static GRACE_MS = 2 * 60 * 1000;
    static payloadFor(admin) {
        return {
            adminId: admin._id.toString(),
            email: admin.email,
            role: admin.role,
            fullName: admin.fullName,
            type: 'ADMIN',
        };
    }
    /** The refresh token that replaces `previous` (identical every time for the same inputs). */
    static successorRefreshToken(admin, sid, previous, issuedAtSec) {
        const salt = crypto_1.default.createHmac('sha256', index_js_1.config.jwt.refreshSecret).update(previous).digest('hex');
        return jsonwebtoken_1.default.sign({ ...AdminSessionService.payloadFor(admin), sid, tokenSalt: salt, iat: issuedAtSec }, index_js_1.config.jwt.refreshSecret, { expiresIn: index_js_1.config.jwt.refreshExpiry });
    }
    static accessTokenFor(admin, sid) {
        return tokenService_js_1.TokenService.generateAdminTokenPair(AdminSessionService.payloadFor(admin), sid).accessToken;
    }
    /** Creates a new device session and returns its token pair. */
    static async issue(admin, userAgent) {
        const sid = crypto_1.default.randomUUID();
        const pair = tokenService_js_1.TokenService.generateAdminTokenPair(AdminSessionService.payloadFor(admin), sid);
        const now = new Date();
        await AdminUser_js_1.AdminUserModel.updateOne({ _id: admin._id }, {
            $push: {
                sessions: {
                    $each: [{ sid, hash: pair.refreshTokenHash, createdAt: now, lastUsedAt: now, userAgent: userAgent?.slice(0, 200) }],
                    $slice: -AdminSessionService.MAX_SESSIONS,
                },
            },
        });
        return { accessToken: pair.accessToken, refreshToken: pair.refreshToken };
    }
    /**
     * Exchanges a refresh token for a new pair. Returns null when the session is unknown, revoked,
     * the account is disabled, or the token was reused; throws if the token itself is invalid/expired.
     */
    static async rotate(refreshToken, userAgent) {
        const decoded = tokenService_js_1.TokenService.verifyRefreshToken(refreshToken);
        if (decoded?.type !== 'ADMIN')
            return null;
        const hash = tokenService_js_1.TokenService.hashToken(refreshToken);
        for (let attempt = 0; attempt < 4; attempt++) {
            const admin = await AdminUser_js_1.AdminUserModel.findById(decoded.adminId).select('+sessions +refreshTokenHash');
            if (!admin || !admin.isActive)
                return null;
            // Tokens issued before per-device sessions: accept the current legacy token once and
            // move it into a proper session.
            if (!decoded.sid) {
                if (!admin.refreshTokenHash || admin.refreshTokenHash !== hash)
                    return null;
                const claimed = await AdminUser_js_1.AdminUserModel.updateOne({ _id: admin._id, refreshTokenHash: hash }, { $unset: { refreshTokenHash: 1 } });
                if (claimed.modifiedCount === 0)
                    return null;
                return AdminSessionService.issue(admin, userAgent);
            }
            const session = (admin.sessions || []).find((s) => s.sid === decoded.sid);
            if (!session)
                return null;
            const now = Date.now();
            const isCurrent = session.hash === hash;
            const isJustRotated = session.prevHash === hash &&
                session.rotatedAt &&
                now - new Date(session.rotatedAt).getTime() < AdminSessionService.GRACE_MS;
            if (isJustRotated) {
                // Another request already rotated this token moments ago: hand out the same successor.
                const issuedAtSec = Math.floor(new Date(session.rotatedAt).getTime() / 1000);
                const successor = AdminSessionService.successorRefreshToken(admin, decoded.sid, refreshToken, issuedAtSec);
                if (tokenService_js_1.TokenService.hashToken(successor) === session.hash) {
                    return { accessToken: AdminSessionService.accessTokenFor(admin, decoded.sid), refreshToken: successor };
                }
                // Profile details changed in between (e.g. role): fall through and rotate normally.
            }
            if (!isCurrent && !isJustRotated) {
                // An old refresh token came back: assume it leaked and end this session only.
                await AdminUser_js_1.AdminUserModel.updateOne({ _id: admin._id }, { $pull: { sessions: { sid: decoded.sid } } });
                return null;
            }
            const issuedAtSec = Math.floor(now / 1000);
            const successor = AdminSessionService.successorRefreshToken(admin, decoded.sid, refreshToken, issuedAtSec);
            const result = await AdminUser_js_1.AdminUserModel.updateOne({ _id: admin._id, sessions: { $elemMatch: { sid: decoded.sid, hash: session.hash } } }, {
                $set: {
                    'sessions.$.prevHash': hash,
                    'sessions.$.hash': tokenService_js_1.TokenService.hashToken(successor),
                    'sessions.$.rotatedAt': new Date(issuedAtSec * 1000),
                    'sessions.$.lastUsedAt': new Date(now),
                },
            });
            if (result.modifiedCount === 1) {
                return { accessToken: AdminSessionService.accessTokenFor(admin, decoded.sid), refreshToken: successor };
            }
            // Lost the race to a concurrent refresh: re-read and evaluate again (now as "just rotated").
        }
        return null;
    }
    /** Ends the session a refresh token belongs to (logout on this device only). Never throws. */
    static async revoke(refreshToken) {
        if (!refreshToken)
            return;
        try {
            const decoded = tokenService_js_1.TokenService.verifyRefreshToken(refreshToken);
            if (decoded?.type !== 'ADMIN')
                return;
            if (decoded.sid) {
                await AdminUser_js_1.AdminUserModel.updateOne({ _id: decoded.adminId }, { $pull: { sessions: { sid: decoded.sid } } });
            }
            else {
                await AdminUser_js_1.AdminUserModel.updateOne({ _id: decoded.adminId, refreshTokenHash: tokenService_js_1.TokenService.hashToken(refreshToken) }, { $unset: { refreshTokenHash: 1 } });
            }
        }
        catch {
            // Invalid or expired token: nothing to revoke.
        }
    }
}
exports.AdminSessionService = AdminSessionService;
//# sourceMappingURL=AdminSessionService.js.map