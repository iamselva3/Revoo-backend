import { BrandModel } from '../models/Brand.js';
import { SmartphoneModel } from '../models/SmartphoneModel.js';
import { StorageVariantModel } from '../models/StorageVariant.js';
import { SeedMarkerModel } from '../models/SeedMarker.js';
import { EXACT_22_BRANDS } from './brandArrangementSeed.js';
import catalog from './data/phoneCatalog.json';

/**
 * Phone catalogue arrangement (non-Apple brands), following the same rules as the Apple seed:
 *  - models appear in the exact order of the supplied list (displayOrder 1..N per brand);
 *  - existing models are matched and re-ordered; their price and existing variants are kept,
 *    missing listed variants are added and a photo is filled in only when they have none;
 *  - new models are created with the listed variants and a hand-estimated buyback base price;
 *  - nothing is deleted: unlisted models stay and move after the listed ones; an exact duplicate
 *    of a listed model (same phone, different spelling) is hidden (isPublished=false), not removed.
 * Runs once per catalogue version (SeedMarker), in the background after the server starts.
 */

export interface CatalogVariant {
  ram: string;
  storage: string;
}

export interface CatalogModel {
  order: number;
  name: string;
  slug: string;
  releaseYear: number;
  basePrice: number;
  variants: CatalogVariant[];
  imageUrl?: string | null;
}

export interface CatalogBrand {
  brandSlug: string;
  brandName: string;
  models: CatalogModel[];
}

interface CatalogData {
  version: string;
  brands: CatalogBrand[];
}

const DATA = catalog as unknown as CatalogData;
const MARKER_KEY = 'phone-catalog';
const UNLISTED_ORDER_START = 1000;

/** Existing brands whose phones the list files under another brand. */
const BRAND_ALIASES: Record<string, string[]> = {
  xiaomi: ['redmi', 'mi'],
  google: ['google-pixel', 'pixel'],
  nokia: ['hmd'],
};

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** "Samsung Galaxy S24 Ultra 5G" → "galaxys24ultra5g" (brand prefix, spacing, + and punctuation removed). */
export const modelKey = (name: string, brandName: string) => {
  let s = ` ${name.toLowerCase()} `.replace(/\+/g, ' plus ');
  for (const prefix of [brandName.toLowerCase(), 'motorola']) {
    s = s.replace(new RegExp(`^\\s*${escapeRegex(prefix)}\\s+`), ' ');
  }
  return s.replace(/[^a-z0-9]+/g, '');
};

/** Same as modelKey but ignoring network suffixes (5G/4G), used only when unambiguous. */
export const looseModelKey = (name: string, brandName: string) =>
  modelKey(name.replace(/\b[45]g\b/gi, ' '), brandName);

const storageGB = (storage: string) => {
  const m = /^(\d+)\s*(GB|TB)$/i.exec(storage.trim());
  if (!m) return 0;
  return Number(m[1]) * (m[2].toUpperCase() === 'TB' ? 1024 : 1);
};
const ramGB = (ram: string) => Number(/^(\d+)/.exec(ram)?.[1] || 0);
const capacityLabel = (v: CatalogVariant) => `${v.ram} / ${v.storage}`;
const normCapacity = (c: string) => c.toLowerCase().replace(/\s+/g, '').replace(/ram|rom/g, '');

/**
 * Price ladder for variants above the lowest one: each storage doubling ≈ +8% of the base price
 * (+10% for 512GB→1TB, +12% for 1TB→2TB), each extra 2GB RAM ≈ +2%. Strictly increasing,
 * rounded to ₹100 below a ₹5,000 base, ₹500 otherwise.
 */
export const variantModifiers = (basePrice: number, variants: CatalogVariant[]): number[] => {
  if (variants.length === 0) return [];
  const step = basePrice < 5000 ? 100 : 500;
  const round = (n: number) => Math.round(n / step) * step;
  const sorted = variants
    .map((v, i) => ({ v, i }))
    .sort((a, b) => storageGB(a.v.storage) - storageGB(b.v.storage) || ramGB(a.v.ram) - ramGB(b.v.ram));
  const low = sorted[0].v;
  const result = new Array<number>(variants.length).fill(0);
  let previous = 0;
  sorted.forEach(({ v, i }, idx) => {
    if (idx === 0) return;
    let pct = 0;
    let s = storageGB(low.storage);
    while (s > 0 && s < storageGB(v.storage)) {
      pct += s >= 1024 ? 0.12 : s >= 512 ? 0.1 : 0.08;
      s *= 2;
    }
    pct += Math.max(0, ramGB(v.ram) - ramGB(low.ram)) * 0.01;
    let modifier = Math.max(step, round(basePrice * pct));
    if (modifier <= previous) modifier = previous + step;
    result[i] = modifier;
    previous = modifier;
  });
  return result;
};

