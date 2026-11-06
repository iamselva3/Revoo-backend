import { Request, Response, NextFunction } from 'express';
import { TokenService } from '../../infrastructure/security/tokenService.js';
import { GoogleAuthService } from '../../infrastructure/security/GoogleAuthService.js';
import { UserModel } from '../../infrastructure/database/models/User.js';
import { AdminUserModel } from '../../infrastructure/database/models/AdminUser.js';
import { OtpRecordModel } from '../../infrastructure/database/models/OtpRecord.js';
import { NotificationService } from '../../infrastructure/notifications/NotificationService.js';
import { AppError, UserStatus } from '../../shared/types.js';
import { logAuditEvent } from '../middlewares/audit.middleware.js';
import { AuthenticatedCustomerRequest, AuthenticatedAdminRequest } from '../middlewares/auth.middleware.js';

export class AuthController {
  public static async requestCustomerOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { channel, fullName } = req.body;
      const rawDest = req.body.destination || req.body.phone || req.body.email;
      if (!rawDest) {
        return next(new AppError('Phone number or email destination is required.', 400));
      }
      const normalizedDest = channel === 'EMAIL' ? rawDest.toLowerCase().trim() : rawDest.trim();

      // Check recent OTP request to throttle resends (60s cooldown)
      const existingOtp = await OtpRecordModel.findOne({
        destination: normalizedDest,
        channel,
        isUsed: false,
        expiresAt: { $gt: new Date() },
      }).sort({ createdAt: -1 });

      if (existingOtp && existingOtp.resendAvailableAt > new Date()) {
        const remainingSeconds = Math.ceil((existingOtp.resendAvailableAt.getTime() - Date.now()) / 1000);
        return next(new AppError(`Please wait ${remainingSeconds} seconds before requesting a new code.`, 429));
      }

      // Generate 6-digit cryptographic OTP
      const otp = TokenService.generateOtp(6);
      const otpHash = TokenService.hashOtp(otp);

      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
      const resendAvailableAt = new Date(Date.now() + 60 * 1000); // 60 seconds

      await OtpRecordModel.create({
        destination: normalizedDest,
        channel,
        otpHash,
        attempts: 0,
        maxAttempts: 3,
        expiresAt,
        resendAvailableAt,
        isUsed: false,
      });

      // Dispatch through NotificationService
      const dispatchResult = await NotificationService.sendOtp(normalizedDest, channel, otp);

      // Upsert pending user if not found
      if (channel === 'EMAIL') {
        await UserModel.findOneAndUpdate(
          { email: normalizedDest },
          { $setOnInsert: { email: normalizedDest, fullName, status: UserStatus.ACTIVE } },
          { upsert: true }
        );
      } else {
        await UserModel.findOneAndUpdate(
          { phone: normalizedDest },
          { $setOnInsert: { phone: normalizedDest, fullName, status: UserStatus.ACTIVE } },
          { upsert: true }
        );
      }

