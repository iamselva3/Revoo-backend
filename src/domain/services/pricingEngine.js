// pricingEngine.js
// Buyback pricing: global default % with per-model admin overrides.

// Phones that don't switch on are bought at scrap value, plus these small extras for accessories.
const ACC_BONUS = { original_charger: 250, box_same_imei: 150, bill_same_imei: 210 };

// Working phones: the price assumes the original charger and box are handed over; each missing one
// is taken off. Per model the admin sets the amount (PricingRule.deductions.accessoriesBonus);
// it is never more than MISSING_ACCESSORY_MAX_PCT of the phone's price, so cheap phones aren't
// hit disproportionately.
const DEFAULT_MISSING_ACCESSORY = { original_charger: 500, box_same_imei: 500 };
const MISSING_ACCESSORY_MAX_PCT = 0.05;
const MISSING_ACCESSORY_KEYS = { original_charger: 'missing_original_charger', box_same_imei: 'missing_box_same_imei' };
// No bill with the same IMEI: the same ₹210 as before (on top of the no-bill warranty penalty).
const NO_BILL_DEDUCTION = ACC_BONUS.bill_same_imei;

// How old the phone is (customer's answer, counted from the purchase date). Per model the admin
// sets the % of the price taken off for each age band (PricingRule.deductionPercentages.deviceAge,
// whole numbers: 5 = 5%). A band the admin hasn't set takes nothing off.
const DEVICE_AGE_BANDS = ['BELOW_3_MONTHS', '3_TO_6_MONTHS', '6_TO_11_MONTHS', 'ABOVE_11_MONTHS'];
const DEVICE_AGE_MAX_PCT = 90;

const DEFAULT_PCT = {
  // Screen & touch (single select)
  flawless: 0,
  minor_screen_scratches: 0.06,
  heavy_screen_scratches: 0.12,
  minor_display_spots: 0.12, // 1-2 small spots, display otherwise usable
  display_spots_or_dead_pixels: 0.28,
  screen_cracked_glass_only: 0.35,
  touch_screen_not_working: 0.62,
  // Body (single select)
  no_scratches_flawless: 0,
  minor_scratches_center_or_side: 0.04,
  minor_dent: 0.05, // minor dent does not void warranty
  major_scratches_or_paint_peel: 0.09,
  back_glass_cracked_or_broken: 0.15,
  dents_or_bent_side_panel: 0.16,
  // Battery (single select)
  above_90_percent: 0,
  '86_to_90_percent': 0.03,
  '80_to_85_percent': 0.08,
  below_80_percent_or_service: 0.14,
  // Hardware (multi select)
  camera_glass_broken: 0.09,
  rear_camera_not_working_or_blurry: 0.18,
  front_camera_not_working: 0.10,
  face_id_or_fingerprint_not_working: 0.25,
  wifi_bluetooth_gps_issue: 0.20,
  speaker_or_mic_faulty: 0.08,
  charging_port_faulty: 0.07,
  volume_or_power_button_faulty: 0.06,
  network_or_sim_tray_issue: 0.30,
  // Warranty
  out_of_warranty_or_no_bill_penalty: 0.18,
};

const WARRANTY_VOID_KEYS = new Set([
  'touch_screen_not_working',
  'screen_cracked_glass_only',
  'display_spots_or_dead_pixels',
  'camera_glass_broken',
  'back_glass_cracked_or_broken',
  'dents_or_bent_side_panel',
]);

// Faults that send the phone straight to scrap value (like "does not turn on").
// Admin-configurable: pass config.criticalKeys to override.
const DEFAULT_CRITICAL_KEYS = ['network_or_sim_tray_issue'];

function resolveDeduction(key, basePrice, phone) {
  const flat = phone.customDeductions?.[key];
  if (typeof flat === 'number') return { amount: flat, source: 'admin_flat' };

  const pct = phone.customPercentages?.[key];
  if (typeof pct === 'number') {
    return { amount: Math.round(basePrice * pct), source: 'admin_pct' };
  }

  if (!(key in DEFAULT_PCT)) {
    // Never silently treat an unknown key as 0 -- this hides mapping bugs.
    throw new Error(`Unknown condition key: "${key}"`);
  }
  return { amount: Math.round(basePrice * DEFAULT_PCT[key]), source: 'default_pct' };
}

/**
 * @param {object} phone  { basePrice, minScrapPrice?, customDeductions?, customPercentages?,
 *                          accessoryDeductions?: { original_charger?: number, box_same_imei?: number },
 *                          deviceAgePercentages?: { [band]: number }  (whole % per age band) }
 * @param {object} input  {
 *   phone_working_condition: boolean,
 *   screenKey: string, bodyKey: string, batteryKey: string,
 *   hardwareKeys: string[],
 *   accessories: { original_charger, box_same_imei, bill_same_imei }  (booleans),
 *   deviceAge?: 'BELOW_3_MONTHS' | '3_TO_6_MONTHS' | '6_TO_11_MONTHS' | 'ABOVE_11_MONTHS'
 * }
 * @param {object} [config] { criticalKeys?: string[], criticalIncludesAccessories?: boolean }
 */
