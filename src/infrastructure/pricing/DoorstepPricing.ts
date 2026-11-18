import mongoose from 'mongoose';
import { ValuationEngine } from '../../domain/services/ValuationEngine.js';
import { DevicePriceResolver } from './DevicePriceResolver.js';
import { PriceChangeLine } from '../database/models/DoorstepCheck.js';

/**
 * Prices for the pickup partner's check at the door (partner app).
 *
 * The admin's prices decide everything: the same engine and the same per-model settings as the
 * customer's quote. The final price is the customer's quote, plus or minus what the partner's
 * changed answers change, so:
 *   - nothing changed at the door → the customer gets exactly the quoted price (even if prices
 *     moved since booking);
 *   - a changed answer takes off what that answer takes off for this phone;
 *   - never below the "doesn't switch on" price, never above the top-condition price.
 */

export interface DevicePrice {
  amount: number;
  breakdown: Array<{ component: string; description?: string; adjustment: number }>;
  storage: string;
  variantId?: string;
}

/** Best condition: everything perfect, under warranty, newest, with charger, box and bill. */
export const BEST_CONDITION = {
  basicQuestions: { isPhoneWorking: true, isTouchscreenWorking: true, isDisplayOriginal: true, hasValidWarranty: true },
  screenDisplayCondition: 'NO_SPOT',
  touchGlassCondition: 'NO_SCRATCH',
  backPanelCondition: 'NO_DEFECTS',
  sidePanelCondition: 'NO_DEFECTS',
  hardwareFaults: {},
  hasOriginalCharger: true,
  hasOriginalBox: true,
  hasValidBill: true,
  deviceAge: 'BELOW_3_MONTHS',
};

/** Worst condition: the phone doesn't switch on. */
export const WORST_CONDITION = {
  basicQuestions: { isPhoneWorking: false, isTouchscreenWorking: false, isDisplayOriginal: false, hasValidWarranty: false },
  hardwareFaults: {},
};

const HARDWARE_KEYS = [
  'batteryHealthBelow83',
  'frontCameraNotWorking',
  'backCameraNotWorking',
  'cameraGlassBroken',
  'networkProblem',
  'chargingPortNotWorking',
  'wifiOrBluetoothNotWorking',
  'earSpeakerNotWorking',
  'microphoneNotWorking',
  'biometricsNotWorking',
  'powerButtonNotWorking',
  'volumeButtonNotWorking',
  'vibratorNotWorking',
  'proximitySensorNotWorking',
] as const;

const SCREEN_DISPLAY = ['NO_SPOT', 'MINOR_SPOTS', 'MAJOR_SPOTS_OR_LINES'];
const TOUCH_GLASS = ['NO_SCRATCH', 'MINOR_SCRATCHES', 'HEAVY_SCRATCHES', 'CRACKED_GLASS'];
const BACK_PANEL = ['NO_DEFECTS', 'MINOR_SCRATCHES', 'HEAVY_SCRATCHES', 'BACK_PANEL_BROKEN'];
const SIDE_PANEL = ['NO_DEFECTS', 'MINOR_DENT_OR_SCRATCHES', 'HEAVY_DENT', 'BENT_OR_BROKEN'];
const AGES = ['BELOW_3_MONTHS', '3_TO_6_MONTHS', '6_TO_11_MONTHS', 'ABOVE_11_MONTHS'];

const pick = (value: unknown, allowed: string[]) => {
  const v = typeof value === 'string' ? value.toUpperCase() : '';
  return allowed.includes(v) ? v : undefined;
};
const bool = (value: unknown) => value === true || value === 'true';

/**
 * Only the answers the partner app sends (the website's question set), with known values. Anything
 * else is dropped, so a partner can't send fields that change the price in other ways.
 */