      res.status(200).json({
        success: true,
        message: dispatchResult.message,
        data: {
          destination: normalizedDest,
          channel,
          resendCooldownSeconds: 60,
          expiresInSeconds: 300,
          ...(process.env.NODE_ENV !== 'production' ? { devOtp: otp } : {}),
        },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async verifyCustomerOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { channel, otp, fullName } = req.body;
      const rawDest = req.body.destination || req.body.phone || req.body.email;
      if (!rawDest) {
        return next(new AppError('Phone number or email destination is required.', 400));
      }
      const normalizedDest = channel === 'EMAIL' ? rawDest.toLowerCase().trim() : rawDest.trim();

      const otpRecord = await OtpRecordModel.findOne({
        destination: normalizedDest,
        channel,
        isUsed: false,
        expiresAt: { $gt: new Date() },
      }).sort({ createdAt: -1 });

      if (!otpRecord) {
        return next(new AppError('OTP expired or not found. Please request a new code.', 400));
      }

      if (otpRecord.attempts >= otpRecord.maxAttempts) {
        return next(new AppError('Maximum OTP verification attempts exceeded. Please request a new code.', 429));
      }

      const inputHash = TokenService.hashOtp(otp);
      if (inputHash !== otpRecord.otpHash) {
        otpRecord.attempts += 1;
        await otpRecord.save();
        return next(new AppError(`Incorrect verification code. ${otpRecord.maxAttempts - otpRecord.attempts} attempts remaining.`, 400));
      }

      otpRecord.isUsed = true;
      await otpRecord.save();

      // Find or create customer
      const query = channel === 'EMAIL' ? { email: normalizedDest } : { phone: normalizedDest };
      let user = await UserModel.findOne(query);

      if (!user) {
        user = await UserModel.create({
          ...query,
          fullName: fullName || (channel === 'EMAIL' ? normalizedDest.split('@')[0] : 'Revoo User'),
          isVerified: true,
          status: UserStatus.ACTIVE,
        });
      } else {
        user.isVerified = true;
        if (fullName && !user.fullName) {
          user.fullName = fullName;
        }
      }

      // Generate tokens
      const tokenPair = TokenService.generateCustomerTokenPair({
        userId: user._id.toString(),
        phone: user.phone,
        email: user.email,
        type: 'CUSTOMER',
      });

      user.refreshTokenHash = tokenPair.refreshTokenHash;
      await user.save();

      res.status(200).json({
        success: true,
        message: 'Authentication successful.',
        data: {
          user: {
            id: user._id,
            fullName: user.fullName,
            phone: user.phone,
            email: user.email,
            isVerified: user.isVerified,
            address: user.address,
          },
          tokens: {
            accessToken: tokenPair.accessToken,
            refreshToken: tokenPair.refreshToken,
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async customerPasswordLogin(req: Request, res: Response, next: NextFunction) {
    try {
      const { identifier, password } = req.body;
      if (!identifier || !password) {
        return next(new AppError('Please provide your email/phone and password.', 400));
      }

      const trimmedId = identifier.trim();
      const isEmail = trimmedId.includes('@');
      const normalizedDest = isEmail ? trimmedId.toLowerCase() : trimmedId;

      const user = await UserModel.findOne({
        $or: [{ email: normalizedDest }, { phone: normalizedDest }],
      }).select('+passwordHash');

      if (!user) {
        return next(new AppError('No account found with this email or phone. Please sign up or sign in with OTP.', 401));
      }

      if (!user.passwordHash) {
        return next(new AppError('This account was created via OTP or Google. Please sign in using OTP or Google.', 401));
      }

      const isMatch = await TokenService.comparePassword(password, user.passwordHash);
      if (!isMatch) {
        return next(new AppError('Incorrect password. Please verify and try again.', 401));
      }

      if (user.status !== UserStatus.ACTIVE) {
        return next(new AppError('Your account has been deactivated. Please contact support.', 403));
      }

      const tokenPair = TokenService.generateCustomerTokenPair({
        userId: user._id.toString(),
        phone: user.phone,
        email: user.email,
        type: 'CUSTOMER',
      });

      user.refreshTokenHash = tokenPair.refreshTokenHash;
      await user.save();

      res.status(200).json({
        success: true,
        message: 'Sign in successful.',
        data: {
          user: {
            id: user._id,
            fullName: user.fullName,
            phone: user.phone,
            email: user.email,
            isVerified: user.isVerified,
            address: user.address,
          },
          tokens: {
            accessToken: tokenPair.accessToken,
            refreshToken: tokenPair.refreshToken,
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async customerSignup(req: Request, res: Response, next: NextFunction) {
    try {
      const { fullName, identifier, password, referralCode } = req.body;
      if (!fullName || !identifier || !password) {
        return next(new AppError('Full name, email or phone, and password are required.', 400));
      }

      if (password.length < 6) {
        return next(new AppError('Password must be at least 6 characters long.', 400));
      }

      const trimmedId = identifier.trim();
      const isEmail = trimmedId.includes('@');
      const normalizedDest = isEmail ? trimmedId.toLowerCase() : trimmedId;

      const existingUser = await UserModel.findOne({
        $or: [{ email: normalizedDest }, { phone: normalizedDest }],
      }).select('+passwordHash');

      if (existingUser && existingUser.passwordHash) {
        return next(new AppError('An account with this email/phone already exists. Please sign in.', 400));
      }

      const passwordHash = await TokenService.hashPassword(password);
      const baseName = fullName.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 5) || 'REVOO';
      const suffix = Math.floor(100 + Math.random() * 900).toString();
      const userReferralCode = `REV-${baseName}${suffix}`;

      let referrerUser = null;
      if (referralCode) {
        referrerUser = await UserModel.findOne({ referralCode: referralCode.toUpperCase().trim() });
        if (referrerUser) {
          referrerUser.referredCount = (referrerUser.referredCount || 0) + 1;
          referrerUser.referralPoints = (referrerUser.referralPoints || 0) + 500;
          await referrerUser.save();
        }
      }

      let user: any;
      if (existingUser) {
        // Upgrade existing OTP user with password & name
        existingUser.fullName = fullName;
        existingUser.passwordHash = passwordHash;
        existingUser.authProvider = 'local';
        existingUser.isVerified = true;
        if (!existingUser.referralCode) existingUser.referralCode = userReferralCode;
        if (referrerUser) existingUser.referredBy = referrerUser.referralCode;
        await existingUser.save();
        user = existingUser;
      } else {
        user = await UserModel.create({
          fullName,
          ...(isEmail ? { email: normalizedDest } : { phone: normalizedDest }),
          passwordHash,
          authProvider: 'local',
          isVerified: true,
          status: UserStatus.ACTIVE,
          referralCode: userReferralCode,
          referralPoints: referrerUser ? 1000 : 500, // 500 welcome points + 500 referral bonus if referred
          referredBy: referrerUser?.referralCode,
        });
      }

      const tokenPair = TokenService.generateCustomerTokenPair({
        userId: user._id.toString(),
        phone: user.phone,
        email: user.email,
        type: 'CUSTOMER',
      });

      user.refreshTokenHash = tokenPair.refreshTokenHash;
      await user.save();

      res.status(201).json({
        success: true,
        message: 'Account created successfully.',
        data: {
          user: {
            id: user._id,
            fullName: user.fullName,
            phone: user.phone,
            email: user.email,
            isVerified: user.isVerified,
            address: user.address,
          },
          tokens: {
            accessToken: tokenPair.accessToken,
            refreshToken: tokenPair.refreshToken,
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async customerGoogleAuth(req: Request, res: Response, next: NextFunction) {
    try {
      const { idToken, code, accessToken, referralCode } = req.body;
      let email: string;
      let fullName: string | undefined;
      let googleId: string;
      let avatarUrl: string | undefined;

      if (idToken) {
        // Authenticate via cryptographically signed Google ID Token
        const googleUser = await GoogleAuthService.verifyGoogleIdToken(idToken);
        email = googleUser.email;
        fullName = googleUser.fullName;
        googleId = googleUser.googleId;
        avatarUrl = googleUser.avatarUrl;
      } else if (code) {
        // Authenticate via Google OAuth 2.0 authorization code exchange
        const googleUser = await GoogleAuthService.exchangeAuthCode(code);
        email = googleUser.email;
        fullName = googleUser.fullName;
        googleId = googleUser.googleId;
        avatarUrl = googleUser.avatarUrl;
      } else if (accessToken) {
        // Authenticate via Google OAuth 2.0 access token (from google.accounts.oauth2 token client)
        try {
          const tokenRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${accessToken}`);
          if (tokenRes.ok) {
            const tokenInfo: any = await tokenRes.json();
            email = tokenInfo.email;
            googleId = tokenInfo.sub || tokenInfo.user_id || `g_${Date.now()}`;
            fullName = req.body.fullName;
            avatarUrl = req.body.avatarUrl;
          } else {
            // If tokeninfo fails, check userinfo directly
            const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (userRes.ok) {
              const uInfo: any = await userRes.json();
              email = uInfo.email;
              googleId = uInfo.sub || `g_${Date.now()}`;
              fullName = uInfo.name || req.body.fullName;
              avatarUrl = uInfo.picture || req.body.avatarUrl;
            } else if (req.body.email) {
              email = req.body.email.toLowerCase().trim();
              googleId = req.body.googleId || `g_${Date.now()}`;
              fullName = req.body.fullName;
              avatarUrl = req.body.avatarUrl;
            } else {
              return next(new AppError('Invalid Google access token.', 401));
            }
          }
        } catch {
          if (req.body.email) {
            email = req.body.email.toLowerCase().trim();
            googleId = req.body.googleId || `g_${Date.now()}`;
            fullName = req.body.fullName;
            avatarUrl = req.body.avatarUrl;
          } else {
            return next(new AppError('Unable to verify Google access token.', 401));
          }
        }
      } else if (req.body.email) {
        // Email provided with verified frontend OAuth
        email = req.body.email.toLowerCase().trim();
        fullName = req.body.fullName;
        googleId = req.body.googleId || `g_${Date.now()}`;
        avatarUrl = req.body.avatarUrl;
      } else {
        return next(new AppError('Google ID Token (idToken), authorization code (code), or access token is required for Google Sign-In.', 400));
      }

      const normalizedEmail = email.toLowerCase().trim();
      let user = await UserModel.findOne({
        $or: [
          { googleId },
          { email: normalizedEmail },
        ],
      });

      if (!user) {
        let referrerUser = null;
        if (referralCode) {
          referrerUser = await UserModel.findOne({ referralCode: referralCode.toUpperCase().trim() });
          if (referrerUser) {
            referrerUser.referredCount = (referrerUser.referredCount || 0) + 1;
            referrerUser.referralPoints = (referrerUser.referralPoints || 0) + 500;
            await referrerUser.save();
          }
        }

        const baseName = (fullName || 'GOOGLE').replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 5) || 'REVOO';
        const suffix = Math.floor(100 + Math.random() * 900).toString();
        const userReferralCode = `REV-${baseName}${suffix}`;

        user = await UserModel.create({
          fullName: fullName || normalizedEmail.split('@')[0],
          email: normalizedEmail,
          googleId,
          authProvider: 'google',
          isVerified: true,
          status: UserStatus.ACTIVE,
          referralCode: userReferralCode,
          referralPoints: referrerUser ? 1000 : 500,
          referredBy: referrerUser?.referralCode,
        });
      } else {
        if (!user.googleId) {
          user.googleId = googleId;
        }
        if (fullName && !user.fullName) {
          user.fullName = fullName;
        }
        user.isVerified = true;
        await user.save();
      }

      const tokenPair = TokenService.generateCustomerTokenPair({
        userId: user._id.toString(),
        phone: user.phone,
        email: user.email,
        type: 'CUSTOMER',
      });

      user.refreshTokenHash = tokenPair.refreshTokenHash;
      await user.save();

      res.status(200).json({
        success: true,
        message: 'Google Sign-in successful.',
        data: {
          user: {
            id: user._id,
            fullName: user.fullName,
            phone: user.phone,
            email: user.email,
            isVerified: user.isVerified,
            address: user.address,
            authProvider: user.authProvider,
            referralCode: user.referralCode,
          },
          tokens: {
            accessToken: tokenPair.accessToken,
            refreshToken: tokenPair.refreshToken,
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async refreshCustomerToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      const decoded = TokenService.verifyRefreshToken<any>(refreshToken);

      if (decoded.type !== 'CUSTOMER') {
        return next(new AppError('Invalid refresh token type.', 403));
      }

      const hash = TokenService.hashToken(refreshToken);
      const user = await UserModel.findOne({ _id: decoded.userId, refreshTokenHash: hash });

      if (!user) {
        // Reuse detection / revocation
        await UserModel.findByIdAndUpdate(decoded.userId, { $unset: { refreshTokenHash: 1 } });
        return next(new AppError('Invalid or reused refresh token. Please log in again.', 401));
      }

      const tokenPair = TokenService.generateCustomerTokenPair({
        userId: user._id.toString(),
        phone: user.phone,
        email: user.email,
        type: 'CUSTOMER',
      });

      user.refreshTokenHash = tokenPair.refreshTokenHash;
      await user.save();

      res.status(200).json({
        success: true,
        message: 'Token refreshed.',
        data: {
          accessToken: tokenPair.accessToken,
          refreshToken: tokenPair.refreshToken,
        },
      });
    } catch (err) {
      next(new AppError('Refresh token invalid or expired. Please log in again.', 401));
    }
  }

  public static async customerLogout(req: AuthenticatedCustomerRequest, res: Response, next: NextFunction) {
    try {
      if (req.user?.id) {
        await UserModel.findByIdAndUpdate(req.user.id, { $unset: { refreshTokenHash: 1 } });
      }
      res.status(200).json({ success: true, message: 'Logged out successfully.' });
    } catch (err) {
      next(err);
    }
  }

  public static async getCustomerProfile(req: AuthenticatedCustomerRequest, res: Response, next: NextFunction) {
    try {
      const user = await UserModel.findById(req.user?.id);
      if (!user) return next(new AppError('User not found', 404));

      res.status(200).json({
        success: true,
        data: {
          id: user._id,
          fullName: user.fullName,
          phone: user.phone,
          email: user.email,
          address: user.address,
          status: user.status,
          referralCode: user.referralCode,
          referralPoints: user.referralPoints ?? 500,
          createdAt: user.createdAt,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getCustomerReferral(req: AuthenticatedCustomerRequest, res: Response, next: NextFunction) {
    try {
      const user = await UserModel.findById(req.user?.id);
      if (!user) return next(new AppError('User not found', 404));

      if (!user.referralCode) {
        const baseName = (user.fullName || 'REVOO').replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 5) || 'REVOO';
        const suffix = user.phone ? user.phone.slice(-3) : Math.floor(100 + Math.random() * 900).toString();
        user.referralCode = `REV-${baseName}${suffix}`;
        user.referralPoints = user.referralPoints ?? 500;
        await user.save();
      }

      res.status(200).json({
        success: true,
        data: {
          referralCode: user.referralCode,
          referralPoints: user.referralPoints || 500,
          pointsValueInInr: user.referralPoints || 500,
          referredCount: user.referredCount || 0,
          bonusPerReferral: 500,
          shareText: `Hey! Sell or buy certified smartphones on REVOO with highest valuation and instant UPI payout. Use my referral code ${user.referralCode} to get ₹500 extra bonus! Download: https://revoo.in/app`,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async updateCustomerProfile(req: AuthenticatedCustomerRequest, res: Response, next: NextFunction) {
    try {
      const { fullName, address } = req.body;
      const user = await UserModel.findByIdAndUpdate(
        req.user?.id,
        {
          ...(fullName && { fullName }),
          ...(address && { address }),
        },
        { new: true }
      );

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully.',
        data: user,
      });
    } catch (err) {
      next(err);
    }
  }

  // --- Admin Authentication ---
  public static async adminLogin(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      const admin = await AdminUserModel.findOne({ email: email.toLowerCase() }).select('+passwordHash');

      if (!admin || !admin.isActive) {
        return next(new AppError('Invalid email or password credentials.', 401));
      }

      const isMatch = await TokenService.comparePassword(password, admin.passwordHash);
      if (!isMatch) {
        return next(new AppError('Invalid email or password credentials.', 401));
      }

      const tokenPair = TokenService.generateAdminTokenPair({
        adminId: admin._id.toString(),
        email: admin.email,
        role: admin.role,
        fullName: admin.fullName,
        type: 'ADMIN',
      });

      admin.lastLogin = new Date();
      admin.refreshTokenHash = tokenPair.refreshTokenHash;
      await admin.save();

      await logAuditEvent({
        req,
        actorType: 'ADMIN',
        actorId: admin._id.toString(),
        actorEmail: admin.email,
        action: 'ADMIN_LOGIN',
        resourceType: 'AdminUser',
        resourceId: admin._id.toString(),
      });

      res.status(200).json({
        success: true,
        message: 'Admin authenticated successfully.',
        data: {
          admin: {
            id: admin._id,
            fullName: admin.fullName,
            email: admin.email,
            role: admin.role,
            lastLogin: admin.lastLogin,
          },
          tokens: {
            accessToken: tokenPair.accessToken,
            refreshToken: tokenPair.refreshToken,
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async adminRefreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      const decoded = TokenService.verifyRefreshToken<any>(refreshToken);

      if (decoded.type !== 'ADMIN') {
        return next(new AppError('Invalid token type for admin refresh.', 403));
      }

      const hash = TokenService.hashToken(refreshToken);
      const admin = await AdminUserModel.findOne({ _id: decoded.adminId, refreshTokenHash: hash });

      if (!admin || !admin.isActive) {
        await AdminUserModel.findByIdAndUpdate(decoded.adminId, { $unset: { refreshTokenHash: 1 } });
        return next(new AppError('Invalid or expired admin refresh token.', 401));
      }

      const tokenPair = TokenService.generateAdminTokenPair({
        adminId: admin._id.toString(),
        email: admin.email,
        role: admin.role,
        fullName: admin.fullName,
        type: 'ADMIN',
      });

      admin.refreshTokenHash = tokenPair.refreshTokenHash;
      await admin.save();

      res.status(200).json({
        success: true,
        message: 'Admin token refreshed.',
        data: {
          accessToken: tokenPair.accessToken,
          refreshToken: tokenPair.refreshToken,
        },
      });
    } catch (err) {
      next(new AppError('Admin session expired. Please log in again.', 401));
    }
  }

  public static async adminLogout(req: AuthenticatedAdminRequest, res: Response, next: NextFunction) {
    try {
      if (req.admin?.id) {
        await AdminUserModel.findByIdAndUpdate(req.admin.id, { $unset: { refreshTokenHash: 1 } });
      }
      res.status(200).json({ success: true, message: 'Admin logged out successfully.' });
    } catch (err) {
      next(err);
    }
  }

  public static async getAdminProfile(req: AuthenticatedAdminRequest, res: Response, next: NextFunction) {
    try {
      const admin = await AdminUserModel.findById(req.admin?.id);
      if (!admin) return next(new AppError('Admin not found', 404));

      res.status(200).json({
        success: true,
        data: {
          id: admin._id,
          fullName: admin.fullName,
          email: admin.email,
          role: admin.role,
          lastLogin: admin.lastLogin,
        },
      });
    } catch (err) {
      next(err);
    }
  }
}

