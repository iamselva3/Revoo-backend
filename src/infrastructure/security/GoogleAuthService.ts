import { OAuth2Client } from 'google-auth-library';
import { config } from '../../config/index.js';
import { AppError } from '../../shared/types.js';

export interface VerifiedGoogleUser {
  googleId: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
  isEmailVerified: boolean;
}

export class GoogleAuthService {
  private static client: OAuth2Client | null = null;

  private static getClient(): OAuth2Client {
    if (!this.client) {
      this.client = new OAuth2Client(
        config.google.clientId,
        config.google.clientSecret,
        config.google.redirectUri
      );
    }
    return this.client;
  }

  /**
   * Cryptographically verifies Google ID Token issued by Google OAuth / Identity Services
   */
  public static async verifyGoogleIdToken(idToken: string): Promise<VerifiedGoogleUser> {
    if (!idToken || typeof idToken !== 'string') {
      throw new AppError('Google ID token is required.', 400);
    }

    const client = this.getClient();
    const audience = config.google.clientId || undefined;

    try {
      const ticket = await client.verifyIdToken({
        idToken,
        audience,
      });

      const payload = ticket.getPayload();
      if (!payload) {
        throw new AppError('Invalid Google token payload.', 401);
      }

      if (!payload.email) {
        throw new AppError('Google account does not provide an email address.', 400);
      }

      return {
        googleId: payload.sub,
        email: payload.email.toLowerCase().trim(),
        fullName: payload.name,
        avatarUrl: payload.picture,
        isEmailVerified: payload.email_verified === true,
      };
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      throw new AppError(
        `Google token verification failed: ${err.message || 'Invalid token signature or expired'}`,
        401
      );
    }
  }

  /**
   * Verifies an OAuth 2.0 access token from the Google Identity Services token client.
   * The token must have been issued to one of our OAuth clients (prevents token substitution)
   * and must belong to a verified email address.
   */
  public static async verifyAccessToken(accessToken: string): Promise<VerifiedGoogleUser> {
    if (!accessToken || typeof accessToken !== 'string') {
      throw new AppError('Google access token is required.', 400);
    }

    let info: any;
    try {
      const res = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`,
        { signal: AbortSignal.timeout(8000) }
      );
      if (!res.ok) throw new Error(`tokeninfo responded ${res.status}`);
      info = await res.json();
    } catch {
      throw new AppError('Your Google session is invalid or expired. Please try again.', 401);
    }

    const allowedClients = new Set(
      [config.google.clientId, ...config.google.allowedClientIds].filter(Boolean)
    );
    if (allowedClients.size > 0) {
      if (!allowedClients.has(info.aud) && !allowedClients.has(info.azp)) {
        throw new AppError('This Google token was issued for a different application.', 401);
      }
    } else {
      console.warn('[GoogleAuth] GOOGLE_CLIENT_ID is not set; access-token audience is not being checked.');
    }

    const emailVerified =
      info.email_verified === true || info.email_verified === 'true' || info.verified_email === true;
    if (!info.email || !emailVerified) {
      throw new AppError('Your Google account email is not verified.', 401);
    }

    let fullName: string | undefined;
    let avatarUrl: string | undefined;
    try {
      const profileRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(8000),
      });
      if (profileRes.ok) {
        const profile: any = await profileRes.json();
        fullName = profile.name;
        avatarUrl = profile.picture;
      }
    } catch {
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
  public static async exchangeAuthCode(code: string): Promise<VerifiedGoogleUser> {
    if (!config.google.clientId || !config.google.clientSecret) {
      throw new AppError(
        'Google OAuth is not configured on the server. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your .env file.',
        500
      );
    }

    const client = this.getClient();
    try {
      const { tokens } = await client.getToken(code);
      if (!tokens.id_token) {
        throw new AppError('No ID token returned by Google OAuth code exchange.', 400);
      }
      return await this.verifyGoogleIdToken(tokens.id_token);
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      throw new AppError(`Failed to exchange Google authorization code: ${err.message}`, 400);
    }
  }
}

