"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleAuthService = void 0;
const google_auth_library_1 = require("google-auth-library");
const index_js_1 = require("../../config/index.js");
const types_js_1 = require("../../shared/types.js");
class GoogleAuthService {
    static client = null;
    static getClient() {
        if (!this.client) {
            this.client = new google_auth_library_1.OAuth2Client(index_js_1.config.google.clientId, index_js_1.config.google.clientSecret, index_js_1.config.google.redirectUri);
        }
        return this.client;
    }
    /**
     * Cryptographically verifies Google ID Token issued by Google OAuth / Identity Services
     */
    static async verifyGoogleIdToken(idToken) {
        if (!idToken || typeof idToken !== 'string') {
            throw new types_js_1.AppError('Google ID token is required.', 400);
        }
        const client = this.getClient();
        const audience = index_js_1.config.google.clientId || undefined;
        try {
            const ticket = await client.verifyIdToken({
                idToken,
                audience,
            });
            const payload = ticket.getPayload();
            if (!payload) {
                throw new types_js_1.AppError('Invalid Google token payload.', 401);
            }
            if (!payload.email) {
                throw new types_js_1.AppError('Google account does not provide an email address.', 400);
            }
            return {
                googleId: payload.sub,
                email: payload.email.toLowerCase().trim(),
                fullName: payload.name,
                avatarUrl: payload.picture,
                isEmailVerified: payload.email_verified === true,
            };
        }
        catch (err) {
            if (err instanceof types_js_1.AppError)
                throw err;
            throw new types_js_1.AppError(`Google token verification failed: ${err.message || 'Invalid token signature or expired'}`, 401);
        }
    }
    /**
     * Exchanges an authorization code (serverAuthCode) for tokens and verifies identity
     */
    static async exchangeAuthCode(code) {
        if (!index_js_1.config.google.clientId || !index_js_1.config.google.clientSecret) {
            throw new types_js_1.AppError('Google OAuth is not configured on the server. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your .env file.', 500);
        }
        const client = this.getClient();
        try {
            const { tokens } = await client.getToken(code);
            if (!tokens.id_token) {
                throw new types_js_1.AppError('No ID token returned by Google OAuth code exchange.', 400);
            }
            return await this.verifyGoogleIdToken(tokens.id_token);
        }
        catch (err) {
            if (err instanceof types_js_1.AppError)
                throw err;
            throw new types_js_1.AppError(`Failed to exchange Google authorization code: ${err.message}`, 400);
        }
    }
}
exports.GoogleAuthService = GoogleAuthService;
//# sourceMappingURL=GoogleAuthService.js.map