export const cleanCheckedCondition = (raw: any) => {
  const c = raw && typeof raw === 'object' ? raw : {};
  const bq = c.basicQuestions && typeof c.basicQuestions === 'object' ? c.basicQuestions : {};
  const working = bq.isPhoneWorking !== false && bq.isPhoneWorking !== 'false';
  const touch = working && bq.isTouchscreenWorking !== false && bq.isTouchscreenWorking !== 'false';
  const displayOriginal = touch && bq.isDisplayOriginal !== false && bq.isDisplayOriginal !== 'false';
  const warranty = displayOriginal && bool(bq.hasValidWarranty);
  const faults: Record<string, boolean> = {};
  const rawFaults = c.hardwareFaults && typeof c.hardwareFaults === 'object' ? c.hardwareFaults : {};
  for (const key of HARDWARE_KEYS) if (working && bool(rawFaults[key])) faults[key] = true;
  return {
    basicQuestions: { isPhoneWorking: working, isTouchscreenWorking: touch, isDisplayOriginal: displayOriginal, hasValidWarranty: warranty },
    ...(working
      ? {
          screenDisplayCondition: (displayOriginal && pick(c.screenDisplayCondition, SCREEN_DISPLAY)) || 'NO_SPOT',
          touchGlassCondition: (displayOriginal && pick(c.touchGlassCondition, TOUCH_GLASS)) || 'NO_SCRATCH',
          backPanelCondition: pick(c.backPanelCondition, BACK_PANEL) || 'NO_DEFECTS',
          sidePanelCondition: pick(c.sidePanelCondition, SIDE_PANEL) || 'NO_DEFECTS',
        }
      : {}),
    hardwareFaults: faults,
    hasOriginalCharger: working && bool(c.hasOriginalCharger),
    hasOriginalBox: working && bool(c.hasOriginalBox),
    hasValidBill: warranty && bool(c.hasValidBill),
    deviceAge: warranty ? pick(c.deviceAge, AGES) : undefined,
  };
};

/** Same normalisation as a booking (older apps sent flat fields instead of the grouped ones). */
const normalizeForEngine = (condition: any) => {
  const c: any = { ...(condition || {}) };
  if (!c.basicQuestions && (c.isPhoneWorking !== undefined || c.isTouchscreenWorking !== undefined || c.isDisplayOriginal !== undefined)) {
    c.basicQuestions = {
      isPhoneWorking: c.isPhoneWorking !== false && c.isPhoneWorking !== 'false',
      isTouchscreenWorking: c.isTouchscreenWorking !== false && c.isTouchscreenWorking !== 'false',
      isDisplayOriginal: c.isDisplayOriginal !== false && c.isDisplayOriginal !== 'false',
      hasValidWarranty: bool(c.hasValidWarranty),
    };
  }
  return c;
};

export class DoorstepPricing {
  /** Price of this model/variant for these answers, with the admin's settings for the model. */
  public static async priceDevice(modelId: string, variantId: string | undefined, storage: string | undefined, condition: any): Promise<DevicePrice | null> {
    const resolved = await DevicePriceResolver.resolve({
      modelId,
      variantId: variantId && mongoose.Types.ObjectId.isValid(variantId) ? variantId : undefined,
      variantCapacity: storage,
    });
    if (!resolved?.model) return null;
    const model: any = resolved.model;
    const configRule: any = resolved.configRule || {};
    const valuation = ValuationEngine.calculate(
      {
        id: String(configRule._id ?? model._id),
        modelId: String(model._id),
        variantId: resolved.variant?._id ? String(resolved.variant._id) : '',
        basePrice: resolved.basePrice,
        storagePriceAdjustment: resolved.variantAdjustment,
        customDeductions: configRule.customDeductions,
        customPercentages: configRule.customPercentages,
        minScrapPrice: configRule.minScrapPrice,
        deductions: configRule.deductions,
        deductionPercentages: configRule.deductionPercentages,
        deviceAgeDeductions: model.deviceAgeDeductions,
        ruleBasePrice: configRule.basePrice,
        version: configRule.version || 1,
        isActive: true,
        effectiveFrom: configRule.effectiveFrom || new Date(),
      },
      normalizeForEngine(condition)
    );
    return {
      amount: valuation.finalCalculatedAmount,
      breakdown: valuation.breakdown.map((b) => ({ component: b.component, description: b.description, adjustment: b.adjustment })),
      storage: resolved.variant?.capacity || storage || '',
      variantId: resolved.variant?._id ? String(resolved.variant._id) : undefined,
    };
  }

