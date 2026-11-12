"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomerSessionService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const User_js_1 = require("../database/models/User.js");
const tokenService_js_1 = require("./tokenService.js");
const types_js_1 = require("../../shared/types.js");
/**
 * Per-device customer sessions.
 *
 * Each sign-in creates its own session (stored on the user), so signing in on the phone app or
 * another browser never invalidates an existing one. Refresh tokens carry the session id (`sid`)
 * and rotate on every use:
 *   - presenting the current token rotates it;
 *   - presenting the token rotated away within GRACE_MS is accepted too, which absorbs
 *     two tabs/requests refreshing at the same moment;
 *   - presenting any older token is treated as token reuse and ends that one session only.
 */
class CustomerSessionService {
    static MAX_SESSIONS = 10;
    static GRACE_MS = 2 * 60 * 1000;
    static payloadFor(user) {
        return {
            userId: user._id.toString(),
            phone: user.phone,
            email: user.email,
            type: 'CUSTOMER',
        };
    }
    /** Creates a new device session and returns its token pair. */
    static async issue(user, userAgent) {
        const sid = crypto_1.default.randomUUID();
        const pair = tokenService_js_1.TokenService.generateCustomerTokenPair(CustomerSessionService.payloadFor(user), sid);
        const now = new Date();
        await User_js_1.UserModel.updateOne({ _id: user._id }, {
            $push: {
                sessions: {
                    $each: [
                        {
                            sid,
                            hash: pair.refreshTokenHash,
                            createdAt: now,
                            lastUsedAt: now,
                            userAgent: userAgent?.slice(0, 200),
                        },
                    ],
                    $slice: -CustomerSessionService.MAX_SESSIONS, // keep the most recent devices
                },
            },
        });
        return { accessToken: pair.accessToken, refreshToken: pair.refreshToken };
    }
    /**
     * Exchanges a refresh token for a new pair. Returns null when the session is unknown,
     * revoked, or the token was reused; throws if the token itself is invalid/expired.
     */
    static async rotate(refreshToken, userAgent) {
        const decoded = tokenService_js_1.TokenService.verifyRefreshToken(refreshToken);
        if (decoded?.type !== 'CUSTOMER')
            return null;
        const hash = tokenService_js_1.TokenService.hashToken(refreshToken);
        // Optimistic concurrency: each write only applies if the session is unchanged since we read
        // it; if another refresh won the race, re-read and try again.
        for (let attempt = 0; attempt < 4; attempt++) {
            const user = await User_js_1.UserModel.findById(decoded.userId).select('+sessions +refreshTokenHash');
            // Same rule as the auth middleware: only suspended accounts are refused
            if (!user || user.status === types_js_1.UserStatus.BLOCKED)
                return null;
            // Tokens issued before per-device sessions existed: accept the current legacy token once
            // and move it into a proper session.
            if (!decoded.sid) {
                if (!user.refreshTokenHash || user.refreshTokenHash !== hash)
                    return null;
                const claimed = await User_js_1.UserModel.updateOne({ _id: user._id, refreshTokenHash: hash }, { $unset: { refreshTokenHash: 1 } });
                if (claimed.modifiedCount === 0)
                    return null;
                return CustomerSessionService.issue(user, userAgent);
            }
            const session = (user.sessions || []).find((s) => s.sid === decoded.sid);
            if (!session)
                return null;
            const now = Date.now();
            const isCurrent = session.hash === hash;
            const isJustRotated = session.prevHash === hash &&
                session.rotatedAt &&
                now - new Date(session.rotatedAt).getTime() < CustomerSessionService.GRACE_MS;
            if (!isCurrent && !isJustRotated) {
                // An old refresh token came back: assume it leaked and end this session only.
                await User_js_1.UserModel.updateOne({ _id: user._id }, { $pull: { sessions: { sid: decoded.sid } } });
                return null;
            }
            const pair = tokenService_js_1.TokenService.generateCustomerTokenPair(CustomerSessionService.payloadFor(user), decoded.sid);
            const result = await User_js_1.UserModel.updateOne({ _id: user._id, sessions: { $elemMatch: { sid: decoded.sid, hash: session.hash } } }, {
                $set: {
                    'sessions.$.prevHash': session.hash,
                    'sessions.$.hash': pair.refreshTokenHash,
                    'sessions.$.rotatedAt': new Date(now),
                    'sessions.$.lastUsedAt': new Date(now),
                },
            });
            if (result.modifiedCount === 1) {
                return { accessToken: pair.accessToken, refreshToken: pair.refreshToken };
            }
            // Lost the race to a concurrent refresh: loop and evaluate against the fresh state.
        }
        return null;
    }
    /** Ends the session a refresh token belongs to (logout on this device). Never throws. */
    static async revoke(refreshToken) {
        if (!refreshToken)
            return;
        try {
            const decoded = tokenService_js_1.TokenService.verifyRefreshToken(refreshToken);
            if (decoded?.type !== 'CUSTOMER')
                return;
            if (decoded.sid) {
                await User_js_1.UserModel.updateOne({ _id: decoded.userId }, { $pull: { sessions: { sid: decoded.sid } } });
            }
            else {
                await User_js_1.UserModel.updateOne({ _id: decoded.userId, refreshTokenHash: tokenService_js_1.TokenService.hashToken(refreshToken) }, { $unset: { refreshTokenHash: 1 } });
            }
        }
        catch {
            // Invalid or expired token: nothing to revoke.
        }
    }
}
exports.CustomerSessionService = CustomerSessionService;
//# sourceMappingURL=CustomerSessionService.js.map