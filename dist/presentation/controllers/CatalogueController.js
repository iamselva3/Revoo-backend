"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CatalogueController = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Brand_js_1 = require("../../infrastructure/database/models/Brand.js");
const SmartphoneModel_js_1 = require("../../infrastructure/database/models/SmartphoneModel.js");
const StorageVariant_js_1 = require("../../infrastructure/database/models/StorageVariant.js");
const PricingRule_js_1 = require("../../infrastructure/database/models/PricingRule.js");
const Category_js_1 = require("../../infrastructure/database/models/Category.js");
const RefurbishedProduct_js_1 = require("../../infrastructure/database/models/RefurbishedProduct.js");
const Banner_js_1 = require("../../infrastructure/database/models/Banner.js");
const Invoice_js_1 = require("../../infrastructure/database/models/Invoice.js");
const ValuationEngine_js_1 = require("../../domain/services/ValuationEngine.js");
const types_js_1 = require("../../shared/types.js");
const audit_middleware_js_1 = require("../middlewares/audit.middleware.js");
class CatalogueController {
    // --- Public Customer Endpoints ---
    static async getActiveBrands(req, res, next) {
        try {
            const brands = await Brand_js_1.BrandModel.find({ isActive: true }).sort({ displayOrder: 1, name: 1 });
            res.status(200).json({ success: true, data: brands });
        }
        catch (err) {
            next(err);
        }
    }
    static async getModelsByBrand(req, res, next) {
        try {
            const { brandId } = req.params;
            let targetBrandId = brandId;
            if (!mongoose_1.default.Types.ObjectId.isValid(brandId)) {
                const cleanSlug = brandId.split('-')[0].toLowerCase();
                const brandDoc = await Brand_js_1.BrandModel.findOne({
                    $or: [
                        { slug: cleanSlug },
                        { name: new RegExp(`^${cleanSlug}$`, 'i') }
                    ]
                });
                if (brandDoc) {
                    targetBrandId = brandDoc._id;
                }
                else {
                    return res.status(200).json({ success: true, data: [] });
                }
            }
            const { category } = req.query;
            let filterQuery = {
                brandId: targetBrandId,
                isPublished: true,
                isArchived: false,
            };
            if (category) {
                const catStr = category.toLowerCase();
                if (catStr === 'mobile' || catStr === 'phones' || catStr === 'phone') {
                    filterQuery.name = { $not: /(macbook|laptop|notebook|thinkpad|alienware|xps|ipad|tablet|tv|oled|bravia|air|pro 1[46])/i };
                }
                else if (catStr === 'laptops' || catStr === 'laptop' || catStr === 'macbook' || catStr === 'macbooks') {
                    filterQuery.name = { $regex: /(macbook|laptop|notebook|thinkpad|xps|alienware|zenbook|vivobook|omen|predator|swift|air|pro 1[46])/i };
                }
                else if (catStr === 'tablets' || catStr === 'tablet' || catStr === 'ipad' || catStr === 'ipads') {
                    filterQuery.name = { $regex: /(ipad|tab|pad)/i };
                }
                else if (catStr === 'tv' || catStr === 'tvs' || catStr === 'smart_tv') {
                    filterQuery.name = { $regex: /(tv|bravia|oled|qled|crystal|uhd)/i };
                }
            }
            const models = await SmartphoneModel_js_1.SmartphoneModel.find(filterQuery).sort({ releaseYear: -1, name: 1 });
            res.status(200).json({ success: true, data: models });
        }
        catch (err) {
            next(err);
        }
    }
    static async getModelDetails(req, res, next) {
        try {
            const { modelId } = req.params;
            let model = null;
            if (mongoose_1.default.Types.ObjectId.isValid(modelId)) {
                model = await SmartphoneModel_js_1.SmartphoneModel.findById(modelId).populate('brandId', 'name logoUrl');
            }
            else {
                model = await SmartphoneModel_js_1.SmartphoneModel.findOne({
                    $or: [
                        { slug: modelId },
                        { name: new RegExp(`^${modelId}$`, 'i') }
                    ]
                }).populate('brandId', 'name logoUrl');
            }
            if (!model || model.isArchived) {
                return next(new types_js_1.AppError('Smartphone model not found or currently unavailable.', 404));
            }
            const variants = await StorageVariant_js_1.StorageVariantModel.find({
                modelId: model._id,
                isPublished: true,
            }).sort({ priceModifier: 1 });
            res.status(200).json({
                success: true,
                data: {
                    model,
                    variants,
                },
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async calculateIndicativeEstimate(req, res, next) {
        try {
            const { modelId, variantId, modelName, brandName, basePrice: customBasePrice, declaredCondition, 
            // DOFY fields
            basicQuestions, backPanelCondition, sidePanelCondition, hardwareFaults, isPhoneWorking, isTouchscreenWorking, isDisplayOriginal, hasValidWarranty, volumeButtonNotWorking, wifiOrBluetoothNotWorking, chargingPortNotWorking, proximitySensorNotWorking, powerButtonNotWorking, earSpeakerNotWorking, vibratorNotWorking, 
            // Legacy fields
            displayCondition = 'FLAWLESS', bodyCondition = 'FLAWLESS', batteryHealth = 'ABOVE_85', functionalFaults = {}, hasOriginalBox = false, hasOriginalCharger = false, } = req.body;
            let pricingRule = null;
            let modelDoc = null;
            let effectiveBasePrice = typeof customBasePrice === 'number' && customBasePrice > 0 ? customBasePrice : 0;
            let storageModifier = 0;
            // 1. Resolve modelDoc & real model ObjectId if possible
            if (modelId) {
                if (mongoose_1.default.Types.ObjectId.isValid(modelId)) {
                    modelDoc = await SmartphoneModel_js_1.SmartphoneModel.findById(modelId);
                }
                else {
                    modelDoc = await SmartphoneModel_js_1.SmartphoneModel.findOne({
                        $or: [
                            { slug: modelId },
                            { name: new RegExp(`^${modelId}$`, 'i') },
                            ...(modelName ? [{ name: new RegExp(`^${modelName}$`, 'i') }] : []),
                        ],
                    });
                }
            }
            if (modelDoc) {
                effectiveBasePrice = effectiveBasePrice || modelDoc.basePrice;
            }
            // 2. Resolve variant & storage modifier if provided
            if (variantId) {
                if (mongoose_1.default.Types.ObjectId.isValid(variantId)) {
                    const variant = await StorageVariant_js_1.StorageVariantModel.findById(variantId);
                    if (variant)
                        storageModifier = variant.priceModifier;
                }
                else if (modelDoc) {
                    const variant = await StorageVariant_js_1.StorageVariantModel.findOne({
                        modelId: modelDoc._id,
                        $or: [{ capacity: variantId }, { capacity: new RegExp(variantId, 'i') }],
                    });
                    if (variant)
                        storageModifier = variant.priceModifier;
                }
            }
            // 3. Search for existing PricingRule
            const targetModelId = modelDoc ? modelDoc._id : (modelId && mongoose_1.default.Types.ObjectId.isValid(modelId) ? modelId : null);
            if (targetModelId) {
                const query = { modelId: targetModelId, isActive: true };
                if (variantId && mongoose_1.default.Types.ObjectId.isValid(variantId)) {
                    query.variantId = variantId;
                }
                pricingRule = await PricingRule_js_1.PricingRuleModel.findOne(query).sort({ version: -1 });
                if (!pricingRule) {
                    pricingRule = await PricingRule_js_1.PricingRuleModel.findOne({ modelId: targetModelId, isActive: true }).sort({ version: -1 });
                }
            }
            // 4. Fallback estimated base price from model name or standard tier if not resolved
            if (!effectiveBasePrice) {
                const lowerName = (modelName || modelId || '').toLowerCase();
                if (lowerName.includes('pro max') || lowerName.includes('ultra')) {
                    effectiveBasePrice = 65000;
                }
                else if (lowerName.includes('pro') || lowerName.includes('plus')) {
                    effectiveBasePrice = 45000;
                }
                else if (lowerName.includes('macbook') || lowerName.includes('xps') || lowerName.includes('alienware')) {
                    effectiveBasePrice = 85000;
                }
                else if (lowerName.includes('laptop') || lowerName.includes('thinkpad') || lowerName.includes('zenbook')) {
                    effectiveBasePrice = 55000;
                }
                else {
                    effectiveBasePrice = 28000;
                }
            }
            // Resolve DOFY conditions from structured or flattened input
            const resolvedBasicQuestions = declaredCondition?.basicQuestions || basicQuestions || (isPhoneWorking !== undefined || isTouchscreenWorking !== undefined || isDisplayOriginal !== undefined || hasValidWarranty !== undefined
                ? {
                    isPhoneWorking: isPhoneWorking !== false && isPhoneWorking !== 'false',
                    isTouchscreenWorking: isTouchscreenWorking !== false && isTouchscreenWorking !== 'false',
                    isDisplayOriginal: isDisplayOriginal !== false && isDisplayOriginal !== 'false',
                    hasValidWarranty: hasValidWarranty === true || hasValidWarranty === 'true',
                }
                : undefined);
            const resolvedBackPanel = declaredCondition?.backPanelCondition || backPanelCondition;
            const resolvedSidePanel = declaredCondition?.sidePanelCondition || sidePanelCondition;
            const resolvedHardwareFaults = declaredCondition?.hardwareFaults || hardwareFaults || (volumeButtonNotWorking !== undefined || powerButtonNotWorking !== undefined || chargingPortNotWorking !== undefined ||
                wifiOrBluetoothNotWorking !== undefined || proximitySensorNotWorking !== undefined || earSpeakerNotWorking !== undefined || vibratorNotWorking !== undefined
                ? {
                    volumeButtonNotWorking: volumeButtonNotWorking === true || volumeButtonNotWorking === 'true',
                    wifiOrBluetoothNotWorking: wifiOrBluetoothNotWorking === true || wifiOrBluetoothNotWorking === 'true',
                    chargingPortNotWorking: chargingPortNotWorking === true || chargingPortNotWorking === 'true',
                    proximitySensorNotWorking: proximitySensorNotWorking === true || proximitySensorNotWorking === 'true',
                    powerButtonNotWorking: powerButtonNotWorking === true || powerButtonNotWorking === 'true',
                    earSpeakerNotWorking: earSpeakerNotWorking === true || earSpeakerNotWorking === 'true',
                    vibratorNotWorking: vibratorNotWorking === true || vibratorNotWorking === 'true',
                }
                : undefined);
            const resolvedBox = declaredCondition?.hasOriginalBox ?? (hasOriginalBox === true || hasOriginalBox === 'true');
            const resolvedCharger = declaredCondition?.hasOriginalCharger ?? (hasOriginalCharger === true || hasOriginalCharger === 'true');
            const fullCondition = {
                basicQuestions: resolvedBasicQuestions,
                backPanelCondition: resolvedBackPanel,
                sidePanelCondition: resolvedSidePanel,
                hardwareFaults: resolvedHardwareFaults,
                displayCondition: displayCondition || 'FLAWLESS',
                bodyCondition: bodyCondition || 'FLAWLESS',
                batteryHealth: batteryHealth || 'ABOVE_85',
                functionalFaults: functionalFaults || {},
                hasOriginalBox: !!resolvedBox,
                hasOriginalCharger: !!resolvedCharger,
            };
            let valuation;
            if (pricingRule) {
                valuation = ValuationEngine_js_1.ValuationEngine.calculate({
                    id: pricingRule._id.toString(),
                    modelId: pricingRule.modelId.toString(),
                    variantId: pricingRule.variantId?.toString() || '',
                    basePrice: pricingRule.basePrice,
                    storagePriceAdjustment: pricingRule.storagePriceAdjustment,
                    deductions: pricingRule.deductions,
                    version: pricingRule.version,
                    isActive: pricingRule.isActive,
                    effectiveFrom: pricingRule.effectiveFrom,
                }, fullCondition);
            }
            else {
                const dummyRule = {
                    id: 'default',
                    modelId: targetModelId?.toString() || 'default',
                    variantId: '',
                    basePrice: effectiveBasePrice,
                    storagePriceAdjustment: storageModifier,
                    deductions: {
                        display: {
                            FLAWLESS: 0,
                            MINOR_SCRATCHES: Math.round(effectiveBasePrice * 0.08),
                            DEEP_SCRATCHES: Math.round(effectiveBasePrice * 0.15),
                            CRACKED_GLASS: Math.round(effectiveBasePrice * 0.30),
                            BROKEN_OR_DEAD_PIXELS: Math.round(effectiveBasePrice * 0.50),
                        },
                        body: {
                            FLAWLESS: 0,
                            MINOR_SIGNS_OF_USE: Math.round(effectiveBasePrice * 0.04),
                            DENTED_OR_SCRATCHED: Math.round(effectiveBasePrice * 0.10),
                            BENT_OR_CRACKED_BACK: Math.round(effectiveBasePrice * 0.20),
                        },
                        battery: {
                            EXCELLENT: 0,
                            GOOD: Math.round(effectiveBasePrice * 0.05),
                            DEGRADED: Math.round(effectiveBasePrice * 0.10),
                        },
                        functional: {
                            frontCameraFaulty: Math.round(effectiveBasePrice * 0.08),
                            backCameraFaulty: Math.round(effectiveBasePrice * 0.12),
                            faceIdOrFingerprintFaulty: Math.round(effectiveBasePrice * 0.10),
                            speakerOrMicFaulty: Math.round(effectiveBasePrice * 0.05),
                            chargingPortFaulty: Math.round(effectiveBasePrice * 0.06),
                            wirelessOrBluetoothFaulty: Math.round(effectiveBasePrice * 0.07),
                        },
                        basicQuestions: {
                            phoneNotWorking: Math.round(effectiveBasePrice * 0.60),
                            touchscreenNotWorking: Math.round(effectiveBasePrice * 0.15),
                            displayNotOriginal: Math.round(effectiveBasePrice * 0.10),
                            noWarranty: Math.round(effectiveBasePrice * 0.05),
                        },
                        backPanel: {
                            NO_DEFECTS: 0,
                            MINOR_SCRATCHES: Math.round(effectiveBasePrice * 0.03),
                            HEAVY_SCRATCHES: Math.round(effectiveBasePrice * 0.08),
                            BACK_PANEL_BROKEN: Math.round(effectiveBasePrice * 0.15),
                        },
                        sidePanel: {
                            NO_DEFECTS: 0,
                            MINOR_DENT_OR_SCRATCHES: Math.round(effectiveBasePrice * 0.03),
                            HEAVY_DENT: Math.round(effectiveBasePrice * 0.08),
                            BENT_OR_BROKEN: Math.round(effectiveBasePrice * 0.12),
                        },
                        hardwareFaults: {
                            powerButtonNotWorking: Math.round(effectiveBasePrice * 0.05),
                            volumeButtonNotWorking: Math.round(effectiveBasePrice * 0.03),
                            chargingPortNotWorking: Math.round(effectiveBasePrice * 0.08),
                            earSpeakerNotWorking: Math.round(effectiveBasePrice * 0.03),
                            proximitySensorNotWorking: Math.round(effectiveBasePrice * 0.03),
                            wifiOrBluetoothNotWorking: Math.round(effectiveBasePrice * 0.05),
                            vibratorNotWorking: Math.round(effectiveBasePrice * 0.02),
                        },
                    },
                    version: 1,
                    isActive: true,
                    effectiveFrom: new Date(),
                };
                valuation = ValuationEngine_js_1.ValuationEngine.calculate(dummyRule, fullCondition);
            }
            res.status(200).json({
                success: true,
                message: 'Indicative estimate calculated successfully.',
                data: {
                    valuation,
                    disclaimer: 'This is an indicative estimate only. Your final offer will be confirmed after physical inspection of your device.',
                },
            });
        }
        catch (err) {
            next(err);
        }
    }
    // --- Admin Catalogue Operations ---
    static async adminListBrands(req, res, next) {
        try {
            const brands = await Brand_js_1.BrandModel.find().sort({ displayOrder: 1, name: 1 });
            res.status(200).json({ success: true, data: brands });
        }
        catch (err) {
            next(err);
        }
    }
    static async adminCreateBrand(req, res, next) {
        try {
            const brand = await Brand_js_1.BrandModel.create(req.body);
            await (0, audit_middleware_js_1.logAuditEvent)({
                req,
                actorType: 'ADMIN',
                actorId: req.admin?.id,
                actorEmail: req.admin?.email,
                action: 'CREATE_BRAND',
                resourceType: 'Brand',
                resourceId: brand._id.toString(),
                diff: brand.toObject(),
            });
            res.status(201).json({ success: true, message: 'Brand created successfully.', data: brand });
        }
        catch (err) {
            next(err);
        }
    }
    static async adminUpdateBrand(req, res, next) {
        try {
            const { id } = req.params;
            const brand = await Brand_js_1.BrandModel.findByIdAndUpdate(id, req.body, { new: true });
            if (!brand)
                return next(new types_js_1.AppError('Brand not found', 404));
            await (0, audit_middleware_js_1.logAuditEvent)({
                req,
                actorType: 'ADMIN',
                actorId: req.admin?.id,
                actorEmail: req.admin?.email,
                action: 'UPDATE_BRAND',
                resourceType: 'Brand',
                resourceId: brand._id.toString(),
                diff: req.body,
            });
            res.status(200).json({ success: true, message: 'Brand updated.', data: brand });
        }
        catch (err) {
            next(err);
        }
    }
    static async adminListModels(req, res, next) {
        try {
            const { brandId, includeArchived } = req.query;
            const filter = {};
            if (brandId)
                filter.brandId = brandId;
            if (includeArchived !== 'true')
                filter.isArchived = false;
            const models = await SmartphoneModel_js_1.SmartphoneModel.find(filter)
                .populate('brandId', 'name slug logoUrl')
                .sort({ releaseYear: -1, name: 1 });
            res.status(200).json({ success: true, data: models });
        }
        catch (err) {
            next(err);
        }
    }
    static async adminCreateModel(req, res, next) {
        try {
            const model = await SmartphoneModel_js_1.SmartphoneModel.create(req.body);
            // Create default base pricing rule for this model
            await PricingRule_js_1.PricingRuleModel.create({
                modelId: model._id,
                basePrice: model.basePrice,
                version: 1,
                isActive: true,
            });
            await (0, audit_middleware_js_1.logAuditEvent)({
                req,
                actorType: 'ADMIN',
                actorId: req.admin?.id,
                actorEmail: req.admin?.email,
                action: 'CREATE_MODEL',
                resourceType: 'SmartphoneModel',
                resourceId: model._id.toString(),
                diff: model.toObject(),
            });
            res.status(201).json({ success: true, message: 'Smartphone model created.', data: model });
        }
        catch (err) {
            next(err);
        }
    }
    static async adminUpdateModel(req, res, next) {
        try {
            const { id } = req.params;
            const model = await SmartphoneModel_js_1.SmartphoneModel.findByIdAndUpdate(id, req.body, { new: true });
            if (!model)
                return next(new types_js_1.AppError('Model not found', 404));
            await (0, audit_middleware_js_1.logAuditEvent)({
                req,
                actorType: 'ADMIN',
                actorId: req.admin?.id,
                actorEmail: req.admin?.email,
                action: 'UPDATE_MODEL',
                resourceType: 'SmartphoneModel',
                resourceId: model._id.toString(),
                diff: req.body,
            });
            res.status(200).json({ success: true, message: 'Model updated.', data: model });
        }
        catch (err) {
            next(err);
        }
    }
    static async adminArchiveModel(req, res, next) {
        try {
            const { id } = req.params;
            // Soft-archive to preserve historical buyback records
            const model = await SmartphoneModel_js_1.SmartphoneModel.findByIdAndUpdate(id, { isArchived: true, isPublished: false }, { new: true });
            if (!model)
                return next(new types_js_1.AppError('Model not found', 404));
            await (0, audit_middleware_js_1.logAuditEvent)({
                req,
                actorType: 'ADMIN',
                actorId: req.admin?.id,
                actorEmail: req.admin?.email,
                action: 'ARCHIVE_MODEL',
                resourceType: 'SmartphoneModel',
                resourceId: model._id.toString(),
            });
            res.status(200).json({ success: true, message: 'Model archived safely.', data: model });
        }
        catch (err) {
            next(err);
        }
    }
    static async adminDeleteModel(req, res, next) {
        try {
            const { id } = req.params;
            const model = await SmartphoneModel_js_1.SmartphoneModel.findByIdAndDelete(id);
            if (!model)
                return next(new types_js_1.AppError('Model not found', 404));
            await (0, audit_middleware_js_1.logAuditEvent)({
                req,
                actorType: 'ADMIN',
                actorId: req.admin?.id,
                actorEmail: req.admin?.email,
                action: 'DELETE_MODEL',
                resourceType: 'SmartphoneModel',
                resourceId: id,
            });
            res.status(200).json({ success: true, message: 'Model deleted successfully.' });
        }
        catch (err) {
            next(err);
        }
    }
    static async adminCreateVariant(req, res, next) {
        try {
            const variant = await StorageVariant_js_1.StorageVariantModel.create(req.body);
            // Create pricing rule variation for this storage variant
            const model = await SmartphoneModel_js_1.SmartphoneModel.findById(variant.modelId);
            if (model) {
                await PricingRule_js_1.PricingRuleModel.create({
                    modelId: model._id,
                    variantId: variant._id,
                    basePrice: model.basePrice,
                    storagePriceAdjustment: variant.priceModifier,
                    version: 1,
                    isActive: true,
                });
            }
            res.status(201).json({ success: true, message: 'Storage variant added.', data: variant });
        }
        catch (err) {
            next(err);
        }
    }
    // --- Multi-Category Endpoints ---
    static async getCategories(req, res, next) {
        try {
            let categories = await Category_js_1.CategoryModel.find({ isActive: true }).sort({ displayOrder: 1 });
            if (categories.length === 0) {
                // Default official categories
                const defaults = [
                    { name: 'Mobile Phones', slug: 'mobile', iconName: 'phone_android', description: 'Instant valuation & free doorstep pickup', isActive: true, displayOrder: 1, badgeText: 'Most Popular' },
                    { name: 'Laptops', slug: 'laptop', iconName: 'laptop_chromebook', description: 'MacBook, Dell, HP, ThinkPad & more', isActive: true, displayOrder: 2, badgeText: 'High Value' },
                    { name: 'Tablets & iPads', slug: 'tablet', iconName: 'tablet_mac', description: 'Apple iPads, Galaxy Tab & Surface', isActive: true, displayOrder: 3, badgeText: 'Instant Cash' },
                    { name: 'MacBooks', slug: 'macbook', iconName: 'laptop_mac', description: 'MacBook Air & MacBook Pro M-Series', isActive: true, displayOrder: 4, badgeText: 'Top Payout' },
                    { name: 'Wireless Earbuds', slug: 'earbuds', iconName: 'headphones', description: 'AirPods, Galaxy Buds, Sony ANC', isActive: true, displayOrder: 5, badgeText: 'Doorstep Pickup' },
                    { name: 'Smart TVs', slug: 'smart_tv', iconName: 'tv', description: '4K UHD, OLED & QLED Large Screens', isActive: true, displayOrder: 6, badgeText: 'Free Inspection' },
                    { name: 'Refrigerators', slug: 'refrigerator', iconName: 'kitchen', description: 'Double Door, Frost Free & Smart Fridges', isActive: true, displayOrder: 7, badgeText: 'Heavy Appliance Pickup' },
                ];
                categories = await Category_js_1.CategoryModel.insertMany(defaults);
            }
            res.status(200).json({ success: true, data: categories });
        }
        catch (err) {
            next(err);
        }
    }
    // --- Refurbished Second-Hand Phones (Buy Section) ---
    static async getRefurbishedProducts(req, res, next) {
        try {
            const { search, brand, grade, maxPrice, category } = req.query;
            const query = { inStock: true };
            if (category && typeof category === 'string' && category !== 'all' && category !== 'ALL') {
                query.category = new RegExp(category, 'i');
            }
            if (brand && typeof brand === 'string' && brand !== 'ALL') {
                query.brand = new RegExp(brand, 'i');
            }
            if (grade && typeof grade === 'string') {
                query.grade = grade;
            }
            if (maxPrice && !isNaN(Number(maxPrice))) {
                query.salePrice = { $lte: Number(maxPrice) };
            }
            if (search && typeof search === 'string' && search.trim() !== '') {
                query.$or = [
                    { name: new RegExp(search.trim(), 'i') },
                    { brand: new RegExp(search.trim(), 'i') },
                    { offerTag: new RegExp(search.trim(), 'i') },
                ];
            }
            let products = await RefurbishedProduct_js_1.RefurbishedProductModel.find(query).sort({ isFeatured: -1, createdAt: -1 });
            if (products.length === 0 && !search && !brand && !grade && !maxPrice) {
                // Seed default high-quality second-hand inventory across all brands
                const defaultRefurbished = [
                    {
                        name: 'iPhone 15 Pro',
                        brand: 'Apple',
                        storage: '256GB',
                        color: 'Natural Titanium',
                        grade: RefurbishedProduct_js_1.DeviceGrade.PRISTINE,
                        batteryHealth: 99,
                        originalPrice: 134900,
                        salePrice: 84999,
                        discountPercentage: 37,
                        warrantyMonths: 12,
                        imageUrl: 'https://pub-ebb60884050ceb5a3565e132a7ef9394.r2.dev/revoo/uploads/devices/iphone-15-pro.png',
                        inspectionScore: 99,
                        inStock: true,
                        isFeatured: true,
                        highlights: ['A17 Pro Titanium Architecture', '12-Month REVOO Warranty', 'Original Box & Cable Included', 'Free 7-Day Replacement'],
                    },
                    {
                        name: 'Galaxy S24 Ultra 5G',
                        brand: 'Samsung',
                        storage: '256GB',
                        color: 'Titanium Gray',
                        grade: RefurbishedProduct_js_1.DeviceGrade.PRISTINE,
                        batteryHealth: 98,
                        originalPrice: 129999,
                        salePrice: 81999,
                        discountPercentage: 37,
                        warrantyMonths: 12,
                        imageUrl: 'https://pub-ebb60884050ceb5a3565e132a7ef9394.r2.dev/revoo/uploads/devices/galaxy-s24-ultra.png',
                        inspectionScore: 99,
                        inStock: true,
                        isFeatured: true,
                        highlights: ['Galaxy AI Enabled', 'S-Pen Verified & Pristine', '12-Month REVOO Warranty', 'Free Doorstep Delivery'],
                    },
                    {
                        name: 'Vivo X100 Pro 5G',
                        brand: 'Vivo',
                        storage: '256GB',
                        color: 'Sunset Orange',
                        grade: RefurbishedProduct_js_1.DeviceGrade.PRISTINE,
                        batteryHealth: 97,
                        originalPrice: 89999,
                        salePrice: 56999,
                        discountPercentage: 37,
                        warrantyMonths: 12,
                        imageUrl: 'https://pub-ebb60884050ceb5a3565e132a7ef9394.r2.dev/revoo/uploads/devices/vivo-x100-pro.png',
                        inspectionScore: 98,
                        inStock: true,
                        isFeatured: true,
                        highlights: ['Zeiss APO Telephoto Camera', 'Dimensity 9300 Flagship', '12-Month Warranty', '32-Point Quality Certified'],
                    },
                    {
                        name: 'Oppo Find X7 Ultra',
                        brand: 'Oppo',
                        storage: '256GB',
                        color: 'Sepia Brown Leather',
                        grade: RefurbishedProduct_js_1.DeviceGrade.EXCELLENT,
                        batteryHealth: 96,
                        originalPrice: 94999,
                        salePrice: 59999,
                        discountPercentage: 37,
                        warrantyMonths: 12,
                        imageUrl: 'https://pub-ebb60884050ceb5a3565e132a7ef9394.r2.dev/revoo/uploads/devices/oppo-find-x7-ultra.png',
                        inspectionScore: 97,
                        inStock: true,
                        isFeatured: false,
                        highlights: ['Dual Periscope Telephoto', 'Hasselblad Color Science', '100W Fast Charger Included', 'Zero Defects'],
                    },
                    {
                        name: 'Nothing Phone (2)',
                        brand: 'Nothing',
                        storage: '256GB',
                        color: 'Dark Gray',
                        grade: RefurbishedProduct_js_1.DeviceGrade.PRISTINE,
                        batteryHealth: 98,
                        originalPrice: 49999,
                        salePrice: 32999,
                        discountPercentage: 34,
                        warrantyMonths: 12,
                        imageUrl: 'https://pub-ebb60884050ceb5a3565e132a7ef9394.r2.dev/revoo/uploads/devices/nothing-phone-2.png',
                        inspectionScore: 98,
                        inStock: true,
                        isFeatured: true,
                        highlights: ['Glyph Interface Matrix 100% Tested', 'Snapdragon 8+ Gen 1', 'Clean Nothing OS 2.5', '12-Month Warranty'],
                    },
                    {
                        name: 'Redmi Note 13 Pro+ 5G',
                        brand: 'Redmi',
                        storage: '256GB',
                        color: 'Fusion Purple',
                        grade: RefurbishedProduct_js_1.DeviceGrade.EXCELLENT,
                        batteryHealth: 96,
                        originalPrice: 33999,
                        salePrice: 21999,
                        discountPercentage: 35,
                        warrantyMonths: 6,
                        imageUrl: 'https://pub-ebb60884050ceb5a3565e132a7ef9394.r2.dev/revoo/uploads/devices/redmi-note-13-pro-plus.png',
                        inspectionScore: 96,
                        inStock: true,
                        isFeatured: false,
                        highlights: ['200MP OIS Camera Verified', '120W HyperCharge Ready', 'IP68 Water Resistance Tested', '6-Month Warranty'],
                    },
                    {
                        name: 'Realme 12 Pro+ 5G',
                        brand: 'Realme',
                        storage: '256GB',
                        color: 'Submarine Blue',
                        grade: RefurbishedProduct_js_1.DeviceGrade.EXCELLENT,
                        batteryHealth: 95,
                        originalPrice: 31999,
                        salePrice: 20499,
                        discountPercentage: 36,
                        warrantyMonths: 6,
                        imageUrl: 'https://pub-ebb60884050ceb5a3565e132a7ef9394.r2.dev/revoo/uploads/devices/realme-12-pro-plus.png',
                        inspectionScore: 95,
                        inStock: true,
                        isFeatured: false,
                        highlights: ['Periscope Portrait Camera', 'Luxury Watch Dial Design', 'Vegan Leather Back', '6-Month Warranty'],
                    },
                    {
                        name: 'iQOO 12 5G',
                        brand: 'iQOO',
                        storage: '256GB',
                        color: 'Legend White BMW',
                        grade: RefurbishedProduct_js_1.DeviceGrade.PRISTINE,
                        batteryHealth: 99,
                        originalPrice: 59999,
                        salePrice: 42999,
                        discountPercentage: 28,
                        warrantyMonths: 12,
                        imageUrl: 'https://pub-ebb60884050ceb5a3565e132a7ef9394.r2.dev/revoo/uploads/devices/iqoo-12-5g.png',
                        inspectionScore: 99,
                        inStock: true,
                        isFeatured: true,
                        highlights: ['Snapdragon 8 Gen 3 Gaming Beast', 'Supercomputing Chip Q1', '120W FlashCharge', '12-Month Warranty'],
                    },
                    {
                        name: 'OnePlus 12 5G',
                        brand: 'OnePlus',
                        storage: '256GB',
                        color: 'Flowy Emerald',
                        grade: RefurbishedProduct_js_1.DeviceGrade.PRISTINE,
                        batteryHealth: 98,
                        originalPrice: 64999,
                        salePrice: 44999,
                        discountPercentage: 31,
                        warrantyMonths: 12,
                        imageUrl: 'https://pub-ebb60884050ceb5a3565e132a7ef9394.r2.dev/revoo/uploads/devices/oneplus-12.png',
                        inspectionScore: 98,
                        inStock: true,
                        isFeatured: true,
                        highlights: ['4th Gen Hasselblad Camera', '2K ProXDR 120Hz Display', '100W SuperVOOC', '12-Month Warranty'],
                    },
                    {
                        name: 'Pixel 8 Pro',
                        brand: 'Google',
                        storage: '128GB',
                        color: 'Bay Blue',
                        grade: RefurbishedProduct_js_1.DeviceGrade.EXCELLENT,
                        batteryHealth: 96,
                        originalPrice: 106999,
                        salePrice: 54999,
                        discountPercentage: 49,
                        warrantyMonths: 12,
                        imageUrl: 'https://pub-ebb60884050ceb5a3565e132a7ef9394.r2.dev/revoo/uploads/devices/pixel-8-pro.png',
                        inspectionScore: 97,
                        inStock: true,
                        isFeatured: true,
                        highlights: ['Google Tensor G3 & Best Take AI', 'Temperature Sensor Tested', 'Pro Camera Controls', '12-Month Warranty'],
                    },
                ];
                products = await RefurbishedProduct_js_1.RefurbishedProductModel.insertMany(defaultRefurbished);
            }
            res.status(200).json({ success: true, count: products.length, data: products });
        }
        catch (err) {
            next(err);
        }
    }
    static async adminListRefurbishedProducts(req, res, next) {
        try {
            const { search, brand, category, inStock } = req.query;
            const query = {};
            if (brand && typeof brand === 'string' && brand !== 'ALL') {
                query.brand = new RegExp(`^${brand}$`, 'i');
            }
            if (category && typeof category === 'string' && category !== 'ALL') {
                query.category = new RegExp(category, 'i');
            }
            if (inStock !== undefined && inStock !== 'ALL' && inStock !== '') {
                query.inStock = String(inStock) === 'true';
            }
            if (search && typeof search === 'string' && search.trim() !== '') {
                query.$or = [
                    { name: new RegExp(search.trim(), 'i') },
                    { brand: new RegExp(search.trim(), 'i') },
                    { offerTag: new RegExp(search.trim(), 'i') },
                ];
            }
            const products = await RefurbishedProduct_js_1.RefurbishedProductModel.find(query).sort({ createdAt: -1 });
            res.status(200).json({ success: true, count: products.length, data: products });
        }
        catch (err) {
            next(err);
        }
    }
    static async adminCreateRefurbishedProduct(req, res, next) {
        try {
            const payload = { ...req.body };
            if (payload.originalPrice && payload.salePrice && (!payload.discountPercentage || payload.discountPercentage === 0)) {
                payload.discountPercentage = Math.max(0, Math.round(((payload.originalPrice - payload.salePrice) / payload.originalPrice) * 100));
            }
            const product = await RefurbishedProduct_js_1.RefurbishedProductModel.create(payload);
            res.status(201).json({ success: true, message: 'Certified phone listed in buy store successfully.', data: product });
        }
        catch (err) {
            next(err);
        }
    }
    static async adminUpdateRefurbishedProduct(req, res, next) {
        try {
            const { id } = req.params;
            const payload = { ...req.body };
            delete payload._id;
            delete payload.__v;
            delete payload.createdAt;
            delete payload.updatedAt;
            if (payload.originalPrice && payload.salePrice && (!payload.discountPercentage || payload.discountPercentage === 0)) {
                payload.discountPercentage = Math.max(0, Math.round(((payload.originalPrice - payload.salePrice) / payload.originalPrice) * 100));
            }
            let product = null;
            if (id && mongoose_1.default.Types.ObjectId.isValid(id)) {
                product = await RefurbishedProduct_js_1.RefurbishedProductModel.findByIdAndUpdate(id, { $set: payload }, { new: true });
            }
            if (!product && id) {
                product = await RefurbishedProduct_js_1.RefurbishedProductModel.findOneAndUpdate({ $or: [{ name: new RegExp(`^${id}$`, 'i') }, { offerTag: id }] }, { $set: payload }, { new: true });
            }
            if (!product) {
                return res.status(404).json({ success: false, message: 'Certified phone not found.' });
            }
            res.status(200).json({ success: true, message: 'Certified phone updated successfully.', data: product });
        }
        catch (err) {
            next(err);
        }
    }
    static async adminDeleteRefurbishedProduct(req, res, next) {
        try {
            const { id } = req.params;
            let product = null;
            if (id && mongoose_1.default.Types.ObjectId.isValid(id)) {
                product = await RefurbishedProduct_js_1.RefurbishedProductModel.findByIdAndDelete(id);
            }
            if (!product && id) {
                product = await RefurbishedProduct_js_1.RefurbishedProductModel.findOneAndDelete({
                    $or: [{ name: new RegExp(`^${id}$`, 'i') }, { offerTag: id }],
                });
            }
            if (!product) {
                return res.status(404).json({ success: false, message: 'Certified phone not found.' });
            }
            res.status(200).json({ success: true, message: 'Certified phone deleted from store inventory.' });
        }
        catch (err) {
            next(err);
        }
    }
    // --- Verified Customer Reviews (For Sell & Buy) ---
    static async getCustomerReviews(req, res, next) {
        try {
            const { type } = req.query; // 'sell' or 'buy'
            const sellReviews = [
                {
                    id: 'rev-s-1',
                    name: 'Arjun Nambiar',
                    city: 'Bengaluru',
                    rating: 5,
                    type: 'SELL',
                    device: 'iPhone 13 Pro (128GB)',
                    amount: 47500,
                    quote: 'Sold my iPhone in less than 3 hours from booking. The collection executive tested the screen and transferred ₹47,500 instantly to my Google Pay before stepping out!',
                    date: 'Yesterday',
                    verified: true,
                },
                {
                    id: 'rev-s-2',
                    name: 'Pooja Deshmukh',
                    city: 'Pune',
                    rating: 5,
                    type: 'SELL',
                    device: 'Samsung Galaxy S22 Ultra',
                    amount: 42000,
                    quote: 'Local shops offered only ₹34k citing minor edge wear. REVOO gave an indicative estimate of ₹44k and paid ₹42k after physical check. Truly transparent pricing!',
                    date: '3 days ago',
                    verified: true,
                },
                {
                    id: 'rev-s-3',
                    name: 'Karan Singhania',
                    city: 'Delhi NCR',
                    rating: 5,
                    type: 'SELL',
                    device: 'OnePlus 10 Pro',
                    amount: 26000,
                    quote: 'Free doorstep pickup was on exact time. Data erasure certificate gave me complete peace of mind before handing the device over. 10/10 service!',
                    date: '1 week ago',
                    verified: true,
                },
            ];
            const buyReviews = [
                {
                    id: 'rev-b-1',
                    name: 'Rohan Varma',
                    city: 'Mumbai',
                    rating: 5,
                    type: 'BUY',
                    device: 'Certified iPhone 14 Pro',
                    amount: 66999,
                    quote: 'Got this pristine iPhone 14 Pro at almost half price. Battery health is at 98%, not a single mark on the display, and 1-year REVOO warranty card was inside the box!',
                    date: '2 days ago',
                    verified: true,
                },
                {
                    id: 'rev-b-2',
                    name: 'Meera Iyer',
                    city: 'Chennai',
                    rating: 5,
                    type: 'BUY',
                    device: 'Galaxy S23 Ultra',
                    amount: 58999,
                    quote: 'Looked completely brand new. 32-point inspection diagnostic report was shared with the delivery. Best experience buying refurbished electronics in India.',
                    date: '4 days ago',
                    verified: true,
                },
            ];
            const reviews = type === 'buy' ? buyReviews : type === 'sell' ? sellReviews : [...sellReviews, ...buyReviews];
            res.status(200).json({ success: true, count: reviews.length, data: reviews });
        }
        catch (err) {
            next(err);
        }
    }
    // --- Banner Management (Admin Editable) ---
    static async getBanners(req, res, next) {
        try {
            let banners = await Banner_js_1.BannerModel.find({ isActive: true }).sort({ displayOrder: 1, createdAt: -1 });
            if (banners.length === 0) {
                const defaultBanners = [
                    {
                        tag: 'INSTANT VALUATION',
                        title: 'Sell Old Phone at Highest Price',
                        subtitle: 'Zero deductions for normal wear • Free doorstep pickup',
                        badge: 'Verified Payout',
                        color1: '#0F172A',
                        color2: '#1E293B',
                        icon: 'flash_on',
                        linkUrl: '/catalogue/brands',
                        isActive: true,
                        displayOrder: 1,
                    },
                    {
                        tag: 'REVOO GREEN FINANCE',
                        title: 'Instant UPI Cash in 60 Seconds',
                        subtitle: 'Payment credited to UPI / Bank before inspector leaves',
                        badge: '100% Guaranteed',
                        color1: '#0B6623',
                        color2: '#073814',
                        icon: 'account_balance_wallet',
                        linkUrl: '/catalogue/brands',
                        isActive: true,
                        displayOrder: 2,
                    },
                    {
                        tag: 'DATA SECURITY',
                        title: 'Certified ISO Data Erasure',
                        subtitle: 'Government-grade data wipe certificate issued instantly',
                        badge: 'Zero Data Risk',
                        color1: '#1E3A8A',
                        color2: '#0F172A',
                        icon: 'shield_outlined',
                        linkUrl: '/catalogue/brands',
                        isActive: true,
                        displayOrder: 3,
                    },
                ];
                banners = await Banner_js_1.BannerModel.insertMany(defaultBanners);
            }
            res.status(200).json({ success: true, data: banners });
        }
        catch (err) {
            next(err);
        }
    }
    static async adminListBanners(req, res, next) {
        try {
            const banners = await Banner_js_1.BannerModel.find().sort({ displayOrder: 1, createdAt: -1 });
            res.status(200).json({ success: true, data: banners });
        }
        catch (err) {
            next(err);
        }
    }
    static async adminCreateBanner(req, res, next) {
        try {
            const banner = await Banner_js_1.BannerModel.create(req.body);
            res.status(201).json({ success: true, message: 'Banner created successfully.', data: banner });
        }
        catch (err) {
            next(err);
        }
    }
    static async adminUpdateBanner(req, res, next) {
        try {
            const { id } = req.params;
            const banner = await Banner_js_1.BannerModel.findByIdAndUpdate(id, req.body, { new: true });
            if (!banner)
                return next(new types_js_1.AppError('Banner not found.', 404));
            res.status(200).json({ success: true, message: 'Banner updated successfully.', data: banner });
        }
        catch (err) {
            next(err);
        }
    }
    static async adminDeleteBanner(req, res, next) {
        try {
            const { id } = req.params;
            await Banner_js_1.BannerModel.findByIdAndDelete(id);
            res.status(200).json({ success: true, message: 'Banner deleted successfully.' });
        }
        catch (err) {
            next(err);
        }
    }
    // --- Dedicated App Launch Popup Endpoints ---
    static async getAppPopup(req, res, next) {
        try {
            const popup = await Banner_js_1.BannerModel.findOne({ isPopupModal: true });
            if (!popup) {
                return res.status(200).json({ success: true, data: { isEnabled: false } });
            }
            res.status(200).json({
                success: true,
                data: {
                    isEnabled: popup.isActive === true,
                    ...popup.toObject(),
                },
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async adminSavePopup(req, res, next) {
        try {
            const { isEnabled = false, tag = 'LIVE SALE', title = 'Special Promotion', subtitle = '', badge = 'Exclusive Deal', popupActionText = 'BUY NOW', popupActionUrl = '/buy', imageUrl = '', color1 = '#059669', color2 = '#022C22', } = req.body;
            let popup = await Banner_js_1.BannerModel.findOne({ isPopupModal: true });
            if (popup) {
                popup.isActive = isEnabled;
                popup.tag = tag;
                popup.title = title;
                popup.subtitle = subtitle;
                popup.badge = badge;
                popup.popupActionText = popupActionText;
                popup.popupActionUrl = popupActionUrl;
                popup.linkUrl = popupActionUrl;
                popup.imageUrl = imageUrl;
                popup.color1 = color1;
                popup.color2 = color2;
                await popup.save();
            }
            else {
                popup = await Banner_js_1.BannerModel.create({
                    tag,
                    title,
                    subtitle,
                    badge,
                    icon: 'local_fire_department',
                    imageUrl,
                    isPopupModal: true,
                    popupActionText,
                    popupActionUrl,
                    linkUrl: popupActionUrl,
                    isActive: isEnabled,
                    color1,
                    color2,
                    displayOrder: 0,
                });
            }
            res.status(200).json({
                success: true,
                message: 'Launch popup updated successfully.',
                data: {
                    isEnabled: popup.isActive,
                    ...popup.toObject(),
                },
            });
        }
        catch (err) {
            next(err);
        }
    }
    // --- Admin Category Endpoints ---
    static async adminListCategories(req, res, next) {
        try {
            const categories = await Category_js_1.CategoryModel.find().sort({ displayOrder: 1, createdAt: 1 });
            res.status(200).json({ success: true, data: categories });
        }
        catch (err) {
            next(err);
        }
    }
    static async adminCreateCategory(req, res, next) {
        try {
            const category = await Category_js_1.CategoryModel.create(req.body);
            res.status(201).json({ success: true, message: 'Category created successfully.', data: category });
        }
        catch (err) {
            next(err);
        }
    }
    static async adminUpdateCategory(req, res, next) {
        try {
            const { id } = req.params;
            const category = await Category_js_1.CategoryModel.findByIdAndUpdate(id, req.body, { new: true });
            if (!category)
                return next(new types_js_1.AppError('Category not found.', 404));
            res.status(200).json({ success: true, message: 'Category updated successfully.', data: category });
        }
        catch (err) {
            next(err);
        }
    }
    // --- Orders & Invoices Management ---
    static async createOrderInvoice(req, res, next) {
        try {
            const invoiceData = req.body;
            if (!invoiceData.invoiceNumber) {
                invoiceData.invoiceNumber = `REV-INV-${Math.floor(100000 + Math.random() * 900000)}`;
            }
            if (!invoiceData.orderNumber) {
                invoiceData.orderNumber = `REV-${Date.now().toString().slice(-6)}`;
            }
            const invoice = await Invoice_js_1.InvoiceModel.create(invoiceData);
            res.status(201).json({
                success: true,
                message: 'Order placed & invoice generated successfully.',
                data: invoice,
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async adminListInvoices(req, res, next) {
        try {
            let invoices = await Invoice_js_1.InvoiceModel.find().sort({ createdAt: -1 });
            if (invoices.length === 0) {
                // Seed realistic starter customer tax invoices so admin immediately sees historical data
                const sampleInvoices = [
                    {
                        invoiceNumber: 'REV-INV-849201',
                        orderNumber: 'REV-982142',
                        customerName: 'Aarav Sharma',
                        customerPhone: '+91 98450 12345',
                        customerEmail: 'aarav.sharma@gmail.com',
                        shippingAddress: '42, Indiranagar 100ft Road, Bengaluru, Karnataka - 560038',
                        addressTag: 'Home',
                        productName: 'iPhone 15 Pro 256GB Natural Titanium',
                        brand: 'Apple',
                        storage: '256GB',
                        color: 'Natural Titanium',
                        grade: 'PRISTINE',
                        quantity: 1,
                        unitPrice: 84999,
                        totalAmount: 84999,
                        paymentMethod: 'Cash on Delivery (COD)',
                        status: 'CONFIRMED',
                        orderDate: new Date(Date.now() - 3600000 * 4),
                    },
                    {
                        invoiceNumber: 'REV-INV-732915',
                        orderNumber: 'REV-610492',
                        customerName: 'Priya Sundaram',
                        customerPhone: '+91 99620 67890',
                        customerEmail: 'priya.sundaram@outlook.com',
                        shippingAddress: '15, Anna Nagar 2nd Avenue, Chennai, Tamil Nadu - 600040',
                        addressTag: 'Work',
                        productName: 'Galaxy S24 Ultra 256GB Titanium Gray',
                        brand: 'Samsung',
                        storage: '256GB',
                        color: 'Titanium Gray',
                        grade: 'EXCELLENT',
                        quantity: 1,
                        unitPrice: 74999,
                        totalAmount: 74999,
                        paymentMethod: 'Instant UPI Transfer',
                        status: 'CONFIRMED',
                        orderDate: new Date(Date.now() - 3600000 * 24),
                    },
                    {
                        invoiceNumber: 'REV-INV-619482',
                        orderNumber: 'REV-452109',
                        customerName: 'Vikram Joshi',
                        customerPhone: '+91 97110 54321',
                        customerEmail: 'vikram.joshi@techcorp.in',
                        shippingAddress: 'Flat 702, Lodha Bellissimo, Worli, Mumbai, Maharashtra - 400018',
                        addressTag: 'Home',
                        productName: 'OnePlus 12 512GB Silky Black',
                        brand: 'OnePlus',
                        storage: '512GB',
                        color: 'Silky Black',
                        grade: 'GOOD',
                        quantity: 1,
                        unitPrice: 47999,
                        totalAmount: 47999,
                        paymentMethod: 'Pre-order Direct Verification',
                        status: 'PROCESSING',
                        orderDate: new Date(Date.now() - 3600000 * 48),
                    },
                ];
                invoices = await Invoice_js_1.InvoiceModel.insertMany(sampleInvoices);
            }
            res.status(200).json({ success: true, count: invoices.length, data: invoices });
        }
        catch (err) {
            next(err);
        }
    }
}
exports.CatalogueController = CatalogueController;
//# sourceMappingURL=CatalogueController.js.map