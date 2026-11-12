"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DevicePriceResolver = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const SmartphoneModel_js_1 = require("../database/models/SmartphoneModel.js");
const StorageVariant_js_1 = require("../database/models/StorageVariant.js");
const PricingRule_js_1 = require("../database/models/PricingRule.js");
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const normalizeCapacity = (value) => value.toLowerCase().replace(/\s+/g, '');
const ruleVariantId = (rule) => {
    const id = rule?.variantId ?? rule?.storageVariantId;
    return id ? String(id) : null;
};
const hasEngineConfig = (rule) => Boolean(rule &&
    (rule.customDeductions ||
        rule.customPercentages ||
        rule.minScrapPrice ||
        rule.customScrapFloor ||
        rule.criticalKeys ||
        rule.criticalFaults));
class DevicePriceResolver {
    static variantPrice(model, variant) {
        const base = Number(model?.basePrice) || 0;
        const modifier = Number(variant?.priceModifier) || 0;
        return Math.max(0, Math.round(base + modifier));
    }
    /** Bulk "up to" price ranges for listings (one query for all variants). */
    static async priceRanges(models) {
        const ranges = new Map();
        if (models.length === 0)
            return ranges;
        const variants = await StorageVariant_js_1.StorageVariantModel.find({
            modelId: { $in: models.map((m) => m._id) },
            isPublished: true,
        })
            .select('modelId priceModifier')
            .lean();
        const modifiersByModel = new Map();
        for (const v of variants) {
            const key = String(v.modelId);
            const list = modifiersByModel.get(key) ?? [];
            list.push(Number(v.priceModifier) || 0);
            modifiersByModel.set(key, list);
        }
        for (const m of models) {
            const modifiers = modifiersByModel.get(String(m._id)) ?? [];
            const prices = (modifiers.length > 0 ? modifiers : [0]).map((mod) => DevicePriceResolver.variantPrice(m, { priceModifier: mod }));
            ranges.set(String(m._id), {
                minPrice: Math.min(...prices),
                maxPrice: Math.max(...prices),
                variantCount: modifiers.length,
            });
        }
        return ranges;
    }
    /** Finds a model by id, slug or exact name. Never falls back to an unrelated model. */
    static async findModel(modelRef, modelName) {
        const ref = typeof modelRef === 'string' ? modelRef.trim() : '';
        const name = typeof modelName === 'string' ? modelName.trim() : '';
        if (ref && mongoose_1.default.Types.ObjectId.isValid(ref)) {
            const byId = await SmartphoneModel_js_1.SmartphoneModel.findById(ref).populate('brandId', 'name logoUrl');
            if (byId)
                return byId;
        }
        const candidates = [ref, name].filter(Boolean);
        for (const candidate of candidates) {
            const bySlugOrName = await SmartphoneModel_js_1.SmartphoneModel.findOne({
                $or: [
                    { slug: candidate.toLowerCase() },
                    { name: new RegExp(`^${escapeRegex(candidate)}$`, 'i') },
                ],
            }).populate('brandId', 'name logoUrl');
            if (bySlugOrName)
                return bySlugOrName;
        }
        return null;
    }
    /** Finds a variant of the given model by id, falling back to an exact capacity match. */
    static async findVariant(modelId, variantRef, capacity) {
        const ref = typeof variantRef === 'string' ? variantRef.trim() : '';
        if (ref && mongoose_1.default.Types.ObjectId.isValid(ref)) {
            const byId = await StorageVariant_js_1.StorageVariantModel.findOne({ _id: ref, modelId });
            if (byId)
                return byId;
        }
        const wanted = [ref, typeof capacity === 'string' ? capacity : '']
            .map((c) => c.trim())
            .filter(Boolean)
            .map(normalizeCapacity);
        if (wanted.length === 0)
            return null;
        const variants = await StorageVariant_js_1.StorageVariantModel.find({ modelId });
        return variants.find((v) => wanted.includes(normalizeCapacity(v.capacity))) ?? null;
    }
    /**
     * The rule that configures the valuation engine for this device: a variant-specific rule that
     * carries engine config wins, otherwise the latest model-level rule.
     */
    static async findConfigRule(modelId, variantId) {
        const rules = await PricingRule_js_1.PricingRuleModel.find({ modelId, isActive: true })
            .sort({ version: -1, updatedAt: -1 })
            .lean();
        if (variantId) {
            const variantRule = rules.find((r) => ruleVariantId(r) === String(variantId) && hasEngineConfig(r));
            if (variantRule)
                return variantRule;
        }
        return rules.find((r) => ruleVariantId(r) === null) ?? null;
    }
    static async resolve(params) {
        const model = await DevicePriceResolver.findModel(params.modelId, params.modelName);
        if (!model)
            return null;
        const variant = await DevicePriceResolver.findVariant(model._id, params.variantId, params.variantCapacity);
        const configRule = await DevicePriceResolver.findConfigRule(model._id, variant?._id);
        const basePrice = Number(model.basePrice) || 0;
        const variantAdjustment = Number(variant?.priceModifier) || 0;
        return {
            model,
            variant,
            basePrice,
            variantAdjustment,
            maxPrice: DevicePriceResolver.variantPrice(model, variant),
            configRule,
        };
    }
}
exports.DevicePriceResolver = DevicePriceResolver;
//# sourceMappingURL=DevicePriceResolver.js.map