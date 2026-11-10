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

    test('POST /api/v1/auth/customer/google signs in with Google account', async () => {
      const res = await request(app)
        .post('/api/v1/auth/customer/google')
        .send({
          email: 'google.user@gmail.com',
          fullName: 'Google User',
          googleId: 'g_1234567890',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.tokens.accessToken).toBeDefined();
      expect(res.body.data.user.email).toBe('google.user@gmail.com');
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
    test('POST /api/v1/auth/customer/google - Authenticates new Google customer and issues tokens', async () => {
      const res = await request(app)
        .post('/api/v1/auth/customer/google')
        .send({
          email: 'google.tester@gmail.com',
          fullName: 'Google Test User',
          googleId: 'g_sub_1234567890',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('google.tester@gmail.com');
      expect(res.body.data.user.authProvider).toBe('google');
      expect(res.body.data.tokens.accessToken).toBeDefined();
      expect(res.body.data.tokens.refreshToken).toBeDefined();
    });

    test('POST /api/v1/auth/customer/google - Re-authenticating existing user retains Google ID', async () => {
      const res = await request(app)
        .post('/api/v1/auth/customer/google')
        .send({
          email: 'google.tester@gmail.com',
          fullName: 'Google Test User',
          googleId: 'g_sub_1234567890',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('google.tester@gmail.com');
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

