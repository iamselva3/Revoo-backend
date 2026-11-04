"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedDatabase = seedDatabase;
const connection_js_1 = require("../connection.js");
const AdminUser_js_1 = require("../models/AdminUser.js");
const Brand_js_1 = require("../models/Brand.js");
const SmartphoneModel_js_1 = require("../models/SmartphoneModel.js");
const StorageVariant_js_1 = require("../models/StorageVariant.js");
const PricingRule_js_1 = require("../models/PricingRule.js");
const BuybackRequest_js_1 = require("../models/BuybackRequest.js");
const Inspection_js_1 = require("../models/Inspection.js");
const FinalOffer_js_1 = require("../models/FinalOffer.js");
const Payment_js_1 = require("../models/Payment.js");
const User_js_1 = require("../models/User.js");
const tokenService_js_1 = require("../../security/tokenService.js");
const types_js_1 = require("../../../shared/types.js");
async function seedDatabase() {
    console.log('[Seeder] Starting REVOO database seeding...');
    // 1. Clear existing collections
    await Promise.all([
        AdminUser_js_1.AdminUserModel.deleteMany({}),
        Brand_js_1.BrandModel.deleteMany({}),
        SmartphoneModel_js_1.SmartphoneModel.deleteMany({}),
        StorageVariant_js_1.StorageVariantModel.deleteMany({}),
        PricingRule_js_1.PricingRuleModel.deleteMany({}),
        BuybackRequest_js_1.BuybackRequestModel.deleteMany({}),
        Inspection_js_1.InspectionModel.deleteMany({}),
        FinalOffer_js_1.FinalOfferModel.deleteMany({}),
        Payment_js_1.PaymentModel.deleteMany({}),
        User_js_1.UserModel.deleteMany({}),
    ]);
    // 2. Admin Users
    const superAdminPassword = await tokenService_js_1.TokenService.hashPassword('RevooAdmin@2026!');
    const inspectorPassword = await tokenService_js_1.TokenService.hashPassword('Inspector@2026!');
    const operationsPassword = await tokenService_js_1.TokenService.hashPassword('Operations@2026!');
    const superAdmin = await AdminUser_js_1.AdminUserModel.create({
        email: 'admin@revoo.com',
        fullName: 'Rajesh Sharma (Super Admin)',
        passwordHash: superAdminPassword,
        role: types_js_1.AdminRole.SUPER_ADMIN,
        isActive: true,
    });
    const inspector = await AdminUser_js_1.AdminUserModel.create({
        email: 'inspector@revoo.com',
        fullName: 'Amit Verma (Chief Inspector)',
        passwordHash: inspectorPassword,
        role: types_js_1.AdminRole.INSPECTOR,
        isActive: true,
    });
    const operations = await AdminUser_js_1.AdminUserModel.create({
        email: 'operations@revoo.com',
        fullName: 'Pooja Nair (Logistics Lead)',
        passwordHash: operationsPassword,
        role: types_js_1.AdminRole.OPERATIONS,
        isActive: true,
    });
    console.log('[Seeder] Created default Admin, Inspector, and Operations accounts.');
    // 3. Brands (All 10 requested brands with verified Cloudflare R2 vector-rendered PNG logos)
    const apple = await Brand_js_1.BrandModel.create({
        name: 'Apple',
        slug: 'apple',
        logoUrl: 'https://pub-ebb60884050ceb5a3565e132a7ef9394.r2.dev/revoo/uploads/brands/apple.png',
        displayOrder: 1,
        isActive: true,
    });
    const samsung = await Brand_js_1.BrandModel.create({
        name: 'Samsung',
        slug: 'samsung',
        logoUrl: 'https://pub-ebb60884050ceb5a3565e132a7ef9394.r2.dev/revoo/uploads/brands/samsung.png',
        displayOrder: 2,
        isActive: true,
    });
    const oneplus = await Brand_js_1.BrandModel.create({
        name: 'OnePlus',
        slug: 'oneplus',
        logoUrl: 'https://pub-ebb60884050ceb5a3565e132a7ef9394.r2.dev/revoo/uploads/brands/oneplus.png',
        displayOrder: 3,
        isActive: true,
    });
    const google = await Brand_js_1.BrandModel.create({
        name: 'Google',
        slug: 'google',
        logoUrl: 'https://pub-ebb60884050ceb5a3565e132a7ef9394.r2.dev/revoo/uploads/brands/google.png',
        displayOrder: 4,
        isActive: true,
    });
    const vivo = await Brand_js_1.BrandModel.create({
        name: 'Vivo',
        slug: 'vivo',
        logoUrl: 'https://pub-ebb60884050ceb5a3565e132a7ef9394.r2.dev/revoo/uploads/brands/vivo.png',
        displayOrder: 5,
        isActive: true,
    });
    const oppo = await Brand_js_1.BrandModel.create({
        name: 'Oppo',
        slug: 'oppo',
        logoUrl: 'https://pub-ebb60884050ceb5a3565e132a7ef9394.r2.dev/revoo/uploads/brands/oppo.png',
        displayOrder: 6,
        isActive: true,
    });
    const nothing = await Brand_js_1.BrandModel.create({
        name: 'Nothing',
        slug: 'nothing',
        logoUrl: 'https://pub-ebb60884050ceb5a3565e132a7ef9394.r2.dev/revoo/uploads/brands/nothing.png',
        displayOrder: 7,
        isActive: true,
    });
    const redmi = await Brand_js_1.BrandModel.create({
        name: 'Redmi',
        slug: 'redmi',
        logoUrl: 'https://pub-ebb60884050ceb5a3565e132a7ef9394.r2.dev/revoo/uploads/brands/redmi.png',
        displayOrder: 8,
        isActive: true,
    });
    const realme = await Brand_js_1.BrandModel.create({
        name: 'Realme',
        slug: 'realme',
        logoUrl: 'https://pub-ebb60884050ceb5a3565e132a7ef9394.r2.dev/revoo/uploads/brands/realme.png',
        displayOrder: 9,
        isActive: true,
    });
    const iqoo = await Brand_js_1.BrandModel.create({
        name: 'iQOO',
        slug: 'iqoo',
        logoUrl: 'https://pub-ebb60884050ceb5a3565e132a7ef9394.r2.dev/revoo/uploads/brands/iqoo.png',
        displayOrder: 10,
        isActive: true,
    });
    console.log('[Seeder] Seeded all 10 brands with Cloudflare R2 assets: Apple, Samsung, OnePlus, Google, Vivo, Oppo, Nothing, Redmi, Realme, iQOO.');
    // 4. Smartphone Models & Storage Variants
    const modelsData = [
        // Apple
        {
            brandId: apple._id,
            name: 'iPhone 15 Pro Max',
            slug: 'iphone-15-pro-max',
            releaseYear: 2023,
            imageUrl: 'https://pub-ebb60884050ceb5a3565e132a7ef9394.r2.dev/revoo/uploads/devices/iphone-15-pro-max.png',
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
            imageUrl: 'https://pub-ebb60884050ceb5a3565e132a7ef9394.r2.dev/revoo/uploads/devices/iphone-15-pro.png',
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
            imageUrl: 'https://pub-ebb60884050ceb5a3565e132a7ef9394.r2.dev/revoo/uploads/devices/iphone-15.png',
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
            imageUrl: 'https://pub-ebb60884050ceb5a3565e132a7ef9394.r2.dev/revoo/uploads/devices/iphone-14-pro.png',
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
            imageUrl: 'https://pub-ebb60884050ceb5a3565e132a7ef9394.r2.dev/revoo/uploads/devices/iphone-14.png',
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
            imageUrl: 'https://pub-ebb60884050ceb5a3565e132a7ef9394.r2.dev/revoo/uploads/devices/iphone-13.png',
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
            imageUrl: 'https://pub-ebb60884050ceb5a3565e132a7ef9394.r2.dev/revoo/uploads/devices/galaxy-s24-ultra.png',
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
            imageUrl: 'https://pub-ebb60884050ceb5a3565e132a7ef9394.r2.dev/revoo/uploads/devices/galaxy-s24-plus.png',
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
            imageUrl: 'https://pub-ebb60884050ceb5a3565e132a7ef9394.r2.dev/revoo/uploads/devices/galaxy-s24.png',
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
            imageUrl: 'https://pub-ebb60884050ceb5a3565e132a7ef9394.r2.dev/revoo/uploads/devices/galaxy-s23-ultra.png',
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
            imageUrl: 'https://pub-ebb60884050ceb5a3565e132a7ef9394.r2.dev/revoo/uploads/devices/galaxy-z-fold-5.png',
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
            imageUrl: 'https://pub-ebb60884050ceb5a3565e132a7ef9394.r2.dev/revoo/uploads/devices/galaxy-z-flip-5.png',
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
            imageUrl: 'https://pub-ebb60884050ceb5a3565e132a7ef9394.r2.dev/revoo/uploads/devices/vivo-x100-pro.png',
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
            imageUrl: 'https://pub-ebb60884050ceb5a3565e132a7ef9394.r2.dev/revoo/uploads/devices/vivo-v30-pro.png',
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
            imageUrl: 'https://pub-ebb60884050ceb5a3565e132a7ef9394.r2.dev/revoo/uploads/devices/vivo-v29-5g.png',
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
            imageUrl: 'https://pub-ebb60884050ceb5a3565e132a7ef9394.r2.dev/revoo/uploads/devices/vivo-t3-5g.png',
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
            imageUrl: 'https://pub-ebb60884050ceb5a3565e132a7ef9394.r2.dev/revoo/uploads/devices/oppo-find-x7-ultra.png',
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
            imageUrl: 'https://pub-ebb60884050ceb5a3565e132a7ef9394.r2.dev/revoo/uploads/devices/oppo-reno-11-pro.png',
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
            imageUrl: 'https://pub-ebb60884050ceb5a3565e132a7ef9394.r2.dev/revoo/uploads/devices/oppo-f25-pro-5g.png',
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
            imageUrl: 'https://pub-ebb60884050ceb5a3565e132a7ef9394.r2.dev/revoo/uploads/devices/nothing-phone-2.png',
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
            imageUrl: 'https://pub-ebb60884050ceb5a3565e132a7ef9394.r2.dev/revoo/uploads/devices/nothing-phone-2a.png',
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
            imageUrl: 'https://pub-ebb60884050ceb5a3565e132a7ef9394.r2.dev/revoo/uploads/devices/nothing-phone-1.png',
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
            imageUrl: 'https://pub-ebb60884050ceb5a3565e132a7ef9394.r2.dev/revoo/uploads/devices/redmi-note-13-pro-plus.png',
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
            imageUrl: 'https://pub-ebb60884050ceb5a3565e132a7ef9394.r2.dev/revoo/uploads/devices/redmi-note-13-pro.png',
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
            imageUrl: 'https://pub-ebb60884050ceb5a3565e132a7ef9394.r2.dev/revoo/uploads/devices/redmi-13c-5g.png',
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
            imageUrl: 'https://pub-ebb60884050ceb5a3565e132a7ef9394.r2.dev/revoo/uploads/devices/realme-12-pro-plus.png',
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
            imageUrl: 'https://pub-ebb60884050ceb5a3565e132a7ef9394.r2.dev/revoo/uploads/devices/realme-gt-6t.png',
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
            imageUrl: 'https://pub-ebb60884050ceb5a3565e132a7ef9394.r2.dev/revoo/uploads/devices/realme-narzo-70-pro.png',
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
            imageUrl: 'https://pub-ebb60884050ceb5a3565e132a7ef9394.r2.dev/revoo/uploads/devices/iqoo-12-5g.png',
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
            imageUrl: 'https://pub-ebb60884050ceb5a3565e132a7ef9394.r2.dev/revoo/uploads/devices/iqoo-neo-9-pro.png',
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
            imageUrl: 'https://pub-ebb60884050ceb5a3565e132a7ef9394.r2.dev/revoo/uploads/devices/iqoo-z9-5g.png',
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
            imageUrl: 'https://pub-ebb60884050ceb5a3565e132a7ef9394.r2.dev/revoo/uploads/devices/oneplus-12.png',
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
            imageUrl: 'https://pub-ebb60884050ceb5a3565e132a7ef9394.r2.dev/revoo/uploads/devices/oneplus-12r.png',
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
            imageUrl: 'https://pub-ebb60884050ceb5a3565e132a7ef9394.r2.dev/revoo/uploads/devices/oneplus-nord-4.png',
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
            imageUrl: 'https://pub-ebb60884050ceb5a3565e132a7ef9394.r2.dev/revoo/uploads/devices/pixel-8-pro.png',
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
            imageUrl: 'https://pub-ebb60884050ceb5a3565e132a7ef9394.r2.dev/revoo/uploads/devices/pixel-8.png',
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
            imageUrl: 'https://pub-ebb60884050ceb5a3565e132a7ef9394.r2.dev/revoo/uploads/devices/pixel-7a.png',
            basePrice: 26000,
            variants: [
                { capacity: '128GB', priceModifier: 0 },
            ],
        },
    ];
    let sampleModelForRequest = null;
    let sampleVariantForRequest = null;
    for (const mData of modelsData) {
        const model = await SmartphoneModel_js_1.SmartphoneModel.create({
            brandId: mData.brandId,
            name: mData.name,
            slug: mData.slug,
            releaseYear: mData.releaseYear,
            imageUrl: mData.imageUrl,
            basePrice: mData.basePrice,
            isPublished: true,
            isArchived: false,
        });
        if (!sampleModelForRequest)
            sampleModelForRequest = model;
        for (const vData of mData.variants) {
            const variant = await StorageVariant_js_1.StorageVariantModel.create({
                modelId: model._id,
                capacity: vData.capacity,
                priceModifier: vData.priceModifier,
                isPublished: true,
            });
            if (!sampleVariantForRequest)
                sampleVariantForRequest = variant;
            // Pricing rule for this variant
            await PricingRule_js_1.PricingRuleModel.create({
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
    const sampleCustomer = await User_js_1.UserModel.create({
        phone: '+919876543210',
        email: 'customer@example.com',
        fullName: 'Vikram Malhotra',
        isVerified: true,
        status: types_js_1.UserStatus.ACTIVE,
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
            requestNumber: 'REV-2026-1001',
            status: types_js_1.RequestStatus.SUBMITTED,
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
            requestNumber: 'REV-2026-1002',
            status: types_js_1.RequestStatus.ASSIGNED_FOR_COLLECTION,
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
            requestNumber: 'REV-2026-1003',
            status: types_js_1.RequestStatus.UNDER_INSPECTION,
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
            requestNumber: 'REV-2026-1004',
            status: types_js_1.RequestStatus.AWAITING_CUSTOMER_DECISION,
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
            requestNumber: 'REV-2026-1005',
            status: types_js_1.RequestStatus.PAYMENT_COMPLETED,
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
        const buybackReq = await BuybackRequest_js_1.BuybackRequestModel.create({
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
            pickupAddress: sampleCustomer.address,
            status: sReq.status,
            timeline: [
                {
                    status: types_js_1.RequestStatus.SUBMITTED,
                    timestamp: new Date(Date.now() - 48 * 3600 * 1000),
                    note: 'Request submitted online.',
                    updatedBy: 'Customer',
                },
            ],
        });
        // If awaiting customer decision or completed, attach Inspection & Final Offer
        if (sReq.status === types_js_1.RequestStatus.AWAITING_CUSTOMER_DECISION || sReq.status === types_js_1.RequestStatus.PAYMENT_COMPLETED) {
            const inspection = await Inspection_js_1.InspectionModel.create({
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
            const finalOffer = await FinalOffer_js_1.FinalOfferModel.create({
                requestId: buybackReq._id,
                inspectionId: inspection._id,
                offerVersion: 1,
                originalEstimatedAmount: sReq.estimateAmount,
                finalOfferedAmount: sReq.estimateAmount - 2000,
                valuationExplanation: 'Minor bezel hairline scratch deducted as per pricing schedule. All functional systems verified.',
                issuedByAdminId: superAdmin._id,
                issuedByAdminName: superAdmin.fullName,
                status: sReq.status === types_js_1.RequestStatus.PAYMENT_COMPLETED ? types_js_1.FinalOfferStatus.ACCEPTED : types_js_1.FinalOfferStatus.ISSUED,
                validUntil: new Date(Date.now() + 7 * 24 * 3600 * 1000),
            });
            buybackReq.inspectionId = inspection._id;
            buybackReq.activeOfferId = finalOffer._id;
            if (sReq.status === types_js_1.RequestStatus.PAYMENT_COMPLETED) {
                const payment = await Payment_js_1.PaymentModel.create({
                    requestId: buybackReq._id,
                    offerId: finalOffer._id,
                    amount: finalOffer.finalOfferedAmount,
                    paymentMethod: types_js_1.PaymentMethod.UPI,
                    paymentReference: 'UPI/2026/8947289172',
                    status: types_js_1.PaymentStatus.COMPLETED,
                    recordedByAdminId: superAdmin._id,
                    recordedByAdminName: superAdmin.fullName,
                    paidAt: new Date(),
                });
                buybackReq.paymentId = payment._id;
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
            await (0, connection_js_1.connectDatabase)();
            await seedDatabase();
            await (0, connection_js_1.disconnectDatabase)();
            process.exit(0);
        }
        catch (err) {
            console.error('[Seeder Error]', err);
            process.exit(1);
        }
    })();
}
//# sourceMappingURL=seed.js.map