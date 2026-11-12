import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../connection.js';
import { AdminUserModel } from '../models/AdminUser.js';
import { BrandModel } from '../models/Brand.js';
import { SmartphoneModel } from '../models/SmartphoneModel.js';
import { StorageVariantModel } from '../models/StorageVariant.js';
import { PricingRuleModel } from '../models/PricingRule.js';
import { BuybackRequestModel } from '../models/BuybackRequest.js';
import { InspectionModel } from '../models/Inspection.js';
import { FinalOfferModel } from '../models/FinalOffer.js';
import { PaymentModel } from '../models/Payment.js';
import { UserModel } from '../models/User.js';
import { TokenService } from '../../security/tokenService.js';
import { AdminRole, RequestStatus, FinalOfferStatus, PaymentMethod, PaymentStatus, UserStatus } from '../../../shared/types.js';

export async function seedDatabase() {
  console.log('[Seeder] Starting REVOO database seeding...');

  // 1. Clear existing collections
  await Promise.all([
    AdminUserModel.deleteMany({}),
    BrandModel.deleteMany({}),
    SmartphoneModel.deleteMany({}),
    StorageVariantModel.deleteMany({}),
    PricingRuleModel.deleteMany({}),
    BuybackRequestModel.deleteMany({}),
    InspectionModel.deleteMany({}),
    FinalOfferModel.deleteMany({}),
    PaymentModel.deleteMany({}),
    UserModel.deleteMany({}),
  ]);

  // 2. Admin Users
  const superAdminPassword = await TokenService.hashPassword('RevooAdmin@2026!');
  const inspectorPassword = await TokenService.hashPassword('Inspector@2026!');
  const operationsPassword = await TokenService.hashPassword('Operations@2026!');

  const superAdmin = await AdminUserModel.create({
    email: 'admin@revoo.com',
    fullName: 'Rajesh Sharma (Super Admin)',
    passwordHash: superAdminPassword,
    role: AdminRole.SUPER_ADMIN,
    isActive: true,
  });

  const inspector = await AdminUserModel.create({
    email: 'inspector@revoo.com',
    fullName: 'Amit Verma (Chief Inspector)',
    passwordHash: inspectorPassword,
    role: AdminRole.INSPECTOR,
    isActive: true,
  });

  const operations = await AdminUserModel.create({
    email: 'operations@revoo.com',
    fullName: 'Pooja Nair (Logistics Lead)',
    passwordHash: operationsPassword,
    role: AdminRole.OPERATIONS,
    isActive: true,
  });

  console.log('[Seeder] Created default Admin, Inspector, and Operations accounts.');

  // 3. Brands (Mobile, Laptops & Smart TVs with official verified transparent vector PNG logos)
  const apple = await BrandModel.create({
    name: 'Apple',
    slug: 'apple',
    logoUrl: '/uploads/brands/apple.png',
    displayOrder: 1,
    isActive: true,
  });

  const samsung = await BrandModel.create({
    name: 'Samsung',
    slug: 'samsung',
    logoUrl: '/uploads/brands/samsung.png',
    displayOrder: 2,
    isActive: true,
  });

  const oneplus = await BrandModel.create({
    name: 'OnePlus',
    slug: 'oneplus',
    logoUrl: '/uploads/brands/oneplus.png',
    displayOrder: 3,
    isActive: true,
  });

  const google = await BrandModel.create({
    name: 'Google',
    slug: 'google',
    logoUrl: '/uploads/brands/google.png',
    displayOrder: 4,
    isActive: true,
  });

  const vivo = await BrandModel.create({
    name: 'Vivo',
    slug: 'vivo',
    logoUrl: '/uploads/brands/vivo.png',
    displayOrder: 5,
    isActive: true,
  });

  const oppo = await BrandModel.create({
    name: 'Oppo',
    slug: 'oppo',
    logoUrl: '/uploads/brands/oppo.png',
    displayOrder: 6,
    isActive: true,
  });

  const nothing = await BrandModel.create({
    name: 'Nothing',
    slug: 'nothing',
    logoUrl: '/uploads/brands/nothing.png',
    displayOrder: 7,
    isActive: true,
  });

  const redmi = await BrandModel.create({
    name: 'Redmi',
    slug: 'redmi',
    logoUrl: '/uploads/brands/redmi.png',
    displayOrder: 8,
    isActive: true,
  });

  const realme = await BrandModel.create({
    name: 'Realme',
    slug: 'realme',
    logoUrl: '/uploads/brands/realme.png',
    displayOrder: 9,
    isActive: true,
  });

  const iqoo = await BrandModel.create({
    name: 'iQOO',
    slug: 'iqoo',
    logoUrl: '/uploads/brands/iqoo.png',
    displayOrder: 10,
    isActive: true,
  });

  // Laptop Brands
  const dell = await BrandModel.create({
    name: 'Dell',
    slug: 'dell',
    logoUrl: '/uploads/brands/dell.png',
    displayOrder: 11,
    isActive: true,
  });

  const hp = await BrandModel.create({
    name: 'HP',
    slug: 'hp',
    logoUrl: '/uploads/brands/hp.png',
    displayOrder: 12,
    isActive: true,
  });

  const lenovo = await BrandModel.create({
    name: 'Lenovo',
    slug: 'lenovo',
    logoUrl: '/uploads/brands/lenovo.png',
    displayOrder: 13,
    isActive: true,
  });

  const asus = await BrandModel.create({
    name: 'ASUS',
    slug: 'asus',
    logoUrl: '/uploads/brands/asus.png',
    displayOrder: 14,
    isActive: true,
  });

  const acer = await BrandModel.create({
    name: 'Acer',
    slug: 'acer',
    logoUrl: '/uploads/brands/acer.png',
    displayOrder: 15,
    isActive: true,
  });

  // Smart TV Brands
  const sony = await BrandModel.create({
    name: 'Sony',
    slug: 'sony',
    logoUrl: '/uploads/brands/sony.png',
    displayOrder: 16,
    isActive: true,
  });

  const lg = await BrandModel.create({
    name: 'LG',
    slug: 'lg',
    logoUrl: '/uploads/brands/lg.png',
    displayOrder: 17,
    isActive: true,
  });

  const tcl = await BrandModel.create({
    name: 'TCL',
    slug: 'tcl',
    logoUrl: '/uploads/brands/tcl.png',
    displayOrder: 18,
    isActive: true,
  });

  const xiaomi = await BrandModel.create({
    name: 'Xiaomi',
    slug: 'xiaomi',
    logoUrl: '/uploads/brands/xiaomi.png',
    displayOrder: 19,
    isActive: true,
  });

  console.log('[Seeder] Seeded all 19 Brands across Smartphones, Laptops, and Smart TVs.');

  // 4. Smartphone Models & Storage Variants
  const modelsData = [
    // Apple
    {
      brandId: apple._id,
      name: 'iPhone 15 Pro Max',
      slug: 'iphone-15-pro-max',
      releaseYear: 2023,
      imageUrl: '/uploads/devices/iphone-15-pro-max.png',
      basePrice: 85000,
      variants: [
        { capacity: '256GB', priceModifier: 0 },
        { capacity: '512GB', priceModifier: 12000 },
        { capacity: '1TB', priceModifier: 24000 },
      ],
    },
    {
      brandId: apple._id,
      name: 'iPhone 15 Pro',
      slug: 'iphone-15-pro',
      releaseYear: 2023,
      imageUrl: '/uploads/devices/iphone-15-pro.png',
      basePrice: 72000,
      variants: [
        { capacity: '128GB', priceModifier: 0 },
        { capacity: '256GB', priceModifier: 8000 },
        { capacity: '512GB', priceModifier: 18000 },
      ],
    },
    {
      brandId: apple._id,
      name: 'iPhone 15',
      slug: 'iphone-15',
      releaseYear: 2023,
      imageUrl: '/uploads/devices/iphone-15.png',
      basePrice: 52000,
      variants: [
        { capacity: '128GB', priceModifier: 0 },
        { capacity: '256GB', priceModifier: 6000 },
        { capacity: '512GB', priceModifier: 14000 },
      ],
    },
    {
      brandId: apple._id,
      name: 'iPhone 14 Pro',
      slug: 'iphone-14-pro',
      releaseYear: 2022,
      imageUrl: '/uploads/devices/iphone-14-pro.png',
      basePrice: 62000,
      variants: [
        { capacity: '128GB', priceModifier: 0 },
        { capacity: '256GB', priceModifier: 6000 },
      ],
    },
    {
      brandId: apple._id,
      name: 'iPhone 14',
      slug: 'iphone-14',
      releaseYear: 2022,
      imageUrl: '/uploads/devices/iphone-14.png',
      basePrice: 42000,
      variants: [
        { capacity: '128GB', priceModifier: 0 },
        { capacity: '256GB', priceModifier: 5000 },
        { capacity: '512GB', priceModifier: 11000 },
      ],
    },
    {
      brandId: apple._id,
      name: 'iPhone 13',
      slug: 'iphone-13',
      releaseYear: 2021,
      imageUrl: '/uploads/devices/iphone-13.png',
      basePrice: 35000,
      variants: [
        { capacity: '128GB', priceModifier: 0 },
        { capacity: '256GB', priceModifier: 4000 },
      ],
    },

    // Samsung
    {
      brandId: samsung._id,
      name: 'Galaxy S24 Ultra',
      slug: 'galaxy-s24-ultra',
      releaseYear: 2024,
      imageUrl: '/uploads/devices/galaxy-s24-ultra.png',
      basePrice: 78000,
      variants: [
        { capacity: '256GB', priceModifier: 0 },
        { capacity: '512GB', priceModifier: 10000 },
        { capacity: '1TB', priceModifier: 22000 },
      ],
    },
    {
      brandId: samsung._id,
      name: 'Galaxy S24+',
      slug: 'galaxy-s24-plus',
      releaseYear: 2024,
      imageUrl: '/uploads/devices/galaxy-s24-plus.png',
      basePrice: 58000,
      variants: [
        { capacity: '256GB', priceModifier: 0 },
        { capacity: '512GB', priceModifier: 8000 },
      ],
    },
    {
      brandId: samsung._id,
      name: 'Galaxy S24',
      slug: 'galaxy-s24',
      releaseYear: 2024,
      imageUrl: '/uploads/devices/galaxy-s24.png',
      basePrice: 48000,
      variants: [
        { capacity: '128GB', priceModifier: 0 },
        { capacity: '256GB', priceModifier: 5000 },
      ],
    },
    {
      brandId: samsung._id,
      name: 'Galaxy S23 Ultra',
      slug: 'galaxy-s23-ultra',
      releaseYear: 2023,
      imageUrl: '/uploads/devices/galaxy-s23-ultra.png',
      basePrice: 54000,
      variants: [
        { capacity: '256GB', priceModifier: 0 },
        { capacity: '512GB', priceModifier: 7000 },
      ],
    },
    {
      brandId: samsung._id,
      name: 'Galaxy Z Fold 5',
      slug: 'galaxy-z-fold-5',
      releaseYear: 2023,
      imageUrl: '/uploads/devices/galaxy-z-fold-5.png',
      basePrice: 75000,
      variants: [
        { capacity: '256GB', priceModifier: 0 },
        { capacity: '512GB', priceModifier: 11000 },
      ],
    },
    {
      brandId: samsung._id,
      name: 'Galaxy Z Flip 5',
      slug: 'galaxy-z-flip-5',
      releaseYear: 2023,
      imageUrl: '/uploads/devices/galaxy-z-flip-5.png',
      basePrice: 46000,
      variants: [
        { capacity: '256GB', priceModifier: 0 },
        { capacity: '512GB', priceModifier: 6000 },
      ],
    },

    // Vivo
    {
      brandId: vivo._id,
      name: 'Vivo X100 Pro',
      slug: 'vivo-x100-pro',
      releaseYear: 2024,
      imageUrl: '/uploads/devices/vivo-x100-pro.png',
      basePrice: 56000,
      variants: [
        { capacity: '256GB', priceModifier: 0 },
        { capacity: '512GB', priceModifier: 7000 },
      ],
    },
    {
      brandId: vivo._id,
      name: 'Vivo V30 Pro',
      slug: 'vivo-v30-pro',
      releaseYear: 2024,
      imageUrl: '/uploads/devices/vivo-v30-pro.png',
      basePrice: 34000,
      variants: [
        { capacity: '256GB', priceModifier: 0 },
        { capacity: '512GB', priceModifier: 4000 },
      ],
    },
    {
      brandId: vivo._id,
      name: 'Vivo V29 5G',
      slug: 'vivo-v29-5g',
      releaseYear: 2023,
      imageUrl: '/uploads/devices/vivo-v29-5g.png',
      basePrice: 24000,
      variants: [
        { capacity: '128GB', priceModifier: 0 },
        { capacity: '256GB', priceModifier: 3000 },
      ],
    },
    {
      brandId: vivo._id,
      name: 'Vivo T3 5G',
      slug: 'vivo-t3-5g',
      releaseYear: 2024,
      imageUrl: '/uploads/devices/vivo-t3-5g.png',
      basePrice: 17000,
      variants: [
        { capacity: '128GB', priceModifier: 0 },
        { capacity: '256GB', priceModifier: 2500 },
      ],
    },

    // Oppo
    {
      brandId: oppo._id,
      name: 'Find X7 Ultra',
      slug: 'oppo-find-x7-ultra',
      releaseYear: 2024,
      imageUrl: '/uploads/devices/oppo-find-x7-ultra.png',
      basePrice: 59000,
      variants: [
        { capacity: '256GB', priceModifier: 0 },
        { capacity: '512GB', priceModifier: 8000 },
      ],
    },
    {
      brandId: oppo._id,
      name: 'Reno 11 Pro',
      slug: 'oppo-reno-11-pro',
      releaseYear: 2024,
      imageUrl: '/uploads/devices/oppo-reno-11-pro.png',
      basePrice: 31000,
      variants: [
        { capacity: '256GB', priceModifier: 0 },
        { capacity: '512GB', priceModifier: 4000 },
      ],
    },
    {
      brandId: oppo._id,
      name: 'Oppo F25 Pro 5G',
      slug: 'oppo-f25-pro-5g',
      releaseYear: 2024,
      imageUrl: '/uploads/devices/oppo-f25-pro-5g.png',
      basePrice: 21000,
      variants: [
        { capacity: '128GB', priceModifier: 0 },
        { capacity: '256GB', priceModifier: 2500 },
      ],
    },

    // Nothing
    {
      brandId: nothing._id,
      name: 'Nothing Phone (2)',
      slug: 'nothing-phone-2',
      releaseYear: 2023,
      imageUrl: '/uploads/devices/nothing-phone-2.png',
      basePrice: 36000,
      variants: [
        { capacity: '128GB', priceModifier: 0 },
        { capacity: '256GB', priceModifier: 4000 },
        { capacity: '512GB', priceModifier: 8000 },
      ],
    },
    {
      brandId: nothing._id,
      name: 'Nothing Phone (2a)',
      slug: 'nothing-phone-2a',
      releaseYear: 2024,
      imageUrl: '/uploads/devices/nothing-phone-2a.png',
      basePrice: 22000,
      variants: [
        { capacity: '128GB', priceModifier: 0 },
        { capacity: '256GB', priceModifier: 3000 },
      ],
    },
    {
      brandId: nothing._id,
      name: 'Nothing Phone (1)',
      slug: 'nothing-phone-1',
      releaseYear: 2022,
      imageUrl: '/uploads/devices/nothing-phone-1.png',
      basePrice: 19000,
      variants: [
        { capacity: '128GB', priceModifier: 0 },
        { capacity: '256GB', priceModifier: 2500 },
      ],
    },

    // Redmi
    {
      brandId: redmi._id,
      name: 'Redmi Note 13 Pro+ 5G',
      slug: 'redmi-note-13-pro-plus',
      releaseYear: 2024,
      imageUrl: '/uploads/devices/redmi-note-13-pro-plus.png',
      basePrice: 28000,
      variants: [
        { capacity: '256GB', priceModifier: 0 },
        { capacity: '512GB', priceModifier: 3500 },
      ],
    },
    {
      brandId: redmi._id,
      name: 'Redmi Note 13 Pro',
      slug: 'redmi-note-13-pro',
      releaseYear: 2024,
      imageUrl: '/uploads/devices/redmi-note-13-pro.png',
      basePrice: 22000,
      variants: [
        { capacity: '128GB', priceModifier: 0 },
        { capacity: '256GB', priceModifier: 2500 },
      ],
    },
    {
      brandId: redmi._id,
      name: 'Redmi 13C 5G',
      slug: 'redmi-13c-5g',
      releaseYear: 2023,
      imageUrl: '/uploads/devices/redmi-13c-5g.png',
      basePrice: 11000,
      variants: [
        { capacity: '128GB', priceModifier: 0 },
        { capacity: '256GB', priceModifier: 1500 },
      ],
    },

    // Realme
    {
      brandId: realme._id,
      name: 'Realme 12 Pro+ 5G',
      slug: 'realme-12-pro-plus',
      releaseYear: 2024,
      imageUrl: '/uploads/devices/realme-12-pro-plus.png',
      basePrice: 26000,
      variants: [
        { capacity: '128GB', priceModifier: 0 },
        { capacity: '256GB', priceModifier: 3000 },
      ],
    },
    {
      brandId: realme._id,
      name: 'Realme GT 6T',
      slug: 'realme-gt-6t',
      releaseYear: 2024,
      imageUrl: '/uploads/devices/realme-gt-6t.png',
      basePrice: 29000,
      variants: [
        { capacity: '128GB', priceModifier: 0 },
        { capacity: '256GB', priceModifier: 3500 },
      ],
    },
    {
      brandId: realme._id,
      name: 'Realme Narzo 70 Pro',
      slug: 'realme-narzo-70-pro',
      releaseYear: 2024,
      imageUrl: '/uploads/devices/realme-narzo-70-pro.png',
      basePrice: 18000,
      variants: [
        { capacity: '128GB', priceModifier: 0 },
        { capacity: '256GB', priceModifier: 2000 },
      ],
    },

    // iQOO
    {
      brandId: iqoo._id,
      name: 'iQOO 12 5G',
      slug: 'iqoo-12-5g',
      releaseYear: 2023,
      imageUrl: '/uploads/devices/iqoo-12-5g.png',
      basePrice: 46000,
      variants: [
        { capacity: '256GB', priceModifier: 0 },
        { capacity: '512GB', priceModifier: 6000 },
      ],
    },
    {
      brandId: iqoo._id,
      name: 'iQOO Neo 9 Pro',
      slug: 'iqoo-neo-9-pro',
      releaseYear: 2024,
      imageUrl: '/uploads/devices/iqoo-neo-9-pro.png',
      basePrice: 32000,
      variants: [
        { capacity: '128GB', priceModifier: 0 },
        { capacity: '256GB', priceModifier: 4000 },
      ],
    },
    {
      brandId: iqoo._id,
      name: 'iQOO Z9 5G',
      slug: 'iqoo-z9-5g',
      releaseYear: 2024,
      imageUrl: '/uploads/devices/iqoo-z9-5g.png',
      basePrice: 17000,
      variants: [
        { capacity: '128GB', priceModifier: 0 },
        { capacity: '256GB', priceModifier: 2000 },
      ],
    },

    // OnePlus
    {
      brandId: oneplus._id,
      name: 'OnePlus 12',
      slug: 'oneplus-12',
      releaseYear: 2024,
      imageUrl: '/uploads/devices/oneplus-12.png',
      basePrice: 46000,
      variants: [
        { capacity: '256GB', priceModifier: 0 },
        { capacity: '512GB', priceModifier: 6000 },
      ],
    },
    {
      brandId: oneplus._id,
      name: 'OnePlus 12R',
      slug: 'oneplus-12r',
      releaseYear: 2024,
      imageUrl: '/uploads/devices/oneplus-12r.png',
      basePrice: 34000,
      variants: [
        { capacity: '128GB', priceModifier: 0 },
        { capacity: '256GB', priceModifier: 4000 },
      ],
    },
    {
      brandId: oneplus._id,
      name: 'OnePlus Nord 4',
      slug: 'oneplus-nord-4',
      releaseYear: 2024,
      imageUrl: '/uploads/devices/oneplus-nord-4.png',
      basePrice: 27000,
      variants: [
        { capacity: '128GB', priceModifier: 0 },
        { capacity: '256GB', priceModifier: 3000 },
      ],
    },

    // Google
    {
      brandId: google._id,
      name: 'Pixel 8 Pro',
      slug: 'pixel-8-pro',
      releaseYear: 2023,
      imageUrl: '/uploads/devices/pixel-8-pro.png',
      basePrice: 52000,
      variants: [
        { capacity: '128GB', priceModifier: 0 },
        { capacity: '256GB', priceModifier: 6000 },
        { capacity: '512GB', priceModifier: 14000 },
      ],
    },
    {
      brandId: google._id,
      name: 'Pixel 8',
      slug: 'pixel-8',
      releaseYear: 2023,
      imageUrl: '/uploads/devices/pixel-8.png',
      basePrice: 39000,
      variants: [
        { capacity: '128GB', priceModifier: 0 },
        { capacity: '256GB', priceModifier: 5000 },
      ],
    },
    {
      brandId: google._id,
      name: 'Pixel 7a',
      slug: 'pixel-7a',
      releaseYear: 2023,
      imageUrl: '/uploads/devices/pixel-7a.png',
      basePrice: 26000,
      variants: [
        { capacity: '128GB', priceModifier: 0 },
      ],
    },

    // LAPTOPS - Apple MacBooks
    {
      brandId: apple._id,
      name: 'MacBook Pro 16" M3 Max',
      slug: 'macbook-pro-16-m3-max',
      releaseYear: 2023,
      imageUrl: '/uploads/brands/apple.png',
      basePrice: 165000,
      variants: [
        { capacity: '512GB SSD / 36GB RAM', priceModifier: 0 },
        { capacity: '1TB SSD / 48GB RAM', priceModifier: 24000 },
        { capacity: '2TB SSD / 96GB RAM', priceModifier: 48000 },
      ],
    },
    {
      brandId: apple._id,
      name: 'MacBook Pro 14" M3 Pro',
      slug: 'macbook-pro-14-m3-pro',
      releaseYear: 2023,
      imageUrl: '/uploads/brands/apple.png',
      basePrice: 125000,
      variants: [
        { capacity: '512GB SSD / 18GB RAM', priceModifier: 0 },
        { capacity: '1TB SSD / 36GB RAM', priceModifier: 20000 },
      ],
    },
    {
      brandId: apple._id,
      name: 'MacBook Air 15" M2',
      slug: 'macbook-air-15-m2',
      releaseYear: 2023,
      imageUrl: '/uploads/brands/apple.png',
      basePrice: 78000,
      variants: [
        { capacity: '256GB SSD', priceModifier: 0 },
        { capacity: '512GB SSD', priceModifier: 12000 },
      ],
    },
    {
      brandId: apple._id,
      name: 'MacBook Air 13" M2',
      slug: 'macbook-air-13-m2',
      releaseYear: 2022,
      imageUrl: '/uploads/brands/apple.png',
      basePrice: 62000,
      variants: [
        { capacity: '256GB SSD', priceModifier: 0 },
        { capacity: '512GB SSD', priceModifier: 10000 },
      ],
    },
    {
      brandId: apple._id,
      name: 'MacBook Air 13" M1',
      slug: 'macbook-air-13-m1',
      releaseYear: 2020,
      imageUrl: '/uploads/brands/apple.png',
      basePrice: 48000,
      variants: [
        { capacity: '256GB SSD', priceModifier: 0 },
        { capacity: '512GB SSD', priceModifier: 8000 },
      ],
    },

    // LAPTOPS - Dell
    {
      brandId: dell._id,
      name: 'Dell XPS 15 OLED (9530)',
      slug: 'dell-xps-15',
      releaseYear: 2023,
      imageUrl: '/uploads/brands/dell.png',
      basePrice: 85000,
      variants: [
        { capacity: '512GB SSD / 16GB RAM', priceModifier: 0 },
        { capacity: '1TB SSD / 32GB RAM', priceModifier: 14000 },
      ],
    },
    {
      brandId: dell._id,
      name: 'Dell Alienware m16 R2 Gaming',
      slug: 'dell-alienware-m16',
      releaseYear: 2024,
      imageUrl: '/uploads/brands/dell.png',
      basePrice: 95000,
      variants: [
        { capacity: '1TB SSD / 32GB RAM / RTX 4070', priceModifier: 0 },
        { capacity: '2TB SSD / 64GB RAM / RTX 4080', priceModifier: 22000 },
      ],
    },
    {
      brandId: dell._id,
      name: 'Dell Inspiron 16 Plus',
      slug: 'dell-inspiron-16',
      releaseYear: 2023,
      imageUrl: '/uploads/brands/dell.png',
      basePrice: 42000,
      variants: [
        { capacity: '512GB SSD', priceModifier: 0 },
        { capacity: '1TB SSD', priceModifier: 6000 },
      ],
    },

    // LAPTOPS - HP
    {
      brandId: hp._id,
      name: 'HP Spectre x360 14 OLED',
      slug: 'hp-spectre-14',
      releaseYear: 2024,
      imageUrl: '/uploads/brands/hp.png',
      basePrice: 72000,
      variants: [
        { capacity: '512GB SSD / 16GB RAM', priceModifier: 0 },
        { capacity: '1TB SSD / 32GB RAM', priceModifier: 12000 },
      ],
    },
    {
      brandId: hp._id,
      name: 'HP OMEN 16 Gaming Laptop',
      slug: 'hp-omen-16',
      releaseYear: 2023,
      imageUrl: '/uploads/brands/hp.png',
      basePrice: 68000,
      variants: [
        { capacity: '1TB SSD / 16GB RAM / RTX 4060', priceModifier: 0 },
      ],
    },

    // LAPTOPS - Lenovo
    {
      brandId: lenovo._id,
      name: 'ThinkPad X1 Carbon Gen 11',
      slug: 'thinkpad-x1-gen11',
      releaseYear: 2023,
      imageUrl: '/uploads/brands/lenovo.png',
      basePrice: 68000,
      variants: [
        { capacity: '512GB SSD / 16GB RAM', priceModifier: 0 },
        { capacity: '1TB SSD / 32GB RAM', priceModifier: 12000 },
      ],
    },
    {
      brandId: lenovo._id,
      name: 'Lenovo Legion Pro 5 Gen 8',
      slug: 'lenovo-legion-pro-5',
      releaseYear: 2023,
      imageUrl: '/uploads/brands/lenovo.png',
      basePrice: 64000,
      variants: [
        { capacity: '1TB SSD / RTX 4070', priceModifier: 0 },
      ],
    },

    // LAPTOPS - ASUS
    {
      brandId: asus._id,
      name: 'ROG Zephyrus G14 (2024)',
      slug: 'asus-rog-g14',
      releaseYear: 2024,
      imageUrl: '/uploads/brands/asus.png',
      basePrice: 78000,
      variants: [
        { capacity: '1TB SSD / OLED / RTX 4060', priceModifier: 0 },
        { capacity: '1TB SSD / OLED / RTX 4070', priceModifier: 14000 },
      ],
    },
    {
      brandId: asus._id,
      name: 'ZenBook 14 OLED (UX3405)',
      slug: 'asus-zenbook-14',
      releaseYear: 2024,
      imageUrl: '/uploads/brands/asus.png',
      basePrice: 52000,
      variants: [
        { capacity: '512GB SSD', priceModifier: 0 },
        { capacity: '1TB SSD', priceModifier: 8000 },
      ],
    },

    // LAPTOPS - Acer
    {
      brandId: acer._id,
      name: 'Predator Helios 16 Gaming',
      slug: 'acer-predator-helios-16',
      releaseYear: 2024,
      imageUrl: '/uploads/brands/acer.png',
      basePrice: 75000,
      variants: [
        { capacity: '1TB SSD / RTX 4070', priceModifier: 0 },
      ],
    },
    {
      brandId: acer._id,
      name: 'Swift Go 14 OLED',
      slug: 'acer-swift-go-14',
      releaseYear: 2023,
      imageUrl: '/uploads/brands/acer.png',
      basePrice: 42000,
      variants: [
        { capacity: '512GB SSD', priceModifier: 0 },
      ],
    },

    // SMART TVS - Sony
    {
      brandId: sony._id,
      name: 'Sony Bravia XR 65" 4K OLED (A80L)',
      slug: 'sony-bravia-65-oled',
      releaseYear: 2023,
      imageUrl: '/uploads/brands/sony.png',
      basePrice: 95000,
      variants: [
        { capacity: '65-inch 4K OLED 120Hz', priceModifier: 0 },
      ],
    },
    {
      brandId: sony._id,
      name: 'Sony Bravia 55" 4K Google TV (X80L)',
      slug: 'sony-bravia-55-4k',
      releaseYear: 2023,
      imageUrl: '/uploads/brands/sony.png',
      basePrice: 58000,
      variants: [
        { capacity: '55-inch 4K HDR', priceModifier: 0 },
      ],
    },
    {
      brandId: sony._id,
      name: 'Sony Bravia 43" 4K HDR (X74L)',
      slug: 'sony-bravia-43-4k',
      releaseYear: 2023,
      imageUrl: '/uploads/brands/sony.png',
      basePrice: 38000,
      variants: [
        { capacity: '43-inch 4K Google TV', priceModifier: 0 },
      ],
    },

    // SMART TVS - Samsung
    {
      brandId: samsung._id,
      name: 'Samsung Neo QLED 65" 4K (QN90C)',
      slug: 'samsung-neo-qled-65',
      releaseYear: 2023,
      imageUrl: '/uploads/brands/samsung.png',
      basePrice: 88000,
      variants: [
        { capacity: '65-inch Neo QLED 120Hz', priceModifier: 0 },
      ],
    },
    {
      brandId: samsung._id,
      name: 'Samsung The Frame 55" 4K QLED',
      slug: 'samsung-the-frame-55',
      releaseYear: 2023,
      imageUrl: '/uploads/brands/samsung.png',
      basePrice: 56000,
      variants: [
        { capacity: '55-inch Matte Display', priceModifier: 0 },
      ],
    },
    {
      brandId: samsung._id,
      name: 'Samsung Crystal UHD 43" 4K (CU8000)',
      slug: 'samsung-crystal-uhd-43',
      releaseYear: 2023,
      imageUrl: '/uploads/brands/samsung.png',
      basePrice: 28000,
      variants: [
        { capacity: '43-inch 4K HDR10+', priceModifier: 0 },
      ],
    },

    // SMART TVS - LG
    {
      brandId: lg._id,
      name: 'LG OLED evo C3 65" 4K Cinema',
      slug: 'lg-oled-c3-65',
      releaseYear: 2023,
      imageUrl: '/uploads/brands/lg.png',
      basePrice: 92000,
      variants: [
        { capacity: '65-inch OLED evo 120Hz', priceModifier: 0 },
      ],
    },
    {
      brandId: lg._id,
      name: 'LG OLED B3 55" 4K Smart TV',
      slug: 'lg-oled-b3-55',
      releaseYear: 2023,
      imageUrl: '/uploads/brands/lg.png',
      basePrice: 62000,
      variants: [
        { capacity: '55-inch OLED 120Hz', priceModifier: 0 },
      ],
    },
    {
      brandId: lg._id,
      name: 'LG UHD AI ThinQ 43" 4K (UR7500)',
      slug: 'lg-uhd-thinq-43',
      releaseYear: 2023,
      imageUrl: '/uploads/brands/lg.png',
      basePrice: 26000,
      variants: [
        { capacity: '43-inch 4K webOS', priceModifier: 0 },
      ],
    },

    // SMART TVS - Xiaomi
    {
      brandId: xiaomi._id,
      name: 'Xiaomi Smart TV X Pro 55" 4K Dolby Vision',
      slug: 'xiaomi-tv-x-pro-55',
      releaseYear: 2023,
      imageUrl: '/uploads/brands/xiaomi.png',
      basePrice: 32000,
      variants: [
        { capacity: '55-inch 4K Dolby Vision IQ', priceModifier: 0 },
      ],
    },
    {
      brandId: xiaomi._id,
      name: 'Xiaomi Smart TV X 43" 4K',
      slug: 'xiaomi-tv-x-43',
      releaseYear: 2023,
      imageUrl: '/uploads/brands/xiaomi.png',
      basePrice: 22000,
      variants: [
        { capacity: '43-inch 4K HDR10', priceModifier: 0 },
      ],
    },

    // SMART TVS - TCL
    {
      brandId: tcl._id,
      name: 'TCL 55" Mini-LED 4K Google TV (C755)',
      slug: 'tcl-55-mini-led',
      releaseYear: 2023,
      imageUrl: '/uploads/brands/tcl.png',
      basePrice: 36000,
      variants: [
        { capacity: '55-inch 144Hz VRR Mini-LED', priceModifier: 0 },
      ],
    },
    {
      brandId: tcl._id,
      name: 'TCL 43" Metallic Bezel-less 4K (43V6B)',
      slug: 'tcl-43-metallic-4k',
      releaseYear: 2023,
      imageUrl: '/uploads/brands/tcl.png',
      basePrice: 19000,
      variants: [
        { capacity: '43-inch 4K Google TV', priceModifier: 0 },
      ],
    },
  ];

  let sampleModelForRequest: any = null;
  let sampleVariantForRequest: any = null;

  for (const mData of modelsData) {
    const model = await SmartphoneModel.create({
      brandId: mData.brandId,
      name: mData.name,
      slug: mData.slug,
      releaseYear: mData.releaseYear,
      imageUrl: mData.imageUrl,
      basePrice: mData.basePrice,
      isPublished: true,
      isArchived: false,
    });

    if (!sampleModelForRequest) sampleModelForRequest = model;

    for (const vData of mData.variants) {
      const variant = await StorageVariantModel.create({
        modelId: model._id,
        capacity: vData.capacity,
        priceModifier: vData.priceModifier,
        isPublished: true,
      });

      if (!sampleVariantForRequest) sampleVariantForRequest = variant;

      // Pricing rule for this variant
      await PricingRuleModel.create({
        modelId: model._id,
        variantId: variant._id,
        basePrice: model.basePrice,
        storagePriceAdjustment: vData.priceModifier,
        version: 1,
        isActive: true,
      });
    }
  }

  console.log('[Seeder] Created models, storage variants, and pricing rules.');

  // 5. Seed sample Customer User
  const sampleCustomer = await UserModel.create({
    phone: '+919876543210',
    email: 'customer@example.com',
    fullName: 'Vikram Malhotra',
    isVerified: true,
    status: UserStatus.ACTIVE,
    address: {
      street: '42, Brigade Road, Ashok Nagar',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560025',
      landmark: 'Opposite Metro Station',
    },
  });

  // 6. Seed sample Buyback Requests in different stages
  const sampleRequests = [
    {
      requestNumber: 'GENIE-2026-1001',
      status: RequestStatus.SUBMITTED,
      declaredCondition: {
        displayCondition: 'FLAWLESS',
        bodyCondition: 'MINOR_SIGNS_OF_USE',
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
      },
      estimateAmount: 85500,
    },
    {
      requestNumber: 'GENIE-2026-1002',
      status: RequestStatus.ASSIGNED_FOR_COLLECTION,
      declaredCondition: {
        displayCondition: 'MINOR_SCRATCHES',
        bodyCondition: 'DENTED_OR_SCRATCHED',
        batteryHealth: 'GOOD',
        functionalFaults: {
          frontCameraFaulty: false,
          backCameraFaulty: false,
          faceIdOrFingerprintFaulty: false,
          speakerOrMicFaulty: false,
          chargingPortFaulty: false,
          wirelessOrBluetoothFaulty: false,
        },
        hasOriginalBox: true,
        hasOriginalCharger: false,
      },
      estimateAmount: 68500,
    },
    {
      requestNumber: 'GENIE-2026-1003',
      status: RequestStatus.UNDER_INSPECTION,
      declaredCondition: {
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
      },
      estimateAmount: 43000,
    },
    {
      requestNumber: 'GENIE-2026-1004',
      status: RequestStatus.AWAITING_CUSTOMER_DECISION,
      declaredCondition: {
        displayCondition: 'MINOR_SCRATCHES',
        bodyCondition: 'MINOR_SIGNS_OF_USE',
        batteryHealth: 'GOOD',
        functionalFaults: {
          frontCameraFaulty: false,
          backCameraFaulty: false,
          faceIdOrFingerprintFaulty: false,
          speakerOrMicFaulty: false,
          chargingPortFaulty: false,
          wirelessOrBluetoothFaulty: false,
        },
        hasOriginalBox: false,
        hasOriginalCharger: false,
      },
      estimateAmount: 76000,
    },
    {
      requestNumber: 'GENIE-2026-1005',
      status: RequestStatus.PAYMENT_COMPLETED,
      declaredCondition: {
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
      },
      estimateAmount: 85500,
    },
  ];

  for (const sReq of sampleRequests) {
    const buybackReq = await BuybackRequestModel.create({
      requestNumber: sReq.requestNumber,
      userId: sampleCustomer._id,
      customerDetails: {
        fullName: sampleCustomer.fullName || 'Vikram Malhotra',
        phone: sampleCustomer.phone || '+919876543210',
        email: sampleCustomer.email,
      },
      deviceDetails: {
        brandId: apple._id,
        brandName: 'Apple',
        modelId: sampleModelForRequest._id,
        modelName: sampleModelForRequest.name,
        variantId: sampleVariantForRequest._id,
        storageCapacity: '256GB',
        imeiOrSerial: '358921098471924',
      },
      declaredCondition: sReq.declaredCondition,
      indicativeEstimate: {
        basePrice: 85000,
        storageAdjustment: 0,
        totalDeductions: 0,
        totalBonuses: 500,
        estimatedAmount: sReq.estimateAmount,
        pricingRuleVersion: 1,
        breakdown: [
          { component: 'Base Price', description: 'Base valuation', adjustment: 85000 },
          { component: 'Original Box', description: 'Included authentic box', adjustment: 500 },
        ],
      },
      photoUrls: [
        'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=600',
        'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=600',
      ],
      pickupAddress: sampleCustomer.address!,
      status: sReq.status,
      timeline: [
        {
          status: RequestStatus.SUBMITTED,
          timestamp: new Date(Date.now() - 48 * 3600 * 1000),
          note: 'Request submitted online.',
          updatedBy: 'Customer',
        },
      ],
    });

    // If awaiting customer decision or completed, attach Inspection & Final Offer
    if (sReq.status === RequestStatus.AWAITING_CUSTOMER_DECISION || sReq.status === RequestStatus.PAYMENT_COMPLETED) {
      const inspection = await InspectionModel.create({
        requestId: buybackReq._id,
        inspectorId: inspector._id,
        inspectorName: inspector.fullName,
        actualCondition: {
          ...sReq.declaredCondition,
          screenFunctional: true,
          touchFunctional: true,
          camerasFunctional: true,
          biometricsFunctional: true,
        },
        discrepancies: ['Light scratch on upper bezel detected during microscopic examination.'],
        suggestedOfferAmount: sReq.estimateAmount - 2000,
        customerVisibleNotes: 'Device passed all hardware diagnostics. Minor cosmetic hairline scratch on upper bezel.',
        completedAt: new Date(),
      });

      const finalOffer = await FinalOfferModel.create({
        requestId: buybackReq._id,
        inspectionId: inspection._id,
        offerVersion: 1,
        originalEstimatedAmount: sReq.estimateAmount,
        finalOfferedAmount: sReq.estimateAmount - 2000,
        valuationExplanation: 'Minor bezel hairline scratch deducted as per pricing schedule. All functional systems verified.',
        issuedByAdminId: superAdmin._id,
        issuedByAdminName: superAdmin.fullName,
        status: sReq.status === RequestStatus.PAYMENT_COMPLETED ? FinalOfferStatus.ACCEPTED : FinalOfferStatus.ISSUED,
        validUntil: new Date(Date.now() + 7 * 24 * 3600 * 1000),
      });

      buybackReq.inspectionId = inspection._id as any;
      buybackReq.activeOfferId = finalOffer._id as any;

      if (sReq.status === RequestStatus.PAYMENT_COMPLETED) {
        const payment = await PaymentModel.create({
          requestId: buybackReq._id,
          offerId: finalOffer._id,
          amount: finalOffer.finalOfferedAmount,
          paymentMethod: PaymentMethod.UPI,
          paymentReference: 'UPI/2026/8947289172',
          status: PaymentStatus.COMPLETED,
          recordedByAdminId: superAdmin._id,
          recordedByAdminName: superAdmin.fullName,
          paidAt: new Date(),
        });
        buybackReq.paymentId = payment._id as any;
      }

      await buybackReq.save();
    }
  }

  console.log('[Seeder] Seeded sample customer buyback requests across workflow stages.');
  console.log('[Seeder] Seeding completed successfully!');
}

if (process.argv[1] && (process.argv[1].endsWith('seed.ts') || process.argv[1].endsWith('seed.js') || process.argv[1].includes('seed'))) {
  (async () => {
    try {
      await connectDatabase();
      await seedDatabase();
      await disconnectDatabase();
      process.exit(0);
    } catch (err) {
      console.error('[Seeder Error]', err);
      process.exit(1);
    }
  })();
}

