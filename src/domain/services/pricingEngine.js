// pricingEngine.js
// Buyback pricing: global default % with per-model admin overrides.

const ACC_BONUS = { original_charger: 250, box_same_imei: 150, bill_same_imei: 210 };
const MAX_ACC_POOL = Object.values(ACC_BONUS).reduce((a, b) => a + b, 0); // 610

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
 * @param {object} phone  { basePrice, minScrapPrice?, customDeductions?, customPercentages? }
 * @param {object} input  {
 *   phone_working_condition: boolean,
 *   screenKey: string, bodyKey: string, batteryKey: string,
 *   hardwareKeys: string[],
 *   accessories: { original_charger, box_same_imei, bill_same_imei }  (booleans)
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
    basePrice, scrapFloor, maxAccPool: MAX_ACC_POOL, selectedAccBonus,
    deductions: [], totalDeductions: 0, rawBodyPrice: null,
    clampedBodyPrice: null, finalPrice: null, rule: null,
  };

  // Gatekeeper: phone does not turn on
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

  result.totalDeductions = result.deductions.reduce((s, d) => s + d.amount, 0);
  result.rawBodyPrice = basePrice - MAX_ACC_POOL - result.totalDeductions;
  result.clampedBodyPrice = Math.max(scrapFloor, result.rawBodyPrice);
  result.finalPrice = Math.min(basePrice, result.clampedBodyPrice + selectedAccBonus);
  result.rule = 'active_phone_formula';
  return result;
}

module.exports = { calculatePrice, DEFAULT_PCT, WARRANTY_VOID_KEYS, ACC_BONUS };

