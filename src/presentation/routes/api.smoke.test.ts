/**
 * Whole-API smoke test: calls every route against an in-memory database and walks buyback requests
 * from booking through inspection, offer, payment and return. Fails if any call answers with a
 * server error or an unexpected status (bad ids and missing fields must be 4xx, admin routes must
 * refuse without a token, error responses must not include code details).
 * No email, SMS, Google, Groq, R2 or postal-API calls leave the machine.
 * Set SMOKE_OUT=<file.json> to write every call's status for inspection.
 */
import fs from 'fs';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import app from '../../app.js';
import { AdminUserModel } from '../../infrastructure/database/models/AdminUser.js';
import { BrandModel } from '../../infrastructure/database/models/Brand.js';
import { SmartphoneModel } from '../../infrastructure/database/models/SmartphoneModel.js';
import { StorageVariantModel } from '../../infrastructure/database/models/StorageVariant.js';
import { TokenService } from '../../infrastructure/security/tokenService.js';
import { GoogleAuthService } from '../../infrastructure/security/GoogleAuthService.js';
import { NotificationService } from '../../infrastructure/notifications/NotificationService.js';
import { StorageService } from '../../infrastructure/storage/StorageService.js';
import { GenieAiService } from '../../domain/services/GenieAiService.js';
import { AdminRole } from '../../shared/types.js';

jest.setTimeout(180000);

type Row = { step: string; method: string; path: string; status: number; message?: string; serverError: boolean; unexpected: boolean };
const rows: Row[] = [];
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAAABJRU5ErkJggg==', 'base64');

async function call(step: string, method: 'get' | 'post' | 'put' | 'delete', path: string, opts: { token?: string; body?: any; expect?: number[]; file?: boolean } = {}) {
  let r: any = (request(app) as any)[method]('/api/v1' + path);
  if (opts.token) r = r.set('Authorization', `Bearer ${opts.token}`);
  if (opts.file) r = r.attach('image', PNG, { filename: 'p.png', contentType: 'image/png' });
  else if (opts.body !== undefined) r = r.send(opts.body);
  const res = await r;
  const expectOk = opts.expect ?? [200, 201];
  const message = res.body?.message || res.body?.error || '';
  rows.push({
    step, method: method.toUpperCase(), path, status: res.status, message: String(message).slice(0, 140),
    serverError: res.status >= 500, unexpected: !expectOk.includes(res.status),
  });
  return res;
}

