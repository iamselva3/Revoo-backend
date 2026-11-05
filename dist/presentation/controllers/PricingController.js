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
class PricingController {
    static async getPricingRuleForModel(req, res, next) {
        try {
            const { modelId } = req.params;
            const { variantId } = req.query;
            const query = { modelId, isActive: true };
            if (variantId)
                query.variantId = variantId;
            let rule = await PricingRule_js_1.PricingRuleModel.findOne(query).sort({ version: -1 });
            if (!rule) {
                rule = await PricingRule_js_1.PricingRuleModel.findOne({ modelId, isActive: true }).sort({ version: -1 });
            }
            if (!rule) {
                let model = null;
                if (mongoose_1.default.Types.ObjectId.isValid(modelId)) {
                    model = await SmartphoneModel_js_1.SmartphoneModel.findById(modelId);
                }
                if (!model) {
                    model = await SmartphoneModel_js_1.SmartphoneModel.findOne({ slug: modelId });
                }
                const modelBasePrice = model?.basePrice || 45000;
                return res.status(200).json({
                    success: true,
                    data: {
                        modelId,
                        basePrice: modelBasePrice,
                        storagePriceAdjustment: 0,
                        version: 1,
                        isActive: true,
                        deductions: {
                            display: { FLAWLESS: 0, MINOR_SCRATCHES: 1000, DEEP_SCRATCHES: 2500, CRACKED_GLASS: 4500, BROKEN_OR_DEAD_PIXELS: 7000 },
                            body: { FLAWLESS: 0, MINOR_SIGNS_OF_USE: 500, DENTED_OR_SCRATCHED: 1500, BENT_OR_CRACKED_BACK: 3500 },
                            battery: { EXCELLENT: 0, GOOD: 800, DEGRADED: 2000 },
                            functional: { frontCameraFaulty: 1500, backCameraFaulty: 2500, faceIdOrFingerprintFaulty: 2000, speakerOrMicFaulty: 1000, chargingPortFaulty: 1200, wirelessOrBluetoothFaulty: 1500 },
                            accessoriesBonus: { hasOriginalBox: 500, hasOriginalCharger: 500 },
                        },
                    },
                });
            }
            res.status(200).json({ success: true, data: rule });
        }
        catch (err) {
            next(err);
        }
    }
    static async updatePricingRule(req, res, next) {
        try {
            const { modelId } = req.params;
            const { variantId, basePrice, storagePriceAdjustment, deductions, reasonForChange } = req.body;
            const query = { modelId, isActive: true };
            if (variantId)
                query.variantId = variantId;
            const existingRule = await PricingRule_js_1.PricingRuleModel.findOne(query).sort({ version: -1 });
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
                version: newVersion,
                isActive: true,
                effectiveFrom: new Date(),
                updatedByAdminId: req.admin?.id,
            });
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