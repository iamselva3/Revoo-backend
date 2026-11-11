import jwt, { SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { config } from '../../config/index.js';
import { AdminRole } from '../../shared/types.js';

export interface CustomerTokenPayload {
  userId: string;
  phone?: string;
  email?: string;
  type: 'CUSTOMER';
}

export interface AdminTokenPayload {
  adminId: string;
  email: string;
  role: AdminRole;
  fullName: string;
  type: 'ADMIN';
}

export class TokenService {
  /**
   * @param sid Session id embedded in the refresh token, identifying the device/browser session
   *            it belongs to (see CustomerSessionService).
   */
  public static generateCustomerTokenPair(payload: CustomerTokenPayload, sid?: string): {
    accessToken: string;
    refreshToken: string;
    refreshTokenHash: string;
  } {
    const accessToken = jwt.sign(payload, config.jwt.accessSecret, {
      expiresIn: config.jwt.accessExpiry as any,
    });

    const refreshTokenRaw = crypto.randomBytes(40).toString('hex');
    const refreshToken = jwt.sign(
      { ...payload, ...(sid ? { sid } : {}), tokenSalt: refreshTokenRaw },
      config.jwt.refreshSecret,
      { expiresIn: config.jwt.refreshExpiry as any }
    );

    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    return { accessToken, refreshToken, refreshTokenHash };
  }

  public static generateAdminTokenPair(payload: AdminTokenPayload): {
    accessToken: string;
    refreshToken: string;
    refreshTokenHash: string;
  } {
    const accessToken = jwt.sign(payload, config.jwt.accessSecret, {
      expiresIn: config.jwt.accessExpiry as any,
    });

    const refreshTokenRaw = crypto.randomBytes(40).toString('hex');
    const refreshToken = jwt.sign(
      { ...payload, tokenSalt: refreshTokenRaw },
      config.jwt.refreshSecret,
      { expiresIn: config.jwt.refreshExpiry as any }
    );

    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    return { accessToken, refreshToken, refreshTokenHash };
  }

  public static verifyAccessToken<T = any>(token: string): T {
    return jwt.verify(token, config.jwt.accessSecret) as T;
  }

  public static verifyRefreshToken<T = any>(token: string): T {
    return jwt.verify(token, config.jwt.refreshSecret) as T;
  }

  public static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  public static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  public static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  public static generateOtp(digits = 6): string {
    const min = Math.pow(10, digits - 1);
    const max = Math.pow(10, digits) - 1;
    return crypto.randomInt(min, max + 1).toString();
  }

  public static hashOtp(otp: string): string {
    return crypto.createHash('sha256').update(otp).digest('hex');
  }
}

