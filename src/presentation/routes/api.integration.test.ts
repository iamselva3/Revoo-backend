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
import { StorageService } from '../../infrastructure/storage/StorageService.js';

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

    test("POST /api/v1/catalogue/estimate takes off the admin's phone-age %", async () => {
      const rule = await PricingRuleModel.create({
        modelId: sampleModelId,
        basePrice: 70000,
        version: 2,
        isActive: true,
        deductionPercentages: { deviceAge: { BELOW_3_MONTHS: 0, ABOVE_11_MONTHS: 10 } },
      });
      try {
        const quote = (deviceAge: string) =>
          request(app).post('/api/v1/catalogue/estimate').send({
            modelId: sampleModelId,
            variantId: sampleVariantId,
            basicQuestions: { isPhoneWorking: true, isTouchscreenWorking: true, isDisplayOriginal: true, hasValidWarranty: false },
            touchGlassCondition: 'NO_SCRATCH',
            screenDisplayCondition: 'NO_SPOT',
            backPanelCondition: 'NO_DEFECTS',
            sidePanelCondition: 'NO_DEFECTS',
            hasOriginalBox: true,
            hasOriginalCharger: true,
            hasValidBill: true,
            deviceAge,
          });

        const old = await quote('ABOVE_11_MONTHS');
        expect(old.status).toBe(200);
        expect(old.body.data.finalPrice).toBe(75000 - 7500);
        const line = old.body.data.valuation.breakdown.find((b: any) => b.component === 'Phone age: Above 11 months');
        expect(line?.adjustment).toBe(-7500);

        const recent = await quote('BELOW_3_MONTHS');
        expect(recent.body.data.finalPrice).toBe(75000);
      } finally {
        await PricingRuleModel.deleteOne({ _id: rule._id });
      }
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

  describe('Customer bookings & profile', () => {
    let tokenA: string;
    let tokenB: string;
    let requestNumber: string;

    const signup = async (email: string, fullName: string) => {
      const res = await request(app)
        .post('/api/v1/auth/customer/signup')
        .send({ fullName, identifier: email, password: 'SecurePassword123!' });
      expect(res.status).toBe(201);
      return res.body.data.tokens.accessToken as string;
    };

    // Exactly what the website's pickup form sends
    const webBooking = (overrides: Record<string, any> = {}) => ({
      device: { brand: 'Apple', modelName: 'iPhone 15 Pro', modelId: sampleModelId, variant: '256GB', variantId: sampleVariantId },
      modelId: sampleModelId,
      variantId: sampleVariantId,
      conditions: {
        basicQuestions: { isPhoneWorking: true, isTouchscreenWorking: true, isDisplayOriginal: true, hasValidWarranty: false },
        screenDisplayCondition: 'NO_SPOT',
        touchGlassCondition: 'MINOR_SCRATCHES',
        backPanelCondition: 'NO_DEFECTS',
        sidePanelCondition: 'NO_DEFECTS',
        hardwareFaults: { batteryHealthBelow83: true },
        hasValidBill: true,
        summary: [{ title: 'Screen', items: ['No spot', 'Minor scratches'] }],
      },
      indicativeValuation: 60000,
      pickupAddress: {
        fullName: 'Selva Ganesh',
        phone: '+91 98450 12345',
        addressLine1: 'No. 42, North Mada Street',
        addressLine2: 'Anna Nagar',
        city: 'Chennai',
        state: 'Tamil Nadu',
        pincode: '600040',
      },
      scheduledPickupDate: '2026-11-12',
      preferredTimeWindow: 'Morning (10:00 AM - 01:00 PM)',
      paymentDetails: { paymentMethod: 'UPI', upiId: 'selva@okhdfcbank' },
      ...overrides,
    });

    beforeAll(async () => {
      tokenA = await signup('booking.a@revoo.test', 'Selva Ganesh');
      tokenB = await signup('booking.b@revoo.test', 'Other Person');
    });

    test('POST /api/v1/requests accepts the website booking payload', async () => {
      const res = await request(app).post('/api/v1/requests').set('Authorization', `Bearer ${tokenA}`).send(webBooking());

      expect(res.status).toBe(201);
      const saved = res.body.data;
      requestNumber = saved.requestNumber;
      expect(saved.pickupAddress.street).toBe('No. 42, North Mada Street');
      expect(saved.pickupAddress.area).toBe('Anna Nagar');
      expect(saved.pickupAddress.pincode).toBe('600040');
      expect(saved.customerDetails.phone).toBe('9845012345');
      expect(saved.payoutDetails).toMatchObject({ method: 'UPI', upiId: 'selva@okhdfcbank' });
      expect(saved.deviceDetails.storageCapacity).toBe('256GB');
      expect(saved.declaredCondition.touchGlassCondition).toBe('MINOR_SCRATCHES');
      expect(saved.declaredCondition.hardwareFaults.batteryHealthBelow83).toBe(true);
      expect(saved.declaredCondition.summary[0].items).toContain('Minor scratches');
    });

    test('POST /api/v1/requests rejects an incomplete address', async () => {
      const res = await request(app)
        .post('/api/v1/requests')
        .set('Authorization', `Bearer ${tokenA}`)
        .send(webBooking({ pickupAddress: { addressLine1: 'Somewhere', city: 'Chennai', state: 'Tamil Nadu', pincode: '12' } }));
      expect(res.status).toBe(400);
    });

    test('GET /api/v1/requests/my returns pickup details with a masked bank account', async () => {
      await request(app)
        .post('/api/v1/requests')
        .set('Authorization', `Bearer ${tokenA}`)
        .send(
          webBooking({
            paymentDetails: { paymentMethod: 'BANK_TRANSFER', bankAccount: { accountNumber: '50100234566789', ifscCode: 'hdfc0001234' } },
          })
        );

      const res = await request(app).get('/api/v1/requests/my').set('Authorization', `Bearer ${tokenA}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      const [bank, upi] = res.body.data; // newest first
      expect(bank.payoutDetails.accountNumber).toBe('•••• 6789');
      expect(bank.payoutDetails.ifscCode).toBe('HDFC0001234');
      expect(upi.customer.phone).toBe('9845012345');
      expect(upi.pickupAddress.area).toBe('Anna Nagar');
      expect(upi.device.modelName).toBe('iPhone 15 Pro');
      expect(upi.device.slug).toBe('iphone-15-pro');
    });

    test('GET /api/v1/requests/my/:requestNumber finds a request by its number', async () => {
      const res = await request(app).get(`/api/v1/requests/my/${requestNumber}`).set('Authorization', `Bearer ${tokenA}`);
      expect(res.status).toBe(200);
      expect(res.body.data.requestNumber).toBe(requestNumber);
    });

    test('Another customer cannot read the request', async () => {
      const res = await request(app).get(`/api/v1/requests/my/${requestNumber}`).set('Authorization', `Bearer ${tokenB}`);
      expect(res.status).toBe(404);
    });

    test('PUT /api/v1/auth/customer/profile updates name and phone but never the email', async () => {
      const res = await request(app)
        .put('/api/v1/auth/customer/profile')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ fullName: '  Selva   G  ', phone: '+91 98450 12345', email: 'attacker@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.data.fullName).toBe('Selva G');
      expect(res.body.data.phone).toBe('9845012345');
      expect(res.body.data.email).toBe('booking.a@revoo.test');
    });

    test('PUT /api/v1/auth/customer/profile rejects an invalid mobile number', async () => {
      const res = await request(app)
        .put('/api/v1/auth/customer/profile')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ phone: '12345' });
      expect(res.status).toBe(400);
    });

    test('PUT /api/v1/auth/customer/profile refuses a number linked to another account', async () => {
      const res = await request(app)
        .put('/api/v1/auth/customer/profile')
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ phone: '9845012345' });
      expect(res.status).toBe(409);
    });
  });

  describe('Customer sessions (stay signed in)', () => {
    const login = async () => {
      const res = await request(app)
        .post('/api/v1/auth/customer/login-password')
        .send({ identifier: 'sessions@revoo.test', password: 'SecurePassword123!' });
      expect(res.status).toBe(200);
      return res.body.data.tokens as { accessToken: string; refreshToken: string };
    };
    const refresh = (refreshToken: string) =>
      request(app).post('/api/v1/auth/customer/refresh-token').send({ refreshToken });

    beforeAll(async () => {
      await request(app)
        .post('/api/v1/auth/customer/signup')
        .send({ fullName: 'Session Tester', identifier: 'sessions@revoo.test', password: 'SecurePassword123!' });
    });

    test('Refreshing returns a working new token pair', async () => {
      const first = await login();
      const res = await refresh(first.refreshToken);
      expect(res.status).toBe(200);
      const profile = await request(app)
        .get('/api/v1/auth/customer/profile')
        .set('Authorization', `Bearer ${res.body.data.accessToken}`);
      expect(profile.status).toBe(200);
    });

    test('Signing in on a second device does not log out the first', async () => {
      const deviceA = await login();
      const deviceB = await login();
      expect((await refresh(deviceA.refreshToken)).status).toBe(200);
      expect((await refresh(deviceB.refreshToken)).status).toBe(200);
    });

    test('Two refreshes at the same moment (two tabs) both succeed', async () => {
      const session = await login();
      const [one, two] = await Promise.all([refresh(session.refreshToken), refresh(session.refreshToken)]);
      expect(one.status).toBe(200);
      expect(two.status).toBe(200);
    });

    test('Reusing an old refresh token ends that session only', async () => {
      const victim = await login();
      const other = await login();
      const second = (await refresh(victim.refreshToken)).body.data.refreshToken;
      const third = (await refresh(second)).body.data.refreshToken;

      expect((await refresh(victim.refreshToken)).status).toBe(401); // stale token replayed
      expect((await refresh(third)).status).toBe(401); // that session is now closed
      expect((await refresh(other.refreshToken)).status).toBe(200); // other device unaffected
    });

    test('Logout ends this device only and works without a valid access token', async () => {
      const deviceA = await login();
      const deviceB = await login();
      const res = await request(app).post('/api/v1/auth/customer/logout').send({ refreshToken: deviceA.refreshToken });
      expect(res.status).toBe(200);
      expect((await refresh(deviceA.refreshToken)).status).toBe(401);
      expect((await refresh(deviceB.refreshToken)).status).toBe(200);
    });

    test('Garbage refresh tokens are rejected with 401', async () => {
      expect((await refresh('not-a-jwt-token')).status).toBe(401);
    });
  });

  describe('Admin sessions (no surprise logouts)', () => {
    const login = async () => {
      const res = await request(app)
        .post('/api/v1/auth/admin/login')
        .send({ email: 'admin@revoo.test', password: 'AdminTest123!' });
      expect(res.status).toBe(200);
      return res.body.data.tokens as { accessToken: string; refreshToken: string };
    };
    const refresh = (refreshToken: string) =>
      request(app).post('/api/v1/auth/admin/refresh-token').send({ refreshToken });

    test('Refreshing returns a working new token pair', async () => {
      const res = await refresh((await login()).refreshToken);
      expect(res.status).toBe(200);
      const profile = await request(app)
        .get('/api/v1/auth/admin/profile')
        .set('Authorization', `Bearer ${res.body.data.accessToken}`);
      expect(profile.status).toBe(200);
    });

    test('Several requests refreshing at the same moment all succeed', async () => {
      const session = await login();
      const results = await Promise.all([1, 2, 3, 4, 5].map(() => refresh(session.refreshToken)));
      results.forEach((r) => expect(r.status).toBe(200));
      // Everyone got the same successor, so whichever one the browser keeps is valid
      expect(new Set(results.map((r) => r.body.data.refreshToken)).size).toBe(1);
      expect((await refresh(results[4].body.data.refreshToken)).status).toBe(200);
    });

    test('Two computers signed in to the same admin account both stay signed in', async () => {
      const pcA = await login();
      const pcB = await login();
      expect((await refresh(pcA.refreshToken)).status).toBe(200);
      expect((await refresh(pcB.refreshToken)).status).toBe(200);
    });

    test('Reusing an old refresh token ends that session only', async () => {
      const victim = await login();
      const other = await login();
      const second = (await refresh(victim.refreshToken)).body.data.refreshToken;
      const third = (await refresh(second)).body.data.refreshToken;
      expect((await refresh(victim.refreshToken)).status).toBe(401);
      expect((await refresh(third)).status).toBe(401);
      expect((await refresh(other.refreshToken)).status).toBe(200);
    });

    test('Logout ends this computer only and works without an access token', async () => {
      const pcA = await login();
      const pcB = await login();
      expect((await request(app).post('/api/v1/auth/admin/logout').send({ refreshToken: pcA.refreshToken })).status).toBe(200);
      expect((await refresh(pcA.refreshToken)).status).toBe(401);
      expect((await refresh(pcB.refreshToken)).status).toBe(200);
    });

    test('A token issued before sessions existed is accepted once and moved into a session', async () => {
      const admin = await AdminUserModel.findOne({ email: 'admin@revoo.test' });
      const legacy = TokenService.generateAdminTokenPair({
        adminId: admin!._id.toString(),
        email: admin!.email,
        role: admin!.role,
        fullName: admin!.fullName,
        type: 'ADMIN',
      });
      await AdminUserModel.updateOne({ _id: admin!._id }, { $set: { refreshTokenHash: legacy.refreshTokenHash } });
      const res = await refresh(legacy.refreshToken);
      expect(res.status).toBe(200);
      expect((await refresh(res.body.data.refreshToken)).status).toBe(200);
    });
  });

  describe('Admin photo uploads', () => {
    // 1x1 PNG
    const PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const created: string[] = [];
    const fs = require('fs') as typeof import('fs');
    const path = require('path') as typeof import('path');

    beforeAll(() => {
      // Tests never touch the real bucket: store on local disk and clean up afterwards
      jest.spyOn(StorageService, 'isR2Enabled').mockReturnValue(false);
    });
    afterAll(() => {
      created.forEach((url) => fs.rmSync(path.resolve(process.cwd(), url.replace(/^\//, '')), { force: true }));
      jest.restoreAllMocks();
    });

    test('POST /catalogue/admin/media stores the photo and returns its URL', async () => {
      const res = await request(app)
        .post('/api/v1/catalogue/admin/media')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('folder', 'devices')
        .field('name', 'Test Phone 9')
        .attach('image', Buffer.from(PNG_BASE64, 'base64'), { filename: 'photo.png', contentType: 'image/png' });
      expect(res.status).toBe(201);
      expect(res.body.data.url).toMatch(/^\/uploads\/devices\/test-phone-9-[0-9a-f]{12}\.png$/);
      created.push(res.body.data.url);
    });

    test('Photo upload needs an admin login', async () => {
      const res = await request(app)
        .post('/api/v1/catalogue/admin/media')
        .attach('image', Buffer.from(PNG_BASE64, 'base64'), { filename: 'photo.png', contentType: 'image/png' });
      expect(res.status).toBe(401);
    });

    test('Non-image files are rejected', async () => {
      const res = await request(app)
        .post('/api/v1/catalogue/admin/media')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('image', Buffer.from('hello'), { filename: 'note.txt', contentType: 'text/plain' });
      expect(res.status).toBe(400);
    });

    test('A base64 photo sent with a brand is stored as a file, never kept in the database', async () => {
      const res = await request(app)
        .put(`/api/v1/catalogue/admin/brands/${sampleBrandId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ logoUrl: `data:image/png;base64,${PNG_BASE64}` });
      expect(res.status).toBe(200);
      const brand = await BrandModel.findById(sampleBrandId);
      expect(brand!.logoUrl).toMatch(/^\/uploads\/brands\/[a-z0-9-]+-[0-9a-f]{12}\.png$/);
      created.push(brand!.logoUrl as string);
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

