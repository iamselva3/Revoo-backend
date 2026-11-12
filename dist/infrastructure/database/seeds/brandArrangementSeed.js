"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NEW_MODELS_DATA = exports.EXACT_22_BRANDS = void 0;
exports.seedBrandArrangementIfNeeded = seedBrandArrangementIfNeeded;
const Brand_js_1 = require("../models/Brand.js");
const SmartphoneModel_js_1 = require("../models/SmartphoneModel.js");
const StorageVariant_js_1 = require("../models/StorageVariant.js");
const PricingRule_js_1 = require("../models/PricingRule.js");
exports.EXACT_22_BRANDS = [
    { name: 'Apple', slug: 'apple', logoUrl: '/uploads/brands/apple.png', displayOrder: 1 },
    { name: 'Samsung', slug: 'samsung', logoUrl: '/uploads/brands/samsung.png', displayOrder: 2 },
    { name: 'OnePlus', slug: 'oneplus', logoUrl: '/uploads/brands/oneplus.png', displayOrder: 3 },
    { name: 'Google', slug: 'google', logoUrl: '/uploads/brands/google.png', displayOrder: 4 },
    { name: 'Oppo', slug: 'oppo', logoUrl: '/uploads/brands/oppo.png', displayOrder: 5 },
    { name: 'Vivo', slug: 'vivo', logoUrl: '/uploads/brands/vivo.png', displayOrder: 6 },
    { name: 'Xiaomi', slug: 'xiaomi', logoUrl: '/uploads/brands/xiaomi.png', displayOrder: 7 },
    { name: 'Motorola', slug: 'motorola', logoUrl: '/uploads/brands/motorola.png', displayOrder: 8 },
    { name: 'Realme', slug: 'realme', logoUrl: '/uploads/brands/realme.png', displayOrder: 9 },
    { name: 'POCO', slug: 'poco', logoUrl: '/uploads/brands/poco.png', displayOrder: 10 },
    { name: 'iQOO', slug: 'iqoo', logoUrl: '/uploads/brands/iqoo.png', displayOrder: 11 },
    { name: 'Nothing', slug: 'nothing', logoUrl: '/uploads/brands/nothing.png', displayOrder: 12 },
    { name: 'Infinix', slug: 'infinix', logoUrl: '/uploads/brands/infinix.png', displayOrder: 13 },
    { name: 'Tecno', slug: 'tecno', logoUrl: '/uploads/brands/tecno.png', displayOrder: 14 },
    { name: 'Nokia', slug: 'nokia', logoUrl: '/uploads/brands/nokia.png', displayOrder: 15 },
    { name: 'Lava', slug: 'lava', logoUrl: '/uploads/brands/lava.png', displayOrder: 16 },
    { name: 'Honor', slug: 'honor', logoUrl: '/uploads/brands/honor.png', displayOrder: 17 },
    { name: 'Huawei', slug: 'huawei', logoUrl: '/uploads/brands/huawei.png', displayOrder: 18 },
    { name: 'LG', slug: 'lg', logoUrl: '/uploads/brands/lg.png', displayOrder: 19 },
    { name: 'Nubia', slug: 'nubia', logoUrl: '/uploads/brands/nubia.png', displayOrder: 20 },
    { name: 'Asus', slug: 'asus', logoUrl: '/uploads/brands/asus.png', displayOrder: 21 },
    { name: 'CMF', slug: 'cmf', logoUrl: '/uploads/brands/cmf.png', displayOrder: 22 },
];
exports.NEW_MODELS_DATA = [
    // Infinix
    {
        brandSlug: 'infinix',
        name: 'Infinix GT 20 Pro 5G',
        slug: 'infinix-gt-20-pro-5g',
        releaseYear: 2024,
        imageUrl: '/uploads/brands/infinix.png',
        basePrice: 21999,
        variants: [
            { capacity: '8GB/256GB', priceModifier: 0 },
            { capacity: '12GB/256GB', priceModifier: 3000 },
        ],
    },
    {
        brandSlug: 'infinix',
        name: 'Infinix Note 40 Pro+ 5G',
        slug: 'infinix-note-40-pro-plus-5g',
        releaseYear: 2024,
        imageUrl: '/uploads/brands/infinix.png',
        basePrice: 20999,
        variants: [{ capacity: '12GB/256GB', priceModifier: 0 }],
    },
    {
        brandSlug: 'infinix',
        name: 'Infinix Note 40 Pro 5G',
        slug: 'infinix-note-40-pro-5g',
        releaseYear: 2024,
        imageUrl: '/uploads/brands/infinix.png',
        basePrice: 18999,
        variants: [{ capacity: '8GB/256GB', priceModifier: 0 }],
    },
    {
        brandSlug: 'infinix',
        name: 'Infinix Zero 30 5G',
        slug: 'infinix-zero-30-5g',
        releaseYear: 2023,
        imageUrl: '/uploads/brands/infinix.png',
        basePrice: 19999,
        variants: [
            { capacity: '8GB/256GB', priceModifier: 0 },
            { capacity: '12GB/256GB', priceModifier: 3000 },
        ],
    },
    {
        brandSlug: 'infinix',
        name: 'Infinix Hot 40i',
        slug: 'infinix-hot-40i',
        releaseYear: 2024,
        imageUrl: '/uploads/brands/infinix.png',
        basePrice: 9999,
        variants: [
            { capacity: '8GB/128GB', priceModifier: 0 },
            { capacity: '8GB/256GB', priceModifier: 2000 },
        ],
    },
    {
        brandSlug: 'infinix',
        name: 'Infinix Smart 8 HD',
        slug: 'infinix-smart-8-hd',
        releaseYear: 2023,
        imageUrl: '/uploads/brands/infinix.png',
        basePrice: 6299,
        variants: [
            { capacity: '3GB/64GB', priceModifier: 0 },
            { capacity: '4GB/64GB', priceModifier: 1200 },
        ],
    },
    // Tecno
    {
        brandSlug: 'tecno',
        name: 'Tecno Phantom V Fold 5G',
        slug: 'tecno-phantom-v-fold-5g',
        releaseYear: 2023,
        imageUrl: '/uploads/brands/tecno.png',
        basePrice: 64999,
        variants: [
            { capacity: '12GB/256GB', priceModifier: 0 },
            { capacity: '12GB/512GB', priceModifier: 10000 },
        ],
    },
    {
        brandSlug: 'tecno',
        name: 'Tecno Phantom V Flip 5G',
        slug: 'tecno-phantom-v-flip-5g',
        releaseYear: 2023,
        imageUrl: '/uploads/brands/tecno.png',
        basePrice: 39999,
        variants: [{ capacity: '8GB/256GB', priceModifier: 0 }],
    },
    {
        brandSlug: 'tecno',
        name: 'Tecno Camon 30 Premier 5G',
        slug: 'tecno-camon-30-premier-5g',
        releaseYear: 2024,
        imageUrl: '/uploads/brands/tecno.png',
        basePrice: 34999,
        variants: [{ capacity: '12GB/512GB', priceModifier: 0 }],
    },
    {
        brandSlug: 'tecno',
        name: 'Tecno Camon 30 Pro 5G',
        slug: 'tecno-camon-30-pro-5g',
        releaseYear: 2024,
        imageUrl: '/uploads/brands/tecno.png',
        basePrice: 22999,
        variants: [
            { capacity: '8GB/256GB', priceModifier: 0 },
            { capacity: '12GB/512GB', priceModifier: 3000 },
        ],
    },
    {
        brandSlug: 'tecno',
        name: 'Tecno Pova 6 Pro 5G',
        slug: 'tecno-pova-6-pro-5g',
        releaseYear: 2024,
        imageUrl: '/uploads/brands/tecno.png',
        basePrice: 17999,
        variants: [
            { capacity: '8GB/128GB', priceModifier: 0 },
            { capacity: '12GB/256GB', priceModifier: 2000 },
        ],
    },
    {
        brandSlug: 'tecno',
        name: 'Tecno Spark 20 Pro+',
        slug: 'tecno-spark-20-pro-plus',
        releaseYear: 2024,
        imageUrl: '/uploads/brands/tecno.png',
        basePrice: 14999,
        variants: [{ capacity: '8GB/256GB', priceModifier: 0 }],
    },
    // Nokia
    {
        brandSlug: 'nokia',
        name: 'Nokia XR21 5G Rugged',
        slug: 'nokia-xr21-5g',
        releaseYear: 2023,
        imageUrl: '/uploads/brands/nokia.png',
        basePrice: 26999,
        variants: [{ capacity: '6GB/128GB', priceModifier: 0 }],
    },
    {
        brandSlug: 'nokia',
        name: 'Nokia G42 5G',
        slug: 'nokia-g42-5g',
        releaseYear: 2023,
        imageUrl: '/uploads/brands/nokia.png',
        basePrice: 12999,
        variants: [
            { capacity: '6GB/128GB', priceModifier: 0 },
            { capacity: '8GB/256GB', priceModifier: 2000 },
        ],
    },
    {
        brandSlug: 'nokia',
        name: 'Nokia X30 5G PureView',
        slug: 'nokia-x30-5g',
        releaseYear: 2022,
        imageUrl: '/uploads/brands/nokia.png',
        basePrice: 24999,
        variants: [{ capacity: '8GB/256GB', priceModifier: 0 }],
    },
    {
        brandSlug: 'nokia',
        name: 'Nokia G21',
        slug: 'nokia-g21',
        releaseYear: 2022,
        imageUrl: '/uploads/brands/nokia.png',
        basePrice: 9999,
        variants: [
            { capacity: '4GB/64GB', priceModifier: 0 },
            { capacity: '6GB/128GB', priceModifier: 2000 },
        ],
    },
    {
        brandSlug: 'nokia',
        name: 'Nokia C32',
        slug: 'nokia-c32',
        releaseYear: 2023,
        imageUrl: '/uploads/brands/nokia.png',
        basePrice: 7999,
        variants: [
            { capacity: '4GB/64GB', priceModifier: 0 },
            { capacity: '4GB/128GB', priceModifier: 1000 },
        ],
    },
    // Lava
    {
        brandSlug: 'lava',
        name: 'Lava Agni 3 5G Dual AMOLED',
        slug: 'lava-agni-3-5g',
        releaseYear: 2024,
        imageUrl: '/uploads/brands/lava.png',
        basePrice: 20999,
        variants: [
            { capacity: '8GB/128GB', priceModifier: 0 },
            { capacity: '8GB/256GB', priceModifier: 2000 },
        ],
    },
    {
        brandSlug: 'lava',
        name: 'Lava Agni 2 5G Curved AMOLED',
        slug: 'lava-agni-2-5g',
        releaseYear: 2023,
        imageUrl: '/uploads/brands/lava.png',
        basePrice: 17999,
        variants: [{ capacity: '8GB/256GB', priceModifier: 0 }],
    },
    {
        brandSlug: 'lava',
        name: 'Lava Blaze Curve 5G',
        slug: 'lava-blaze-curve-5g',
        releaseYear: 2024,
        imageUrl: '/uploads/brands/lava.png',
        basePrice: 15999,
        variants: [
            { capacity: '8GB/128GB', priceModifier: 0 },
            { capacity: '8GB/256GB', priceModifier: 2000 },
        ],
    },
    {
        brandSlug: 'lava',
        name: 'Lava Blaze Pro 5G',
        slug: 'lava-blaze-pro-5g',
        releaseYear: 2023,
        imageUrl: '/uploads/brands/lava.png',
        basePrice: 11999,
        variants: [{ capacity: '8GB/128GB', priceModifier: 0 }],
    },
    {
        brandSlug: 'lava',
        name: 'Lava Yuva 3 Pro',
        slug: 'lava-yuva-3-pro',
        releaseYear: 2023,
        imageUrl: '/uploads/brands/lava.png',
        basePrice: 8499,
        variants: [{ capacity: '4GB/128GB', priceModifier: 0 }],
    },
    {
        brandSlug: 'lava',
        name: 'Lava O2',
        slug: 'lava-o2',
        releaseYear: 2024,
        imageUrl: '/uploads/brands/lava.png',
        basePrice: 7999,
        variants: [{ capacity: '8GB/128GB', priceModifier: 0 }],
    },
    // Honor
    {
        brandSlug: 'honor',
        name: 'Honor Magic 6 Pro 5G AI',
        slug: 'honor-magic-6-pro-5g',
        releaseYear: 2024,
        imageUrl: '/uploads/brands/honor.png',
        basePrice: 84999,
        variants: [{ capacity: '12GB/512GB', priceModifier: 0 }],
    },
    {
        brandSlug: 'honor',
        name: 'Honor 200 Pro 5G Studio Portrait',
        slug: 'honor-200-pro-5g',
        releaseYear: 2024,
        imageUrl: '/uploads/brands/honor.png',
        basePrice: 49999,
        variants: [{ capacity: '12GB/512GB', priceModifier: 0 }],
    },
    {
        brandSlug: 'honor',
        name: 'Honor 200 5G',
        slug: 'honor-200-5g',
        releaseYear: 2024,
        imageUrl: '/uploads/brands/honor.png',
        basePrice: 31999,
        variants: [
            { capacity: '8GB/256GB', priceModifier: 0 },
            { capacity: '12GB/512GB', priceModifier: 4000 },
        ],
    },
    {
        brandSlug: 'honor',
        name: 'Honor X9b 5G Ultra-Bounce',
        slug: 'honor-x9b-5g',
        releaseYear: 2024,
        imageUrl: '/uploads/brands/honor.png',
        basePrice: 21999,
        variants: [{ capacity: '8GB/256GB', priceModifier: 0 }],
    },
    {
        brandSlug: 'honor',
        name: 'Honor 90 5G 200MP',
        slug: 'honor-90-5g',
        releaseYear: 2023,
        imageUrl: '/uploads/brands/honor.png',
        basePrice: 25999,
        variants: [
            { capacity: '8GB/256GB', priceModifier: 0 },
            { capacity: '12GB/512GB', priceModifier: 4000 },
        ],
    },
    // Huawei
    {
        brandSlug: 'huawei',
        name: 'Huawei Mate 60 Pro Satellite',
        slug: 'huawei-mate-60-pro',
        releaseYear: 2023,
        imageUrl: '/uploads/brands/huawei.png',
        basePrice: 72999,
        variants: [
            { capacity: '12GB/512GB', priceModifier: 0 },
            { capacity: '12GB/1TB', priceModifier: 10000 },
        ],
    },
    {
        brandSlug: 'huawei',
        name: 'Huawei P60 Pro XMAGE',
        slug: 'huawei-p60-pro',
        releaseYear: 2023,
        imageUrl: '/uploads/brands/huawei.png',
        basePrice: 58999,
        variants: [
            { capacity: '8GB/256GB', priceModifier: 0 },
            { capacity: '12GB/512GB', priceModifier: 8000 },
        ],
    },
    {
        brandSlug: 'huawei',
        name: 'Huawei Nova 11 Pro',
        slug: 'huawei-nova-11-pro',
        releaseYear: 2023,
        imageUrl: '/uploads/brands/huawei.png',
        basePrice: 32999,
        variants: [{ capacity: '8GB/256GB', priceModifier: 0 }],
    },
    {
        brandSlug: 'huawei',
        name: 'Huawei P50 Pro',
        slug: 'huawei-p50-pro',
        releaseYear: 2022,
        imageUrl: '/uploads/brands/huawei.png',
        basePrice: 38999,
        variants: [{ capacity: '8GB/256GB', priceModifier: 0 }],
    },
    {
        brandSlug: 'huawei',
        name: 'Huawei Mate 50 Pro',
        slug: 'huawei-mate-50-pro',
        releaseYear: 2022,
        imageUrl: '/uploads/brands/huawei.png',
        basePrice: 44999,
        variants: [
            { capacity: '8GB/256GB', priceModifier: 0 },
            { capacity: '8GB/512GB', priceModifier: 6000 },
        ],
    },
    // LG
    {
        brandSlug: 'lg',
        name: 'LG Wing 5G Swivel Screen',
        slug: 'lg-wing-5g',
        releaseYear: 2020,
        imageUrl: '/uploads/brands/lg.png',
        basePrice: 24999,
        variants: [
            { capacity: '8GB/128GB', priceModifier: 0 },
            { capacity: '8GB/256GB', priceModifier: 4000 },
        ],
    },
    {
        brandSlug: 'lg',
        name: 'LG Velvet 5G 3D Arc',
        slug: 'lg-velvet-5g',
        releaseYear: 2020,
        imageUrl: '/uploads/brands/lg.png',
        basePrice: 18999,
        variants: [{ capacity: '6GB/128GB', priceModifier: 0 }],
    },
    {
        brandSlug: 'lg',
        name: 'LG G8X ThinQ Dual Screen',
        slug: 'lg-g8x-thinq',
        releaseYear: 2019,
        imageUrl: '/uploads/brands/lg.png',
        basePrice: 16999,
        variants: [{ capacity: '6GB/128GB', priceModifier: 0 }],
    },
    {
        brandSlug: 'lg',
        name: 'LG V60 ThinQ 5G Quad DAC',
        slug: 'lg-v60-thinq',
        releaseYear: 2020,
        imageUrl: '/uploads/brands/lg.png',
        basePrice: 19999,
        variants: [{ capacity: '8GB/128GB', priceModifier: 0 }],
    },
    // Nubia
    {
        brandSlug: 'nubia',
        name: 'Nubia RedMagic 9 Pro 5G Flagship Gaming',
        slug: 'nubia-redmagic-9-pro-5g',
        releaseYear: 2024,
        imageUrl: '/uploads/brands/nubia.png',
        basePrice: 64999,
        variants: [
            { capacity: '12GB/256GB', priceModifier: 0 },
            { capacity: '16GB/512GB', priceModifier: 10000 },
        ],
    },
    {
        brandSlug: 'nubia',
        name: 'Nubia RedMagic 8S Pro 5G',
        slug: 'nubia-redmagic-8s-pro-5g',
        releaseYear: 2023,
        imageUrl: '/uploads/brands/nubia.png',
        basePrice: 49999,
        variants: [{ capacity: '12GB/256GB', priceModifier: 0 }],
    },
    {
        brandSlug: 'nubia',
        name: 'Nubia Z60 Ultra 5G Under-Display Cam',
        slug: 'nubia-z60-ultra-5g',
        releaseYear: 2024,
        imageUrl: '/uploads/brands/nubia.png',
        basePrice: 54999,
        variants: [
            { capacity: '12GB/256GB', priceModifier: 0 },
            { capacity: '16GB/512GB', priceModifier: 8000 },
        ],
    },
    {
        brandSlug: 'nubia',
        name: 'Nubia Focus Pro 5G 108MP',
        slug: 'nubia-focus-pro-5g',
        releaseYear: 2024,
        imageUrl: '/uploads/brands/nubia.png',
        basePrice: 18999,
        variants: [{ capacity: '8GB/256GB', priceModifier: 0 }],
    },
    {
        brandSlug: 'nubia',
        name: 'Nubia Neo 2 5G Gaming Triggers',
        slug: 'nubia-neo-2-5g',
        releaseYear: 2024,
        imageUrl: '/uploads/brands/nubia.png',
        basePrice: 16999,
        variants: [{ capacity: '8GB/256GB', priceModifier: 0 }],
    },
    // Asus (Smartphones)
    {
        brandSlug: 'asus',
        name: 'Asus ROG Phone 8 Pro 5G Anime Vision',
        slug: 'asus-rog-phone-8-pro-5g',
        releaseYear: 2024,
        imageUrl: '/uploads/brands/asus.png',
        basePrice: 89999,
        variants: [
            { capacity: '16GB/512GB', priceModifier: 0 },
            { capacity: '24GB/1TB', priceModifier: 15000 },
        ],
    },
    {
        brandSlug: 'asus',
        name: 'Asus ROG Phone 7 Ultimate',
        slug: 'asus-rog-phone-7-ultimate',
        releaseYear: 2023,
        imageUrl: '/uploads/brands/asus.png',
        basePrice: 69999,
        variants: [{ capacity: '16GB/512GB', priceModifier: 0 }],
    },
    {
        brandSlug: 'asus',
        name: 'Asus ROG Phone 7 5G',
        slug: 'asus-rog-phone-7-5g',
        releaseYear: 2023,
        imageUrl: '/uploads/brands/asus.png',
        basePrice: 54999,
        variants: [{ capacity: '12GB/256GB', priceModifier: 0 }],
    },
    {
        brandSlug: 'asus',
        name: 'Asus Zenfone 10 5G Compact',
        slug: 'asus-zenfone-10-5g',
        releaseYear: 2023,
        imageUrl: '/uploads/brands/asus.png',
        basePrice: 44999,
        variants: [
            { capacity: '8GB/128GB', priceModifier: 0 },
            { capacity: '8GB/256GB', priceModifier: 5000 },
        ],
    },
    {
        brandSlug: 'asus',
        name: 'Asus Zenfone 9 Gimbal Cam',
        slug: 'asus-zenfone-9',
        releaseYear: 2022,
        imageUrl: '/uploads/brands/asus.png',
        basePrice: 34999,
        variants: [{ capacity: '8GB/128GB', priceModifier: 0 }],
    },
    // CMF
    {
        brandSlug: 'cmf',
        name: 'CMF Phone 1 by Nothing',
        slug: 'cmf-phone-1',
        releaseYear: 2024,
        imageUrl: '/uploads/brands/cmf.png',
        basePrice: 14999,
        variants: [
            { capacity: '6GB/128GB', priceModifier: 0 },
            { capacity: '8GB/128GB', priceModifier: 2000 },
        ],
    },
    // Motorola
    {
        brandSlug: 'motorola',
        name: 'Motorola Edge 50 Ultra 5G AI',
        slug: 'motorola-edge-50-ultra',
        releaseYear: 2024,
        imageUrl: '/uploads/brands/motorola.png',
        basePrice: 54999,
        variants: [{ capacity: '12GB/512GB', priceModifier: 0 }],
    },
    {
        brandSlug: 'motorola',
        name: 'Motorola Edge 50 Pro 5G Pantone',
        slug: 'motorola-edge-50-pro',
        releaseYear: 2024,
        imageUrl: '/uploads/brands/motorola.png',
        basePrice: 29999,
        variants: [
            { capacity: '8GB/256GB', priceModifier: 0 },
            { capacity: '12GB/256GB', priceModifier: 4000 },
        ],
    },
    {
        brandSlug: 'motorola',
        name: 'Motorola Edge 50 Fusion 5G',
        slug: 'motorola-edge-50-fusion',
        releaseYear: 2024,
        imageUrl: '/uploads/brands/motorola.png',
        basePrice: 20999,
        variants: [
            { capacity: '8GB/128GB', priceModifier: 0 },
            { capacity: '12GB/256GB', priceModifier: 3000 },
        ],
    },
    {
        brandSlug: 'motorola',
        name: 'Motorola Razr 50 Ultra Flip',
        slug: 'motorola-razr-50-ultra',
        releaseYear: 2024,
        imageUrl: '/uploads/brands/motorola.png',
        basePrice: 89999,
        variants: [{ capacity: '12GB/512GB', priceModifier: 0 }],
    },
    {
        brandSlug: 'motorola',
        name: 'Motorola Moto G85 5G 3D Curved',
        slug: 'motorola-moto-g85-5g',
        releaseYear: 2024,
        imageUrl: '/uploads/brands/motorola.png',
        basePrice: 16999,
        variants: [
            { capacity: '8GB/128GB', priceModifier: 0 },
            { capacity: '12GB/256GB', priceModifier: 2000 },
        ],
    },
    {
        brandSlug: 'motorola',
        name: 'Motorola Moto G54 5G 6000mAh',
        slug: 'motorola-moto-g54-5g',
        releaseYear: 2023,
        imageUrl: '/uploads/brands/motorola.png',
        basePrice: 13999,
        variants: [
            { capacity: '8GB/128GB', priceModifier: 0 },
            { capacity: '12GB/256GB', priceModifier: 2000 },
        ],
    },
    // POCO
    {
        brandSlug: 'poco',
        name: 'POCO F6 Pro 5G Snapdragon 8 Gen 2',
        slug: 'poco-f6-pro-5g',
        releaseYear: 2024,
        imageUrl: '/uploads/brands/poco.png',
        basePrice: 36999,
        variants: [
            { capacity: '12GB/256GB', priceModifier: 0 },
            { capacity: '16GB/512GB', priceModifier: 6000 },
        ],
    },
    {
        brandSlug: 'poco',
        name: 'POCO F6 5G Snapdragon 8s Gen 3',
        slug: 'poco-f6-5g',
        releaseYear: 2024,
        imageUrl: '/uploads/brands/poco.png',
        basePrice: 28999,
        variants: [
            { capacity: '8GB/256GB', priceModifier: 0 },
            { capacity: '12GB/512GB', priceModifier: 4000 },
        ],
    },
    {
        brandSlug: 'poco',
        name: 'POCO X6 Pro 5G Dimensity 8300 Ultra',
        slug: 'poco-x6-pro-5g',
        releaseYear: 2024,
        imageUrl: '/uploads/brands/poco.png',
        basePrice: 23999,
        variants: [
            { capacity: '8GB/256GB', priceModifier: 0 },
            { capacity: '12GB/512GB', priceModifier: 3000 },
        ],
    },
    {
        brandSlug: 'poco',
        name: 'POCO X6 5G 1.5K AMOLED',
        slug: 'poco-x6-5g',
        releaseYear: 2024,
        imageUrl: '/uploads/brands/poco.png',
        basePrice: 18999,
        variants: [
            { capacity: '8GB/256GB', priceModifier: 0 },
            { capacity: '12GB/256GB', priceModifier: 3000 },
        ],
    },
    {
        brandSlug: 'poco',
        name: 'POCO M6 Pro 5G',
        slug: 'poco-m6-pro-5g',
        releaseYear: 2023,
        imageUrl: '/uploads/brands/poco.png',
        basePrice: 10999,
        variants: [
            { capacity: '4GB/128GB', priceModifier: 0 },
            { capacity: '6GB/128GB', priceModifier: 1500 },
        ],
    },
];
/**
 * Ensures the exact 22 brand arrangement from https://genietn.in/sell?category=phone
 * is present and ordered in MongoDB, with any additional brands positioned cleanly at the end.
 * Also seeds comprehensive model lineups and pricing rules for all brands.
 */
