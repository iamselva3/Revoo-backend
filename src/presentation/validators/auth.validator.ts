import { z } from 'zod';

export const requestOtpSchema = z.object({
  destination: z.string().min(3, 'Phone or email is required'),
  channel: z.enum(['WHATSAPP', 'EMAIL']),
  fullName: z.string().optional(),
});

export const verifyOtpSchema = z.object({
  destination: z.string().min(3, 'Destination is required'),
  channel: z.enum(['WHATSAPP', 'EMAIL']),
  otp: z.string().length(6, 'OTP must be 6 digits'),
  fullName: z.string().optional(),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(10, 'Refresh token is required'),
});

export const adminLoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const customerPasswordLoginSchema = z.object({
  identifier: z.string().min(3, 'Email or phone number is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const customerSignupSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  identifier: z.string().min(3, 'Email or phone number is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  referralCode: z.string().optional(),
});

export const customerGoogleAuthSchema = z.object({
  idToken: z.string().optional(),
  code: z.string().optional(),
  email: z.string().email().optional(),
  fullName: z.string().optional(),
  googleId: z.string().optional(),
  referralCode: z.string().optional(),
});


