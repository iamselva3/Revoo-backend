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