async function seedBrandArrangementIfNeeded() {
    try {
        console.log('[Brand Seeder] Verifying 22 phone brand arrangement & catalogue models...');
        const brandMap = new Map();
        // 1. Upsert exact 22 brands with priority display orders 1..22
        for (const bDef of exports.EXACT_22_BRANDS) {
            let brand = await Brand_js_1.BrandModel.findOne({
                $or: [
                    { slug: bDef.slug },
                    { name: new RegExp(`^${bDef.name}$`, 'i') },
                ],
            });
            if (!brand) {
                brand = await Brand_js_1.BrandModel.create({
                    name: bDef.name,
                    slug: bDef.slug,
                    logoUrl: bDef.logoUrl,
                    displayOrder: bDef.displayOrder,
                    isActive: true,
                });
                console.log(`[Brand Seeder] Added new brand: ${bDef.name} (order: ${bDef.displayOrder})`);
            }
            else {
                brand.displayOrder = bDef.displayOrder;
                // Preserve existing brand name and logoUrl - do not modify existing logos
                if (!brand.logoUrl) {
                    brand.logoUrl = bDef.logoUrl;
                }
                brand.isActive = true;
                await brand.save();
            }
            brandMap.set(bDef.slug, brand);
        }
        // 2. Put any extra brands at the end (order 23+) without deleting anything
        const extraBrands = await Brand_js_1.BrandModel.find({
            slug: { $nin: exports.EXACT_22_BRANDS.map((b) => b.slug) },
        }).sort({ displayOrder: 1, name: 1 });
        let nextOrder = 23;
        for (const eb of extraBrands) {
            if (eb.displayOrder < 23) {
                eb.displayOrder = nextOrder++;
                await eb.save();
            }
            else {
                nextOrder = Math.max(nextOrder, eb.displayOrder + 1);
            }
        }
        console.log(`[Brand Seeder] Arranged ${exports.EXACT_22_BRANDS.length} priority brands and ${extraBrands.length} additional brands.`);
        // 3. Ensure models exist for new brands
        for (const mData of exports.NEW_MODELS_DATA) {
            const brand = brandMap.get(mData.brandSlug) || (await Brand_js_1.BrandModel.findOne({ slug: mData.brandSlug }));
            if (!brand)
                continue;
            let model = await SmartphoneModel_js_1.SmartphoneModel.findOne({
                brandId: brand._id,
                $or: [{ slug: mData.slug }, { name: mData.name }],
            });
            if (!model) {
                model = await SmartphoneModel_js_1.SmartphoneModel.create({
                    brandId: brand._id,
                    name: mData.name,
                    slug: mData.slug,
                    releaseYear: mData.releaseYear,
                    imageUrl: mData.imageUrl || brand.logoUrl,
                    basePrice: mData.basePrice,
                    isPublished: true,
                    isArchived: false,
                });
                for (const vData of mData.variants) {
                    const variant = await StorageVariant_js_1.StorageVariantModel.create({
                        modelId: model._id,
                        capacity: vData.capacity,
                        priceModifier: vData.priceModifier,
                        isPublished: true,
                    });
                    await PricingRule_js_1.PricingRuleModel.create({
                        modelId: model._id,
                        variantId: variant._id,
                        basePrice: model.basePrice,
                        storagePriceAdjustment: vData.priceModifier,
                        version: 1,
                        isActive: true,
                    });
                }
                console.log(`[Brand Seeder] Seeded model: ${mData.name} (${brand.name}) with ${mData.variants.length} variants.`);
            }
        }
        console.log('[Brand Seeder] Brand arrangement and catalogue verification completed successfully.');
    }
    catch (err) {
        console.error('[Brand Seeder] Error during brand arrangement seeding:', err);
    }
}
//# sourceMappingURL=brandArrangementSeed.js.map