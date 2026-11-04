"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.customerGoogleAuthSchema = exports.customerSignupSchema = exports.customerPasswordLoginSchema = exports.adminLoginSchema = exports.refreshTokenSchema = exports.verifyOtpSchema = exports.requestOtpSchema = void 0;
const zod_1 = require("zod");
exports.requestOtpSchema = zod_1.z.object({
    destination: zod_1.z.string().min(3, 'Phone or email is required'),
    channel: zod_1.z.enum(['WHATSAPP', 'EMAIL']),
    fullName: zod_1.z.string().optional(),
});
exports.verifyOtpSchema = zod_1.z.object({
    destination: zod_1.z.string().min(3, 'Destination is required'),
    channel: zod_1.z.enum(['WHATSAPP', 'EMAIL']),
    otp: zod_1.z.string().length(6, 'OTP must be 6 digits'),
    fullName: zod_1.z.string().optional(),
});
exports.refreshTokenSchema = zod_1.z.object({
    refreshToken: zod_1.z.string().min(10, 'Refresh token is required'),
});
exports.adminLoginSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address'),
    password: zod_1.z.string().min(6, 'Password must be at least 6 characters'),
});
exports.customerPasswordLoginSchema = zod_1.z.object({
    identifier: zod_1.z.string().min(3, 'Email or phone number is required'),
    password: zod_1.z.string().min(6, 'Password must be at least 6 characters'),
});
exports.customerSignupSchema = zod_1.z.object({
    fullName: zod_1.z.string().min(2, 'Full name is required'),
    identifier: zod_1.z.string().min(3, 'Email or phone number is required'),
    password: zod_1.z.string().min(6, 'Password must be at least 6 characters'),
    referralCode: zod_1.z.string().optional(),
});
exports.customerGoogleAuthSchema = zod_1.z.object({
    idToken: zod_1.z.string().optional(),
    code: zod_1.z.string().optional(),
    email: zod_1.z.string().email().optional(),
    fullName: zod_1.z.string().optional(),
    googleId: zod_1.z.string().optional(),
    referralCode: zod_1.z.string().optional(),
});
//# sourceMappingURL=auth.validator.js.map