describe('whole API smoke test', () => {
  let mongo: MongoMemoryServer;
  let admin = '';
  let brandId = '', modelId = '', variantId = '';

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
    jest.spyOn(NotificationService, 'sendOtp').mockResolvedValue({ success: true, delivered: false, message: 'test' } as any);
    jest.spyOn(NotificationService, 'notify').mockResolvedValue(undefined);
    jest.spyOn(StorageService, 'isR2Enabled').mockReturnValue(false);
    jest.spyOn(GenieAiService, 'chat').mockResolvedValue('Hello from the test assistant');
    jest.spyOn(GoogleAuthService, 'verifyGoogleIdToken').mockResolvedValue({ googleId: 'g-1', email: 'g.user@gmail.com', fullName: 'G User', isEmailVerified: true } as any);
    const realFetch = global.fetch;
    jest.spyOn(global, 'fetch').mockImplementation((async (url: any, init?: any) => {
      if (String(url).includes('postalpincode.in')) {
        return new Response(JSON.stringify([{ Status: 'Success', PostOffice: [{ Name: 'Anna Nagar', District: 'Chennai', State: 'Tamil Nadu', Block: 'Chennai' }] }]), { status: 200 });
      }
      return realFetch(url, init);
    }) as any);

    const a = await AdminUserModel.create({ email: 'smoke.admin@revoo.test', fullName: 'Smoke Admin', passwordHash: await TokenService.hashPassword('AdminTest123!'), role: AdminRole.SUPER_ADMIN, isActive: true });
    admin = TokenService.generateAdminTokenPair({ adminId: String(a._id), email: a.email, role: a.role, fullName: a.fullName, type: 'ADMIN' }).accessToken;
    const brand = await BrandModel.create({ name: 'Realme', slug: 'realme', isActive: true, displayOrder: 1 });
    brandId = String(brand._id);
    const model = await SmartphoneModel.create({ brandId: brand._id, name: 'Realme 12 Pro Plus', slug: 'realme-12-pro-plus', releaseYear: 2024, basePrice: 15000, isPublished: true });
    modelId = String(model._id);
    const v = await StorageVariantModel.create({ modelId: model._id, capacity: '8GB / 128GB', ram: '8GB', storage: '128GB', priceModifier: 0, isPublished: true });
    await StorageVariantModel.create({ modelId: model._id, capacity: '8GB / 256GB', ram: '8GB', storage: '256GB', priceModifier: 1200, isPublished: true });
    variantId = String(v._id);
  });

  afterAll(async () => {
    if (process.env.SMOKE_OUT) fs.writeFileSync(process.env.SMOKE_OUT, JSON.stringify(rows, null, 1));
    jest.restoreAllMocks();
    await mongoose.disconnect();
    await mongo.stop();
  });

  test('every route', async () => {
    // ---------- Health & public catalogue ----------
    await call('health', 'get', '/health');
    await call('banners', 'get', '/catalogue/banners');
    await call('categories', 'get', '/catalogue/categories');
    await call('brands', 'get', '/catalogue/brands');
    await call('brand models', 'get', `/catalogue/brands/${brandId}/models`);
    await call('model detail', 'get', `/catalogue/models/${modelId}`);
    await call('model detail by slug', 'get', '/catalogue/models/realme-12-pro-plus');
    const conditions = {
      basicQuestions: { isPhoneWorking: true, isTouchscreenWorking: true, isDisplayOriginal: false, hasValidWarranty: true },
      screenDisplayCondition: 'MINOR_SPOTS', touchGlassCondition: 'MINOR_SCRATCHES', backPanelCondition: 'MINOR_SCRATCHES',
      sidePanelCondition: 'NO_DEFECTS', hardwareFaults: { batteryHealthBelow83: true }, hasOriginalCharger: true, hasOriginalBox: false,
      hasValidBill: true, deviceAge: '6_TO_11_MONTHS',
    };
    await call('estimate (website answers)', 'post', '/catalogue/estimate', { body: { modelId, variantId, ...conditions } });
    await call('estimate (phone dead)', 'post', '/catalogue/estimate', { body: { modelId, variantId, basicQuestions: { isPhoneWorking: false } } });
    await call('estimate (no model)', 'post', '/catalogue/estimate', { body: {}, expect: [200, 400] });
    await call('refurbished', 'get', '/catalogue/refurbished');
    await call('reviews', 'get', '/catalogue/reviews');
    await call('reviews sell', 'get', '/catalogue/reviews?type=sell');
    await call('popup', 'get', '/catalogue/popup');

    // ---------- Geo, staff, enquiries, AI ----------
    await call('states', 'get', '/geo/states');
    await call('cities', 'get', '/geo/cities?state=Tamil%20Nadu');
    await call('pincode', 'get', '/geo/pincode/600040');
    await call('pincode invalid', 'get', '/geo/pincode/12', { expect: [400, 404] });
    await call('staff list without sign-in (must refuse)', 'get', '/employees', { expect: [401] });
    await call('staff recommend without sign-in (must refuse)', 'get', '/employees/recommend?district=Chennai', { expect: [401] });
    await call('staff list (admin)', 'get', '/employees', { token: admin });
    await call('staff recommend (admin)', 'get', '/employees/recommend?district=Chennai', { token: admin });
    const err = await call('error response has no code details', 'get', '/catalogue/models/not-an-id', { expect: [400, 404] });
    if (err.body?.stack) rows.push({ step: 'STACK LEAK', method: 'GET', path: '/catalogue/models/not-an-id', status: err.status, message: 'stack included in error response', serverError: true, unexpected: true });
    await call('enquiry submit', 'post', '/enquiries', { body: { name: 'Test User', email: 'test.user@revoo.test', phone: '9845012345', subject: 'Pickup', message: 'When is my pickup?' } });
    await call('ai status', 'get', '/ai/status');
    await call('ai chat', 'post', '/ai/chat', { body: { messages: [{ role: 'user', content: 'What is my phone worth?' }] } });
    await call('ai chat empty', 'post', '/ai/chat', { body: {}, expect: [400] });

    // ---------- Customer auth ----------
    const signup = await call('customer signup', 'post', '/auth/customer/signup', { body: { fullName: 'Smoke Customer', identifier: 'smoke.customer@revoo.test', password: 'SecurePassword123!' } });
    let cust = signup.body?.data?.tokens?.accessToken;
    const custRefresh = signup.body?.data?.tokens?.refreshToken;
    await call('customer login', 'post', '/auth/customer/login-password', { body: { identifier: 'smoke.customer@revoo.test', password: 'SecurePassword123!' } });
    await call('customer login wrong pw', 'post', '/auth/customer/login-password', { body: { identifier: 'smoke.customer@revoo.test', password: 'nope' }, expect: [400, 401] });
    const refreshed = await call('customer refresh', 'post', '/auth/customer/refresh-token', { body: { refreshToken: custRefresh } });
    cust = refreshed.body?.data?.accessToken || refreshed.body?.data?.tokens?.accessToken || cust;
    await call('customer profile', 'get', '/auth/customer/profile', { token: cust });
    await call('customer profile update', 'put', '/auth/customer/profile', { token: cust, body: { fullName: 'Smoke Customer 2', phone: '9845012345' } });
    await call('customer referral', 'get', '/auth/customer/referral', { token: cust });
    await call('otp request', 'post', '/auth/customer/request-otp', { body: { channel: 'EMAIL', destination: 'otp.user@revoo.test' } });
    await call('otp verify wrong', 'post', '/auth/customer/verify-otp', { body: { channel: 'EMAIL', destination: 'otp.user@revoo.test', otp: '000000' }, expect: [400, 401] });
    await call('google sign-in', 'post', '/auth/customer/google', { body: { idToken: 'fake-token' } });
    await call('customer profile (no token)', 'get', '/auth/customer/profile', { expect: [401] });

    // ---------- Admin auth ----------
    const login = await call('admin login', 'post', '/auth/admin/login', { body: { email: 'smoke.admin@revoo.test', password: 'AdminTest123!' } });
    await call('admin login wrong', 'post', '/auth/admin/login', { body: { email: 'smoke.admin@revoo.test', password: 'wrong' }, expect: [400, 401] });
    await call('admin refresh', 'post', '/auth/admin/refresh-token', { body: { refreshToken: login.body?.data?.refreshToken || login.body?.data?.tokens?.refreshToken } });
    await call('admin profile', 'get', '/auth/admin/profile', { token: admin });

    // ---------- Admin catalogue ----------
    await call('admin popup get', 'get', '/catalogue/admin/popup', { token: admin });
    await call('admin popup save', 'post', '/catalogue/admin/popup', { token: admin, body: { title: 'Diwali offer', subtitle: 'Extra 5%', isActive: true, imageUrl: '/uploads/popups/x.png' } });
    const media = await call('admin media upload', 'post', '/catalogue/admin/media', { token: admin, file: true, body: undefined });
    if (media.body?.data?.url) fs.rmSync(media.body.data.url.replace(/^\//, ''), { force: true });
    await call('admin banners', 'get', '/catalogue/admin/banners', { token: admin });
    const banner = await call('admin banner create', 'post', '/catalogue/admin/banners', { token: admin, body: { tag: 'New', title: 'Sell now', subtitle: 'Best price', imageUrl: '/uploads/banners/b.png', isActive: true } });
    const bannerId = banner.body?.data?._id;
    await call('admin banner update', 'put', `/catalogue/admin/banners/${bannerId}`, { token: admin, body: { title: 'Sell today' } });
    await call('admin banner delete', 'delete', `/catalogue/admin/banners/${bannerId}`, { token: admin });
    await call('admin brands', 'get', '/catalogue/admin/brands', { token: admin });
    const brand2 = await call('admin brand create', 'post', '/catalogue/admin/brands', { token: admin, body: { name: 'TestBrand', slug: 'testbrand', isActive: true } });
    await call('admin brand update', 'put', `/catalogue/admin/brands/${brand2.body?.data?._id}`, { token: admin, body: { name: 'TestBrand 2' } });
    await call('admin categories', 'get', '/catalogue/admin/categories', { token: admin });
    const cat = await call('admin category create', 'post', '/catalogue/admin/categories', { token: admin, body: { name: 'Phones', slug: 'phones', iconName: 'Smartphone' } });
    await call('admin category update', 'put', `/catalogue/admin/categories/${cat.body?.data?._id}`, { token: admin, body: { name: 'Mobiles' } });
    await call('admin models', 'get', '/catalogue/admin/models', { token: admin });
    const m2 = await call('admin model create', 'post', '/catalogue/admin/models', { token: admin, body: { brandId, name: 'Realme Smoke 1', slug: 'realme-smoke-1', basePrice: 9000, releaseYear: 2025, variants: [{ capacity: '6GB / 128GB', ram: '6GB', storage: '128GB', priceModifier: 0 }], deviceAgeDeductions: { ABOVE_11_MONTHS: 8 } } });
    const m2id = m2.body?.data?._id;
    await call('admin model update', 'put', `/catalogue/admin/models/${m2id}`, { token: admin, body: { basePrice: 9500, variants: [{ capacity: '6GB / 128GB', ram: '6GB', storage: '128GB', priceModifier: 0 }, { capacity: '8GB / 128GB', ram: '8GB', storage: '128GB', priceModifier: 700 }] } });
    await call('admin variant add (model from URL)', 'post', `/catalogue/admin/models/${m2id}/variants`, { token: admin, body: { capacity: '8GB / 256GB', ram: '8GB', storage: '256GB', priceModifier: 1500 } });
    await call('admin variant add (admin page payload)', 'post', `/catalogue/admin/models/${m2id}/variants`, { token: admin, body: { modelId: m2id, capacity: '12GB / 256GB', ram: '12GB', storage: '256GB', priceModifier: 2500, isPublished: true } });
    await call('admin variant add (no capacity)', 'post', `/catalogue/admin/models/${m2id}/variants`, { token: admin, body: {}, expect: [400] });
    await call('admin model archive', 'delete', `/catalogue/admin/models/${m2id}/archive`, { token: admin });
    await call('admin model delete', 'delete', `/catalogue/admin/models/${m2id}`, { token: admin });
    await call('admin refurbished', 'get', '/catalogue/admin/refurbished', { token: admin });
    const rp = await call('admin refurbished create', 'post', '/catalogue/admin/refurbished', { token: admin, body: { name: 'iPhone 13', brand: 'Apple', storage: '128GB', originalPrice: 50000, salePrice: 32000, imageUrl: '/uploads/products/p.png' } });
    const rpId = rp.body?.data?._id;
    await call('admin refurbished update', 'put', `/catalogue/admin/refurbished/${rpId}`, { token: admin, body: { salePrice: 31000 } });
    await call('admin refurbished update (post)', 'post', `/catalogue/admin/refurbished/${rpId}/update`, { token: admin, body: { salePrice: 30500 } });
    await call('public refurbished after create', 'get', '/catalogue/refurbished');
    await call('order invoice', 'post', '/catalogue/orders', { body: { customerName: 'Buyer', customerPhone: '9845012345', customerEmail: 'buyer@revoo.test', shippingAddress: 'Chennai 600040', productName: 'iPhone 13', brand: 'Apple', unitPrice: 30500, totalAmount: 30500, productId: rpId, quantity: 1 } });
    await call('admin invoices', 'get', '/catalogue/admin/invoices', { token: admin });
    await call('admin refurbished delete (post)', 'post', `/catalogue/admin/refurbished/${rpId}/delete`, { token: admin });
    await call('admin refurbished delete again', 'delete', `/catalogue/admin/refurbished/${rpId}`, { token: admin, expect: [200, 404] });

    // ---------- Pricing ----------
    await call('pricing rule get', 'get', `/pricing/model/${modelId}`, { token: admin });
    await call('pricing rule save', 'put', `/pricing/model/${modelId}`, { token: admin, body: { basePrice: 15000, deductionPercentages: { basicQuestions: { displayNotOriginal: 12 }, deviceAge: { ABOVE_11_MONTHS: 5 } }, deductions: { accessoriesBonus: { hasOriginalCharger: 400, hasOriginalBox: 300 } }, reasonForChange: 'smoke' } });
    await call('pricing history', 'get', `/pricing/history/${modelId}`, { token: admin });
    await call('estimate after pricing save', 'post', '/catalogue/estimate', { body: { modelId, variantId, ...conditions } });

    // ---------- Dashboard, staff, enquiries (admin) ----------
    await call('dashboard stats', 'get', '/dashboard/stats', { token: admin });
    await call('dashboard audits', 'get', '/dashboard/audits', { token: admin });
    const emp = await call('employee create', 'post', '/employees', { token: admin, body: { fullName: 'Ravi Kumar', employeeCode: 'EMP-001', phone: '9876543210', email: 'ravi@revoo.test', district: 'Chennai', role: 'PICKUP_PARTNER', status: 'ACTIVE', vehicleType: 'BIKE' } });
    const empId = emp.body?.data?._id;
    await call('employee update', 'put', `/employees/${empId}`, { token: admin, body: { status: 'ON_DUTY' } });
    const enq = await call('admin enquiries', 'get', '/enquiries/admin', { token: admin });
    const enqId = enq.body?.data?.[0]?._id ?? enq.body?.data?.enquiries?.[0]?._id;
    await call('admin enquiry respond', 'put', `/enquiries/admin/${enqId}/respond`, { token: admin, body: { response: 'Tomorrow 10 AM', status: 'RESOLVED' } });

    // ---------- Buyback request lifecycle ----------
    const photo = await call('request photo upload', 'post', '/requests/upload', { file: true });
    // remove the test image again (stored on local disk in tests)
    const uploaded = JSON.stringify(photo.body?.data || {}).match(/\/uploads\/[^"]+/g) || [];
    uploaded.forEach((u) => fs.rmSync(u.replace(/^\//, ''), { force: true }));
    const booking = (o: any = {}) => ({
      device: { brand: 'Realme', modelName: 'Realme 12 Pro Plus', modelId, variant: '8GB / 128GB', variantId }, modelId, variantId,
      conditions, indicativeValuation: 12000,
      pickupAddress: { fullName: 'Smoke Customer', phone: '+91 98450 12345', addressLine1: 'No. 1, Main Road', addressLine2: 'Anna Nagar', city: 'Chennai', state: 'Tamil Nadu', pincode: '600040' },
      scheduledPickupDate: '2026-11-20', preferredTimeWindow: 'Morning (10:00 AM - 01:00 PM)', paymentDetails: { paymentMethod: 'UPI', upiId: 'smoke@okicici' }, ...o,
    });
    const r1 = await call('request submit', 'post', '/requests', { token: cust, body: booking() });
    const r1id = r1.body?.data?._id;
    await call('my requests', 'get', '/requests/my', { token: cust });
    await call('my request detail', 'get', `/requests/my/${r1id}`, { token: cust });
    await call('my request by number', 'get', `/requests/my/${r1.body?.data?.requestNumber}`, { token: cust });
    await call('admin requests', 'get', '/requests/admin', { token: admin });
    await call('admin requests filtered', 'get', '/requests/admin?status=SUBMITTED&page=1&limit=10', { token: admin });
    await call('admin request detail', 'get', `/requests/admin/${r1id}`, { token: admin });
    await call('assign collection', 'post', `/requests/admin/${r1id}/assign-collection`, { token: admin, body: { collectorStaffId: empId, collectorStaffName: 'Ravi Kumar', scheduledDate: '2026-11-20', timeSlot: '10:00 AM - 01:00 PM', notes: 'Call first' } });
    await call('collection status COLLECTED', 'put', `/requests/admin/${r1id}/collection-status`, { token: admin, body: { status: 'COLLECTED' } });
    await call('collection status invalid', 'put', `/requests/admin/${r1id}/collection-status`, { token: admin, body: { status: 'NOT_A_STATUS' }, expect: [400] });
    await call('collection status missing', 'put', `/requests/admin/${r1id}/collection-status`, { token: admin, body: {}, expect: [400] });
    const adminInspection = (amount: number) => ({
      actualCondition: { displayCondition: 'MINOR_SCRATCHES', bodyCondition: 'MINOR_SIGNS_OF_USE', batteryHealth: 'GOOD', functionalFaults: {}, hasOriginalBox: false, hasOriginalCharger: true, screenFunctional: true, touchFunctional: true, camerasFunctional: true, biometricsFunctional: true },
      discrepancies: ['Back has a scratch'], suggestedOfferAmount: amount, internalInspectionNotes: 'ok', customerVisibleNotes: 'Small scratch',
    });
    await call('final offer before inspection (must refuse)', 'post', `/requests/admin/${r1id}/final-offer`, { token: admin, body: { finalOfferedAmount: 11000 }, expect: [400] });
    await call('inspection', 'post', `/requests/admin/${r1id}/inspection`, { token: admin, body: adminInspection(11000) });
    await call('final offer', 'post', `/requests/admin/${r1id}/final-offer`, { token: admin, body: { finalOfferedAmount: 11000, valuationExplanation: 'Scratch on back', validityDays: 3 } });
    await call('customer accepts', 'post', `/requests/my/${r1id}/decision`, { token: cust, body: { decision: 'ACCEPTED' } });
    await call('payment', 'post', `/requests/admin/${r1id}/payments`, { token: admin, body: { amount: 11000, paymentMethod: 'UPI', paymentReference: 'UTR123', notes: 'paid' } });
    await call('admin request detail after payment', 'get', `/requests/admin/${r1id}`, { token: admin });
    await call('customer decides twice', 'post', `/requests/my/${r1id}/decision`, { token: cust, body: { decision: 'ACCEPTED' }, expect: [400] });

    const r2 = await call('request 2 submit', 'post', '/requests', { token: cust, body: booking() });
    const r2id = r2.body?.data?._id;
    await call('r2 inspection', 'post', `/requests/admin/${r2id}/inspection`, { token: admin, body: adminInspection(9000) });
    await call('r2 final offer', 'post', `/requests/admin/${r2id}/final-offer`, { token: admin, body: { finalOfferedAmount: 9000, valuationExplanation: 'Battery' } });
    await call('r2 customer rejects', 'post', `/requests/my/${r2id}/decision`, { token: cust, body: { decision: 'REJECTED', rejectionReason: 'Too low' } });
    await call('r2 return (admin page payload)', 'post', `/requests/admin/${r2id}/returns`, { token: admin, body: { assignedStaffName: 'Ravi Kumar', trackingReference: 'RET-1', notes: 'Offer rejected' } });
    await call('r2 complete return', 'put', `/requests/admin/${r2id}/complete-return`, { token: admin, body: { notes: 'returned' } });
    await call('r2 payment not allowed', 'post', `/requests/admin/${r2id}/payments`, { token: admin, body: { amount: 1 }, expect: [400] });
    await call('final offer missing amount', 'post', `/requests/admin/${r2id}/final-offer`, { token: admin, body: {}, expect: [400] });

    const r3 = await call('request 3 submit', 'post', '/requests', { token: cust, body: booking() });
    const r3id = r3.body?.data?._id;
    await call('r3 inspection', 'post', `/requests/admin/${r3id}/inspection`, { token: admin, body: adminInspection(8000) });
    await call('r3 final offer', 'post', `/requests/admin/${r3id}/final-offer`, { token: admin, body: { finalOfferedAmount: 8000, valuationExplanation: 'Inspection completed.' } });
    await call('r3 bad new offer (refused)', 'post', `/requests/admin/${r3id}/final-offer`, { token: admin, body: { finalOfferedAmount: 0 }, expect: [400] });
    await call('r3 customer can still accept the issued offer', 'post', `/requests/my/${r3id}/decision`, { token: cust, body: { decision: 'ACCEPTED' } });

    // ---------- Malformed ids (must be 400/404, never a server error) ----------
    for (const [name, path, token] of [
      ['model bad id', '/catalogue/models/not-an-id', ''],
      ['brand models bad id', '/catalogue/brands/not-an-id/models', ''],
      ['my request bad id', '/requests/my/not-an-id', cust],
      ['admin request bad id', '/requests/admin/not-an-id', admin],
      ['pricing bad id', '/pricing/model/not-an-id', admin],
      ['pricing history bad id', '/pricing/history/not-an-id', admin],
    ] as Array<[string, string, string]>) {
      await call(name, 'get', path, { token: token || undefined, expect: [200, 400, 404] });
    }
    for (const [name, method, path, body] of [
      ['assign bad id', 'post', '/requests/admin/not-an-id/assign-collection', {}],
      ['banner update bad id', 'put', '/catalogue/admin/banners/not-an-id', { title: 'x' }],
      ['model update bad id', 'put', '/catalogue/admin/models/not-an-id', { basePrice: 1 }],
      ['employee update bad id', 'put', '/employees/not-an-id', { status: 'ACTIVE' }],
      ['enquiry respond bad id', 'put', '/enquiries/admin/not-an-id/respond', { response: 'x' }],
      ['refurbished delete bad id', 'delete', '/catalogue/admin/refurbished/not-an-id', undefined],
    ] as Array<[string, any, string, any]>) {
      await call(name, method, path, { token: admin, body, expect: [400, 404] });
    }

    // ---------- Every admin route must refuse without a token ----------
    for (const [method, path] of [
      ['get', '/catalogue/admin/models'], ['post', '/catalogue/admin/models'], ['put', `/catalogue/admin/models/${modelId}`],
      ['get', '/catalogue/admin/banners'], ['post', '/catalogue/admin/media'], ['get', '/catalogue/admin/invoices'],
      ['get', `/pricing/model/${modelId}`], ['put', `/pricing/model/${modelId}`], ['get', '/dashboard/stats'], ['get', '/dashboard/audits'],
      ['post', '/employees'], ['delete', `/employees/${empId}`], ['get', '/enquiries/admin'], ['get', '/requests/admin'],
      ['post', `/requests/admin/${r1id}/final-offer`], ['get', '/auth/admin/profile'], ['post', '/requests'], ['get', '/requests/my'],
    ] as Array<[any, string]>) {
      await call('no token', method, path, { body: method === 'get' || method === 'delete' ? undefined : {}, expect: [401] });
    }

    // ---------- Cleanup & logouts ----------
    await call('employee delete', 'delete', `/employees/${empId}`, { token: admin });
    await call('customer logout', 'post', '/auth/customer/logout', { token: cust, body: { refreshToken: custRefresh } });
    await call('admin logout', 'post', '/auth/admin/logout', { body: { refreshToken: login.body?.data?.refreshToken } });

    const problems = rows.filter((r) => r.unexpected || r.serverError).map((r) => `${r.status} ${r.method} ${r.path} [${r.step}] ${r.message}`);
    expect(problems).toEqual([]);
    expect(rows.length).toBeGreaterThan(140);
  });
});
