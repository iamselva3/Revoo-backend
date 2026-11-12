"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.APPLE_37_MODELS = void 0;
exports.seedAppleModelsArrangementIfNeeded = seedAppleModelsArrangementIfNeeded;
const Brand_js_1 = require("../models/Brand.js");
const SmartphoneModel_js_1 = require("../models/SmartphoneModel.js");
const StorageVariant_js_1 = require("../models/StorageVariant.js");
const PricingRule_js_1 = require("../models/PricingRule.js");
exports.APPLE_37_MODELS = [
    { order: 1, name: 'iPhone 18 Pro Max', slug: 'iphone-18-pro-max', releaseYear: 2026, basePrice: 131000, ram: '12GB', storages: ['256GB', '512GB', '1TB', '2TB'] },
    { order: 2, name: 'iPhone 18 Pro', slug: 'iphone-18-pro', releaseYear: 2026, basePrice: 121000, ram: '12GB', storages: ['256GB', '512GB', '1TB', '2TB'] },
    { order: 3, name: 'iPhone 17e', slug: 'iphone-17e', releaseYear: 2025, basePrice: 38000, ram: '8GB', storages: ['256GB', '512GB'] },
    { order: 4, name: 'iPhone 17 Pro Max', slug: 'iphone-17-pro-max', releaseYear: 2025, basePrice: 76500, ram: '12GB', storages: ['256GB', '512GB', '1TB', '2TB'] },
    { order: 5, name: 'iPhone 17 Pro', slug: 'iphone-17-pro', releaseYear: 2025, basePrice: 66000, ram: '12GB', storages: ['256GB', '512GB', '1TB'] },
    { order: 6, name: 'iPhone Air', slug: 'iphone-air', releaseYear: 2025, basePrice: 54000, ram: '12GB', storages: ['256GB', '512GB', '1TB'] },
    { order: 7, name: 'iPhone 17', slug: 'iphone-17', releaseYear: 2025, basePrice: 47500, ram: '8GB', storages: ['256GB', '512GB'] },
    { order: 8, name: 'iPhone 16e', slug: 'iphone-16e', releaseYear: 2025, basePrice: 29500, ram: '8GB', storages: ['128GB', '256GB', '512GB'] },
    { order: 9, name: 'iPhone 16 Pro Max', slug: 'iphone-16-pro-max', releaseYear: 2024, basePrice: 64000, ram: '8GB', storages: ['256GB', '512GB', '1TB'] },
    { order: 10, name: 'iPhone 16 Pro', slug: 'iphone-16-pro', releaseYear: 2024, basePrice: 55000, ram: '8GB', storages: ['128GB', '256GB', '512GB', '1TB'] },
    { order: 11, name: 'iPhone 16 Plus', slug: 'iphone-16-plus', releaseYear: 2024, basePrice: 43000, ram: '8GB', storages: ['128GB', '256GB', '512GB'] },
    { order: 12, name: 'iPhone 16', slug: 'iphone-16', releaseYear: 2024, basePrice: 38500, ram: '8GB', storages: ['128GB', '256GB', '512GB'] },
    { order: 13, name: 'iPhone 15', slug: 'iphone-15', releaseYear: 2023, basePrice: 35000, ram: '6GB', storages: ['128GB', '256GB', '512GB'] },
    { order: 14, name: 'iPhone 15 Plus', slug: 'iphone-15-plus', releaseYear: 2023, basePrice: 38500, ram: '6GB', storages: ['128GB', '256GB', '512GB'] },
    { order: 15, name: 'iPhone 15 Pro Max', slug: 'iphone-15-pro-max', releaseYear: 2023, basePrice: 56000, ram: '8GB', storages: ['256GB', '512GB', '1TB'] },
    { order: 16, name: 'iPhone 15 Pro', slug: 'iphone-15-pro', releaseYear: 2023, basePrice: 48000, ram: '8GB', storages: ['128GB', '256GB', '512GB', '1TB'] },
    { order: 17, name: 'iPhone 14 Plus', slug: 'iphone-14-plus', releaseYear: 2022, basePrice: 28000, ram: '6GB', storages: ['128GB', '256GB', '512GB'] },
    { order: 18, name: 'iPhone 14 Pro Max', slug: 'iphone-14-pro-max', releaseYear: 2022, basePrice: 42000, ram: '6GB', storages: ['128GB', '256GB', '512GB', '1TB'] },
    { order: 19, name: 'iPhone 14 Pro', slug: 'iphone-14-pro', releaseYear: 2022, basePrice: 36000, ram: '6GB', storages: ['128GB', '256GB', '512GB', '1TB'] },
    { order: 20, name: 'iPhone 14', slug: 'iphone-14', releaseYear: 2022, basePrice: 25000, ram: '6GB', storages: ['128GB', '256GB', '512GB'] },
    { order: 21, name: 'iPhone SE 2022', slug: 'iphone-se-2022', releaseYear: 2022, basePrice: 12000, ram: '4GB', storages: ['64GB', '128GB', '256GB'] },
    { order: 22, name: 'iPhone XS Max', slug: 'iphone-xs-max', releaseYear: 2018, basePrice: 11500, ram: '4GB', storages: ['64GB', '256GB', '512GB'] },
    { order: 23, name: 'iPhone XR', slug: 'iphone-xr', releaseYear: 2018, basePrice: 8500, ram: '3GB', storages: ['64GB', '128GB', '256GB'] },
    { order: 24, name: 'iPhone X', slug: 'iphone-x', releaseYear: 2017, basePrice: 7500, ram: '3GB', storages: ['64GB', '256GB'] },
    { order: 25, name: 'iPhone 13 Pro Max', slug: 'iphone-13-pro-max', releaseYear: 2021, basePrice: 32000, ram: '6GB', storages: ['128GB', '256GB', '512GB', '1TB'] },
    { order: 26, name: 'iPhone 13 Pro', slug: 'iphone-13-pro', releaseYear: 2021, basePrice: 27500, ram: '6GB', storages: ['128GB', '256GB', '512GB', '1TB'] },
    { order: 27, name: 'iPhone 13 Mini', slug: 'iphone-13-mini', releaseYear: 2021, basePrice: 19000, ram: '4GB', storages: ['128GB', '256GB', '512GB'] },
    { order: 28, name: 'iPhone 13', slug: 'iphone-13', releaseYear: 2021, basePrice: 22000, ram: '4GB', storages: ['128GB', '256GB', '512GB'] },
    { order: 29, name: 'iPhone 12 Pro Max', slug: 'iphone-12-pro-max', releaseYear: 2020, basePrice: 23000, ram: '6GB', storages: ['128GB', '256GB', '512GB'] },
    { order: 30, name: 'iPhone 12 Pro', slug: 'iphone-12-pro', releaseYear: 2020, basePrice: 19500, ram: '6GB', storages: ['128GB', '256GB', '512GB'] },
    { order: 31, name: 'iPhone 12 Mini', slug: 'iphone-12-mini', releaseYear: 2020, basePrice: 13500, ram: '4GB', storages: ['64GB', '128GB', '256GB'] },
    { order: 32, name: 'iPhone 12', slug: 'iphone-12', releaseYear: 2020, basePrice: 13500, ram: '4GB', storages: ['64GB', '128GB', '256GB'] },
    { order: 33, name: 'iPhone SE 2020', slug: 'iphone-se-2020', releaseYear: 2020, basePrice: 7500, ram: '3GB', storages: ['64GB', '128GB', '256GB'] },
    { order: 34, name: 'iPhone 11 Pro Max', slug: 'iphone-11-pro-max', releaseYear: 2019, basePrice: 16500, ram: '4GB', storages: ['64GB', '256GB', '512GB'] },
    { order: 35, name: 'iPhone 11 Pro', slug: 'iphone-11-pro', releaseYear: 2019, basePrice: 14000, ram: '4GB', storages: ['64GB', '256GB', '512GB'] },
    { order: 36, name: 'iPhone 11', slug: 'iphone-11', releaseYear: 2019, basePrice: 10200, ram: '4GB', storages: ['64GB', '128GB', '256GB'] },
    { order: 37, name: 'iPhone XS', slug: 'iphone-xs', releaseYear: 2018, basePrice: 9500, ram: '4GB', storages: ['64GB', '256GB', '512GB'] },
];
function calculateModifier(baseStorage, storage) {
    if (storage === baseStorage)
        return 0;
    const rank = {
        '64GB': 1,
        '128GB': 2,
        '256GB': 3,
        '512GB': 4,
        '1TB': 5,
        '2TB': 6,
    };
    const diff = (rank[storage] || 0) - (rank[baseStorage] || 0);
    if (diff <= 0)
        return 0;
    if (baseStorage === '64GB') {
        if (storage === '128GB')
            return 2000;
        if (storage === '256GB')
            return 4500;
        if (storage === '512GB')
            return 7500;
    }
    if (baseStorage === '128GB') {
        if (storage === '256GB')
            return 4000;
        if (storage === '512GB')
            return 9000;
        if (storage === '1TB')
            return 18000;
    }
    if (baseStorage === '256GB') {
        if (storage === '512GB')
            return 9000;
        if (storage === '1TB')
            return 19000;
        if (storage === '2TB')
            return 34000;
    }
    return diff * 4000;
}
async function seedAppleModelsArrangementIfNeeded() {
    try {
        const appleBrand = await Brand_js_1.BrandModel.findOne({
            $or: [{ slug: 'apple' }, { name: new RegExp('^apple$', 'i') }],
        });
        if (!appleBrand) {
            console.warn('[Apple Models Seeder] Apple brand not found, skipping.');
            return;
        }
        console.log(`[Apple Models Seeder] Arranging 37 Apple models in exact sequence...`);
        const processedModelIds = new Set();
        for (const spec of exports.APPLE_37_MODELS) {
            // Find matching model by slug or name variants (case-insensitive)
            let model = await SmartphoneModel_js_1.SmartphoneModel.findOne({
                brandId: appleBrand._id,
                $or: [
                    { slug: spec.slug },
                    { name: new RegExp(`^${spec.name}$`, 'i') },
                    { name: new RegExp(`^Apple ${spec.name}$`, 'i') },
                    // Special fallback for typos like iphone-18-prp
                    ...(spec.slug === 'iphone-18-pro' ? [{ slug: 'iphone-18-prp' }] : []),
                ],
            });
            if (model) {
                // Update display order, slug, and standardized name
                model.displayOrder = spec.order;
                model.slug = spec.slug;
                model.name = spec.name;
                if (!model.releaseYear)
                    model.releaseYear = spec.releaseYear;
                if (!model.basePrice || model.basePrice <= 0)
                    model.basePrice = spec.basePrice;
                model.isPublished = true;
                model.isArchived = false;
                await model.save();
                processedModelIds.add(String(model._id));
            }
            else {
                // Create new model in its exact spot
                model = await SmartphoneModel_js_1.SmartphoneModel.create({
                    brandId: appleBrand._id,
                    name: spec.name,
                    slug: spec.slug,
                    releaseYear: spec.releaseYear,
                    imageUrl: `/uploads/devices/${spec.slug}.png`,
                    basePrice: spec.basePrice,
                    displayOrder: spec.order,
                    isPublished: true,
                    isArchived: false,
                });
                processedModelIds.add(String(model._id));
            }
            // Ensure all requested configurations/variants exist
            const baseStorage = spec.storages[0];
            for (const storage of spec.storages) {
                const capacity = `${spec.ram} / ${storage}`;
                const modifier = calculateModifier(baseStorage, storage);
                let variant = await StorageVariant_js_1.StorageVariantModel.findOne({
                    modelId: model._id,
                    $or: [
                        { capacity },
                        { capacity: storage },
                        { capacity: `${storage} ` },
                        { storage, ram: spec.ram },
                    ],
                });
                if (variant) {
                    variant.capacity = capacity;
                    variant.ram = spec.ram;
                    variant.storage = storage;
                    variant.priceModifier = modifier;
                    variant.isPublished = true;
                    await variant.save();
                }
                else {
                    variant = await StorageVariant_js_1.StorageVariantModel.create({
                        modelId: model._id,
                        capacity,
                        ram: spec.ram,
                        storage,
                        priceModifier: modifier,
                        isPublished: true,
                    });
                }
                // Ensure PricingRule exists for each variant
                let rule = await PricingRule_js_1.PricingRuleModel.findOne({
                    modelId: model._id,
                    variantId: variant._id,
                });
                if (!rule) {
                    await PricingRule_js_1.PricingRuleModel.create({
                        modelId: model._id,
                        variantId: variant._id,
                        basePrice: model.basePrice,
                        storagePriceAdjustment: modifier,
                        version: 1,
                        isActive: true,
                    });
                }
                else {
                    rule.storagePriceAdjustment = modifier;
                    await rule.save();
                }
            }
        }
        // Preserve any existing Apple models not in 1..37 (e.g. MacBooks, etc.) without deleting them
        const otherModels = await SmartphoneModel_js_1.SmartphoneModel.find({
            brandId: appleBrand._id,
            _id: { $nin: Array.from(processedModelIds) },
        }).sort({ releaseYear: -1, name: 1 });
        let extraOrder = 100;
        for (const om of otherModels) {
            om.displayOrder = extraOrder++;
            await om.save();
        }
        console.log(`[Apple Models Seeder] Successfully arranged 37 priority Apple models and preserved ${otherModels.length} other devices.`);
    }
    catch (err) {
        console.error('[Apple Models Seeder] Error during Apple models arrangement:', err);
    }
}
//# sourceMappingURL=appleModelsSeed.js.map