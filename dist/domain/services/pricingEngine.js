"use strict";
// pricingEngine.js
// Buyback pricing. Every answer a customer can give on the website / app takes a % of the phone's
// price off. The admin sets each % per model in the Pricing window (PricingRule.deductionPercentages);
// the defaults below are used for anything not saved. All the answers the customer picked add up.
// Every customer answer, by Pricing-window field (section -> field): the engine key that prices it,
// its default % (whole numbers: 12 = 12%) and its name for the price breakdown. The admin window
// shows exactly this list, with these defaults.
const PRICING_OPTIONS = {
    basicQuestions: {
        // A phone that doesn't switch on is bought at what's left (2.2% of the price by default); a
        // working phone is never priced below that.
        phoneNotWorking: { key: 'phone_not_working', pct: 97.8, label: 'Phone not working' },
        touchscreenNotWorking: { key: 'touch_screen_not_working', pct: 62, label: 'Touchscreen not working' },
        displayNotOriginal: { key: 'display_not_original', pct: 10, label: 'Display not original' },
        // Taken off once: no warranty (or the question wasn't asked), no bill with the same IMEI, or
        // damage that voids the warranty.
        noWarranty: { key: 'out_of_warranty_or_no_bill_penalty', pct: 18, label: 'No valid warranty' },
    },
    screenDisplay: {
        MINOR_SPOTS: { key: 'minor_display_spots', pct: 12, label: 'Screen: 1–2 minor spots' },
        MAJOR_SPOTS_OR_LINES: { key: 'display_spots_or_dead_pixels', pct: 28, label: 'Screen: major spots or lines' },
    },
    touchGlass: {
        MINOR_SCRATCHES: { key: 'minor_screen_scratches', pct: 6, label: 'Touch glass: minor scratches' },
        HEAVY_SCRATCHES: { key: 'heavy_screen_scratches', pct: 12, label: 'Touch glass: heavy scratches' },
        CRACKED_GLASS: { key: 'screen_cracked_glass_only', pct: 35, label: 'Touch glass: cracked or broken' },
    },
    backPanel: {
        MINOR_SCRATCHES: { key: 'back_minor_scratches', pct: 4, label: 'Back panel: minor scratches' },
        HEAVY_SCRATCHES: { key: 'back_heavy_scratches', pct: 9, label: 'Back panel: heavy scratches' },
        BACK_PANEL_BROKEN: { key: 'back_glass_cracked_or_broken', pct: 15, label: 'Back panel: broken' },
    },
    sidePanel: {
        MINOR_DENT_OR_SCRATCHES: { key: 'side_minor_dent_or_scratches', pct: 5, label: 'Side panel: minor dent or scratches' },
        HEAVY_DENT: { key: 'side_heavy_dent', pct: 9, label: 'Side panel: heavy dents or scratches' },
        BENT_OR_BROKEN: { key: 'dents_or_bent_side_panel', pct: 16, label: 'Side panel: bent or broken' },
    },
    hardwareFaults: {
        batteryHealthBelow83: { key: '80_to_85_percent', pct: 8, label: 'Battery health 83% or below / battery problem' },
        frontCameraNotWorking: { key: 'front_camera_not_working', pct: 10, label: 'Front camera not working' },
        backCameraNotWorking: { key: 'rear_camera_not_working_or_blurry', pct: 18, label: 'Back camera not working' },
        cameraGlassBroken: { key: 'camera_glass_broken', pct: 9, label: 'Camera glass broken' },
        // Same as a phone that doesn't switch on (2.2% of the price is left)
        networkProblem: { key: 'network_or_sim_tray_issue', pct: 97.8, label: 'Network / SIM issue' },
        chargingPortNotWorking: { key: 'charging_port_faulty', pct: 7, label: 'Charging port not working' },
        wifiOrBluetoothNotWorking: { key: 'wifi_bluetooth_gps_issue', pct: 20, label: 'Wi-Fi or Bluetooth not working' },
        earSpeakerNotWorking: { key: 'speaker_faulty', pct: 8, label: 'Speaker not working' },
        microphoneNotWorking: { key: 'mic_faulty', pct: 8, label: 'Microphone not working' },
        biometricsNotWorking: { key: 'face_id_or_fingerprint_not_working', pct: 25, label: 'Face ID / Fingerprint not working' },
        powerButtonNotWorking: { key: 'power_button_faulty', pct: 6, label: 'Power button not working' },
        volumeButtonNotWorking: { key: 'volume_button_faulty', pct: 6, label: 'Volume button not working' },
        vibratorNotWorking: { key: 'vibrator_faulty', pct: 2, label: 'Vibration not working' },
        proximitySensorNotWorking: { key: 'proximity_sensor_faulty', pct: 3, label: 'Proximity sensor not working' },
    },
};
// Keys still sent by older callers (one combined body condition, battery %, combined faults).
const LEGACY_PCT = {
    flawless: 0,
    no_scratches_flawless: 0,
    above_90_percent: 0,
    minor_scratches_center_or_side: 0.04,
    minor_dent: 0.05,
    major_scratches_or_paint_peel: 0.09,
    '86_to_90_percent': 0.03,
    below_80_percent_or_service: 0.14,
    speaker_or_mic_faulty: 0.08,
    volume_or_power_button_faulty: 0.06,
};
/** Default share of the price each key takes off (fractions: 0.12 = 12%). */
const DEFAULT_PCT = { ...LEGACY_PCT };
/** Breakdown name of each customer answer, by engine key. */
const OPTION_LABELS = {};
for (const fields of Object.values(PRICING_OPTIONS)) {
    for (const { key, pct, label } of Object.values(fields)) {
        DEFAULT_PCT[key] = pct / 100;
        OPTION_LABELS[key] = label;
    }
}
// Working phones: the price includes the original charger and box; each missing one is taken off.
// Per model the admin sets the amount (PricingRule.deductions.accessoriesBonus); it is never more
// than MISSING_ACCESSORY_MAX_PCT of the phone's price, so cheap phones aren't hit disproportionately.
const DEFAULT_MISSING_ACCESSORY = { original_charger: 500, box_same_imei: 500 };
const MISSING_ACCESSORY_MAX_PCT = 0.05;
const MISSING_ACCESSORY_KEYS = { original_charger: 'missing_original_charger', box_same_imei: 'missing_box_same_imei' };
// Accessories are part of the price, never an extra (kept for older imports; all zero).
const ACC_BONUS = { original_charger: 0, box_same_imei: 0, bill_same_imei: 0 };
// How old the phone is (customer's answer, counted from the purchase date). Per model the admin
// sets the % of the price taken off for each age band (whole numbers: 5 = 5%). A band the admin
// hasn't set takes nothing off.
const DEVICE_AGE_BANDS = ['BELOW_3_MONTHS', '3_TO_6_MONTHS', '6_TO_11_MONTHS', 'ABOVE_11_MONTHS'];
const DEVICE_AGE_MAX_PCT = 90;
// "Is the phone's display original?" answered No: default % taken off (the admin sets it per model).
const DEFAULT_DISPLAY_NOT_ORIGINAL_PCT = PRICING_OPTIONS.basicQuestions.displayNotOriginal.pct;
// Damage that voids a manufacturer warranty: the phone is then priced as out of warranty.
const WARRANTY_VOID_KEYS = new Set([
    'touch_screen_not_working',
    'screen_cracked_glass_only',
    'display_spots_or_dead_pixels',
    'camera_glass_broken',
    'back_glass_cracked_or_broken',
    'dents_or_bent_side_panel',
]);
const WARRANTY_KEY = PRICING_OPTIONS.basicQuestions.noWarranty.key;
const NOT_WORKING_KEY = PRICING_OPTIONS.basicQuestions.phoneNotWorking.key;
// Faults that send the phone straight to scrap value. None by default: "Network / SIM issue" takes
// 97.8% off instead, which leaves the same scrap value but can be changed by the admin.
// A rule can still pass config.criticalKeys.
const DEFAULT_CRITICAL_KEYS = [];
function resolveDeduction(key, basePrice, phone) {
    const flat = phone.customDeductions?.[key];
    if (typeof flat === 'number')
        return { amount: flat, source: 'admin_flat' };
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
/** What a phone that doesn't switch on is worth; a working phone is never priced below it. */
function scrapValue(basePrice, phone) {
    const pct = phone.customPercentages?.[NOT_WORKING_KEY];
    if (typeof pct === 'number' && Number.isFinite(pct)) {
        return Math.max(0, Math.round(basePrice * (1 - Math.min(Math.max(pct, 0), 1))));
    }
    if (typeof phone.minScrapPrice === 'number' && phone.minScrapPrice > 0)
        return phone.minScrapPrice;
    return Math.round(basePrice * (1 - DEFAULT_PCT[NOT_WORKING_KEY]));
}
/**
 * @param {object} phone  { basePrice, minScrapPrice?, customDeductions?,
 *                          customPercentages?: { [engineKey]: fraction }  (admin's % from the Pricing window),
 *                          accessoryDeductions?: { original_charger?: number, box_same_imei?: number },
 *                          deviceAgePercentages?: { [band]: number }  (whole % per age band),
 *                          displayNotOriginalPct?: number  (whole %, default 10) }
 * @param {object} input  {
 *   phone_working_condition: boolean,
 *   screenKey: string, bodyKey: string, batteryKey: string,
 *   backKey?: string, sideKey?: string  (back and side panel are priced separately and add up),
 *   hardwareKeys: string[],
 *   accessories: { original_charger, box_same_imei, bill_same_imei }  (booleans),
 *   deviceAge?: 'BELOW_3_MONTHS' | '3_TO_6_MONTHS' | '6_TO_11_MONTHS' | 'ABOVE_11_MONTHS',
 *   displayNotOriginal?: boolean  (customer said the display is not original),
 *   underWarranty?: boolean  (customer's answer; false also when the question wasn't asked;
 *                             undefined = older apps: the bill decides)
 * }
 * @param {object} [config] { criticalKeys?: string[] }
 */
function calculatePrice(phone, input, config = {}) {
    const basePrice = phone.basePrice;
    if (typeof basePrice !== 'number' || basePrice <= 0)
        throw new Error('Invalid basePrice');
    if (typeof input.phone_working_condition !== 'boolean') {
        throw new Error('phone_working_condition must be a boolean');
    }
    const criticalKeys = config.criticalKeys ?? DEFAULT_CRITICAL_KEYS;
    const acc = input.accessories || {};
    const scrapFloor = scrapValue(basePrice, phone);
    const result = {
        basePrice, scrapFloor, maxAccPool: 0, selectedAccBonus: 0,
        deductions: [], totalDeductions: 0, rawBodyPrice: null,
        clampedBodyPrice: null, finalPrice: null, rule: null,
    };
    // Gatekeeper: phone does not turn on (scrap value; nothing else is asked)
    if (input.phone_working_condition === false) {
        result.rule = 'gatekeeper_not_working';
        result.finalPrice = Math.min(basePrice, scrapFloor);
        return result;
    }
    const keys = [
        input.screenKey, input.bodyKey, input.backKey, input.sideKey, input.batteryKey,
        ...(input.hardwareKeys || []),
    ].filter(Boolean);
    // Critical fault (only when a rule configures one): straight to scrap value
    const critical = keys.find((k) => criticalKeys.includes(k));
    if (critical) {
        result.rule = `critical_fault:${critical}`;
        result.finalPrice = Math.min(basePrice, scrapFloor);
        return result;
    }
    // Each answer the customer picked
    for (const key of keys) {
        const d = resolveDeduction(key, basePrice, phone);
        result.deductions.push({ key, ...d });
    }
    // Display not original. The question is only asked when the phone and its touchscreen work; a dead
    // touchscreen is already priced as a display replacement, so it is never charged twice.
    if (input.displayNotOriginal === true && input.screenKey !== 'touch_screen_not_working') {
        const configured = phone.displayNotOriginalPct;
        const isSet = typeof configured === 'number' && Number.isFinite(configured) && configured >= 0;
        const pct = Math.min(isSet ? configured : DEFAULT_DISPLAY_NOT_ORIGINAL_PCT, 90);
        const amount = Math.round((basePrice * pct) / 100);
        if (amount > 0) {
            result.deductions.push({ key: 'display_not_original', amount, source: isSet ? 'admin_pct' : 'default_pct', pct });
        }
    }
    // Warranty: "No valid warranty" is taken off once when the customer says there's no warranty (or
    // wasn't asked: display not original, touchscreen not working), when there's no bill with the same
    // IMEI, or when damage voids the warranty. Older apps don't say: then the bill decides.
    const noWarranty = input.underWarranty === false;
    const voided = keys.some((k) => WARRANTY_VOID_KEYS.has(k));
    const noBill = !noWarranty && acc.bill_same_imei !== true;
    if (noWarranty || voided || noBill) {
        const d = resolveDeduction(WARRANTY_KEY, basePrice, phone);
        result.deductions.push({
            key: WARRANTY_KEY,
            ...d,
            reason: noWarranty ? 'no_warranty' : voided ? 'physical_damage' : 'no_bill',
        });
    }
    // Accessories: the price includes them; take off each one that's missing
    for (const [accKey, deductionKey] of Object.entries(MISSING_ACCESSORY_KEYS)) {
        if (acc[accKey] === true)
            continue;
        const configured = phone.accessoryDeductions?.[accKey];
        const wanted = typeof configured === 'number' && configured >= 0 ? configured : DEFAULT_MISSING_ACCESSORY[accKey];
        const amount = Math.min(Math.round(wanted), Math.round(basePrice * MISSING_ACCESSORY_MAX_PCT));
        if (amount > 0) {
            result.deductions.push({ key: deductionKey, amount, source: typeof configured === 'number' ? 'admin_flat' : 'default_flat' });
        }
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
    result.finalPrice = Math.min(basePrice, result.clampedBodyPrice);
    result.rule = 'active_phone_formula';
    return result;
}
module.exports = {
    calculatePrice, DEFAULT_PCT, WARRANTY_VOID_KEYS, ACC_BONUS, PRICING_OPTIONS, OPTION_LABELS,
    DEFAULT_MISSING_ACCESSORY, MISSING_ACCESSORY_MAX_PCT, MISSING_ACCESSORY_KEYS,
    DEVICE_AGE_BANDS, DEVICE_AGE_MAX_PCT, DEFAULT_DISPLAY_NOT_ORIGINAL_PCT,
};
//# sourceMappingURL=pricingEngine.js.map