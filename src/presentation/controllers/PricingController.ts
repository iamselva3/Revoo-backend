import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { PricingRuleModel } from '../../infrastructure/database/models/PricingRule.js';
import { PricingHistoryModel } from '../../infrastructure/database/models/PricingHistory.js';
import { SmartphoneModel } from '../../infrastructure/database/models/SmartphoneModel.js';
import { AppError } from '../../shared/types.js';
import { logAuditEvent } from '../middlewares/audit.middleware.js';
import { AuthenticatedAdminRequest } from '../middlewares/auth.middleware.js';
import { ValuationEngine } from '../../domain/services/ValuationEngine.js';

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

export class PricingController {
  public static async getPricingRuleForModel(req: AuthenticatedAdminRequest, res: Response, next: NextFunction) {
    try {
      const { modelId } = req.params;
      const { variantId } = req.query;

      const query: any = { modelId, isActive: true };
      if (variantId) query.variantId = variantId;

      let rule = await PricingRuleModel.findOne(query).sort({ version: -1 });
      if (!rule) {
        rule = await PricingRuleModel.findOne({ modelId, isActive: true }).sort({ version: -1 });
      }

      if (!rule) {
        let model = null;
        if (mongoose.Types.ObjectId.isValid(modelId)) {
          model = await SmartphoneModel.findById(modelId);
        }
        if (!model) {
          model = await SmartphoneModel.findOne({ slug: modelId });
        }

        const modelBasePrice = model?.basePrice || 45000;
        const deviceAge = await modelDeviceAge(model?._id);
        return res.status(200).json({
          success: true,
          data: {
            modelId,
            basePrice: modelBasePrice,
            storagePriceAdjustment: 0,
            version: 1,
            isActive: true,
            deductions: {
              // Legacy
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

              // DOFY Deductions (Calculated ₹ amounts)
              basicQuestions: {
                phoneNotWorking: Math.round(modelBasePrice * 0.60),
                touchscreenNotWorking: Math.round(modelBasePrice * 0.15),
                displayNotOriginal: Math.round(modelBasePrice * 0.10),
                noWarranty: Math.round(modelBasePrice * 0.05),
              },
              backPanel: {
                NO_DEFECTS: 0,
                MINOR_SCRATCHES: Math.round(modelBasePrice * 0.03),
                HEAVY_SCRATCHES: Math.round(modelBasePrice * 0.08),
                BACK_PANEL_BROKEN: Math.round(modelBasePrice * 0.15),
              },
              sidePanel: {
                NO_DEFECTS: 0,
                MINOR_DENT_OR_SCRATCHES: Math.round(modelBasePrice * 0.03),
                HEAVY_DENT: Math.round(modelBasePrice * 0.08),
                BENT_OR_BROKEN: Math.round(modelBasePrice * 0.12),
              },
              hardwareFaults: {
                powerButtonNotWorking: Math.round(modelBasePrice * 0.05),
                volumeButtonNotWorking: Math.round(modelBasePrice * 0.03),
                chargingPortNotWorking: Math.round(modelBasePrice * 0.08),
                earSpeakerNotWorking: Math.round(modelBasePrice * 0.03),
                proximitySensorNotWorking: Math.round(modelBasePrice * 0.03),
                wifiOrBluetoothNotWorking: Math.round(modelBasePrice * 0.05),
                vibratorNotWorking: Math.round(modelBasePrice * 0.02),
              },
              accessoriesBonus: { hasOriginalBox: 500, hasOriginalCharger: 500 },
            },
            deductionPercentages: {
              ...(deviceAge ? { deviceAge } : {}),
              // Legacy
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

              // DOFY Percentages
              basicQuestions: {
                phoneNotWorking: 60,
                touchscreenNotWorking: 15,
                displayNotOriginal: 10,
                noWarranty: 5,
              },
              backPanel: {
                NO_DEFECTS: 0,
                MINOR_SCRATCHES: 3,
                HEAVY_SCRATCHES: 8,
                BACK_PANEL_BROKEN: 15,
              },
              sidePanel: {
                NO_DEFECTS: 0,
                MINOR_DENT_OR_SCRATCHES: 3,
                HEAVY_DENT: 8,
                BENT_OR_BROKEN: 12,
              },
              hardwareFaults: {
                powerButtonNotWorking: 5,
                volumeButtonNotWorking: 3,
                chargingPortNotWorking: 8,
                earSpeakerNotWorking: 3,
                proximitySensorNotWorking: 3,
                wifiOrBluetoothNotWorking: 5,
                vibratorNotWorking: 2,
              },
            },
          },
        });
      }

      // If rule doesn't have deductionPercentages stored, calculate them dynamically from deductions and basePrice
      const ruleObj = rule.toObject();
      if (!ruleObj.deductionPercentages && ruleObj.basePrice > 0) {
        const bp = ruleObj.basePrice;
        const calcPct = (amt: number) => Math.round(((amt || 0) / bp) * 100);
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
          basicQuestions: {
            phoneNotWorking: calcPct((ruleObj.deductions as any)?.basicQuestions?.phoneNotWorking) || 60,
            touchscreenNotWorking: calcPct((ruleObj.deductions as any)?.basicQuestions?.touchscreenNotWorking) || 15,
            displayNotOriginal: calcPct((ruleObj.deductions as any)?.basicQuestions?.displayNotOriginal) || 10,
            noWarranty: calcPct((ruleObj.deductions as any)?.basicQuestions?.noWarranty) || 5,
          },
          backPanel: {
            NO_DEFECTS: 0,
            MINOR_SCRATCHES: calcPct((ruleObj.deductions as any)?.backPanel?.MINOR_SCRATCHES) || 3,
            HEAVY_SCRATCHES: calcPct((ruleObj.deductions as any)?.backPanel?.HEAVY_SCRATCHES) || 8,
            BACK_PANEL_BROKEN: calcPct((ruleObj.deductions as any)?.backPanel?.BACK_PANEL_BROKEN) || 15,
          },
          sidePanel: {
            NO_DEFECTS: 0,
            MINOR_DENT_OR_SCRATCHES: calcPct((ruleObj.deductions as any)?.sidePanel?.MINOR_DENT_OR_SCRATCHES) || 3,
            HEAVY_DENT: calcPct((ruleObj.deductions as any)?.sidePanel?.HEAVY_DENT) || 8,
            BENT_OR_BROKEN: calcPct((ruleObj.deductions as any)?.sidePanel?.BENT_OR_BROKEN) || 12,
          },
          hardwareFaults: {
            powerButtonNotWorking: calcPct((ruleObj.deductions as any)?.hardwareFaults?.powerButtonNotWorking) || 5,
            volumeButtonNotWorking: calcPct((ruleObj.deductions as any)?.hardwareFaults?.volumeButtonNotWorking) || 3,
            chargingPortNotWorking: calcPct((ruleObj.deductions as any)?.hardwareFaults?.chargingPortNotWorking) || 8,
            earSpeakerNotWorking: calcPct((ruleObj.deductions as any)?.hardwareFaults?.earSpeakerNotWorking) || 3,
            proximitySensorNotWorking: calcPct((ruleObj.deductions as any)?.hardwareFaults?.proximitySensorNotWorking) || 3,
            wifiOrBluetoothNotWorking: calcPct((ruleObj.deductions as any)?.hardwareFaults?.wifiOrBluetoothNotWorking) || 5,
            vibratorNotWorking: calcPct((ruleObj.deductions as any)?.hardwareFaults?.vibratorNotWorking) || 2,
          },
        };
      }

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

