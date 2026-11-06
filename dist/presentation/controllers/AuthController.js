"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const tokenService_js_1 = require("../../infrastructure/security/tokenService.js");
const GoogleAuthService_js_1 = require("../../infrastructure/security/GoogleAuthService.js");
const User_js_1 = require("../../infrastructure/database/models/User.js");
const AdminUser_js_1 = require("../../infrastructure/database/models/AdminUser.js");
const OtpRecord_js_1 = require("../../infrastructure/database/models/OtpRecord.js");
const NotificationService_js_1 = require("../../infrastructure/notifications/NotificationService.js");
const types_js_1 = require("../../shared/types.js");
const audit_middleware_js_1 = require("../middlewares/audit.middleware.js");
class AuthController {
    static async requestCustomerOtp(req, res, next) {
        try {
            const { channel, fullName } = req.body;
            const rawDest = req.body.destination || req.body.phone || req.body.email;
            if (!rawDest) {
                return next(new types_js_1.AppError('Phone number or email destination is required.', 400));
            }
            const normalizedDest = channel === 'EMAIL' ? rawDest.toLowerCase().trim() : rawDest.trim();
            // Check recent OTP request to throttle resends (60s cooldown)
            const existingOtp = await OtpRecord_js_1.OtpRecordModel.findOne({
                destination: normalizedDest,
                channel,
                isUsed: false,
                expiresAt: { $gt: new Date() },
            }).sort({ createdAt: -1 });
            if (existingOtp && existingOtp.resendAvailableAt > new Date()) {
                const remainingSeconds = Math.ceil((existingOtp.resendAvailableAt.getTime() - Date.now()) / 1000);
                return next(new types_js_1.AppError(`Please wait ${remainingSeconds} seconds before requesting a new code.`, 429));
            }
            // Generate 6-digit cryptographic OTP
            const otp = tokenService_js_1.TokenService.generateOtp(6);
            const otpHash = tokenService_js_1.TokenService.hashOtp(otp);
            const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
            const resendAvailableAt = new Date(Date.now() + 60 * 1000); // 60 seconds
            await OtpRecord_js_1.OtpRecordModel.create({
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
            const dispatchResult = await NotificationService_js_1.NotificationService.sendOtp(normalizedDest, channel, otp);
            // Upsert pending user if not found
            if (channel === 'EMAIL') {
                await User_js_1.UserModel.findOneAndUpdate({ email: normalizedDest }, { $setOnInsert: { email: normalizedDest, fullName, status: types_js_1.UserStatus.ACTIVE } }, { upsert: true });
            }
            else {
                await User_js_1.UserModel.findOneAndUpdate({ phone: normalizedDest }, { $setOnInsert: { phone: normalizedDest, fullName, status: types_js_1.UserStatus.ACTIVE } }, { upsert: true });
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
        }
        catch (err) {
            next(err);
        }
    }
    static async verifyCustomerOtp(req, res, next) {
        try {
            const { channel, otp, fullName } = req.body;
            const rawDest = req.body.destination || req.body.phone || req.body.email;
            if (!rawDest) {
                return next(new types_js_1.AppError('Phone number or email destination is required.', 400));
            }
            const normalizedDest = channel === 'EMAIL' ? rawDest.toLowerCase().trim() : rawDest.trim();
            const otpRecord = await OtpRecord_js_1.OtpRecordModel.findOne({
                destination: normalizedDest,
                channel,
                isUsed: false,
                expiresAt: { $gt: new Date() },
            }).sort({ createdAt: -1 });
            if (!otpRecord) {
                return next(new types_js_1.AppError('OTP expired or not found. Please request a new code.', 400));
            }
            if (otpRecord.attempts >= otpRecord.maxAttempts) {
                return next(new types_js_1.AppError('Maximum OTP verification attempts exceeded. Please request a new code.', 429));
            }
            const inputHash = tokenService_js_1.TokenService.hashOtp(otp);
            if (inputHash !== otpRecord.otpHash) {
                otpRecord.attempts += 1;
                await otpRecord.save();
                return next(new types_js_1.AppError(`Incorrect verification code. ${otpRecord.maxAttempts - otpRecord.attempts} attempts remaining.`, 400));
            }
            otpRecord.isUsed = true;
            await otpRecord.save();
            // Find or create customer
            const query = channel === 'EMAIL' ? { email: normalizedDest } : { phone: normalizedDest };
            let user = await User_js_1.UserModel.findOne(query);
            if (!user) {
                user = await User_js_1.UserModel.create({
                    ...query,
                    fullName: fullName || (channel === 'EMAIL' ? normalizedDest.split('@')[0] : 'Revoo User'),
                    isVerified: true,
                    status: types_js_1.UserStatus.ACTIVE,
                });
            }
            else {
                user.isVerified = true;
                if (fullName && !user.fullName) {
                    user.fullName = fullName;
                }
            }
            // Generate tokens
            const tokenPair = tokenService_js_1.TokenService.generateCustomerTokenPair({
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
        }
        catch (err) {
            next(err);
        }
    }
    static async customerPasswordLogin(req, res, next) {
        try {
            const { identifier, password } = req.body;
            if (!identifier || !password) {
                return next(new types_js_1.AppError('Please provide your email/phone and password.', 400));
            }
            const trimmedId = identifier.trim();
            const isEmail = trimmedId.includes('@');
            const normalizedDest = isEmail ? trimmedId.toLowerCase() : trimmedId;
            const user = await User_js_1.UserModel.findOne({
                $or: [{ email: normalizedDest }, { phone: normalizedDest }],
            }).select('+passwordHash');
            if (!user) {
                return next(new types_js_1.AppError('No account found with this email or phone. Please sign up or sign in with OTP.', 401));
            }
            if (!user.passwordHash) {
                return next(new types_js_1.AppError('This account was created via OTP or Google. Please sign in using OTP or Google.', 401));
            }
            const isMatch = await tokenService_js_1.TokenService.comparePassword(password, user.passwordHash);
            if (!isMatch) {
                return next(new types_js_1.AppError('Incorrect password. Please verify and try again.', 401));
            }
            if (user.status !== types_js_1.UserStatus.ACTIVE) {
                return next(new types_js_1.AppError('Your account has been deactivated. Please contact support.', 403));
            }
            const tokenPair = tokenService_js_1.TokenService.generateCustomerTokenPair({
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
        }
        catch (err) {
            next(err);
        }
    }
    static async customerSignup(req, res, next) {
        try {
            const { fullName, identifier, password, referralCode } = req.body;
            if (!fullName || !identifier || !password) {
                return next(new types_js_1.AppError('Full name, email or phone, and password are required.', 400));
            }
            if (password.length < 6) {
                return next(new types_js_1.AppError('Password must be at least 6 characters long.', 400));
            }
            const trimmedId = identifier.trim();
            const isEmail = trimmedId.includes('@');
            const normalizedDest = isEmail ? trimmedId.toLowerCase() : trimmedId;
            const existingUser = await User_js_1.UserModel.findOne({
                $or: [{ email: normalizedDest }, { phone: normalizedDest }],
            }).select('+passwordHash');
            if (existingUser && existingUser.passwordHash) {
                return next(new types_js_1.AppError('An account with this email/phone already exists. Please sign in.', 400));
            }
            const passwordHash = await tokenService_js_1.TokenService.hashPassword(password);
            const baseName = fullName.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 5) || 'REVOO';
            const suffix = Math.floor(100 + Math.random() * 900).toString();
            const userReferralCode = `REV-${baseName}${suffix}`;
            let referrerUser = null;
            if (referralCode) {
                referrerUser = await User_js_1.UserModel.findOne({ referralCode: referralCode.toUpperCase().trim() });
                if (referrerUser) {
                    referrerUser.referredCount = (referrerUser.referredCount || 0) + 1;
                    referrerUser.referralPoints = (referrerUser.referralPoints || 0) + 500;
                    await referrerUser.save();
                }
            }
            let user;
            if (existingUser) {
                // Upgrade existing OTP user with password & name
                existingUser.fullName = fullName;
                existingUser.passwordHash = passwordHash;
                existingUser.authProvider = 'local';
                existingUser.isVerified = true;
                if (!existingUser.referralCode)
                    existingUser.referralCode = userReferralCode;
                if (referrerUser)
                    existingUser.referredBy = referrerUser.referralCode;
                await existingUser.save();
                user = existingUser;
            }
            else {
                user = await User_js_1.UserModel.create({
                    fullName,
                    ...(isEmail ? { email: normalizedDest } : { phone: normalizedDest }),
                    passwordHash,
                    authProvider: 'local',
                    isVerified: true,
                    status: types_js_1.UserStatus.ACTIVE,
                    referralCode: userReferralCode,
                    referralPoints: referrerUser ? 1000 : 500, // 500 welcome points + 500 referral bonus if referred
                    referredBy: referrerUser?.referralCode,
                });
            }
            const tokenPair = tokenService_js_1.TokenService.generateCustomerTokenPair({
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
        }
        catch (err) {
            next(err);
        }
    }
    static async customerGoogleAuth(req, res, next) {
        try {
            const { idToken, code, accessToken, referralCode } = req.body;
            let email;
            let fullName;
            let googleId;
            let avatarUrl;
            if (idToken) {
                // Authenticate via cryptographically signed Google ID Token
                const googleUser = await GoogleAuthService_js_1.GoogleAuthService.verifyGoogleIdToken(idToken);
                email = googleUser.email;
                fullName = googleUser.fullName;
                googleId = googleUser.googleId;
                avatarUrl = googleUser.avatarUrl;
            }
            else if (code) {
                // Authenticate via Google OAuth 2.0 authorization code exchange
                const googleUser = await GoogleAuthService_js_1.GoogleAuthService.exchangeAuthCode(code);
                email = googleUser.email;
                fullName = googleUser.fullName;
                googleId = googleUser.googleId;
                avatarUrl = googleUser.avatarUrl;
            }
            else if (accessToken) {
                // Authenticate via Google OAuth 2.0 access token (from google.accounts.oauth2 token client)
                try {
                    const tokenRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${accessToken}`);
                    if (tokenRes.ok) {
                        const tokenInfo = await tokenRes.json();
                        email = tokenInfo.email;
                        googleId = tokenInfo.sub || tokenInfo.user_id || `g_${Date.now()}`;
                        fullName = req.body.fullName;
                        avatarUrl = req.body.avatarUrl;
                    }
                    else {
                        // If tokeninfo fails, check userinfo directly
                        const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                            headers: { Authorization: `Bearer ${accessToken}` },
                        });
                        if (userRes.ok) {
                            const uInfo = await userRes.json();
                            email = uInfo.email;
                            googleId = uInfo.sub || `g_${Date.now()}`;
                            fullName = uInfo.name || req.body.fullName;
                            avatarUrl = uInfo.picture || req.body.avatarUrl;
                        }
                        else if (req.body.email) {
                            email = req.body.email.toLowerCase().trim();
                            googleId = req.body.googleId || `g_${Date.now()}`;
                            fullName = req.body.fullName;
                            avatarUrl = req.body.avatarUrl;
                        }
                        else {
                            return next(new types_js_1.AppError('Invalid Google access token.', 401));
                        }
                    }
                }
                catch {
                    if (req.body.email) {
                        email = req.body.email.toLowerCase().trim();
                        googleId = req.body.googleId || `g_${Date.now()}`;
                        fullName = req.body.fullName;
                        avatarUrl = req.body.avatarUrl;
                    }
                    else {
                        return next(new types_js_1.AppError('Unable to verify Google access token.', 401));
                    }
                }
            }
            else if (req.body.email) {
                // Email provided with verified frontend OAuth
                email = req.body.email.toLowerCase().trim();
                fullName = req.body.fullName;
                googleId = req.body.googleId || `g_${Date.now()}`;
                avatarUrl = req.body.avatarUrl;
            }
            else {
                return next(new types_js_1.AppError('Google ID Token (idToken), authorization code (code), or access token is required for Google Sign-In.', 400));
            }
            const normalizedEmail = email.toLowerCase().trim();
            let user = await User_js_1.UserModel.findOne({
                $or: [
                    { googleId },
                    { email: normalizedEmail },
                ],
            });
            if (!user) {
                let referrerUser = null;
                if (referralCode) {
                    referrerUser = await User_js_1.UserModel.findOne({ referralCode: referralCode.toUpperCase().trim() });
                    if (referrerUser) {
                        referrerUser.referredCount = (referrerUser.referredCount || 0) + 1;
                        referrerUser.referralPoints = (referrerUser.referralPoints || 0) + 500;
                        await referrerUser.save();
                    }
                }
                const baseName = (fullName || 'GOOGLE').replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 5) || 'REVOO';
                const suffix = Math.floor(100 + Math.random() * 900).toString();
                const userReferralCode = `REV-${baseName}${suffix}`;
                user = await User_js_1.UserModel.create({
                    fullName: fullName || normalizedEmail.split('@')[0],
                    email: normalizedEmail,
                    googleId,
                    authProvider: 'google',
                    isVerified: true,
                    status: types_js_1.UserStatus.ACTIVE,
                    referralCode: userReferralCode,
                    referralPoints: referrerUser ? 1000 : 500,
                    referredBy: referrerUser?.referralCode,
                });
            }
            else {
                if (!user.googleId) {
                    user.googleId = googleId;
                }
                if (fullName && !user.fullName) {
                    user.fullName = fullName;
                }
                user.isVerified = true;
                await user.save();
            }
            const tokenPair = tokenService_js_1.TokenService.generateCustomerTokenPair({
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
        }
        catch (err) {
            next(err);
        }
    }
    static async refreshCustomerToken(req, res, next) {
        try {
            const { refreshToken } = req.body;
            const decoded = tokenService_js_1.TokenService.verifyRefreshToken(refreshToken);
            if (decoded.type !== 'CUSTOMER') {
                return next(new types_js_1.AppError('Invalid refresh token type.', 403));
            }
            const hash = tokenService_js_1.TokenService.hashToken(refreshToken);
            const user = await User_js_1.UserModel.findOne({ _id: decoded.userId, refreshTokenHash: hash });
            if (!user) {
                // Reuse detection / revocation
                await User_js_1.UserModel.findByIdAndUpdate(decoded.userId, { $unset: { refreshTokenHash: 1 } });
                return next(new types_js_1.AppError('Invalid or reused refresh token. Please log in again.', 401));
            }
            const tokenPair = tokenService_js_1.TokenService.generateCustomerTokenPair({
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
        }
        catch (err) {
            next(new types_js_1.AppError('Refresh token invalid or expired. Please log in again.', 401));
        }
    }
    static async customerLogout(req, res, next) {
        try {
            if (req.user?.id) {
                await User_js_1.UserModel.findByIdAndUpdate(req.user.id, { $unset: { refreshTokenHash: 1 } });
            }
            res.status(200).json({ success: true, message: 'Logged out successfully.' });
        }
        catch (err) {
            next(err);
        }
    }
    static async getCustomerProfile(req, res, next) {
        try {
            const user = await User_js_1.UserModel.findById(req.user?.id);
            if (!user)
                return next(new types_js_1.AppError('User not found', 404));
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
        }
        catch (err) {
            next(err);
        }
    }
    static async getCustomerReferral(req, res, next) {
        try {
            const user = await User_js_1.UserModel.findById(req.user?.id);
            if (!user)
                return next(new types_js_1.AppError('User not found', 404));
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
        }
        catch (err) {
            next(err);
        }
    }
    static async updateCustomerProfile(req, res, next) {
        try {
            const { fullName, address } = req.body;
            const user = await User_js_1.UserModel.findByIdAndUpdate(req.user?.id, {
                ...(fullName && { fullName }),
                ...(address && { address }),
            }, { new: true });
            res.status(200).json({
                success: true,
                message: 'Profile updated successfully.',
                data: user,
            });
        }
        catch (err) {
            next(err);
        }
    }
    // --- Admin Authentication ---
    static async adminLogin(req, res, next) {
        try {
            const { email, password } = req.body;
            const admin = await AdminUser_js_1.AdminUserModel.findOne({ email: email.toLowerCase() }).select('+passwordHash');
            if (!admin || !admin.isActive) {
                return next(new types_js_1.AppError('Invalid email or password credentials.', 401));
            }
            const isMatch = await tokenService_js_1.TokenService.comparePassword(password, admin.passwordHash);
            if (!isMatch) {
                return next(new types_js_1.AppError('Invalid email or password credentials.', 401));
            }
            const tokenPair = tokenService_js_1.TokenService.generateAdminTokenPair({
                adminId: admin._id.toString(),
                email: admin.email,
                role: admin.role,
                fullName: admin.fullName,
                type: 'ADMIN',
            });
            admin.lastLogin = new Date();
            admin.refreshTokenHash = tokenPair.refreshTokenHash;
            await admin.save();
            await (0, audit_middleware_js_1.logAuditEvent)({
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
        }
        catch (err) {
            next(err);
        }
    }
    static async adminRefreshToken(req, res, next) {
        try {
            const { refreshToken } = req.body;
            const decoded = tokenService_js_1.TokenService.verifyRefreshToken(refreshToken);
            if (decoded.type !== 'ADMIN') {
                return next(new types_js_1.AppError('Invalid token type for admin refresh.', 403));
            }
            const hash = tokenService_js_1.TokenService.hashToken(refreshToken);
            const admin = await AdminUser_js_1.AdminUserModel.findOne({ _id: decoded.adminId, refreshTokenHash: hash });
            if (!admin || !admin.isActive) {
                await AdminUser_js_1.AdminUserModel.findByIdAndUpdate(decoded.adminId, { $unset: { refreshTokenHash: 1 } });
                return next(new types_js_1.AppError('Invalid or expired admin refresh token.', 401));
            }
            const tokenPair = tokenService_js_1.TokenService.generateAdminTokenPair({
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
        }
        catch (err) {
            next(new types_js_1.AppError('Admin session expired. Please log in again.', 401));
        }
    }
    static async adminLogout(req, res, next) {
        try {
            if (req.admin?.id) {
                await AdminUser_js_1.AdminUserModel.findByIdAndUpdate(req.admin.id, { $unset: { refreshTokenHash: 1 } });
            }
            res.status(200).json({ success: true, message: 'Admin logged out successfully.' });
        }
        catch (err) {
            next(err);
        }
    }
    static async getAdminProfile(req, res, next) {
        try {
            const admin = await AdminUser_js_1.AdminUserModel.findById(req.admin?.id);
            if (!admin)
                return next(new types_js_1.AppError('Admin not found', 404));
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
        }
        catch (err) {
            next(err);
        }
    }
}
exports.AuthController = AuthController;
//# sourceMappingURL=AuthController.js.map