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
     * Verifies an OAuth 2.0 access token from the Google Identity Services token client.
     * The token must have been issued to one of our OAuth clients (prevents token substitution)
     * and must belong to a verified email address.
     */
    static async verifyAccessToken(accessToken) {
        if (!accessToken || typeof accessToken !== 'string') {
            throw new types_js_1.AppError('Google access token is required.', 400);
        }
        let info;
        try {
            const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`, { signal: AbortSignal.timeout(8000) });
            if (!res.ok)
                throw new Error(`tokeninfo responded ${res.status}`);
            info = await res.json();
        }
        catch {
            throw new types_js_1.AppError('Your Google session is invalid or expired. Please try again.', 401);
        }
        const allowedClients = new Set([index_js_1.config.google.clientId, ...index_js_1.config.google.allowedClientIds].filter(Boolean));
        if (allowedClients.size > 0) {
            if (!allowedClients.has(info.aud) && !allowedClients.has(info.azp)) {
                throw new types_js_1.AppError('This Google token was issued for a different application.', 401);
            }
        }
        else {
            console.warn('[GoogleAuth] GOOGLE_CLIENT_ID is not set; access-token audience is not being checked.');
        }
        const emailVerified = info.email_verified === true || info.email_verified === 'true' || info.verified_email === true;
        if (!info.email || !emailVerified) {
            throw new types_js_1.AppError('Your Google account email is not verified.', 401);
        }
        let fullName;
        let avatarUrl;
        try {
            const profileRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
                headers: { Authorization: `Bearer ${accessToken}` },
                signal: AbortSignal.timeout(8000),
            });
            if (profileRes.ok) {
                const profile = await profileRes.json();
                fullName = profile.name;
                avatarUrl = profile.picture;
            }
        }
        catch {
            // Profile details are optional; identity is already verified above.
        }
        return {
            googleId: String(info.sub || info.user_id),
            email: String(info.email).toLowerCase().trim(),
            fullName,
            avatarUrl,
            isEmailVerified: true,
        };
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