  /** Lines of two breakdowns that differ (an answer added, removed or priced differently). */
  public static diffLines(before: DevicePrice['breakdown'], after: DevicePrice['breakdown']): PriceChangeLine[] {
    const sum = (lines: DevicePrice['breakdown']) => {
      const m = new Map<string, number>();
      for (const l of lines) m.set(l.component, (m.get(l.component) ?? 0) + l.adjustment);
      return m;
    };
    const a = sum(before);
    const b = sum(after);
    const names = [...new Set([...a.keys(), ...b.keys()])];
    return names
      .map((component) => {
        const quoted = Math.round(a.get(component) ?? 0);
        const checked = Math.round(b.get(component) ?? 0);
        return { component, quoted, checked, difference: checked - quoted };
      })
      .filter((l) => l.difference !== 0);
  }

  /**
   * Everything the partner app shows for a check: the quote, the partner's price, the best and worst
   * prices for the device, and the lines that changed.
   */
  public static async quote(
    request: any,
    input: { variantId?: string; condition: any }
  ): Promise<{
    quotedAmount: number;
    requotedAmount: number;
    checkedAmount: number;
    finalAmount: number;
    difference: number;
    bestAmount: number;
    worstAmount: number;
    changes: PriceChangeLine[];
    checkedBreakdown: DevicePrice['breakdown'];
    checkedCondition: any;
    checkedStorage: string;
    checkedVariantId?: string;
  } | null> {
    const modelId = String(request.deviceDetails?.modelId?._id ?? request.deviceDetails?.modelId ?? '');
    const bookedVariantId = request.deviceDetails?.variantId ? String(request.deviceDetails.variantId) : undefined;
    const bookedStorage = request.deviceDetails?.storageCapacity;
    const checkedVariantId = input.variantId || bookedVariantId;
    const sameVariant = !input.variantId || input.variantId === bookedVariantId;
    const customerCondition = request.declaredCondition?.toObject ? request.declaredCondition.toObject() : request.declaredCondition || {};
    const checkedCondition = cleanCheckedCondition(input.condition);

    const [requote, customerOnChecked, checked, best, worst] = await Promise.all([
      DoorstepPricing.priceDevice(modelId, bookedVariantId, bookedStorage, customerCondition),
      sameVariant ? Promise.resolve(null) : DoorstepPricing.priceDevice(modelId, checkedVariantId, undefined, customerCondition),
      DoorstepPricing.priceDevice(modelId, checkedVariantId, sameVariant ? bookedStorage : undefined, checkedCondition),
      DoorstepPricing.priceDevice(modelId, checkedVariantId, sameVariant ? bookedStorage : undefined, BEST_CONDITION),
      DoorstepPricing.priceDevice(modelId, checkedVariantId, sameVariant ? bookedStorage : undefined, WORST_CONDITION),
    ]);
    if (!requote || !checked || !best || !worst) return null;

    const quotedAmount = Math.round(Number(request.indicativeEstimate?.estimatedAmount) || requote.amount);
    const delta = checked.amount - requote.amount;
    let finalAmount = quotedAmount + delta;
    if (delta < 0) finalAmount = Math.max(finalAmount, worst.amount);
    if (delta > 0) finalAmount = Math.min(finalAmount, Math.max(best.amount, quotedAmount));
    finalAmount = Math.max(0, Math.round(finalAmount));

    // What changed: a different storage first, then each answer that prices differently
    const changes: PriceChangeLine[] = [];
    if (!sameVariant && customerOnChecked) {
      const difference = customerOnChecked.amount - requote.amount;
      changes.push({
        component: `Storage: ${bookedStorage || 'booked'} → ${checked.storage || 'checked'}`,
        quoted: requote.amount,
        checked: customerOnChecked.amount,
        difference,
      });
      changes.push(...DoorstepPricing.diffLines(customerOnChecked.breakdown, checked.breakdown).filter((l) => !/^(Base Price|Storage Variant)$/.test(l.component)));
    } else {
      changes.push(...DoorstepPricing.diffLines(requote.breakdown, checked.breakdown).filter((l) => !/^(Base Price|Storage Variant)$/.test(l.component)));
    }

    return {
      quotedAmount,
      requotedAmount: requote.amount,
      checkedAmount: checked.amount,
      finalAmount,
      difference: finalAmount - quotedAmount,
      bestAmount: best.amount,
      worstAmount: worst.amount,
      changes,
      checkedBreakdown: checked.breakdown,
      checkedCondition,
      checkedStorage: checked.storage,
      checkedVariantId: checked.variantId,
    };
  }
}