export interface CatalogReport {
  version: string;
  dryRun: boolean;
  brandsCreated: string[];
  modelsCreated: number;
  modelsMatched: number;
  modelsMovedBrand: Array<{ name: string; from: string; to: string }>;
  variantsCreated: number;
  imagesFilled: number;
  unlistedKept: number;
  duplicatesHidden: Array<{ brand: string; name: string; duplicateOf: string }>;
  aliasBrandsHidden: string[];
  renamed: Array<{ from: string; to: string }>;
}

export async function applyPhoneCatalog({ dryRun = false, log = console.log } = {}): Promise<CatalogReport> {
  const report: CatalogReport = {
    version: DATA.version,
    dryRun,
    brandsCreated: [],
    modelsCreated: 0,
    modelsMatched: 0,
    modelsMovedBrand: [],
    variantsCreated: 0,
    imagesFilled: 0,
    unlistedKept: 0,
    duplicatesHidden: [],
    aliasBrandsHidden: [],
    renamed: [],
  };

  const takenSlugs = new Set((await SmartphoneModel.find({}, { slug: 1 }).lean()).map((m) => m.slug));

  for (const def of DATA.brands) {
    if (def.models.length === 0) continue;

    // Brand (create if missing, using the arrangement seed's order/logo)
    let brand = await BrandModel.findOne({
      $or: [{ slug: def.brandSlug }, { name: new RegExp(`^${escapeRegex(def.brandName)}$`, 'i') }],
    });
    if (!brand) {
      const arranged = EXACT_22_BRANDS.find((b) => b.slug === def.brandSlug);
      report.brandsCreated.push(def.brandName);
      if (!dryRun) {
        brand = await BrandModel.create({
          name: arranged?.name || def.brandName,
          slug: def.brandSlug,
          logoUrl: arranged?.logoUrl || `/uploads/brands/${def.brandSlug}.png`,
          displayOrder: arranged?.displayOrder ?? 99,
          isActive: true,
        });
      }
    }
    const brandId = brand?._id;
    const aliasBrands = await BrandModel.find({ slug: { $in: BRAND_ALIASES[def.brandSlug] || [] } });
    const brandName = brand?.name || def.brandName;

    const existing = brandId
      ? await SmartphoneModel.find({ brandId: { $in: [brandId, ...aliasBrands.map((b) => b._id)] } })
      : [];

    const listLoose = new Map<string, number>();
    for (const m of def.models) {
      const k = looseModelKey(m.name, brandName);
      listLoose.set(k, (listLoose.get(k) || 0) + 1);
    }

    const used = new Set<string>();
    const matchedLooseKeys = new Map<string, string>();

    const findMatch = (spec: CatalogModel) => {
      const exact = modelKey(spec.name, brandName);
      const exactHit = existing.find(
        (e) => !used.has(String(e._id)) && (modelKey(e.name, brandName) === exact || e.slug === spec.slug)
      );
      if (exactHit) return exactHit;
      const loose = looseModelKey(spec.name, brandName);
      if (listLoose.get(loose) !== 1) return null;
      const candidates = existing.filter((e) => !used.has(String(e._id)) && looseModelKey(e.name, brandName) === loose);
      return candidates.length === 1 ? candidates[0] : null;
    };

    for (const spec of def.models) {
      const match = findMatch(spec);
      const modifiers = variantModifiers(spec.basePrice, spec.variants);

      if (match) {
        used.add(String(match._id));
        matchedLooseKeys.set(looseModelKey(spec.name, brandName), spec.name);
        report.modelsMatched++;
        const fromAlias = brandId && String(match.brandId) !== String(brandId);
        if (fromAlias) {
          const from = aliasBrands.find((b) => String(b._id) === String(match.brandId))?.name || 'other';
          report.modelsMovedBrand.push({ name: match.name, from, to: brandName });
        }
        if (match.name !== spec.name) report.renamed.push({ from: match.name, to: spec.name });

        const needsImage =
          !match.imageUrl || /\/uploads\/brands\//.test(match.imageUrl) || /pixel-7a\.png$/.test(match.imageUrl);
        if (needsImage && spec.imageUrl) report.imagesFilled++;

        // Add listed variants the model doesn't have yet (existing variants and prices untouched)
        const have = await StorageVariantModel.find({ modelId: match._id });
        const haveKeys = new Set(have.map((v) => normCapacity(v.capacity)));
        const haveStorages = new Set(
          have.filter((v) => !v.capacity.includes('/')).map((v) => normCapacity(v.capacity))
        );
        const toAdd = spec.variants
          .map((v, i) => ({ v, modifier: Math.round((modifiers[i] / Math.max(spec.basePrice, 1)) * match.basePrice) }))
          .filter(({ v }) => !haveKeys.has(normCapacity(capacityLabel(v))) && !haveStorages.has(normCapacity(v.storage)));
        report.variantsCreated += toAdd.length;

        if (!dryRun) {
          match.displayOrder = spec.order;
          match.name = spec.name;
          if (brandId) match.brandId = brandId;
          if (!match.releaseYear) match.releaseYear = spec.releaseYear;
          if (needsImage && spec.imageUrl) match.imageUrl = spec.imageUrl;
          match.isPublished = true;
          match.isArchived = false;
          await match.save();
          for (const { v, modifier } of toAdd) {
            await StorageVariantModel.create({
              modelId: match._id,
              capacity: capacityLabel(v),
              ram: v.ram,
              storage: v.storage,
              priceModifier: Math.max(0, modifier),
              isPublished: true,
            });
          }
        }
        continue;
      }

      // New model
      let slug = spec.slug;
      for (let n = 2; takenSlugs.has(slug); n++) slug = `${spec.slug}-${n}`;
      takenSlugs.add(slug);
      report.modelsCreated++;
      report.variantsCreated += spec.variants.length;
      if (spec.imageUrl) report.imagesFilled++;

      if (!dryRun && brandId) {
        const model = await SmartphoneModel.create({
          brandId,
          name: spec.name,
          slug,
          releaseYear: spec.releaseYear,
          imageUrl: spec.imageUrl || undefined,
          basePrice: spec.basePrice,
          displayOrder: spec.order,
          isPublished: true,
          isArchived: false,
        });
        await StorageVariantModel.insertMany(
          spec.variants.map((v, i) => ({
            modelId: model._id,
            capacity: capacityLabel(v),
            ram: v.ram,
            storage: v.storage,
            priceModifier: modifiers[i],
            isPublished: true,
          }))
        );
      }
    }

    // Unlisted models of this brand: keep, move after the list; hide only exact duplicates
    const leftovers = existing
      .filter((e) => !used.has(String(e._id)) && String(e.brandId) === String(brandId))
      .sort((a, b) => (a.displayOrder ?? 9999) - (b.displayOrder ?? 9999) || (b.releaseYear || 0) - (a.releaseYear || 0));
    let nextOrder = UNLISTED_ORDER_START;
    for (const e of leftovers) {
      const duplicateOf = matchedLooseKeys.get(looseModelKey(e.name, brandName));
      if (duplicateOf) report.duplicatesHidden.push({ brand: brandName, name: e.name, duplicateOf });
      else report.unlistedKept++;
      if (!dryRun) {
        e.displayOrder = nextOrder++;
        if (duplicateOf) e.isPublished = false;
        await e.save();
      }
    }

    // Alias brands left with no phones are hidden (not deleted)
    for (const alias of aliasBrands) {
      const remaining = existing.filter((e) => String(e.brandId) === String(alias._id) && !used.has(String(e._id)));
      if (remaining.length === 0 && alias.isActive) {
        report.aliasBrandsHidden.push(alias.name);
        if (!dryRun) {
          alias.isActive = false;
          await alias.save();
        }
      }
    }

    log(`[Phone Catalog] ${brandName}: ${def.models.length} listed, ${leftovers.length} unlisted kept after the list`);
  }

  return report;
}

/** Startup hook: applies the catalogue once per version, without blocking the server. */
export async function runPhoneCatalogSeedIfNeeded(): Promise<void> {
  try {
    const marker = await SeedMarkerModel.findOne({ key: MARKER_KEY });
    if (marker?.version === DATA.version) return;
    console.log(`[Phone Catalog] Applying catalogue version ${DATA.version}...`);
    const report = await applyPhoneCatalog();
    await SeedMarkerModel.updateOne(
      { key: MARKER_KEY },
      {
        $set: {
          version: DATA.version,
          appliedAt: new Date(),
          summary: {
            created: report.modelsCreated,
            matched: report.modelsMatched,
            variants: report.variantsCreated,
            duplicatesHidden: report.duplicatesHidden.length,
          },
        },
      },
      { upsert: true }
    );
    console.log(`[Phone Catalog] Done: ${report.modelsCreated} created, ${report.modelsMatched} re-ordered.`);
  } catch (err) {
    console.error('[Phone Catalog] Seed failed:', err);
  }
}

export const PHONE_CATALOG_VERSION = DATA.version;
export const PHONE_CATALOG_MARKER_KEY = MARKER_KEY;
