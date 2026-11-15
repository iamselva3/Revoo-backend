"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PricingController = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const PricingRule_js_1 = require("../../infrastructure/database/models/PricingRule.js");
const PricingHistory_js_1 = require("../../infrastructure/database/models/PricingHistory.js");
const SmartphoneModel_js_1 = require("../../infrastructure/database/models/SmartphoneModel.js");
const audit_middleware_js_1 = require("../middlewares/audit.middleware.js");
const ValuationEngine_js_1 = require("../../domain/services/ValuationEngine.js");
/**
 * Phone-age % live on the model (SmartphoneModel.deviceAgeDeductions) so the model editor and this
 * page edit the same numbers. This page shows them as deductionPercentages.deviceAge.
 */
const modelDeviceAge = async (modelId) => {
    if (!modelId || !mongoose_1.default.Types.ObjectId.isValid(String(modelId)))
        return undefined;
    const model = await SmartphoneModel_js_1.SmartphoneModel.findById(modelId).select('deviceAgeDeductions').lean();
    const age = ValuationEngine_js_1.ValuationEngine.sanitizeDeviceAgePercentages(model?.deviceAgeDeductions);
    return age && Object.keys(age).length > 0 ? age : undefined;
};
/**
 * % for every customer answer as the Pricing window shows them (whole numbers): the saved value, or
 * the engine's default for anything not saved. Exactly what the price engine applies.
 */
const withOptionDefaults = (saved) => {
    const out = { ...(saved || {}) };
    for (const [section, fields] of Object.entries(ValuationEngine_js_1.PRICING_OPTIONS)) {
        const merged = { ...(saved?.[section] || {}) };
        for (const [field, option] of Object.entries(fields)) {
            const v = saved?.[section]?.[field];
            merged[field] = v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v)) ? Number(v) : option.pct;
        }
        out[section] = merged;
    }
    return out;
};
/** The model-wide rule the price engine uses (the newest one without a variant). */
const findModelRule = (modelId) => PricingRule_js_1.PricingRuleModel.findOne({ modelId, isActive: true, variantId: null }).sort({ version: -1, updatedAt: -1 });
class PricingController {
    static async getPricingRuleForModel(req, res, next) {
        try {
            const { modelId } = req.params;
            const { variantId } = req.query;
            let rule = variantId
                ? await PricingRule_js_1.PricingRuleModel.findOne({ modelId, variantId, isActive: true }).sort({ version: -1 })
                : null;
            if (!rule)
                rule = await findModelRule(modelId);
            if (!rule)
                rule = await PricingRule_js_1.PricingRuleModel.findOne({ modelId, isActive: true }).sort({ version: -1 });
            if (!rule) {
                let model = null;
                if (mongoose_1.default.Types.ObjectId.isValid(modelId)) {
                    model = await SmartphoneModel_js_1.SmartphoneModel.findById(modelId);
                }
                if (!model) {
                    model = await SmartphoneModel_js_1.SmartphoneModel.findOne({ slug: modelId });
                }
                const deviceAge = await modelDeviceAge(model?._id);
                return res.status(200).json({
                    success: true,
                    data: {
                        modelId,
                        basePrice: model?.basePrice || 0,
                        storagePriceAdjustment: 0,
                        version: 1,
                        isActive: true,
                        deductions: { accessoriesBonus: { hasOriginalBox: 500, hasOriginalCharger: 500 } },
                        deductionPercentages: { ...withOptionDefaults(undefined), ...(deviceAge ? { deviceAge } : {}) },
                    },
                });
            }
            const ruleObj = rule.toObject();
            ruleObj.deductionPercentages = withOptionDefaults(ruleObj.deductionPercentages);
            const deviceAge = await modelDeviceAge(ruleObj.modelId);
            if (deviceAge)
                ruleObj.deductionPercentages = { ...(ruleObj.deductionPercentages || {}), deviceAge };
            res.status(200).json({ success: true, data: ruleObj });
        }
        catch (err) {
            next(err);
        }
    }
    static async updatePricingRule(req, res, next) {
        try {
            const { modelId } = req.params;
            const { variantId, basePrice, storagePriceAdjustment, deductions, deductionPercentages, minScrapPrice, customDeductions, customPercentages, criticalKeys, reasonForChange, } = req.body;
            const existingRule = variantId
                ? await PricingRule_js_1.PricingRuleModel.findOne({ modelId, variantId, isActive: true }).sort({ version: -1 })
                : await findModelRule(modelId);
            const previousVersion = existingRule ? existingRule.version : 0;
            const newVersion = previousVersion + 1;
            // Mark previous rule as superseded
            if (existingRule) {
                existingRule.isActive = false;
                await existingRule.save();
            }
            // Create new immutable versioned pricing rule
            const newRule = await PricingRule_js_1.PricingRuleModel.create({
                modelId,
                variantId,
                basePrice,
                storagePriceAdjustment: storagePriceAdjustment || 0,
                deductions,
                deductionPercentages,
                minScrapPrice,
                customDeductions,
                customPercentages,
                criticalKeys,
                version: newVersion,
                isActive: true,
                effectiveFrom: new Date(),
                updatedByAdminId: req.admin?.id,
            });
            // Phone-age % are kept on the model (shared with the model editor)
            const deviceAge = ValuationEngine_js_1.ValuationEngine.sanitizeDeviceAgePercentages(deductionPercentages?.deviceAge);
            if (deviceAge && mongoose_1.default.Types.ObjectId.isValid(String(modelId))) {
                await SmartphoneModel_js_1.SmartphoneModel.updateOne({ _id: modelId }, { $set: { deviceAgeDeductions: deviceAge } });
            }
            // Record detailed pricing history audit
            await PricingHistory_js_1.PricingHistoryModel.create({
                pricingRuleId: newRule._id,
                modelId,
                changedByAdminId: req.admin?.id,
                changedByAdminName: req.admin?.fullName,
                previousValues: existingRule ? existingRule.toObject() : {},
                newValues: newRule.toObject(),
                reason: reasonForChange || 'Price adjustment by admin',
            });
            await (0, audit_middleware_js_1.logAuditEvent)({
                req,
                actorType: 'ADMIN',
                actorId: req.admin?.id,
                actorEmail: req.admin?.email,
                action: 'UPDATE_PRICING_RULE',
                resourceType: 'PricingRule',
                resourceId: newRule._id.toString(),
                diff: {
                    modelId,
                    version: newVersion,
                    basePrice,
                    storagePriceAdjustment,
                },
            });
            res.status(200).json({
                success: true,
                message: `Pricing rule updated to version ${newVersion}.`,
                data: newRule,
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async getPricingHistory(req, res, next) {
        try {
            const { modelId } = req.params;
            const history = await PricingHistory_js_1.PricingHistoryModel.find({ modelId })
                .populate('changedByAdminId', 'fullName email')
                .sort({ createdAt: -1 });
            res.status(200).json({ success: true, data: history });
        }
        catch (err) {
            next(err);
        }
    }
}
exports.PricingController = PricingController;
//# sourceMappingURL=PricingController.js.map