function calculatePrice(phone, input, config = {}) {
  const basePrice = phone.basePrice;
  if (typeof basePrice !== 'number' || basePrice <= 0) throw new Error('Invalid basePrice');
  if (typeof input.phone_working_condition !== 'boolean') {
    throw new Error('phone_working_condition must be a boolean');
  }

  const criticalKeys = config.criticalKeys ?? DEFAULT_CRITICAL_KEYS;
  const acc = input.accessories || {};

  const selectedAccBonus = Object.keys(ACC_BONUS)
    .filter((k) => acc[k] === true)
    .reduce((sum, k) => sum + ACC_BONUS[k], 0);

  const scrapFloor = phone.minScrapPrice || Math.round(basePrice * 0.022);

  const result = {
    basePrice, scrapFloor, maxAccPool: 0, selectedAccBonus,
    deductions: [], totalDeductions: 0, rawBodyPrice: null,
    clampedBodyPrice: null, finalPrice: null, rule: null,
  };

  // Gatekeeper: phone does not turn on (scrap value + accessory extras)
  if (input.phone_working_condition === false) {
    result.rule = 'gatekeeper_not_working';
    result.finalPrice = scrapFloor + selectedAccBonus;
    return result;
  }

  const keys = [
    input.screenKey, input.bodyKey, input.batteryKey,
    ...(input.hardwareKeys || []),
  ].filter(Boolean);

  // Critical fault: straight to scrap value
  const critical = keys.find((k) => criticalKeys.includes(k));
  if (critical) {
    result.rule = `critical_fault:${critical}`;
    result.finalPrice = scrapFloor + (config.criticalIncludesAccessories ? selectedAccBonus : 0);
    return result;
  }

  // Normal deductions
  for (const key of keys) {
    const d = resolveDeduction(key, basePrice, phone);
    result.deductions.push({ key, ...d });
  }

  // Warranty: any physical-damage key OR no bill with matching IMEI
  const voided = keys.some((k) => WARRANTY_VOID_KEYS.has(k));
  if (voided || acc.bill_same_imei !== true) {
    const key = 'out_of_warranty_or_no_bill_penalty';
    const d = resolveDeduction(key, basePrice, phone);
    result.deductions.push({ key, ...d, reason: voided ? 'physical_damage' : 'no_bill' });
  }

  // Accessories: the base price includes them; take off each one that's missing
  for (const [accKey, deductionKey] of Object.entries(MISSING_ACCESSORY_KEYS)) {
    if (acc[accKey] === true) continue;
    const configured = phone.accessoryDeductions?.[accKey];
    const wanted = typeof configured === 'number' && configured >= 0 ? configured : DEFAULT_MISSING_ACCESSORY[accKey];
    const amount = Math.min(Math.round(wanted), Math.round(basePrice * MISSING_ACCESSORY_MAX_PCT));
    if (amount > 0) {
      result.deductions.push({ key: deductionKey, amount, source: typeof configured === 'number' ? 'admin_flat' : 'default_flat' });
    }
  }
  if (acc.bill_same_imei !== true) {
    result.deductions.push({ key: 'missing_bill_document', amount: NO_BILL_DEDUCTION, source: 'default_flat' });
  }

  // Phone age: admin's % for the band the customer picked
  if (DEVICE_AGE_BANDS.includes(input.deviceAge)) {
    const pct = phone.deviceAgePercentages?.[input.deviceAge];
    if (typeof pct === 'number' && Number.isFinite(pct) && pct > 0) {
      const appliedPct = Math.min(pct, DEVICE_AGE_MAX_PCT);
      const amount = Math.round((basePrice * appliedPct) / 100);
      if (amount > 0) {
        result.deductions.push({ key: 'device_age', amount, source: 'admin_pct', band: input.deviceAge, pct: appliedPct });
      }
    }
  }

  result.totalDeductions = result.deductions.reduce((s, d) => s + d.amount, 0);
  result.rawBodyPrice = basePrice - result.totalDeductions;
  result.clampedBodyPrice = Math.max(scrapFloor, result.rawBodyPrice);
  if (result.rawBodyPrice >= scrapFloor) {
    // Normal case: the price already includes the accessories (missing ones were deducted)
    result.selectedAccBonus = 0;
    result.finalPrice = Math.min(basePrice, result.rawBodyPrice);
  } else {
    // Down at scrap value: same as a phone that doesn't switch on -- scrap + accessory extras
    result.finalPrice = Math.min(basePrice, scrapFloor + selectedAccBonus);
  }
  result.rule = 'active_phone_formula';
  return result;
}

module.exports = {
  calculatePrice, DEFAULT_PCT, WARRANTY_VOID_KEYS, ACC_BONUS,
  DEFAULT_MISSING_ACCESSORY, MISSING_ACCESSORY_MAX_PCT, MISSING_ACCESSORY_KEYS,
  DEVICE_AGE_BANDS, DEVICE_AGE_MAX_PCT,
};

