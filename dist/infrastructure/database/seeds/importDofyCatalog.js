"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.importDofyCatalog = importDofyCatalog;
const fs_1 = __importDefault(require("fs"));
const mongoose_1 = __importDefault(require("mongoose"));
const index_js_1 = require("../../../config/index.js");
const Brand_js_1 = require("../models/Brand.js");
const SmartphoneModel_js_1 = require("../models/SmartphoneModel.js");
const StorageVariant_js_1 = require("../models/StorageVariant.js");
const PricingRule_js_1 = require("../models/PricingRule.js");
async function importDofyCatalog() {
    const jsonPath = 'C:\\Users\\Admin\\Downloads\\dofy_mobile_buyback_catalog_and_pricing.json';
    if (!fs_1.default.existsSync(jsonPath)) {
        console.error(`[Importer] JSON file not found at: ${jsonPath}`);
        return;
    }
    console.log(`[Importer] Reading Dofy catalog from ${jsonPath}...`);
    const rawData = fs_1.default.readFileSync(jsonPath, 'utf8');
    const catalog = JSON.parse(rawData);
    if (!catalog.brands_catalog || !Array.isArray(catalog.brands_catalog)) {
        console.error('[Importer] Invalid JSON format: brands_catalog array missing.');
        return;
    }
    console.log(`[Importer] Connecting to MongoDB: ${index_js_1.config.mongoUri}...`);
    await mongoose_1.default.connect(index_js_1.config.mongoUri, { serverSelectionTimeoutMS: 10000 });
    console.log('[Importer] Connected to MongoDB.');
    let totalBrandsCreated = 0;
    let totalModelsCreated = 0;
    let totalModelsSkipped = 0;
    let totalVariantsCreated = 0;
    let totalPricingRulesCreated = 0;
    for (const b of catalog.brands_catalog) {
        const brandSlug = b.brand_id.toLowerCase().trim();
        const brandName = b.brand_name.trim();
        // 1. Check if brand exists in app/DB
        let brandDoc = await Brand_js_1.BrandModel.findOne({
            $or: [
                { slug: brandSlug },
                { name: new RegExp(`^${brandName}$`, 'i') },
            ],
        });
        if (!brandDoc) {
            console.log(`[Importer] Brand not found in DB. Creating: ${brandName} (${brandSlug})`);
            brandDoc = await Brand_js_1.BrandModel.create({
                name: brandName,
                slug: brandSlug,
                displayOrder: 10,
                isActive: true,
            });
            totalBrandsCreated++;
        }
        else {
            console.log(`[Importer] Brand exists: ${brandDoc.name} (${brandDoc.slug})`);
        }
        if (!b.models || !Array.isArray(b.models))
            continue;
        for (const m of b.models) {
            const modelSlug = m.model_id.toLowerCase().trim();
            const modelName = m.model_name.trim();
            // 2. Check if model exists in app/DB
            const existingModel = await SmartphoneModel_js_1.SmartphoneModel.findOne({
                $or: [
                    { slug: modelSlug },
                    { name: new RegExp(`^${modelName}$`, 'i') },
                ],
            });
            if (existingModel) {
                console.log(`  [SKIP] Model already exists in app: "${existingModel.name}" (slug: ${existingModel.slug})`);
                totalModelsSkipped++;
                continue;
            }
            // Model does not exist -> import it and its prices from JSON
            const variants = m.variants || [];
            const firstVariant = variants[0] || { variant: '128 GB', base_price: 35000, min_scrap_price: 800 };
            const modelBasePrice = firstVariant.base_price;
            const releaseYear = m.release_year || 2024;
            console.log(`  [IMPORT] Adding new model: "${modelName}" | Base Price: ₹${modelBasePrice} | Variants: ${variants.length}`);
            const newModel = await SmartphoneModel_js_1.SmartphoneModel.create({
                brandId: brandDoc._id,
                name: modelName,
                slug: modelSlug,
                releaseYear,
                basePrice: modelBasePrice,
                isPublished: true,
                isArchived: false,
            });
            totalModelsCreated++;
            // Create storage variants
            for (const v of variants) {
                const capacity = v.variant.trim();
                const priceModifier = v.base_price - modelBasePrice;
                const variantDoc = await StorageVariant_js_1.StorageVariantModel.create({
                    modelId: newModel._id,
                    capacity,
                    priceModifier,
                    isPublished: true,
                });
                totalVariantsCreated++;
                // Create version 1 PricingRule with specific deductions and scrap floor
                await PricingRule_js_1.PricingRuleModel.create({
                    modelId: newModel._id,
                    variantId: variantDoc._id,
                    basePrice: v.base_price,
                    storagePriceAdjustment: 0,
                    minScrapPrice: v.min_scrap_price || Math.round(v.base_price * 0.022),
                    customDeductions: m.specific_deductions_inr || {},
                    version: 1,
                    isActive: true,
                    effectiveFrom: new Date(),
                });
                totalPricingRulesCreated++;
            }
        }
    }
    console.log('\n=========================================');
    console.log('[Importer] IMPORT COMPLETE SUMMARY:');
    console.log(`- New Brands Created: ${totalBrandsCreated}`);
    console.log(`- New Models Imported: ${totalModelsCreated}`);
    console.log(`- Existing Models Skipped: ${totalModelsSkipped}`);
    console.log(`- Storage Variants Created: ${totalVariantsCreated}`);
    console.log(`- Pricing Rules Created: ${totalPricingRulesCreated}`);
    console.log('=========================================\n');
    await mongoose_1.default.disconnect();
}
// Execute if run directly
if (process.argv[1]?.includes('importDofyCatalog')) {
    importDofyCatalog()
        .then(() => process.exit(0))
        .catch((err) => {
        console.error('[Importer Error]', err);
        process.exit(1);
    });
}
//# sourceMappingURL=importDofyCatalog.js.map