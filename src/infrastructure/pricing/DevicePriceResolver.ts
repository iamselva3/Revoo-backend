import mongoose from 'mongoose';
import { SmartphoneModel } from '../database/models/SmartphoneModel.js';
import { StorageVariantModel } from '../database/models/StorageVariant.js';
import { PricingRuleModel } from '../database/models/PricingRule.js';

/**
 * Single source of truth for device prices.
 *
 *   top-condition ("Get up to") price of a variant = model.basePrice + variant.priceModifier
 *
 * Admins set `basePrice` (lowest variant, top condition) and each variant's modifier in the
 * Catalogue screen. The same number drives the "Get up to" labels on the website and the base
 * of the valuation engine, so the quote a customer sees can never start above what we advertise.
 *
 * Pricing rules are still used for engine configuration (scrap floor, custom deductions,
 * critical faults), but not for the headline price.
 */

export interface PriceRange {
  minPrice: number;
  maxPrice: number;
  variantCount: number;
}

export interface ResolvedDevicePrice {
  model: any;
  variant: any | null;
  basePrice: number;
  variantAdjustment: number;
  maxPrice: number;
  configRule: any | null;
}

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeCapacity = (value: string) => value.toLowerCase().replace(/\s+/g, '');

const ruleVariantId = (rule: any): string | null => {
  const id = rule?.variantId ?? rule?.storageVariantId;
  return id ? String(id) : null;
};

const hasEngineConfig = (rule: any): boolean =>
  Boolean(
    rule &&
      (rule.customDeductions ||
        rule.customPercentages ||
        rule.minScrapPrice ||
        rule.customScrapFloor ||
        rule.criticalKeys ||
        rule.criticalFaults)
  );

export class DevicePriceResolver {
  public static variantPrice(
    model: { basePrice?: number | null },
    variant?: { priceModifier?: number | null } | null
  ): number {
    const base = Number(model?.basePrice) || 0;
    const modifier = Number(variant?.priceModifier) || 0;
    return Math.max(0, Math.round(base + modifier));
  }

  /** Bulk "up to" price ranges for listings (one query for all variants). */
  public static async priceRanges(
    models: Array<{ _id: any; basePrice?: number | null }>
  ): Promise<Map<string, PriceRange>> {
    const ranges = new Map<string, PriceRange>();
    if (models.length === 0) return ranges;

    const variants = await StorageVariantModel.find({
      modelId: { $in: models.map((m) => m._id) },
      isPublished: true,
    })
      .select('modelId priceModifier')
      .lean();

    const modifiersByModel = new Map<string, number[]>();
    for (const v of variants) {
      const key = String(v.modelId);
      const list = modifiersByModel.get(key) ?? [];
      list.push(Number(v.priceModifier) || 0);
      modifiersByModel.set(key, list);
    }

    for (const m of models) {
      const modifiers = modifiersByModel.get(String(m._id)) ?? [];
      const prices = (modifiers.length > 0 ? modifiers : [0]).map((mod) =>
        DevicePriceResolver.variantPrice(m, { priceModifier: mod })
      );
      ranges.set(String(m._id), {
        minPrice: Math.min(...prices),
        maxPrice: Math.max(...prices),
        variantCount: modifiers.length,
      });
    }
    return ranges;
  }

  /** Finds a model by id, slug or exact name. Never falls back to an unrelated model. */
  public static async findModel(modelRef?: string, modelName?: string): Promise<any | null> {
    const ref = typeof modelRef === 'string' ? modelRef.trim() : '';
    const name = typeof modelName === 'string' ? modelName.trim() : '';

    if (ref && mongoose.Types.ObjectId.isValid(ref)) {
      const byId = await SmartphoneModel.findById(ref).populate('brandId', 'name logoUrl');
      if (byId) return byId;
    }

    const candidates = [ref, name].filter(Boolean);
    for (const candidate of candidates) {
      const bySlugOrName = await SmartphoneModel.findOne({
        $or: [
          { slug: candidate.toLowerCase() },
          { name: new RegExp(`^${escapeRegex(candidate)}$`, 'i') },
        ],
      }).populate('brandId', 'name logoUrl');
      if (bySlugOrName) return bySlugOrName;
    }
    return null;
  }

  /** Finds a variant of the given model by id, falling back to an exact capacity match. */
  public static async findVariant(modelId: any, variantRef?: string, capacity?: string): Promise<any | null> {
    const ref = typeof variantRef === 'string' ? variantRef.trim() : '';
    if (ref && mongoose.Types.ObjectId.isValid(ref)) {
      const byId = await StorageVariantModel.findOne({ _id: ref, modelId });
      if (byId) return byId;
    }

    const wanted = [ref, typeof capacity === 'string' ? capacity : '']
      .map((c) => c.trim())
      .filter(Boolean)
      .map(normalizeCapacity);
    if (wanted.length === 0) return null;

    const variants = await StorageVariantModel.find({ modelId });
    return variants.find((v) => wanted.includes(normalizeCapacity(v.capacity))) ?? null;
  }

  /**
   * The rule that configures the valuation engine for this device: a variant-specific rule that
   * carries engine config wins, otherwise the latest model-level rule.
   */
  public static async findConfigRule(modelId: any, variantId?: any): Promise<any | null> {
    const rules = await PricingRuleModel.find({ modelId, isActive: true })
      .sort({ version: -1, updatedAt: -1 })
      .lean();

    if (variantId) {
      const variantRule = rules.find(
        (r) => ruleVariantId(r) === String(variantId) && hasEngineConfig(r)
      );
      if (variantRule) return variantRule;
    }
    return rules.find((r) => ruleVariantId(r) === null) ?? null;
  }

  public static async resolve(params: {
    modelId?: string;
    modelName?: string;
    variantId?: string;
    variantCapacity?: string;
  }): Promise<ResolvedDevicePrice | null> {
    const model = await DevicePriceResolver.findModel(params.modelId, params.modelName);
    if (!model) return null;

    const variant = await DevicePriceResolver.findVariant(
      model._id,
      params.variantId,
      params.variantCapacity
    );
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
