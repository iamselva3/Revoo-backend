/**
 * Genie catalogue price refresh.
 *
 * Re-prices catalogue models (phones, laptops, TVs) from PRICE_TABLE below:
 *   - SmartphoneModel.basePrice    = top-condition ("Get up to") buyback price of the LOWEST variant (INR)
 *   - StorageVariant.priceModifier = INR added to basePrice for each higher variant (lowest variant = 0)
 *   - ACTIVE PricingRules are kept in sync so every valuation path returns the same number:
 *       variant-specific rule (variantId / storageVariantId set):
 *           basePrice = new model base, storagePriceAdjustment = that variant's new modifier
 *       model-level rule:
 *           basePrice = new model base, storagePriceAdjustment = 0
 *     Inactive (historical) rules are never touched. Nothing is ever deleted.
 *
 * Usage (run from backend/):
 *   npm run seed:prices                          DRY RUN (default): read-only, prints the plan
 *   npm run seed:prices -- --only="iphone 17"    limit to models whose name or slug contains the text
 *   npm run seed:prices -- --apply               perform the writes and print each one
 *
 * The dry run only issues find() queries. autoIndex/autoCreate are disabled in both modes so
 * Mongoose never builds indexes or creates collections as a side effect of connecting.
 */
import mongoose, { Types } from 'mongoose';
import { config } from '../src/config/index.js';
import { BrandModel } from '../src/infrastructure/database/models/Brand.js';
import { SmartphoneModel } from '../src/infrastructure/database/models/SmartphoneModel.js';
import { StorageVariantModel } from '../src/infrastructure/database/models/StorageVariant.js';
import { PricingRuleModel } from '../src/infrastructure/database/models/PricingRule.js';

// ---------------------------------------------------------------------------
// Price table
// ---------------------------------------------------------------------------

export type Kind = 'phone' | 'laptop' | 'tv';
/** Phone tier: sets how much each storage doubling is worth as a fraction of the base price. */
export type Tier = 'apple-pro' | 'apple' | 'flagship' | 'mid';

export interface PriceEntry {
  /** Catalogue model name (normalised for matching). */
  name: string;
  /** Catalogue slugs this entry applies to (tried before the name). */
  slugs: string[];
  /** Top-condition buyback price in INR for the model's LOWEST variant. */
  price: number;
  kind: Kind;
  /** Phones only. */
  tier?: Tier;
  /** Variants to create if the model has none in the DB. */
  createVariants?: string[];
}

const phoneOf =
  (tier: Tier) =>
  (name: string, slugs: string | string[], price: number, extra: Partial<PriceEntry> = {}): PriceEntry => ({
    name,
    slugs: ([] as string[]).concat(slugs),
    price,
    kind: 'phone',
    tier,
    ...extra,
  });
const applePro = phoneOf('apple-pro');
const apple = phoneOf('apple');
const flagship = phoneOf('flagship');
const mid = phoneOf('mid');
const laptop = (name: string, slug: string, price: number): PriceEntry => ({ name, slugs: [slug], price, kind: 'laptop' });
const tv = (name: string, slug: string, price: number): PriceEntry => ({ name, slugs: [slug], price, kind: 'tv' });

/*
 * ESTIMATES FOR ADMINS TO REVIEW. These are not quotes.
 * Realistic top-condition ("Get up to") buyback prices in India as of November 2026 for each
 * model's LOWEST variant, rounded to the nearest ₹500. They come from Indian launch MRPs and typical
 * buyback depreciation: Apple keeps about 80-88% of MRP in the first 3 months, ~60% after 1 yr, ~45% after
 * 2 yrs, ~35% after 3 yrs. Android flagships lose value faster and mid-rangers faster still. Laptops
 * and TVs are priced off their street price. Anchor: iPhone 18 Pro Max 256 GB = ₹1,31,000
 * (a competitor's live quote). Within a line, newer and higher tiers are priced at or above older and lower ones.
 */
