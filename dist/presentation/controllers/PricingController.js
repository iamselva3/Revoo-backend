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
                            display: {
                                FLAWLESS: 0,
                                MINOR_SCRATCHES: Math.round(modelBasePrice * 0.08),
                                DEEP_SCRATCHES: Math.round(modelBasePrice * 0.15),
                                CRACKED_GLASS: Math.round(modelBasePrice * 0.30),
                                BROKEN_OR_DEAD_PIXELS: Math.round(modelBasePrice * 0.50),
                            },
                            body: {
                                FLAWLESS: 0,
                                MINOR_SIGNS_OF_USE: Math.round(modelBasePrice * 0.04),
                                DENTED_OR_SCRATCHED: Math.round(modelBasePrice * 0.10),
                                BENT_OR_CRACKED_BACK: Math.round(modelBasePrice * 0.20),
                            },
                            battery: {
                                EXCELLENT: 0,
                                GOOD: Math.round(modelBasePrice * 0.05),
                                DEGRADED: Math.round(modelBasePrice * 0.10),
                            },
                            functional: {
                                frontCameraFaulty: Math.round(modelBasePrice * 0.08),
                                backCameraFaulty: Math.round(modelBasePrice * 0.12),
                                faceIdOrFingerprintFaulty: Math.round(modelBasePrice * 0.10),
                                speakerOrMicFaulty: Math.round(modelBasePrice * 0.05),
                                chargingPortFaulty: Math.round(modelBasePrice * 0.06),
                                wirelessOrBluetoothFaulty: Math.round(modelBasePrice * 0.07),
                            },
                            accessoriesBonus: { hasOriginalBox: 500, hasOriginalCharger: 500 },
                        },
                        deductionPercentages: {
                            display: { FLAWLESS: 0, MINOR_SCRATCHES: 8, DEEP_SCRATCHES: 15, CRACKED_GLASS: 30, BROKEN_OR_DEAD_PIXELS: 50 },
                            body: { FLAWLESS: 0, MINOR_SIGNS_OF_USE: 4, DENTED_OR_SCRATCHED: 10, BENT_OR_CRACKED_BACK: 20 },
                            battery: { EXCELLENT: 0, GOOD: 5, DEGRADED: 10 },
                            functional: {
                                frontCameraFaulty: 8,
                                backCameraFaulty: 12,
                                faceIdOrFingerprintFaulty: 10,
                                speakerOrMicFaulty: 5,
                                chargingPortFaulty: 6,
                                wirelessOrBluetoothFaulty: 7,
                            },
                        },
                    },
                });
            }
            // If rule doesn't have deductionPercentages stored, calculate them dynamically from deductions and basePrice
            const ruleObj = rule.toObject();
            if (!ruleObj.deductionPercentages && ruleObj.basePrice > 0) {
                const bp = ruleObj.basePrice;
                const calcPct = (amt) => Math.round(((amt || 0) / bp) * 100);
                ruleObj.deductionPercentages = {
                    display: {
                        FLAWLESS: 0,
                        MINOR_SCRATCHES: calcPct(ruleObj.deductions?.display?.MINOR_SCRATCHES) || 8,
                        DEEP_SCRATCHES: calcPct(ruleObj.deductions?.display?.DEEP_SCRATCHES) || 15,
                        CRACKED_GLASS: calcPct(ruleObj.deductions?.display?.CRACKED_GLASS) || 30,
                        BROKEN_OR_DEAD_PIXELS: calcPct(ruleObj.deductions?.display?.BROKEN_OR_DEAD_PIXELS) || 50,
                    },
                    body: {
                        FLAWLESS: 0,
                        MINOR_SIGNS_OF_USE: calcPct(ruleObj.deductions?.body?.MINOR_SIGNS_OF_USE) || 4,
                        DENTED_OR_SCRATCHED: calcPct(ruleObj.deductions?.body?.DENTED_OR_SCRATCHED) || 10,
                        BENT_OR_CRACKED_BACK: calcPct(ruleObj.deductions?.body?.BENT_OR_CRACKED_BACK) || 20,
                    },
                    battery: {
                        EXCELLENT: 0,
                        GOOD: calcPct(ruleObj.deductions?.battery?.GOOD) || 5,
                        DEGRADED: calcPct(ruleObj.deductions?.battery?.DEGRADED) || 10,
                    },
                    functional: {
                        frontCameraFaulty: calcPct(ruleObj.deductions?.functional?.frontCameraFaulty) || 8,
                        backCameraFaulty: calcPct(ruleObj.deductions?.functional?.backCameraFaulty) || 12,
                        faceIdOrFingerprintFaulty: calcPct(ruleObj.deductions?.functional?.faceIdOrFingerprintFaulty) || 10,
                        speakerOrMicFaulty: calcPct(ruleObj.deductions?.functional?.speakerOrMicFaulty) || 5,
                        chargingPortFaulty: calcPct(ruleObj.deductions?.functional?.chargingPortFaulty) || 6,
                        wirelessOrBluetoothFaulty: calcPct(ruleObj.deductions?.functional?.wirelessOrBluetoothFaulty) || 7,
                    },
                };
            }
            res.status(200).json({ success: true, data: ruleObj });
        }
        catch (err) {
            next(err);
        }
    }
    static async updatePricingRule(req, res, next) {
        try {
            const { modelId } = req.params;
            const { variantId, basePrice, storagePriceAdjustment, deductions, deductionPercentages, reasonForChange } = req.body;
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
                deductionPercentages,
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