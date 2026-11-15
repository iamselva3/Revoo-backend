export interface PhonePricingData {
  basePrice: number;
  minScrapPrice?: number;
  customDeductions?: Record<string, number>;
  /** Admin's % per engine key, as fractions (0.12 = 12%); from the Pricing window. */
  customPercentages?: Record<string, number>;
  /** Amount taken off when the accessory is missing (admin, per model). */
  accessoryDeductions?: { original_charger?: number; box_same_imei?: number };
  /** % of the price taken off per phone-age band (admin, per model; whole numbers, 5 = 5%). */
  deviceAgePercentages?: Partial<Record<DeviceAgeBand, number>>;
  /** % of the price taken off when the display is not original (admin, per model; whole %, default 10). */
  displayNotOriginalPct?: number;
}

export type DeviceAgeBand = 'BELOW_3_MONTHS' | '3_TO_6_MONTHS' | '6_TO_11_MONTHS' | 'ABOVE_11_MONTHS';

export interface PricingEngineInput {
  phone_working_condition: boolean;
  screenKey: string;
  bodyKey: string;
  /** Back and side panel answers, priced separately (they add up). */
  backKey?: string;
  sideKey?: string;
  batteryKey: string;
  hardwareKeys: string[];
  accessories: {
    original_charger?: boolean;
    box_same_imei?: boolean;
    bill_same_imei?: boolean;
  };
  /** How old the phone is (customer's answer). Missing = no age deduction. */
  deviceAge?: DeviceAgeBand;
  /** Customer said the display is not original (replaced outside an authorised centre). */
  displayNotOriginal?: boolean;
  /**
   * Customer said the phone is under warranty. false (also when the question wasn't asked): the
   * "No valid warranty" % is taken off; undefined (older apps): the bill decides.
   */
  underWarranty?: boolean;
}

export interface PricingEngineConfig {
  criticalKeys?: string[];
  criticalIncludesAccessories?: boolean;
}

export interface PricingEngineDeduction {
  key: string;
  amount: number;
  source: string;
  reason?: string;
  band?: DeviceAgeBand;
  pct?: number;
}

export interface PricingEngineResult {
  basePrice: number;
  scrapFloor: number;
  maxAccPool: number;
  selectedAccBonus: number;
  deductions: PricingEngineDeduction[];
  totalDeductions: number;
  rawBodyPrice: number | null;
  clampedBodyPrice: number | null;
  finalPrice: number | null;
  rule: string | null;
}

export declare function calculatePrice(
  phone: PhonePricingData,
  input: PricingEngineInput,
  config?: PricingEngineConfig
): PricingEngineResult;

export interface PricingOption {
  /** Engine key the answer is priced by */
  key: string;
  /** Default % of the price taken off (whole numbers: 12 = 12%) */
  pct: number;
  /** Name in the price breakdown */
  label: string;
}

/** Every customer answer by Pricing-window section and field. */
export declare const PRICING_OPTIONS: Record<string, Record<string, PricingOption>>;
/** Breakdown name of each customer answer, by engine key. */
export declare const OPTION_LABELS: Record<string, string>;
export declare const DEFAULT_PCT: Record<string, number>;
export declare const WARRANTY_VOID_KEYS: Set<string>;
export declare const ACC_BONUS: Record<string, number>;
export declare const DEFAULT_MISSING_ACCESSORY: { original_charger: number; box_same_imei: number };
export declare const MISSING_ACCESSORY_MAX_PCT: number;
export declare const MISSING_ACCESSORY_KEYS: { original_charger: string; box_same_imei: string };
export declare const DEVICE_AGE_BANDS: DeviceAgeBand[];
export declare const DEVICE_AGE_MAX_PCT: number;
export declare const DEFAULT_DISPLAY_NOT_ORIGINAL_PCT: number;