export const PRICE_TABLE: PriceEntry[] = [
  // --- Apple iPhone -------------------------------------------------------
  applePro('iPhone 18 Pro Max', 'iphone-18-pro-max', 131000, { createVariants: ['256 GB', '512 GB', '1 TB', '2 TB'] }),
  applePro('iPhone 17 Pro Max', 'iphone-17-pro-max', 90000),
  // iPhone 17 Pro / Air / 17 start at 256 GB in India. The catalogue lists a 128 GB entry, so the
  // price here is set so that the real 256 GB variant lands on target (₹81,000 / ₹66,000 / ₹50,000).
  applePro('iPhone 17 Pro', 'iphone-17-pro', 74500),
  applePro('iPhone Air', 'iphone-air', 60500),
  apple('iPhone 17', 'iphone-17', 46500),
  apple('iPhone 16e', 'iphone-16e', 27500),
  applePro('iPhone 16 Pro Max', 'iphone-16-pro-max', 65000),
  applePro('iPhone 16 Pro', 'iphone-16-pro', 54000),
  apple('iPhone 16 Plus', 'iphone-16-plus', 38500),
  apple('iPhone 16', 'iphone-16', 35000),
  applePro('iPhone 15 Pro Max', 'iphone-15-pro-max', 56000),
  applePro('iPhone 15 Pro', 'iphone-15-pro', 47000),
  apple('iPhone 15', 'iphone-15', 28000),
  applePro('iPhone 14 Pro Max', 'iphone-14-pro-max', 40500),
  applePro('iPhone 14 Pro', 'iphone-14-pro', 36000),
  apple('iPhone 14', 'iphone-14', 23000),
  apple('iPhone 13', 'iphone-13', 19000),
  apple('iPhone 12', 'iphone-12', 12500),
  apple('iPhone 11', 'iphone-11', 9000),

  // --- Apple MacBook ------------------------------------------------------
  laptop('MacBook Pro 16" M3 Max', 'macbook-pro-16-m3-max', 125000),
  laptop('MacBook Pro 14" M3 Pro', 'macbook-pro-14-m3-pro', 78000),
  laptop('MacBook Air 15" M2', 'macbook-air-15-m2', 50000),
  laptop('MacBook Air 13" M2', 'macbook-air-13-m2', 42000),
  laptop('MacBook Air 13" M1', 'macbook-air-13-m1', 30000),

  // --- Samsung Galaxy -----------------------------------------------------
  flagship('Galaxy S25 Ultra', 'galaxy-s25-ultra', 60000),
  flagship('Galaxy S24 Ultra', 'galaxy-s24-ultra', 42500),
  flagship('Galaxy S23 Ultra', ['galaxy-s23-ultra', 'galaxy-s23-ultra-5g'], 31000),
  flagship('Galaxy S25 Plus', 'galaxy-s25-plus', 38000),
  flagship('Galaxy S24+', 'galaxy-s24-plus', 26000),
  flagship('Galaxy S24', 'galaxy-s24', 22000),
  mid('Galaxy S26 FE', 'galaxy-s26-fe', 35000),
  mid('Galaxy A57 5G', 'galaxy-a57-5g', 21000),
  mid('Galaxy A37 5G', 'galaxy-a37-5g', 16000),
  flagship('Galaxy Z Fold 8 Ultra', 'galaxy-z-fold-8-ultra', 115000),
  flagship('Galaxy Z Fold 8', 'galaxy-z-fold-8', 95000),
  flagship('Galaxy Z Flip 8', 'galaxy-z-flip-8', 55000),
  flagship('Galaxy Z Fold 5', 'galaxy-z-fold-5', 34000),
  flagship('Galaxy Z Flip 5', 'galaxy-z-flip-5', 20000),

  // --- OnePlus ------------------------------------------------------------
  flagship('OnePlus 15', 'oneplus-15', 36000),
  flagship('OnePlus 13', 'oneplus-13', 26500),
  flagship('OnePlus 12', 'oneplus-12', 18000),
  mid('OnePlus 15R', 'oneplus-15r', 22500),
  mid('OnePlus 13R', 'oneplus-13r', 16000),
  mid('OnePlus 12R', 'oneplus-12r', 11000),
  mid('OnePlus Nord 6 5G', 'oneplus-nord-6-5g', 18000),
  mid('OnePlus Nord 4', 'oneplus-nord-4', 10000),

  // --- Google Pixel -------------------------------------------------------
  flagship('Pixel 10 Pro Fold', 'google-pixel-10-pro-fold', 70000),
  flagship('Pixel 10', 'google-pixel-10', 34000),
  mid('Pixel 10A', 'google-pixel-10a', 25000),
  flagship('Pixel 8 Pro', 'pixel-8-pro', 24000),
  flagship('Pixel 8', 'pixel-8', 16500),
  mid('Pixel 7a', 'pixel-7a', 8500),

  // --- Vivo ---------------------------------------------------------------
  flagship('Vivo X200 Pro 5G', 'vivo-x200-pro', 35000),
  flagship('Vivo X100 Pro', 'vivo-x100-pro', 23000),
  mid('Vivo V50 Pro 5G', 'vivo-v50-pro', 15000),
  mid('Vivo V30 Pro', 'vivo-v30-pro', 10500),
  mid('Vivo V29 5G', 'vivo-v29-5g', 7000),
  mid('Vivo T3 5G', 'vivo-t3-5g', 5000),

  // --- Oppo ---------------------------------------------------------------
  flagship('Oppo Find X8 Pro 5G', 'oppo-find-x8-pro', 35500),
  flagship('Find X7 Ultra', 'oppo-find-x7-ultra', 22000),
  mid('Oppo Reno 14 Pro 5G', 'oppo-reno-14-pro', 19500),
  mid('Reno 11 Pro', 'oppo-reno-11-pro', 10000),
  mid('Oppo F25 Pro 5G', 'oppo-f25-pro-5g', 5500),

  // --- Nothing ------------------------------------------------------------
  flagship('Nothing Phone (3)', 'nothing-phone-3', 27000),
  mid('Nothing Phone (2)', 'nothing-phone-2', 10000),
  mid('Nothing Phone (2a)', 'nothing-phone-2a', 6500),
  mid('Nothing Phone (1)', 'nothing-phone-1', 5000),

  // --- Xiaomi / Redmi / POCO ----------------------------------------------
  flagship('Xiaomi 15 Ultra 5G', 'xiaomi-15-ultra', 42000),
  mid('POCO F7 Pro 5G', 'poco-f7-pro', 15000),
  mid('Redmi Note 15 Pro Plus 5G', 'redmi-note-15-pro-plus', 16500),
  mid('Redmi Note 13 Pro+ 5G', 'redmi-note-13-pro-plus', 7000),
  mid('Redmi Note 13 Pro', 'redmi-note-13-pro', 5000),
  mid('Redmi 13C 5G', 'redmi-13c-5g', 2500),

  // --- Realme -------------------------------------------------------------
  flagship('Realme GT 8 Pro', 'realme-gt-8-pro', 29000),
  mid('Realme GT 6T', 'realme-gt-6t', 7500),
  mid('Realme 16 Pro Plus 5G', 'realme-16-pro-plus-5g', 17500),
  mid('Realme 12 Pro+ 5G', 'realme-12-pro-plus', 6000),
  mid('Realme Narzo 70 Pro', 'realme-narzo-70-pro', 4000),

  // --- Motorola -----------------------------------------------------------
  flagship('Moto Razr 50 Ultra', 'moto-razr-50-ultra', 24000),
  mid('Moto Edge 70 Pro Plus', 'moto-edge-70-pro-plus', 19500),

  // --- iQOO ---------------------------------------------------------------
  flagship('iQOO 13 5G', 'iqoo-13-5g', 21000),
  flagship('iQOO 12 5G', 'iqoo-12-5g', 14000),
  mid('iQOO Neo 9 Pro', 'iqoo-neo-9-pro', 8500),
  mid('iQOO Z9 5G', 'iqoo-z9-5g', 4500),

  // --- Laptops ------------------------------------------------------------
  laptop('Dell Alienware m16 R2 Gaming', 'dell-alienware-m16', 80000),
  laptop('Dell XPS 15 OLED (9530)', 'dell-xps-15', 48000),
  laptop('Dell Inspiron 16 Plus', 'dell-inspiron-16', 26000),
  laptop('HP Spectre x360 14 OLED', 'hp-spectre-14', 46000),
  laptop('HP OMEN 16 Gaming Laptop', 'hp-omen-16', 38000),
  laptop('Lenovo Legion Pro 5 Gen 8', 'lenovo-legion-pro-5', 46000),
  laptop('ThinkPad X1 Carbon Gen 11', 'thinkpad-x1-gen11', 44000),
  laptop('ROG Zephyrus G14 (2024)', 'asus-rog-g14', 58000),
  laptop('ZenBook 14 OLED (UX3405)', 'asus-zenbook-14', 29000),
  laptop('Predator Helios 16 Gaming', 'acer-predator-helios-16', 52000),
  laptop('Swift Go 14 OLED', 'acer-swift-go-14', 19000),

  // --- TVs ----------------------------------------------------------------
  tv('Sony Bravia XR 65" 4K OLED (A80L)', 'sony-bravia-65-oled', 65000),
  tv('Sony Bravia 55" 4K Google TV (X80L)', 'sony-bravia-55-4k', 20000),
  tv('Sony Bravia 43" 4K HDR (X74L)', 'sony-bravia-43-4k', 12500),
  tv('LG OLED evo C3 65" 4K Cinema', 'lg-oled-c3-65', 62000),
  tv('LG OLED B3 55" 4K Smart TV', 'lg-oled-b3-55', 33000),
  tv('LG UHD AI ThinQ 43" 4K (UR7500)', 'lg-uhd-thinq-43', 7500),
  tv('Samsung Neo QLED 65" 4K (QN90C)', 'samsung-neo-qled-65', 55000),
  tv('Samsung The Frame 55" 4K QLED', 'samsung-the-frame-55', 26000),
  tv('Samsung Crystal UHD 43" 4K (CU8000)', 'samsung-crystal-uhd-43', 8500),
  tv('TCL 55" Mini-LED 4K Google TV (C755)', 'tcl-55-mini-led', 13500),
  tv('TCL 43" Metallic Bezel-less 4K (43V6B)', 'tcl-43-metallic-4k', 5000),
  tv('Xiaomi Smart TV X Pro 55" 4K Dolby Vision', 'xiaomi-tv-x-pro-55', 10500),
  tv('Xiaomi Smart TV X 43" 4K', 'xiaomi-tv-x-43', 6500),
];

