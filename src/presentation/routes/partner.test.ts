import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import app from '../../app.js';
import { AdminUserModel } from '../../infrastructure/database/models/AdminUser.js';
import { BrandModel } from '../../infrastructure/database/models/Brand.js';
import { SmartphoneModel } from '../../infrastructure/database/models/SmartphoneModel.js';
import { StorageVariantModel } from '../../infrastructure/database/models/StorageVariant.js';
import { PricingRuleModel } from '../../infrastructure/database/models/PricingRule.js';
import { EmployeeModel } from '../../infrastructure/database/models/Employee.js';
import { BuybackRequestModel } from '../../infrastructure/database/models/BuybackRequest.js';
import { DoorstepCheckModel } from '../../infrastructure/database/models/DoorstepCheck.js';
import { TokenService } from '../../infrastructure/security/tokenService.js';
import { AdminRole, RequestStatus } from '../../shared/types.js';

/** Pickup partner app: sign in with a PIN, check the device at the door, admin sees every change. */
describe('Pickup partner app', () => {
  let mongoServer: MongoMemoryServer;
  let adminToken: string;
  let customerToken: string;
  let modelId: string;
  let variant256: string;
  let variant128: string;
  let employeeId: string;
  let partnerToken: string;
  let requestNumber: string;
  let requestId: string;

  const customerAnswers = {
    basicQuestions: { isPhoneWorking: true, isTouchscreenWorking: true, isDisplayOriginal: true, hasValidWarranty: false },
    screenDisplayCondition: 'NO_SPOT',
    touchGlassCondition: 'MINOR_SCRATCHES',
    backPanelCondition: 'NO_DEFECTS',
    sidePanelCondition: 'NO_DEFECTS',
    hardwareFaults: {},
    hasOriginalCharger: true,
    hasOriginalBox: true,
  };

  const asPartner = (req: request.Test) => req.set('Authorization', `Bearer ${partnerToken}`);
  const asAdmin = (req: request.Test) => req.set('Authorization', `Bearer ${adminToken}`);

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    const admin = await AdminUserModel.create({
      email: 'ops@genie.test',
      fullName: 'Ops Admin',
      passwordHash: await TokenService.hashPassword('AdminTest123!'),
      role: AdminRole.SUPER_ADMIN,
      isActive: true,
    });
    adminToken = TokenService.generateAdminTokenPair({
      adminId: admin._id.toString(),
      email: admin.email,
      role: admin.role,
      fullName: admin.fullName,
      type: 'ADMIN',
    }).accessToken;

    const brand = await BrandModel.create({ name: 'Apple', slug: 'apple', isActive: true, displayOrder: 1 });
    const model = await SmartphoneModel.create({
      brandId: brand._id,
      name: 'iPhone 15 Pro',
      slug: 'iphone-15-pro',
      releaseYear: 2023,
      basePrice: 70000,
      isPublished: true,
    });
    modelId = model._id.toString();
    const v256 = await StorageVariantModel.create({ modelId: model._id, capacity: '256GB', priceModifier: 5000, isPublished: true });
    const v128 = await StorageVariantModel.create({ modelId: model._id, capacity: '128GB', priceModifier: 0, isPublished: true });
    variant256 = v256._id.toString();
    variant128 = v128._id.toString();
    await PricingRuleModel.create({ modelId: model._id, variantId: v256._id, basePrice: 70000, storagePriceAdjustment: 5000, version: 1, isActive: true });

    const employee = await EmployeeModel.create({
      fullName: 'Karthik R',
      employeeCode: 'GP-101',
      phone: '+91 98765 43210',
      email: 'karthik@genie.test',
      district: 'Chennai',
    });
    employeeId = employee._id.toString();

    const signup = await request(app)
      .post('/api/v1/auth/customer/signup')
      .send({ fullName: 'Selva Ganesh', identifier: 'selva@genie.test', password: 'SecurePassword123!' });
    customerToken = signup.body.data.tokens.accessToken;

    const booking = await request(app)
      .post('/api/v1/requests')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        device: { brand: 'Apple', modelName: 'iPhone 15 Pro', modelId, variant: '256GB', variantId: variant256 },
        modelId,
        variantId: variant256,
        conditions: customerAnswers,
        pickupAddress: {
          fullName: 'Selva Ganesh',
          phone: '9845012345',
          addressLine1: 'No. 42, North Mada Street',
          city: 'Chennai',
          state: 'Tamil Nadu',
          pincode: '600040',
        },
      });
    expect(booking.status).toBe(201);
    requestNumber = booking.body.data.requestNumber;
    requestId = booking.body.data._id;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  describe('Signing in', () => {
    test('no access until the admin sets a PIN', async () => {
      const res = await request(app).post('/api/v1/partner/login').send({ phone: '9876543210', pin: '123456' });
      expect(res.status).toBe(401);
    });

    test('the admin needs a 6-digit PIN to switch access on', async () => {
      const noPin = await asAdmin(request(app).put(`/api/v1/partner/admin/employees/${employeeId}/access`)).send({ enabled: true });
      expect(noPin.status).toBe(400);
      const shortPin = await asAdmin(request(app).put(`/api/v1/partner/admin/employees/${employeeId}/access`)).send({ enabled: true, pin: '12a4' });
      expect(shortPin.status).toBe(400);
    });

    test('admin sets a PIN; the PIN is never returned', async () => {
      const res = await asAdmin(request(app).put(`/api/v1/partner/admin/employees/${employeeId}/access`)).send({ enabled: true, pin: '482913' });
      expect(res.status).toBe(200);
      expect(res.body.data.partnerAccessEnabled).toBe(true);
      expect(res.body.data.partnerPinHash).toBeUndefined();
      const list = await asAdmin(request(app).get('/api/v1/employees'));
      expect(JSON.stringify(list.body)).not.toContain('partnerPinHash');
    });

    test('signs in with the phone number in any format, or the employee code', async () => {
      const byPhone = await request(app).post('/api/v1/partner/login').send({ phone: '+91 98765 43210', pin: '482913' });
      expect(byPhone.status).toBe(200);
      expect(byPhone.body.data.partner.fullName).toBe('Karthik R');
      partnerToken = byPhone.body.data.token;
      const byCode = await request(app).post('/api/v1/partner/login').send({ identifier: 'gp-101', pin: '482913' });
      expect(byCode.status).toBe(200);
    });

    test('wrong PINs count down, then lock the account for 15 minutes; the admin can reset it', async () => {
      for (let i = 4; i >= 1; i--) {
        const res = await request(app).post('/api/v1/partner/login').send({ phone: '9876543210', pin: '000000' });
        expect(res.status).toBe(401);
        expect(res.body.message).toContain(`${i} tr`);
      }
      const locked = await request(app).post('/api/v1/partner/login').send({ phone: '9876543210', pin: '000000' });
      expect(locked.status).toBe(429);
      // Even the right PIN waits while locked
      const right = await request(app).post('/api/v1/partner/login').send({ phone: '9876543210', pin: '482913' });
      expect(right.status).toBe(429);
      // A new PIN from the admin unlocks
      await asAdmin(request(app).put(`/api/v1/partner/admin/employees/${employeeId}/access`)).send({ enabled: true, pin: '482913' });
      const after = await request(app).post('/api/v1/partner/login').send({ phone: '9876543210', pin: '482913' });
      expect(after.status).toBe(200);
      partnerToken = after.body.data.token;
    });

    test('a partner token opens nothing in admin, and a customer token opens nothing in the partner app', async () => {
      const adminList = await asPartner(request(app).get('/api/v1/requests/admin'));
      expect(adminList.status).toBe(403);
      const partnerAdmin = await asPartner(request(app).get('/api/v1/partner/admin/checks'));
      expect(partnerAdmin.status).toBe(403);
      const customer = await request(app).get(`/api/v1/partner/requests/${requestNumber}`).set('Authorization', `Bearer ${customerToken}`);
      expect(customer.status).toBe(403);
      const none = await request(app).get(`/api/v1/partner/requests/${requestNumber}`);
      expect(none.status).toBe(401);
    });
  });

  describe('Checking the device at the door', () => {
    test('typing or scanning the booking number shows the customer, the device, their answers and the quote', async () => {
      // The QR holds a link; a typed number may have spaces
      for (const ref of [requestNumber, requestNumber.toLowerCase().replace(/-/g, ' '), `https://genietn.in/partner?r=${requestNumber}`]) {
        const res = await asPartner(request(app).get(`/api/v1/partner/requests/${encodeURIComponent(ref)}`));
        expect(res.status).toBe(200);
        expect(res.body.data.requestNumber).toBe(requestNumber);
      }
      const res = await asPartner(request(app).get(`/api/v1/partner/requests/${requestNumber}`));
      const d = res.body.data;
      expect(d.customer).toMatchObject({ fullName: 'Selva Ganesh', phone: '9845012345' });
      expect(d.device).toMatchObject({ modelName: 'iPhone 15 Pro', storage: '256GB', variantId: variant256 });
      expect(d.variants.map((v: any) => v.capacity)).toEqual(['128GB', '256GB']);
      expect(d.customerCondition.touchGlassCondition).toBe('MINOR_SCRATCHES');
      expect(d.quotedAmount).toBeGreaterThan(0);
      // Nothing checked yet: the customer's own answers give exactly the quote
      expect(d.pricing.finalAmount).toBe(d.quotedAmount);
      expect(d.pricing.changes).toEqual([]);
      // Admin's best and worst prices for this device
      expect(d.pricing.bestAmount).toBeGreaterThanOrEqual(d.quotedAmount);
      expect(d.pricing.worstAmount).toBeLessThan(d.quotedAmount);
      expect(d.pricing.worstAmount).toBeGreaterThan(0);
    });

    test('an unknown number says so', async () => {
      const res = await asPartner(request(app).get('/api/v1/partner/requests/GENIE-2026-9999'));
      expect(res.status).toBe(404);
    });

    test('same answers at the door: the customer gets exactly the quoted price', async () => {
      const res = await asPartner(request(app).post(`/api/v1/partner/requests/${requestNumber}/price`)).send({ condition: customerAnswers });
      expect(res.status).toBe(200);
      expect(res.body.data.difference).toBe(0);
      expect(res.body.data.finalAmount).toBe(res.body.data.quotedAmount);
    });

    test('a cracked glass found at the door takes off what the admin set for it, and says why', async () => {
      const res = await asPartner(request(app).post(`/api/v1/partner/requests/${requestNumber}/price`)).send({
        condition: { ...customerAnswers, touchGlassCondition: 'CRACKED_GLASS' },
      });
      const p = res.body.data;
      expect(p.finalAmount).toBeLessThan(p.quotedAmount);
      expect(p.difference).toBe(p.finalAmount - p.quotedAmount);
      expect(p.finalAmount).toBeGreaterThanOrEqual(p.worstAmount);
      const total = p.changes.reduce((s: number, c: any) => s + c.difference, 0);
      expect(total).toBe(p.difference);
      expect(p.changes.some((c: any) => c.difference < 0 && /crack/i.test(c.component))).toBe(true);
      expect(p.changes.some((c: any) => c.difference > 0 && /scratch/i.test(c.component))).toBe(true);
    });

    test('a phone that does not switch on drops to the worst price, never below', async () => {
      const res = await asPartner(request(app).post(`/api/v1/partner/requests/${requestNumber}/price`)).send({
        condition: { basicQuestions: { isPhoneWorking: false } },
      });
      expect(res.body.data.finalAmount).toBe(res.body.data.worstAmount);
    });

    test('a smaller storage than booked is priced as that storage', async () => {
      const res = await asPartner(request(app).post(`/api/v1/partner/requests/${requestNumber}/price`)).send({
        variantId: variant128,
        condition: customerAnswers,
      });
      const p = res.body.data;
      expect(p.checkedStorage).toBe('128GB');
      expect(p.finalAmount).toBeLessThan(p.quotedAmount);
      expect(p.changes[0].component).toBe('Storage: 256GB → 128GB');
      expect(p.changes[0].difference).toBeLessThan(0);
    });

    test('unknown answers are ignored (they cannot change the price)', async () => {
      const res = await asPartner(request(app).post(`/api/v1/partner/requests/${requestNumber}/price`)).send({
        condition: { ...customerAnswers, customDeductions: { anything: 99999 }, basePrice: 1, touchGlassCondition: 'MADE_UP' },
      });
      // Unknown glass answer = no scratch, so the price goes up from the customer's "minor scratches", never down
      expect(res.body.data.difference).toBeGreaterThanOrEqual(0);
    });

    test('"cannot buy" needs a reason; a bad IMEI is refused', async () => {
      const noReason = await asPartner(request(app).post(`/api/v1/partner/requests/${requestNumber}/checks`)).send({
        condition: customerAnswers,
        outcome: 'NOT_BUYABLE',
      });
      expect(noReason.status).toBe(400);
      const badImei = await asPartner(request(app).post(`/api/v1/partner/requests/${requestNumber}/checks`)).send({
        condition: customerAnswers,
        outcome: 'AGREED',
        imei: '12345',
      });
      expect(badImei.status).toBe(400);
    });

    test('saving a lower price: kept with the partner, the reason and the customer’s decision; the booking itself is untouched', async () => {
      const before = await BuybackRequestModel.findById(requestId).lean();
      const res = await asPartner(request(app).post(`/api/v1/partner/requests/${requestNumber}/checks`)).send({
        condition: { ...customerAnswers, touchGlassCondition: 'CRACKED_GLASS' },
        outcome: 'AGREED',
        imei: '35 209 876 543 210 9',
        photoUrls: ['https://cdn.genie.test/uploads/requests/a.webp', 'javascript:alert(1)'],
        notes: 'Crack on the top left corner',
      });
      expect(res.status).toBe(201);
      const check = res.body.data;
      expect(check.partnerName).toBe('Karthik R');
      expect(check.partnerCode).toBe('GP-101');
      expect(check.difference).toBeLessThan(0);
      expect(check.imei).toBe('352098765432109');
      expect(check.photoUrls).toEqual(['https://cdn.genie.test/uploads/requests/a.webp']);

      const after = await BuybackRequestModel.findById(requestId).lean();
      expect(after!.status).toBe(before!.status);
      expect(after!.indicativeEstimate.estimatedAmount).toBe(before!.indicativeEstimate.estimatedAmount);
      expect(after!.timeline.length).toBe(before!.timeline.length);
      expect(after!.doorstepCheck).toMatchObject({ partnerName: 'Karthik R', outcome: 'AGREED', difference: check.difference });
    });

    test('the partner sees their own checks', async () => {
      const res = await asPartner(request(app).get('/api/v1/partner/checks'));
      expect(res.status).toBe(200);
      expect(res.body.data[0].requestNumber).toBe(requestNumber);
    });
  });

  describe('Admin', () => {
    test('sees every price reduced at the door, with the total', async () => {
      // A second check that kept the price
      await asPartner(request(app).post(`/api/v1/partner/requests/${requestNumber}/checks`)).send({ condition: customerAnswers, outcome: 'AGREED' });

      const reduced = await asAdmin(request(app).get('/api/v1/partner/admin/checks?change=reduced'));
      expect(reduced.status).toBe(200);
      expect(reduced.body.data).toHaveLength(1);
      expect(reduced.body.data[0]).toMatchObject({ requestNumber, partnerName: 'Karthik R' });
      expect(reduced.body.meta.reducedCount).toBe(1);
      expect(reduced.body.meta.reducedAmount).toBe(-reduced.body.data[0].difference);

      const all = await asAdmin(request(app).get('/api/v1/partner/admin/checks'));
      expect(all.body.meta.total).toBe(2);
    });

    test('sees all checks of one request, newest first, with what changed', async () => {
      const res = await asAdmin(request(app).get(`/api/v1/partner/admin/requests/${requestId}/checks`));
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0].difference).toBe(0);
      expect(res.body.data[1].changes.length).toBeGreaterThan(0);
      expect(res.body.data[1].checkedCondition.touchGlassCondition).toBe('CRACKED_GLASS');
    });

    test('a closed booking can be opened but not checked again', async () => {
      await BuybackRequestModel.updateOne({ _id: requestId }, { $set: { status: RequestStatus.PAYMENT_COMPLETED } });
      const view = await asPartner(request(app).get(`/api/v1/partner/requests/${requestNumber}`));
      expect(view.body.data.closed).toBe(true);
      const res = await asPartner(request(app).post(`/api/v1/partner/requests/${requestNumber}/checks`)).send({ condition: customerAnswers, outcome: 'AGREED' });
      expect(res.status).toBe(409);
      expect(await DoorstepCheckModel.countDocuments({ requestId })).toBe(2);
    });

    test('switching access off signs the partner out at once', async () => {
      await asAdmin(request(app).put(`/api/v1/partner/admin/employees/${employeeId}/access`)).send({ enabled: false });
      const res = await asPartner(request(app).get('/api/v1/partner/me'));
      expect(res.status).toBe(401);
      const login = await request(app).post('/api/v1/partner/login').send({ phone: '9876543210', pin: '482913' });
      expect(login.status).toBe(401);
    });
  });
});
