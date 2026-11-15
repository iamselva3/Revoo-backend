import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { PricingRuleModel } from '../../infrastructure/database/models/PricingRule.js';
import { PricingHistoryModel } from '../../infrastructure/database/models/PricingHistory.js';
import { SmartphoneModel } from '../../infrastructure/database/models/SmartphoneModel.js';
import { AppError } from '../../shared/types.js';
import { logAuditEvent } from '../middlewares/audit.middleware.js';
import { AuthenticatedAdminRequest } from '../middlewares/auth.middleware.js';
import { ValuationEngine, PRICING_OPTIONS } from '../../domain/services/ValuationEngine.js';

/**
 * Phone-age % live on the model (SmartphoneModel.deviceAgeDeductions) so the model editor and this
 * page edit the same numbers. This page shows them as deductionPercentages.deviceAge.
 */
const modelDeviceAge = async (modelId: unknown) => {
  if (!modelId || !mongoose.Types.ObjectId.isValid(String(modelId))) return undefined;
  const model: any = await SmartphoneModel.findById(modelId).select('deviceAgeDeductions').lean();
  const age = ValuationEngine.sanitizeDeviceAgePercentages(model?.deviceAgeDeductions);
  return age && Object.keys(age).length > 0 ? age : undefined;
};

/**
 * % for every customer answer as the Pricing window shows them (whole numbers): the saved value, or
 * the engine's default for anything not saved. Exactly what the price engine applies.
 */
const withOptionDefaults = (saved: any) => {
  const out: any = { ...(saved || {}) };
  for (const [section, fields] of Object.entries(PRICING_OPTIONS)) {
    const merged: Record<string, number> = { ...(saved?.[section] || {}) };
    for (const [field, option] of Object.entries(fields)) {
      const v = saved?.[section]?.[field];
      merged[field] = v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v)) ? Number(v) : option.pct;
    }
    out[section] = merged;
  }
  return out;
};

/** The model-wide rule the price engine uses (the newest one without a variant). */
const findModelRule = (modelId: unknown) =>
  PricingRuleModel.findOne({ modelId, isActive: true, variantId: null }).sort({ version: -1, updatedAt: -1 });

export class PricingController {
  public static async getPricingRuleForModel(req: AuthenticatedAdminRequest, res: Response, next: NextFunction) {
    try {
      const { modelId } = req.params;
      const { variantId } = req.query;

      let rule = variantId
        ? await PricingRuleModel.findOne({ modelId, variantId, isActive: true }).sort({ version: -1 })
        : null;
      if (!rule) rule = await findModelRule(modelId);
      if (!rule) rule = await PricingRuleModel.findOne({ modelId, isActive: true }).sort({ version: -1 });

      if (!rule) {
        let model = null;
        if (mongoose.Types.ObjectId.isValid(modelId)) {
          model = await SmartphoneModel.findById(modelId);
        }
        if (!model) {
          model = await SmartphoneModel.findOne({ slug: modelId });
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

      const ruleObj: any = rule.toObject();
      ruleObj.deductionPercentages = withOptionDefaults(ruleObj.deductionPercentages);

      const deviceAge = await modelDeviceAge(ruleObj.modelId);
      if (deviceAge) ruleObj.deductionPercentages = { ...(ruleObj.deductionPercentages || {}), deviceAge };

      res.status(200).json({ success: true, data: ruleObj });
    } catch (err) {
      next(err);
    }
  }

  public static async updatePricingRule(req: AuthenticatedAdminRequest, res: Response, next: NextFunction) {
    try {
      const { modelId } = req.params;
      const {
        variantId,
        basePrice,
        storagePriceAdjustment,
        deductions,
        deductionPercentages,
        minScrapPrice,
        customDeductions,
        customPercentages,
        criticalKeys,
        reasonForChange,
      } = req.body;

      const existingRule = variantId
        ? await PricingRuleModel.findOne({ modelId, variantId, isActive: true }).sort({ version: -1 })
        : await findModelRule(modelId);
      const previousVersion = existingRule ? existingRule.version : 0;
      const newVersion = previousVersion + 1;

      // Mark previous rule as superseded
      if (existingRule) {
        existingRule.isActive = false;
        await existingRule.save();
      }

      // Create new immutable versioned pricing rule
      const newRule = await PricingRuleModel.create({
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
      } as any);

      // Phone-age % are kept on the model (shared with the model editor)
      const deviceAge = ValuationEngine.sanitizeDeviceAgePercentages(deductionPercentages?.deviceAge);
      if (deviceAge && mongoose.Types.ObjectId.isValid(String(modelId))) {
        await SmartphoneModel.updateOne({ _id: modelId }, { $set: { deviceAgeDeductions: deviceAge } });
      }

      // Record detailed pricing history audit
      await PricingHistoryModel.create({
        pricingRuleId: newRule._id,
        modelId,
        changedByAdminId: req.admin?.id,
        changedByAdminName: req.admin?.fullName,
        previousValues: existingRule ? existingRule.toObject() : {},
        newValues: newRule.toObject(),
        reason: reasonForChange || 'Price adjustment by admin',
      });

      await logAuditEvent({
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
    } catch (err) {
      next(err);
    }
  }

  public static async getPricingHistory(req: AuthenticatedAdminRequest, res: Response, next: NextFunction) {
    try {
      const { modelId } = req.params;
      const history = await PricingHistoryModel.find({ modelId })
        .populate('changedByAdminId', 'fullName email')
        .sort({ createdAt: -1 });

      res.status(200).json({ success: true, data: history });
    } catch (err) {
      next(err);
    }
  }
}

