"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenService = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const index_js_1 = require("../../config/index.js");
class TokenService {
    /**
     * @param sid Session id embedded in the refresh token, identifying the device/browser session
     *            it belongs to (see CustomerSessionService).
     */
    static generateCustomerTokenPair(payload, sid) {
        const accessToken = jsonwebtoken_1.default.sign(payload, index_js_1.config.jwt.accessSecret, {
            expiresIn: index_js_1.config.jwt.accessExpiry,
        });
        const refreshTokenRaw = crypto_1.default.randomBytes(40).toString('hex');
        const refreshToken = jsonwebtoken_1.default.sign({ ...payload, ...(sid ? { sid } : {}), tokenSalt: refreshTokenRaw }, index_js_1.config.jwt.refreshSecret, { expiresIn: index_js_1.config.jwt.refreshExpiry });
        const refreshTokenHash = crypto_1.default.createHash('sha256').update(refreshToken).digest('hex');
        return { accessToken, refreshToken, refreshTokenHash };
    }
    static generateAdminTokenPair(payload) {
        const accessToken = jsonwebtoken_1.default.sign(payload, index_js_1.config.jwt.accessSecret, {
            expiresIn: index_js_1.config.jwt.accessExpiry,
        });
        const refreshTokenRaw = crypto_1.default.randomBytes(40).toString('hex');
        const refreshToken = jsonwebtoken_1.default.sign({ ...payload, tokenSalt: refreshTokenRaw }, index_js_1.config.jwt.refreshSecret, { expiresIn: index_js_1.config.jwt.refreshExpiry });
        const refreshTokenHash = crypto_1.default.createHash('sha256').update(refreshToken).digest('hex');
        return { accessToken, refreshToken, refreshTokenHash };
    }
    static verifyAccessToken(token) {
        return jsonwebtoken_1.default.verify(token, index_js_1.config.jwt.accessSecret);
    }
    static verifyRefreshToken(token) {
        return jsonwebtoken_1.default.verify(token, index_js_1.config.jwt.refreshSecret);
    }
    static hashToken(token) {
        return crypto_1.default.createHash('sha256').update(token).digest('hex');
    }
    static async hashPassword(password) {
        return bcryptjs_1.default.hash(password, 12);
    }
    static async comparePassword(password, hash) {
        return bcryptjs_1.default.compare(password, hash);
    }
    static generateOtp(digits = 6) {
        const min = Math.pow(10, digits - 1);
        const max = Math.pow(10, digits) - 1;
        return crypto_1.default.randomInt(min, max + 1).toString();
    }
    static hashOtp(otp) {
        return crypto_1.default.createHash('sha256').update(otp).digest('hex');
    }
}
exports.TokenService = TokenService;
//# sourceMappingURL=tokenService.js.map