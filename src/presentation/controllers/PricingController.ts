import { Response, NextFunction } from 'express';
import { PricingRuleModel } from '../../infrastructure/database/models/PricingRule.js';
import { PricingHistoryModel } from '../../infrastructure/database/models/PricingHistory.js';
import { AppError } from '../../shared/types.js';
import { logAuditEvent } from '../middlewares/audit.middleware.js';
import { AuthenticatedAdminRequest } from '../middlewares/auth.middleware.js';

export class PricingController {
  public static async getPricingRuleForModel(req: AuthenticatedAdminRequest, res: Response, next: NextFunction) {
    try {
      const { modelId } = req.params;
      const { variantId } = req.query;

      const query: any = { modelId, isActive: true };
      if (variantId) query.variantId = variantId;

      const rule = await PricingRuleModel.findOne(query).sort({ version: -1 });
      if (!rule) {
        return next(new AppError('No active pricing rule found for this model/variant.', 404));
      }

      res.status(200).json({ success: true, data: rule });
    } catch (err) {
      next(err);
    }
  }

  public static async updatePricingRule(req: AuthenticatedAdminRequest, res: Response, next: NextFunction) {
    try {
      const { modelId } = req.params;
      const { variantId, basePrice, storagePriceAdjustment, deductions, reasonForChange } = req.body;

      const query: any = { modelId, isActive: true };
      if (variantId) query.variantId = variantId;

      const existingRule = await PricingRuleModel.findOne(query).sort({ version: -1 });
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
        version: newVersion,
        isActive: true,
        effectiveFrom: new Date(),
        updatedByAdminId: req.admin?.id,
      });

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

