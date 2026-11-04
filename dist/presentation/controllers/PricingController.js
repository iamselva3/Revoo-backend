"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PricingController = void 0;
const PricingRule_js_1 = require("../../infrastructure/database/models/PricingRule.js");
const PricingHistory_js_1 = require("../../infrastructure/database/models/PricingHistory.js");
const types_js_1 = require("../../shared/types.js");
const audit_middleware_js_1 = require("../middlewares/audit.middleware.js");
class PricingController {
    static async getPricingRuleForModel(req, res, next) {
        try {
            const { modelId } = req.params;
            const { variantId } = req.query;
            const query = { modelId, isActive: true };
            if (variantId)
                query.variantId = variantId;
            const rule = await PricingRule_js_1.PricingRuleModel.findOne(query).sort({ version: -1 });
            if (!rule) {
                return next(new types_js_1.AppError('No active pricing rule found for this model/variant.', 404));
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