// ---------------------------------------------------------------------------
// Matching
// ---------------------------------------------------------------------------

const LEADING_BRAND_WORDS = new Set(['apple', 'samsung', 'google']);

/** lowercase, "+" → "plus", punctuation → space, drop leading brand words and a trailing "5g". */
export function normalizeName(raw: string): string {
  const words = raw
    .toLowerCase()
    .replace(/\+/g, ' plus ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);
  while (words.length > 1 && LEADING_BRAND_WORDS.has(words[0])) words.shift();
  while (words.length > 1 && words[words.length - 1] === '5g') words.pop();
  return words.join(' ');
}

export interface PriceIndex {
  bySlug: Map<string, PriceEntry>;
  byName: Map<string, PriceEntry>;
}

export function buildPriceIndex(entries: PriceEntry[]): PriceIndex {
  const bySlug = new Map<string, PriceEntry>();
  const byName = new Map<string, PriceEntry>();
  for (const e of entries) {
    if (!Number.isFinite(e.price) || e.price <= 0 || e.price % 500 !== 0) {
      throw new Error(`PRICE_TABLE: price for "${e.name}" must be a positive multiple of 500 (got ${e.price})`);
    }
    for (const slug of e.slugs) {
      if (bySlug.has(slug)) throw new Error(`PRICE_TABLE: duplicate slug "${slug}"`);
      bySlug.set(slug, e);
    }
    const key = normalizeName(e.name);
    if (byName.has(key)) throw new Error(`PRICE_TABLE: duplicate normalised name "${key}"`);
    byName.set(key, e);
  }
  return { bySlug, byName };
}

export function findPriceEntry(
  index: PriceIndex,
  model: { name: string; slug?: string },
  brandName?: string
): PriceEntry | undefined {
  const bySlug = model.slug ? index.bySlug.get(model.slug.trim().toLowerCase()) : undefined;
  if (bySlug) return bySlug;
  const name = normalizeName(model.name);
  const direct = index.byName.get(name);
  if (direct || !brandName) return direct;
  const brand = normalizeName(brandName);
  // Try with the brand prefixed ("Find X7 Ultra" + Oppo) and with it stripped ("Vivo T3" - Vivo).
  return (
    index.byName.get(normalizeName(`${brandName} ${model.name}`)) ??
    (name.startsWith(`${brand} `) ? index.byName.get(name.slice(brand.length + 1)) : undefined)
  );
}

// ---------------------------------------------------------------------------
// Variant parsing and modifier ladder
// ---------------------------------------------------------------------------

export interface ParsedCapacity {
  storageGB?: number;
  ramGB?: number;
  /** e.g. 4070 for "RTX 4070" */
  gpu?: number;
  inches?: number;
}

/**
 * "128 GB" | "8 GB / 256 GB" | "12 GB / 1 TB" | "512GB SSD / 16GB RAM" | "1TB SSD / RTX 4070" | "55-inch 4K HDR"
 */
export function parseCapacity(capacity: string): ParsedCapacity {
  const s = capacity.replace(/,/g, ' ');
  const out: ParsedCapacity = {};

  const inch = s.match(/(\d{2,3}(?:\.\d+)?)\s*(?:-\s*)?(?:inch(?:es)?\b|in\b|"|″)/i);
  if (inch) out.inches = parseFloat(inch[1]);

  const gpu = s.match(/\bRTX\s*(\d{4})\b/i);
  if (gpu) out.gpu = parseInt(gpu[1], 10);

  const unlabeled: number[] = [];
  for (const m of s.matchAll(/(\d+(?:\.\d+)?)\s*(TB|GB)\b\s*(SSD|HDD|ROM|storage|RAM|memory)?/gi)) {
    const gb = parseFloat(m[1]) * (m[2].toUpperCase() === 'TB' ? 1024 : 1);
    const label = (m[3] ?? '').toLowerCase();
    if (label === 'ram' || label === 'memory') out.ramGB = gb;
    else if (label) out.storageGB = gb;
    else unlabeled.push(gb);
  }
  // Unlabelled sizes: the largest is storage, the next is RAM ("8 GB / 256 GB").
  unlabeled.sort((a, b) => a - b);
  if (out.storageGB === undefined && unlabeled.length) out.storageGB = unlabeled.pop();
  if (out.ramGB === undefined && unlabeled.length) out.ramGB = unlabeled.pop();
  return out;
}

/** Phones: value of each storage doubling as a fraction of base (1 TB / 2 TB steps a bit larger). */
const STORAGE_STEP: Record<Tier, number> = { 'apple-pro': 0.09, apple: 0.08, flagship: 0.08, mid: 0.07 };
const stepTo = (targetGB: number, step: number) => step + (targetGB >= 1024 ? 0.02 : 0) + (targetGB >= 2048 ? 0.01 : 0);

/** Cumulative storage ladder from 32 GB up to `gb`. */
function phoneStorageScore(gb: number, step: number): number {
  let cur = 32;
  if (gb <= cur) return Math.log2(gb / cur) * step;
  let score = 0;
  while (cur * 2 <= gb) {
    cur *= 2;
    score += stepTo(cur, step);
  }
  if (gb > cur) score += Math.log2(gb / cur) * stepTo(cur * 2, step);
  return score;
}

const PHONE_RAM_PER_4GB = 0.03; // +4 GB RAM at the same storage
const LAPTOP_SSD_PER_DOUBLING = 0.09;
const LAPTOP_RAM_PER_DOUBLING = 0.05;
/** RTX xx50 < xx60 < xx70 < xx80 < xx90, as a fraction of base. */
const GPU_CLASS_FRAC: Record<number, number> = { 50: 0, 60: 0.06, 70: 0.14, 80: 0.26, 90: 0.4 };
const gpuFrac = (gpu?: number) => (gpu ? GPU_CLASS_FRAC[gpu % 100] ?? 0 : 0);

export const round500 = (n: number) => Math.round(n / 500) * 500;

export interface VariantInput {
  id: string | null;
  capacity: string;
  oldMod: number | null;
}

export interface VariantPlan extends VariantInput {
  newMod: number;
  parsed: boolean;
  score: number;
}

/** The lowest-ranked parseable variant gets 0. Unparseable variants keep their current modifier. */
export function planVariantModifiers(entry: PriceEntry, base: number, variants: VariantInput[]): VariantPlan[] {
  const parsed = variants.map((v) => ({ v, p: parseCapacity(v.capacity) }));
  const usable = (p: ParsedCapacity) => (entry.kind === 'tv' ? p.inches !== undefined : p.storageGB !== undefined);
  const ok = parsed.filter((x) => usable(x.p));

  const knownRam = ok.map((x) => x.p.ramGB).filter((r): r is number => r !== undefined);
  const ramRef = knownRam.length ? Math.min(...knownRam) : undefined;
  const minInches = Math.min(...ok.map((x) => x.p.inches ?? Infinity));
  const step = STORAGE_STEP[entry.tier ?? 'mid'];

  const score = (p: ParsedCapacity): number => {
    if (entry.kind === 'tv') return p.inches! / minInches; // proportional to screen size
    const ram = p.ramGB ?? ramRef;
    if (entry.kind === 'laptop') {
      return (
        LAPTOP_SSD_PER_DOUBLING * Math.log2(p.storageGB!) +
        (ram ? LAPTOP_RAM_PER_DOUBLING * Math.log2(ram) : 0) +
        gpuFrac(p.gpu)
      );
    }
    return phoneStorageScore(p.storageGB!, step) + (ram ? (PHONE_RAM_PER_4GB * ram) / 4 : 0);
  };

  const scores = new Map(ok.map((x) => [x.v, score(x.p)] as const));
  const minScore = scores.size ? Math.min(...scores.values()) : 0;

  return parsed
    .map(({ v }): VariantPlan => {
      const s = scores.get(v);
      if (s === undefined) return { ...v, newMod: v.oldMod ?? 0, parsed: false, score: Infinity };
      const rel = s - minScore;
      // A higher-ranked variant is always worth at least one ₹500 step more than the lowest.
      const newMod = rel > 1e-9 ? Math.max(500, round500(base * rel)) : 0;
      return { ...v, newMod, parsed: true, score: rel };
    })
    .sort((a, b) => a.score - b.score || a.newMod - b.newMod);
}

// ---------------------------------------------------------------------------
// DB planning (read-only)
// ---------------------------------------------------------------------------

interface LeanBrand {
  _id: Types.ObjectId;
  name: string;
}
interface LeanModel {
  _id: Types.ObjectId;
  brandId?: Types.ObjectId;
  name: string;
  slug: string;
  basePrice: number;
  isPublished?: boolean;
  isArchived?: boolean;
}
interface LeanVariant {
  _id: Types.ObjectId;
  modelId: Types.ObjectId;
  capacity: string;
  priceModifier?: number;
}
interface LeanRule {
  _id: Types.ObjectId;
  modelId: Types.ObjectId;
  variantId?: Types.ObjectId | string | null;
  storageVariantId?: Types.ObjectId | string | null;
  basePrice?: number;
  storagePriceAdjustment?: number;
  version?: number;
}

interface RulePlan {
  id: Types.ObjectId;
  version?: number;
  scope: 'variant' | 'model' | 'orphan';
  label: string;
  oldBase?: number;
  oldAdj?: number;
  set: { basePrice: number; storagePriceAdjustment?: number };
  needsUpdate: boolean;
}

interface ModelPlan {
  model: LeanModel;
  brand: string;
  entry: PriceEntry;
  oldBase: number;
  newBase: number;
  variants: VariantPlan[];
  creating: boolean;
  rules: RulePlan[];
}

interface Plan {
  scanned: number;
  models: ModelPlan[];
  unmatched: { brand: string; model: LeanModel; variantCount: number }[];
  skippedNoVariants: { brand: string; model: LeanModel }[];
}

const looksLikeTestRecord = (m: LeanModel) => normalizeName(m.name).replace(/\s/g, '').length <= 2;

async function buildPlan(only: string): Promise<Plan> {
  const index = buildPriceIndex(PRICE_TABLE);

  const brands = await BrandModel.find({}, { name: 1 }).lean<LeanBrand[]>();
  const brandName = new Map(brands.map((b) => [String(b._id), b.name]));

  let models = await SmartphoneModel.find({}, { name: 1, slug: 1, brandId: 1, basePrice: 1, isPublished: 1, isArchived: 1 }).lean<
    LeanModel[]
  >();
  const scanned = models.length;
  if (only) {
    models = models.filter((m) => m.name.toLowerCase().includes(only) || (m.slug ?? '').toLowerCase().includes(only));
  }
  const ids = models.map((m) => m._id);

  const variants = await StorageVariantModel.find({ modelId: { $in: ids } }, { modelId: 1, capacity: 1, priceModifier: 1 }).lean<
    LeanVariant[]
  >();
  const rules = await PricingRuleModel.find(
    { modelId: { $in: ids }, isActive: true },
    { modelId: 1, variantId: 1, storageVariantId: 1, basePrice: 1, storagePriceAdjustment: 1, version: 1 }
  ).lean<LeanRule[]>();

  const group = <T extends { modelId: Types.ObjectId }>(rows: T[]) => {
    const map = new Map<string, T[]>();
    for (const r of rows) {
      const k = String(r.modelId);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(r);
    }
    return map;
  };
  const variantsByModel = group(variants);
  const rulesByModel = group(rules);

  const plan: Plan = { scanned, models: [], unmatched: [], skippedNoVariants: [] };

  for (const model of models) {
    const brand = brandName.get(String(model.brandId)) ?? '?';
    const modelVariants = variantsByModel.get(String(model._id)) ?? [];
    const entry = findPriceEntry(index, model, brand);

    if (!entry) {
      plan.unmatched.push({ brand, model, variantCount: modelVariants.length });
      continue;
    }

    let inputs: VariantInput[];
    let creating = false;
    if (modelVariants.length) {
      inputs = modelVariants.map((v) => ({ id: String(v._id), capacity: v.capacity, oldMod: v.priceModifier ?? 0 }));
    } else if (entry.createVariants?.length) {
      inputs = entry.createVariants.map((capacity) => ({ id: null, capacity, oldMod: null }));
      creating = true;
    } else {
      plan.skippedNoVariants.push({ brand, model });
      continue;
    }

    const newBase = entry.price;
    const variantPlans = planVariantModifiers(entry, newBase, inputs);
    const modById = new Map(variantPlans.filter((v) => v.id).map((v) => [v.id!, v]));

    const rulePlans: RulePlan[] = (rulesByModel.get(String(model._id)) ?? []).map((r): RulePlan => {
      const ref = r.variantId ?? r.storageVariantId;
      const oldBase = r.basePrice;
      const oldAdj = r.storagePriceAdjustment ?? 0;
      if (ref) {
        const v = modById.get(String(ref));
        if (v) {
          const set = { basePrice: newBase, storagePriceAdjustment: v.newMod };
          return {
            id: r._id,
            version: r.version,
            scope: 'variant',
            label: v.capacity,
            oldBase,
            oldAdj,
            set,
            needsUpdate: oldBase !== set.basePrice || oldAdj !== set.storagePriceAdjustment,
          };
        }
        // Points at a variant that no longer exists: sync the base only, leave the adjustment alone.
        return {
          id: r._id,
          version: r.version,
          scope: 'orphan',
          label: `missing variant ${String(ref)}`,
          oldBase,
          oldAdj,
          set: { basePrice: newBase },
          needsUpdate: oldBase !== newBase,
        };
      }
      const set = { basePrice: newBase, storagePriceAdjustment: 0 };
      return {
        id: r._id,
        version: r.version,
        scope: 'model',
        label: 'model-level',
        oldBase,
        oldAdj,
        set,
        needsUpdate: oldBase !== set.basePrice || oldAdj !== 0,
      };
    });

    plan.models.push({
      model,
      brand,
      entry,
      oldBase: model.basePrice,
      newBase,
      variants: variantPlans,
      creating,
      rules: rulePlans,
    });
  }

  plan.models.sort((a, b) => a.brand.localeCompare(b.brand) || b.newBase - a.newBase || a.model.name.localeCompare(b.model.name));
  return plan;
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

const inr = (n: number | null | undefined) => (n == null ? '-' : `₹${Math.round(n).toLocaleString('en-IN')}`);
const delta = (from: number, to: number) => (to === from ? 'no change' : `${to > from ? '+' : '-'}${inr(Math.abs(to - from))}`);
const variantChanged = (v: VariantPlan) => v.oldMod === null || v.oldMod !== v.newMod;

function printPlan(plan: Plan) {
  const line = '-'.repeat(96);
  for (const mp of plan.models) {
    const flags = [mp.model.isArchived ? 'archived' : '', mp.model.isPublished === false ? 'unpublished' : ''].filter(Boolean);
    console.log(line);
    console.log(
      `${mp.brand} | ${mp.model.name} | ${inr(mp.oldBase)} → ${inr(mp.newBase)} (${delta(mp.oldBase, mp.newBase)})` +
        (flags.length ? `  [${flags.join(', ')}]` : '')
    );
    const capW = Math.max(16, ...mp.variants.map((v) => v.capacity.length)) + 2;
    for (const v of mp.variants) {
      const oldPrice = v.oldMod === null ? null : mp.oldBase + v.oldMod;
      const newPrice = mp.newBase + v.newMod;
      const note = !v.parsed
        ? '  ! could not parse, modifier kept'
        : v.oldMod === null
          ? '  NEW variant'
          : oldPrice === newPrice && !variantChanged(v)
            ? ''
            : `  (${delta(oldPrice!, newPrice)})`;
      console.log(
        `    ${v.capacity.padEnd(capW)}${inr(oldPrice).padStart(11)} → ${inr(newPrice).padEnd(11)} mod ${inr(v.oldMod).padStart(9)} → ${inr(
          v.newMod
        ).padEnd(9)}${note}`
      );
    }
    const toSync = mp.rules.filter((r) => r.needsUpdate);
    const orphans = mp.rules.filter((r) => r.scope === 'orphan').length;
    console.log(
      `    active rules: ${mp.rules.length}, to sync: ${toSync.length}` + (orphans ? `, orphaned (variant missing): ${orphans}` : '')
    );
    for (const r of toSync) {
      const adj = r.set.storagePriceAdjustment === undefined ? 'kept' : `${inr(r.oldAdj)} → ${inr(r.set.storagePriceAdjustment)}`;
      console.log(`      rule ${String(r.id)} v${r.version ?? '?'} [${r.label}] base ${inr(r.oldBase)} → ${inr(r.set.basePrice)}, adj ${adj}`);
    }
  }
  console.log(line);
}

function printSummary(plan: Plan, only: string) {
  const modelsChanged = plan.models.filter((m) => m.oldBase !== m.newBase || m.variants.some(variantChanged)).length;
  const variantsChanged = plan.models.reduce((n, m) => n + m.variants.filter((v) => v.oldMod !== null && v.oldMod !== v.newMod).length, 0);
  const variantsCreated = plan.models.reduce((n, m) => n + m.variants.filter((v) => v.oldMod === null).length, 0);
  const rulesToSync = plan.models.reduce((n, m) => n + m.rules.filter((r) => r.needsUpdate).length, 0);
  const unparsed = plan.models.flatMap((m) => m.variants.filter((v) => !v.parsed).map((v) => `${m.model.name} / "${v.capacity}"`));
  const orphans = plan.models.flatMap((m) => m.rules.filter((r) => r.scope === 'orphan').map((r) => `${m.model.name} rule ${String(r.id)}`));

  console.log('\nSUMMARY' + (only ? ` (--only="${only}")` : ''));
  console.log(`  models in DB:                ${plan.scanned}${only ? ` (${plan.models.length + plan.unmatched.length + plan.skippedNoVariants.length} selected)` : ''}`);
  console.log(`  models matched to table:     ${plan.models.length}`);
  console.log(`  models changed:              ${modelsChanged}`);
  console.log(`  variants changed:            ${variantsChanged}`);
  console.log(`  variants to create:          ${variantsCreated}`);
  console.log(`  active rules to sync:        ${rulesToSync}`);
  console.log(`  unparsed variants (kept):    ${unparsed.length}`);
  for (const u of unparsed) console.log(`    - ${u}`);
  console.log(`  orphaned active rules:       ${orphans.length}`);
  for (const o of orphans) console.log(`    - ${o}`);
  console.log(`  skipped (no variants):       ${plan.skippedNoVariants.length}`);
  for (const s of plan.skippedNoVariants) console.log(`    - ${s.brand} | ${s.model.name} (${s.model.slug})`);
  console.log(`  unmatched (left untouched):  ${plan.unmatched.length}`);
  for (const u of plan.unmatched) {
    const notes = [
      u.variantCount === 0 ? 'no variants' : `${u.variantCount} variants`,
      looksLikeTestRecord(u.model) ? 'likely a test record' : '',
    ].filter(Boolean);
    console.log(`    - ${u.brand} | ${u.model.name} (${u.model.slug}), ${inr(u.model.basePrice)}, ${notes.join(', ')}`);
  }
}

// ---------------------------------------------------------------------------
// Writes (--apply only)
// ---------------------------------------------------------------------------

async function applyPlan(plan: Plan) {
  let writes = 0;
  console.log('\nAPPLYING CHANGES');
  for (const mp of plan.models) {
    const tag = `${mp.brand} | ${mp.model.name}`;

    if (mp.oldBase !== mp.newBase) {
      await SmartphoneModel.updateOne({ _id: mp.model._id }, { $set: { basePrice: mp.newBase } });
      console.log(`  [model]   ${tag}: basePrice ${inr(mp.oldBase)} → ${inr(mp.newBase)}`);
      writes++;
    }

    for (const v of mp.variants) {
      if (v.oldMod === null) {
        const exists = await StorageVariantModel.exists({ modelId: mp.model._id, capacity: v.capacity });
        if (exists) {
          console.log(`  [variant] ${tag} / ${v.capacity}: already exists, skipped create`);
          continue;
        }
        await StorageVariantModel.create({ modelId: mp.model._id, capacity: v.capacity, priceModifier: v.newMod, isPublished: true });
        console.log(`  [variant] ${tag} / ${v.capacity}: CREATED, priceModifier ${inr(v.newMod)}`);
        writes++;
      } else if (v.id && v.oldMod !== v.newMod) {
        await StorageVariantModel.updateOne({ _id: v.id }, { $set: { priceModifier: v.newMod } });
        console.log(`  [variant] ${tag} / ${v.capacity}: priceModifier ${inr(v.oldMod)} → ${inr(v.newMod)}`);
        writes++;
      }
    }

    for (const r of mp.rules) {
      if (!r.needsUpdate) continue;
      // isActive in the filter: never touch a rule that was superseded since the plan was built.
      const res = await PricingRuleModel.updateOne({ _id: r.id, isActive: true }, { $set: r.set });
      const adj = r.set.storagePriceAdjustment === undefined ? 'adj kept' : `adj ${inr(r.oldAdj)} → ${inr(r.set.storagePriceAdjustment)}`;
      console.log(
        `  [rule]    ${tag} rule ${String(r.id)} v${r.version ?? '?'} [${r.label}]: base ${inr(r.oldBase)} → ${inr(r.set.basePrice)}, ${adj}` +
          (res.matchedCount ? '' : '  (no longer active, skipped)')
      );
      if (res.matchedCount) writes++;
    }
  }
  console.log(`\nDone: ${writes} write(s).`);
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

const redactUri = (uri: string) => uri.replace(/\/\/[^@/]*@/, '//***@').replace(/\?.*$/, '');

async function main(argv: string[]): Promise<number> {
  const apply = argv.includes('--apply');
  const onlyArg = argv.find((a) => a.startsWith('--only='));
  const only = onlyArg ? onlyArg.slice('--only='.length).trim().replace(/^["']|["']$/g, '').toLowerCase() : '';
  const unknown = argv.filter((a) => a !== '--apply' && !a.startsWith('--only='));
  if (unknown.length) {
    console.error(`Unknown argument(s): ${unknown.join(' ')}\nUsage: tsx scripts/seed-prices.ts [--apply] [--only=<substring>]`);
    return 2;
  }

  // Never build indexes / create collections as a side effect of connecting.
  mongoose.set('autoIndex', false);
  mongoose.set('autoCreate', false);

  console.log(`[seed-prices] Mode: ${apply ? 'APPLY (writes enabled)' : 'DRY RUN (read-only)'}`);
  console.log(`[seed-prices] Target: ${redactUri(config.mongoUri)}`);

  try {
    try {
      await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 10000, autoIndex: false, autoCreate: false });
    } catch (err) {
      console.error('[seed-prices] MongoDB connection failed:', (err as Error)?.message ?? err);
      return 1;
    }
    console.log(`[seed-prices] Connected to ${mongoose.connection.host}/${mongoose.connection.name}\n`);

    const plan = await buildPlan(only);
    printPlan(plan);
    printSummary(plan, only);

    if (apply) {
      await applyPlan(plan);
    } else {
      console.log('\nDRY RUN: nothing was written. Re-run with --apply to write these changes.');
    }
    return 0;
  } finally {
    await mongoose.disconnect().catch(() => undefined);
  }
}

if (process.argv[1]?.includes('seed-prices')) {
  main(process.argv.slice(2))
    .then((code) => process.exit(code))
    .catch((err) => {
      console.error('[seed-prices] Error:', err);
      mongoose
        .disconnect()
        .catch(() => undefined)
        .finally(() => process.exit(1));
    });
}
