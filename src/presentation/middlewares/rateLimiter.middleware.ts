import rateLimit from 'express-rate-limit';

// Only abuse-prone routes (auth, and the quota-limited Mappls lookup) are rate limited; there is deliberately
// no app-wide limiter.

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // max 20 auth attempts per IP
  // The test suite signs in many times from one address
  skip: () => process.env.NODE_ENV === 'test',
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again after 15 minutes.',
  },
});

export const otpLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // max 5 OTP requests
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  message: {
    success: false,
    message: 'Too many OTP requests. Please wait before requesting another code.',
  },
});


// GPS -> address via Mappls: protects the Mappls daily quota from one address hammering it
export const geoLookupLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 30,
  skip: () => process.env.NODE_ENV === 'test',
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  message: {
    success: false,
    message: 'Too many location lookups. Please enter your pincode instead.',
  },
});

// Typed PIN code -> areas via Mappls: separate allowance, as customers may try a few PIN codes
export const pincodeAreasLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 60,
  skip: () => process.env.NODE_ENV === 'test',
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  message: {
    success: false,
    message: 'Too many PIN code lookups. Please wait a few minutes.',
  },
});
