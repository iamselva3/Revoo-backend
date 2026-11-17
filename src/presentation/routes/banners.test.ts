/**
 * Banners: text is optional (a banner can be just a photo), but a banner needs a photo or a title;
 * partial edits keep the rest; switching every banner off never brings back starter banners.
 */
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import app from '../../app.js';
import { AdminUserModel } from '../../infrastructure/database/models/AdminUser.js';
import { BannerModel } from '../../infrastructure/database/models/Banner.js';
import { StorageService } from '../../infrastructure/storage/StorageService.js';
import { TokenService } from '../../infrastructure/security/tokenService.js';
import { AdminRole } from '../../shared/types.js';

jest.setTimeout(60000);

describe('banners', () => {
  let mongo: MongoMemoryServer;
  let token = '';
  const admin = () => ({ Authorization: `Bearer ${token}` });
  const PHOTO = 'https://images.genietn.in/uploads/banners/diwali-offer.webp';

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
    jest.spyOn(StorageService, 'isR2Enabled').mockReturnValue(false);
    const a = await AdminUserModel.create({ email: 'banner.admin@genie.test', fullName: 'Banner Admin', passwordHash: await TokenService.hashPassword('AdminTest123!'), role: AdminRole.SUPER_ADMIN, isActive: true });
    token = TokenService.generateAdminTokenPair({ adminId: String(a._id), email: a.email, role: a.role, fullName: a.fullName, type: 'ADMIN' }).accessToken;
  });

  afterAll(async () => {
    jest.restoreAllMocks();
    await mongoose.disconnect();
    await mongo.stop();
  });

  beforeEach(() => BannerModel.deleteMany({}));

  it('a photo alone is a banner: no tag, title or subtitle needed', async () => {
    const res = await request(app).post('/api/v1/catalogue/admin/banners').set(admin()).send({ tag: '  ', title: '', subtitle: '', badge: '', imageUrl: PHOTO, linkUrl: '/buy', isActive: true, displayOrder: 1 });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ imageUrl: PHOTO, subtitle: '', badge: '', linkUrl: '/buy' });
    // No empty "" tag or title: the app falls back to its own pill text instead of an empty pill
    expect(res.body.data).not.toHaveProperty('tag');
    expect(res.body.data).not.toHaveProperty('title');

    const list = await request(app).get('/api/v1/catalogue/banners');
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0].imageUrl).toBe(PHOTO);
  });

  it('a text banner needs a title; an empty banner is refused', async () => {
    expect((await request(app).post('/api/v1/catalogue/admin/banners').set(admin()).send({ title: 'Diwali bonus', subtitle: 'Extra ₹1,000' })).status).toBe(201);
    const empty = await request(app).post('/api/v1/catalogue/admin/banners').set(admin()).send({ tag: 'HOT', subtitle: 'No title, no photo' });
    expect(empty.status).toBe(400);
    expect(empty.body.message).toBe('Add a banner photo, or a title for a text banner.');
  });

  it('edits change only what is sent; removing the photo of a banner without a title is refused', async () => {
    const created = await request(app).post('/api/v1/catalogue/admin/banners').set(admin()).send({ tag: 'HOT DEAL', title: 'Old title', imageUrl: PHOTO });
    const id = created.body.data._id;

    const renamed = await request(app).put(`/api/v1/catalogue/admin/banners/${id}`).set(admin()).send({ title: '' });
    expect(renamed.status).toBe(200);
    expect(renamed.body.data).toMatchObject({ tag: 'HOT DEAL', imageUrl: PHOTO });
    expect(renamed.body.data).not.toHaveProperty('title');

    const noPhoto = await request(app).put(`/api/v1/catalogue/admin/banners/${id}`).set(admin()).send({ imageUrl: '' });
    expect(noPhoto.status).toBe(400);
    expect((await BannerModel.findById(id).lean())?.imageUrl).toBe(PHOTO); // nothing was saved

    expect((await request(app).put('/api/v1/catalogue/admin/banners/not-an-id').set(admin()).send({ title: 'x' })).status).toBe(404);
  });

  it('starter banners only for an empty database, never again when the admin switches all off', async () => {
    const first = await request(app).get('/api/v1/catalogue/banners');
    expect(first.body.data).toHaveLength(3);

    await BannerModel.updateMany({}, { isActive: false });
    for (let i = 0; i < 3; i++) {
      const res = await request(app).get('/api/v1/catalogue/banners');
      expect(res.body.data).toEqual([]);
    }
    expect(await BannerModel.countDocuments()).toBe(3);
  });
});
