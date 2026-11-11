import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import app from '../../app.js';
import { AdminUserModel } from '../../infrastructure/database/models/AdminUser.js';
import { BrandModel } from '../../infrastructure/database/models/Brand.js';
import { SmartphoneModel } from '../../infrastructure/database/models/SmartphoneModel.js';
import { StorageVariantModel } from '../../infrastructure/database/models/StorageVariant.js';
import { PricingRuleModel } from '../../infrastructure/database/models/PricingRule.js';
import { TokenService } from '../../infrastructure/security/tokenService.js';
import { GoogleAuthService } from '../../infrastructure/security/GoogleAuthService.js';
import { NotificationService } from '../../infrastructure/notifications/NotificationService.js';
import { AdminRole } from '../../shared/types.js';

describe('REVOO Backend Integration Tests', () => {
  let mongoServer: MongoMemoryServer;
  let adminToken: string;
  let customerToken: string;
  let sampleBrandId: string;
  let sampleModelId: string;
  let sampleVariantId: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Create Admin User
    const passwordHash = await TokenService.hashPassword('AdminTest123!');
    const admin = await AdminUserModel.create({
      email: 'admin@revoo.test',
      fullName: 'Test Admin',
      passwordHash,
      role: AdminRole.SUPER_ADMIN,
      isActive: true,
    });

    const adminTokens = TokenService.generateAdminTokenPair({
      adminId: admin._id.toString(),
      email: admin.email,
      role: admin.role,
      fullName: admin.fullName,
      type: 'ADMIN',
    });
    adminToken = adminTokens.accessToken;

    // Create Sample Brand & Model
    const brand = await BrandModel.create({
      name: 'Apple',
      slug: 'apple',
      isActive: true,
      displayOrder: 1,
    });
    sampleBrandId = brand._id.toString();

    const model = await SmartphoneModel.create({
      brandId: brand._id,
      name: 'iPhone 15 Pro',
      slug: 'iphone-15-pro',
      releaseYear: 2023,
      basePrice: 70000,
      isPublished: true,
    });
    sampleModelId = model._id.toString();

    const variant = await StorageVariantModel.create({
      modelId: model._id,
      capacity: '256GB',
      priceModifier: 5000,
      isPublished: true,
    });
    sampleVariantId = variant._id.toString();

    await PricingRuleModel.create({
      modelId: model._id,
      variantId: variant._id,
      basePrice: 70000,
      storagePriceAdjustment: 5000,
      version: 1,
      isActive: true,
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  describe('Health Check API', () => {
    test('GET /api/v1/health returns status HEALTHY', async () => {
      const res = await request(app).get('/api/v1/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('HEALTHY');
    });
  });

  describe('Customer Auth & OTP Flow', () => {
    const testDestination = '+919988776655';

    test('POST /api/v1/auth/customer/request-otp generates OTP', async () => {
      const res = await request(app)
        .post('/api/v1/auth/customer/request-otp')
        .send({ destination: testDestination, channel: 'WHATSAPP' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.resendCooldownSeconds).toBe(60);
    });

    test('Re-requesting immediately is throttled with 429', async () => {
      const res = await request(app)
        .post('/api/v1/auth/customer/request-otp')
        .send({ destination: testDestination, channel: 'WHATSAPP' });

      expect(res.status).toBe(429);
      expect(res.body.message).toContain('Please wait');
    });

    test('POST /api/v1/auth/customer/signup creates customer with password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/customer/signup')
        .send({
          fullName: 'Ananya Sharma',
          identifier: 'ananya@revoo.test',
          password: 'SecurePassword123!',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.tokens.accessToken).toBeDefined();
      expect(res.body.data.user.email).toBe('ananya@revoo.test');
    });

    test('POST /api/v1/auth/customer/login-password authenticates customer', async () => {
      const res = await request(app)
        .post('/api/v1/auth/customer/login-password')
        .send({
          identifier: 'ananya@revoo.test',
          password: 'SecurePassword123!',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.tokens.accessToken).toBeDefined();
    });

    test('Email OTP: request then verify signs the customer in', async () => {
      // Keep the test hermetic: never hit a real SMTP server from CI
      const sendSpy = jest
        .spyOn(NotificationService, 'sendOtp')
        .mockResolvedValue({ success: true, delivered: false, message: 'Email OTP sent (test)' });

      const email = 'otp.tester@example.com';
      const requested = await request(app)
        .post('/api/v1/auth/customer/request-otp')
        .send({ destination: email, channel: 'EMAIL' });

      expect(requested.status).toBe(200);
      expect(sendSpy).toHaveBeenCalledWith(email, 'EMAIL', expect.stringMatching(/^\d{6}$/), 5);
      const otp = requested.body.data.devOtp;
      expect(otp).toMatch(/^\d{6}$/);

      const verified = await request(app)
        .post('/api/v1/auth/customer/verify-otp')
        .send({ destination: email, channel: 'EMAIL', otp });

      expect(verified.status).toBe(200);
      expect(verified.body.data.user.email).toBe(email);
      expect(verified.body.data.tokens.accessToken).toBeDefined();
      sendSpy.mockRestore();
    });

    test('Email OTP rejects an invalid email address', async () => {
      const res = await request(app)
        .post('/api/v1/auth/customer/request-otp')
        .send({ destination: 'not-an-email', channel: 'EMAIL' });

      expect(res.status).toBe(400);
    });
  });

  describe('Catalogue & Pricing Valuation', () => {
    test('GET /api/v1/catalogue/brands returns active brands', async () => {
      const res = await request(app).get('/api/v1/catalogue/brands');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].name).toBe('Apple');
    });

    test('GET /api/v1/catalogue/brands/:brandId/models returns models', async () => {
      const res = await request(app).get(`/api/v1/catalogue/brands/${sampleBrandId}/models`);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].name).toBe('iPhone 15 Pro');
      // "Get up to" price = base + best variant modifier
      expect(res.body.data[0].maxPrice).toBe(75000);
    });

    test('GET /api/v1/catalogue/models/:modelId returns per-variant prices', async () => {
      const res = await request(app).get(`/api/v1/catalogue/models/${sampleModelId}`);
      expect(res.status).toBe(200);
      expect(res.body.data.variants[0].price).toBe(75000);
      expect(res.body.data.maxPrice).toBe(75000);
    });

    test('POST /api/v1/catalogue/estimate ignores a client-supplied basePrice for catalogue models', async () => {
      const res = await request(app)
        .post('/api/v1/catalogue/estimate')
        .send({
          modelId: sampleModelId,
          variantId: sampleVariantId,
          basePrice: 999999,
          basicQuestions: { isPhoneWorking: true, isTouchscreenWorking: true, isDisplayOriginal: true, hasValidWarranty: true },
          touchGlassCondition: 'NO_SCRATCH',
          screenDisplayCondition: 'NO_SPOT',
          backPanelCondition: 'NO_DEFECTS',
          sidePanelCondition: 'NO_DEFECTS',
          hasOriginalBox: true,
          hasOriginalCharger: true,
          hasValidBill: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.valuation.finalCalculatedAmount).toBe(75000);
    });

    test('POST /api/v1/catalogue/estimate calculates accurate indicative estimate', async () => {
      const res = await request(app)
        .post('/api/v1/catalogue/estimate')
        .send({
          modelId: sampleModelId,
          variantId: sampleVariantId,
          displayCondition: 'FLAWLESS',
          bodyCondition: 'FLAWLESS',
          batteryHealth: 'EXCELLENT',
          functionalFaults: {
            frontCameraFaulty: false,
            backCameraFaulty: false,
            faceIdOrFingerprintFaulty: false,
            speakerOrMicFaulty: false,
            chargingPortFaulty: false,
            wirelessOrBluetoothFaulty: false,
          },
          hasOriginalBox: true,
          hasOriginalCharger: true,
          hasValidBill: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.valuation.finalCalculatedAmount).toBe(75000); // 70000 base + 5000 storage modifier with full accessories pool
      expect(res.body.data.disclaimer).toBeDefined();
    });
  });

  describe('Customer Google OAuth Authentication', () => {
    const verifiedGoogleUser = {
      googleId: 'g_sub_1234567890',
      email: 'google.tester@gmail.com',
      fullName: 'Google Test User',
      isEmailVerified: true,
    };

    afterEach(() => jest.restoreAllMocks());

    test('POST /api/v1/auth/customer/google - rejects an unverified email-only request (no Google token)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/customer/google')
        .send({
          email: 'victim@gmail.com',
          fullName: 'Not Really Google',
          googleId: 'g_forged',
        });

      expect(res.status).toBe(400);
      expect(res.body.data?.tokens).toBeUndefined();
    });

    test('POST /api/v1/auth/customer/google - Authenticates new Google customer from a verified ID token', async () => {
      jest.spyOn(GoogleAuthService, 'verifyGoogleIdToken').mockResolvedValue(verifiedGoogleUser);
      const res = await request(app).post('/api/v1/auth/customer/google').send({ idToken: 'signed.google.jwt' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('google.tester@gmail.com');
      expect(res.body.data.user.authProvider).toBe('google');
      expect(res.body.data.tokens.accessToken).toBeDefined();
      expect(res.body.data.tokens.refreshToken).toBeDefined();
    });

    test('POST /api/v1/auth/customer/google - Re-authenticating existing user retains Google ID', async () => {
      jest.spyOn(GoogleAuthService, 'verifyGoogleIdToken').mockResolvedValue(verifiedGoogleUser);
      const res = await request(app).post('/api/v1/auth/customer/google').send({ idToken: 'signed.google.jwt' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('google.tester@gmail.com');
    });

    test('POST /api/v1/auth/customer/google - rejects a Google account with an unverified email', async () => {
      jest
        .spyOn(GoogleAuthService, 'verifyGoogleIdToken')
        .mockResolvedValue({ ...verifiedGoogleUser, email: 'unverified@gmail.com', isEmailVerified: false });
      const res = await request(app).post('/api/v1/auth/customer/google').send({ idToken: 'signed.google.jwt' });

      expect(res.status).toBe(401);
    });
  });

  describe('Admin Operations & RBAC', () => {
    test('Unauthenticated request to admin route returns 401', async () => {
      const res = await request(app).get('/api/v1/dashboard/stats');
      expect(res.status).toBe(401);
    });

    test('Authenticated admin gets operational stats', async () => {
      const res = await request(app)
        .get('/api/v1/dashboard/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.metrics).toBeDefined();
    });
  });
});

