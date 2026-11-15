import { DeclaredCondition } from '../entities/DeviceCondition.js';
import {
  IPricingRule,
  ValuationResult,
  ValuationBreakdownItem,
  ItemizedPricingBreakdown,
} from '../entities/PricingRule.js';
import {
  calculatePrice,
  DEFAULT_PCT,
  WARRANTY_VOID_KEYS,
  ACC_BONUS,
  DEVICE_AGE_BANDS,
  DeviceAgeBand,
  PRICING_OPTIONS,
  OPTION_LABELS,
  PricingEngineInput,
  PhonePricingData,
  PricingEngineResult,
  PricingEngineConfig,
} from './pricingEngine.js';

export { calculatePrice, DEFAULT_PCT, WARRANTY_VOID_KEYS, ACC_BONUS, PRICING_OPTIONS };

// Accessories are part of the price (missing ones are taken off), never an extra: all zero.
export const CHARGER_BONUS = ACC_BONUS.original_charger;
export const BOX_BONUS = ACC_BONUS.box_same_imei;
export const BILL_BONUS = ACC_BONUS.bill_same_imei;
export const MAX_ACC_POOL = CHARGER_BONUS + BOX_BONUS + BILL_BONUS;

/** Website / app panel answers -> engine keys (NO_DEFECTS takes nothing off). */
const BACK_PANEL_KEYS: Record<string, string> = Object.fromEntries(
  Object.entries(PRICING_OPTIONS.backPanel).map(([answer, o]) => [answer, o.key])
);
const SIDE_PANEL_KEYS: Record<string, string> = Object.fromEntries(
  Object.entries(PRICING_OPTIONS.sidePanel).map(([answer, o]) => [answer, o.key])
);
// Older spellings of the same answers
SIDE_PANEL_KEYS.MINOR_DENT = SIDE_PANEL_KEYS.MINOR_DENT_OR_SCRATCHES;
SIDE_PANEL_KEYS.MAJOR_DENT_OR_HEAVY_SCRATCHES = SIDE_PANEL_KEYS.HEAVY_DENT;

export const DEFAULT_SCRAP_FLOOR_MULTIPLIER = 0.022;
export const DEFAULT_WARRANTY_PENALTY_PCT = 0.18;

export const WARRANTY_VOID_TRIGGERS: readonly string[] = Array.from(WARRANTY_VOID_KEYS);

/** Customer-facing names of the phone-age bands (same wording as the website). */
export const DEVICE_AGE_LABELS: Record<DeviceAgeBand, string> = {
  BELOW_3_MONTHS: 'Below 3 months',
  '3_TO_6_MONTHS': '3 to 6 months',
  '6_TO_11_MONTHS': '6 to 11 months',
  ABOVE_11_MONTHS: 'Above 11 months',
};
export const GlobalDefaultPct: Record<string, number> = DEFAULT_PCT;

const WARRANTY_KEY = PRICING_OPTIONS.basicQuestions.noWarranty.key;

/** Keys priced as screen condition (touch glass, spots, dead touch, replaced display). */
const SCREEN_KEYS = new Set([
  ...Object.values(PRICING_OPTIONS.touchGlass).map((o) => o.key),
  ...Object.values(PRICING_OPTIONS.screenDisplay).map((o) => o.key),
  PRICING_OPTIONS.basicQuestions.touchscreenNotWorking.key,
  PRICING_OPTIONS.basicQuestions.displayNotOriginal.key,
  'flawless',
]);

/** Breakdown names of keys sent by older callers (one combined body condition, battery %). */
const LEGACY_LABELS: Record<string, string> = {
  minor_scratches_center_or_side: 'Body: minor scratches',
  minor_dent: 'Body: minor dent',
  major_scratches_or_paint_peel: 'Body: heavy scratches or paint peel',
  '86_to_90_percent': 'Battery health 86–90%',
  below_80_percent_or_service: 'Battery health below 80% / needs service',
  speaker_or_mic_faulty: 'Speaker or microphone not working',
  volume_or_power_button_faulty: 'Power or volume button not working',
};

export interface ResolvedDeduction {
  key: string;
  amount: number;
  rateSource: 'admin_flat' | 'admin_percentage' | 'global_default';
  rateApplied: number;
}

export class ValuationEngine {
  /**
   * Maps arbitrary request body / condition input to standardized PricingEngineInput
   */
  public static mapConditionToEngineInput(condition: any): PricingEngineInput {
    const c = condition || {};

    // 1. Phone working condition
    let phone_working_condition = true;
    if (c.phone_working_condition !== undefined) {
      phone_working_condition = c.phone_working_condition === true || c.phone_working_condition === 'true';
    } else if (c.isPhoneWorking !== undefined) {
      phone_working_condition = c.isPhoneWorking === true || c.isPhoneWorking === 'true';
    } else if (c.basicQuestions?.isPhoneWorking !== undefined) {
      phone_working_condition = c.basicQuestions.isPhoneWorking === true || c.basicQuestions.isPhoneWorking === 'true';
    }

    // 2. Screen & touch condition
    let screenKey = 'flawless';
    if (c.screenKey !== undefined) {
      screenKey = c.screenKey;
    } else if (c.screen_condition !== undefined) {
      screenKey = c.screen_condition;
    } else if (
      c.touch_screen_not_working === true ||
      c.touch_screen_working === false ||
      c.isTouchscreenWorking === false ||
      c.isTouchscreenWorking === 'false' ||
      c.basicQuestions?.isTouchscreenWorking === false
    ) {
      screenKey = 'touch_screen_not_working';
    } else if (c.touchGlassCondition !== undefined && c.touchGlassCondition !== null) {
      // Website "Physical condition" step: touch-glass scratches/cracks (single select)
      const glass = String(c.touchGlassCondition).toUpperCase();
      if (glass === 'CRACKED_GLASS' || glass === 'GLASS_CRACKED') {
        screenKey = 'screen_cracked_glass_only';
      } else if (glass === 'HEAVY_SCRATCHES') {
        screenKey = 'heavy_screen_scratches';
      } else if (glass === 'MINOR_SCRATCHES') {
        screenKey = 'minor_screen_scratches';
      } else {
        screenKey = 'flawless';
      }
    } else if (c.displayCondition) {
      const dc = String(c.displayCondition).toUpperCase();
      if (dc === 'BROKEN_OR_DEAD_PIXELS' || dc === 'DEAD_PIXELS' || dc === 'DISPLAY_SPOTS_OR_DEAD_PIXELS') {
        screenKey = 'display_spots_or_dead_pixels';
      } else if (dc === 'CRACKED_GLASS' || dc === 'SCREEN_CRACKED_GLASS_ONLY') {
        screenKey = 'screen_cracked_glass_only';
      } else if (dc === 'DEEP_SCRATCHES' || dc === 'HEAVY_SCREEN_SCRATCHES') {
        screenKey = 'heavy_screen_scratches';
      } else if (dc === 'MINOR_SCRATCHES' || dc === 'MINOR_SCREEN_SCRATCHES') {
        screenKey = 'minor_screen_scratches';
      } else if (dc === 'FLAWLESS') {
        screenKey = 'flawless';
      } else {
        screenKey = c.displayCondition;
      }
    }

    // 3. Body, center & side panel condition. The website and app ask the back panel and the side
    //    panel separately: each answer is priced on its own and they add up. Older callers send one
    //    combined body condition.
    let bodyKey = 'no_scratches_flawless';
    let backKey: string | undefined;
    let sideKey: string | undefined;
    const backAnswer = c.backPanelCondition ? String(c.backPanelCondition).toUpperCase() : '';
    const sideAnswer = c.sidePanelCondition ? String(c.sidePanelCondition).toUpperCase() : '';
    if (c.bodyKey !== undefined) {
      bodyKey = c.bodyKey;
    } else if (c.body_condition !== undefined) {
      bodyKey = c.body_condition;
    } else if (backAnswer || sideAnswer) {
      backKey = BACK_PANEL_KEYS[backAnswer];
      sideKey = SIDE_PANEL_KEYS[sideAnswer];
    } else {
      const back = c.backPanelCondition ? String(c.backPanelCondition).toUpperCase() : '';
      const side = c.sidePanelCondition ? String(c.sidePanelCondition).toUpperCase() : '';
      const body = c.bodyCondition ? String(c.bodyCondition).toUpperCase() : '';

      if (back === 'BACK_PANEL_BROKEN' || c.back_glass_cracked_or_broken === true) {
        bodyKey = 'back_glass_cracked_or_broken';
      } else if (side === 'BENT_OR_BROKEN' || body === 'BENT_OR_CRACKED_BACK' || c.dents_or_bent_side_panel === true) {
        bodyKey = 'dents_or_bent_side_panel';
      } else if (
        back === 'HEAVY_SCRATCHES' ||
        side === 'HEAVY_DENT' ||
        body === 'DENTED_OR_SCRATCHED' ||
        c.major_scratches_or_paint_peel === true
      ) {
        bodyKey = 'major_scratches_or_paint_peel';
      } else if (
        side === 'MINOR_DENT_OR_SCRATCHES' ||
        side === 'MINOR_DENT' ||
        c.minor_dent === true ||
        body === 'MINOR_DENT'
      ) {
        // "Minor dent" MUST map to minor_dent (5%), NOT dents_or_bent_side_panel (16% + warranty void)
        bodyKey = 'minor_dent';
      } else if (
        back === 'MINOR_SCRATCHES' ||
        body === 'MINOR_SIGNS_OF_USE' ||
        c.minor_scratches_center_or_side === true
      ) {
        bodyKey = 'minor_scratches_center_or_side';
      } else if (back === 'NO_DEFECTS' && side === 'NO_DEFECTS') {
        bodyKey = 'no_scratches_flawless';
      } else if (body === 'FLAWLESS') {
        bodyKey = 'no_scratches_flawless';
      }
    }

    // 4. Battery health
    let batteryKey = 'above_90_percent';
    if (c.batteryKey !== undefined) {
      batteryKey = c.batteryKey;
    } else if (c.batteryHealthBelow83 === true || c.hardwareFaults?.batteryHealthBelow83 === true) {
      // Website / app answer "Battery health 83% or below / battery problem". Checked before the
      // legacy batteryHealth field, which the estimate endpoint fills with a default.
      batteryKey = '80_to_85_percent';
    } else {
      const rawBattery = c.battery_health ?? c.batteryHealth;
      if (typeof rawBattery === 'number') {
        if (rawBattery > 90) batteryKey = 'above_90_percent';
        else if (rawBattery >= 86) batteryKey = '86_to_90_percent';
        else if (rawBattery >= 80) batteryKey = '80_to_85_percent';
        else batteryKey = 'below_80_percent_or_service';
      } else if (typeof rawBattery === 'string') {
        const bStr = rawBattery.trim().toLowerCase();
        if (bStr === 'above_90_percent' || bStr === '86_to_90_percent' || bStr === '80_to_85_percent' || bStr === 'below_80_percent_or_service') {
          batteryKey = bStr;
        } else if (bStr === 'excellent' || bStr === 'above_85' || bStr === 'above_90') {
          batteryKey = 'above_90_percent';
        } else if (bStr === 'good' || bStr.includes('80_to_85') || bStr.includes('80-85') || bStr === '83') {
          batteryKey = '80_to_85_percent';
        } else if (bStr.includes('86_to_90') || bStr.includes('86-90')) {
          batteryKey = '86_to_90_percent';
        } else if (bStr === 'degraded' || bStr.includes('below_80') || bStr.includes('service')) {
          batteryKey = 'below_80_percent_or_service';
        } else {
          batteryKey = rawBattery;
        }
      } else if (c.batteryHealthBelow83 === true || c.hardwareFaults?.batteryHealthBelow83 === true) {
        batteryKey = '80_to_85_percent';
      }
    }

    // 5. Functional & Hardware defects (multi-select)
    const hardwareSet = new Set<string>();

    if (Array.isArray(c.hardwareKeys)) {
      for (const k of c.hardwareKeys) hardwareSet.add(k);
    }

    if (Array.isArray(c.hardware_defects)) {
      for (const k of c.hardware_defects) {
        const kl = String(k).toLowerCase();
        if (kl === 'camera_glass_broken' || kl === 'broken_camera_glass') hardwareSet.add('camera_glass_broken');
        else if (kl === 'rear_camera_not_working_or_blurry' || kl === 'rear_camera_faulty' || kl === 'backcamerafaulty') hardwareSet.add('rear_camera_not_working_or_blurry');
        else if (kl === 'front_camera_not_working' || kl === 'frontcamerafaulty') hardwareSet.add('front_camera_not_working');
        else if (kl === 'face_id_or_fingerprint_not_working' || kl === 'face_id_not_working' || kl === 'biometrics_faulty') hardwareSet.add('face_id_or_fingerprint_not_working');
        else if (kl === 'wifi_bluetooth_gps_issue' || kl === 'wifi_or_bluetooth_not_working') hardwareSet.add('wifi_bluetooth_gps_issue');
        else if (kl === 'speaker_or_mic_faulty' || kl === 'speaker_faulty' || kl === 'mic_faulty') hardwareSet.add('speaker_or_mic_faulty');
        else if (kl === 'charging_port_faulty' || kl === 'charging_port_not_working') hardwareSet.add('charging_port_faulty');
        else if (kl === 'volume_or_power_button_faulty' || kl === 'volume_button_not_working' || kl === 'power_button_not_working') hardwareSet.add('volume_or_power_button_faulty');
        else if (kl === 'network_or_sim_tray_issue' || kl === 'network_faulty' || kl === 'network_problem' || kl === 'sim_tray_issue') hardwareSet.add('network_or_sim_tray_issue');
        else hardwareSet.add(k);
      }
    }

    const hf = c.hardwareFaults || {};
    const ff = c.functionalFaults || {};

    // Website "Physical condition" step: display spots / lines (single select). Ignored when the
    // touchscreen is dead, which is already priced as the most severe screen condition.
    if (screenKey !== 'touch_screen_not_working' && c.screenDisplayCondition) {
      const display = String(c.screenDisplayCondition).toUpperCase();
      if (display === 'MAJOR_SPOTS_OR_LINES' || display === 'DEAD_PIXELS' || display === 'LINES_ON_DISPLAY') {
        hardwareSet.add('display_spots_or_dead_pixels');
      } else if (display === 'MINOR_SPOTS') {
        hardwareSet.add('minor_display_spots');
      }
    }

    if (hf.cameraGlassBroken || c.cameraGlassBroken || c.camera_glass_broken) {
      hardwareSet.add('camera_glass_broken');
    }
    if (
      hf.rearCameraNotWorking ||
      c.rearCameraNotWorking ||
      hf.backCameraNotWorking ||
      c.backCameraNotWorking ||
      ff.backCameraFaulty ||
      c.rear_camera_not_working_or_blurry
    ) {
      hardwareSet.add('rear_camera_not_working_or_blurry');
    }
    if (hf.frontCameraNotWorking || c.frontCameraNotWorking || ff.frontCameraFaulty || c.front_camera_not_working) {
      hardwareSet.add('front_camera_not_working');
    }
    if (hf.faceIdOrFingerprintNotWorking || c.faceIdOrFingerprintNotWorking || hf.biometricsNotWorking || c.biometricsNotWorking || ff.faceIdOrFingerprintFaulty || c.face_id_or_fingerprint_not_working) {
      hardwareSet.add('face_id_or_fingerprint_not_working');
    }
    if (hf.wifiOrBluetoothNotWorking || c.wifiOrBluetoothNotWorking || ff.wirelessOrBluetoothFaulty || c.wifi_bluetooth_gps_issue) {
      hardwareSet.add('wifi_bluetooth_gps_issue');
    }
    // Speaker and microphone, power and volume button: each answer is priced on its own
    if (hf.earSpeakerNotWorking || c.earSpeakerNotWorking || hf.speakerNotWorking || c.speakerNotWorking) {
      hardwareSet.add('speaker_faulty');
    }
    if (hf.microphoneNotWorking || c.microphoneNotWorking) {
      hardwareSet.add('mic_faulty');
    }
    if ((ff.speakerOrMicFaulty || c.speaker_or_mic_faulty) && !hardwareSet.has('speaker_faulty') && !hardwareSet.has('mic_faulty')) {
      hardwareSet.add('speaker_or_mic_faulty');
    }
    if (hf.chargingPortNotWorking || c.chargingPortNotWorking || ff.chargingPortFaulty || c.charging_port_faulty) {
      hardwareSet.add('charging_port_faulty');
    }
    if (hf.powerButtonNotWorking || c.powerButtonNotWorking) {
      hardwareSet.add('power_button_faulty');
    }
    if (hf.volumeButtonNotWorking || c.volumeButtonNotWorking) {
      hardwareSet.add('volume_button_faulty');
    }
    if (c.volume_or_power_button_faulty && !hardwareSet.has('power_button_faulty') && !hardwareSet.has('volume_button_faulty')) {
      hardwareSet.add('volume_or_power_button_faulty');
    }
    if (hf.proximitySensorNotWorking || c.proximitySensorNotWorking) {
      hardwareSet.add('proximity_sensor_faulty');
    }
    if (hf.vibratorNotWorking || c.vibratorNotWorking) {
      hardwareSet.add('vibrator_faulty');
    }
    // "Network problem / not working" MUST map to network_or_sim_tray_issue
    if (hf.networkProblem || c.networkProblem || hf.networkOrSimTrayIssue || c.networkOrSimTrayIssue || c.network_or_sim_tray_issue) {
      hardwareSet.add('network_or_sim_tray_issue');
    }

    // 6. Accessories
    const accArray = Array.isArray(c.accessories) ? c.accessories : [];
    const accObj = (typeof c.accessories === 'object' && !Array.isArray(c.accessories)) ? c.accessories : {};

    const original_charger =
      accObj.original_charger === true ||
      c.original_charger === true ||
      c.hasOriginalCharger === true ||
      c.hasOriginalCharger === 'true' ||
      accArray.includes('original_charger') ||
      accArray.includes('charger');

    const box_same_imei =
      accObj.box_same_imei === true ||
      c.box_same_imei === true ||
      c.hasOriginalBox === true ||
      c.hasOriginalBox === 'true' ||
      accArray.includes('box_same_imei') ||
      accArray.includes('box');

    let bill_same_imei = false;
    if (accObj.bill_same_imei !== undefined) {
      bill_same_imei = accObj.bill_same_imei === true;
    } else if (c.bill_same_imei !== undefined) {
      bill_same_imei = c.bill_same_imei === true;
    } else if (c.hasValidBill !== undefined) {
      bill_same_imei = c.hasValidBill === true || c.hasValidBill === 'true';
    } else if (c.hasValidWarranty !== undefined) {
      bill_same_imei = c.hasValidWarranty === true || c.hasValidWarranty === 'true';
    } else if (c.basicQuestions?.hasValidWarranty !== undefined) {
      bill_same_imei = c.basicQuestions.hasValidWarranty === true || c.basicQuestions.hasValidWarranty === 'true';
    } else if (accArray.includes('bill_same_imei') || accArray.includes('bill')) {
      bill_same_imei = true;
    }

    return {
      phone_working_condition,
      screenKey,
      bodyKey,
      backKey,
      sideKey,
      batteryKey,
      hardwareKeys: Array.from(hardwareSet),
      accessories: {
        original_charger: !!original_charger,
        box_same_imei: !!box_same_imei,
        bill_same_imei: !!bill_same_imei,
      },
      deviceAge: ValuationEngine.normalizeDeviceAge(c.deviceAge ?? c.device_age ?? c.basicQuestions?.deviceAge),
      displayNotOriginal: ValuationEngine.isNo(c.basicQuestions?.isDisplayOriginal ?? c.isDisplayOriginal),
      underWarranty: ValuationEngine.yesNo(c.basicQuestions?.hasValidWarranty ?? c.hasValidWarranty),
    };
  }

  /** true / false for an explicit answer (also 'true' / 'false'); undefined when not given. */
  public static yesNo(value: unknown): boolean | undefined {
    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;
    return undefined;
  }

  /** true for an explicit "No" (false / 'false'); anything else (yes, missing) is not a No. */
  public static isNo(value: unknown): boolean {
    return value === false || value === 'false';
  }

  /** "6_TO_11_MONTHS", "6-to-11-months", "6 to 11 months" -> "6_TO_11_MONTHS"; anything else -> undefined. */
  public static normalizeDeviceAge(value: unknown): DeviceAgeBand | undefined {
    if (typeof value !== 'string') return undefined;
    const key = value.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    return (DEVICE_AGE_BANDS as string[]).includes(key) ? (key as DeviceAgeBand) : undefined;
  }

  /**
   * Maps database PricingRule or variant/model info into engine's phone object
   */
  public static mapDbToPhone(rule: any): PhonePricingData {
    const rawBasePrice = Number(rule.basePrice) || 0;
    const storageAdjustment = Number(rule.storagePriceAdjustment) || 0;
    const basePrice = rawBasePrice + storageAdjustment;

    // Normalizing customPercentages: if any admin entered whole percentage numbers (e.g. 4 for 4%), convert to fraction 0.04
    let customPercentages = rule.customPercentages;
    if (customPercentages && typeof customPercentages === 'object') {
      const normalized: Record<string, number> = {};
      for (const [k, v] of Object.entries(customPercentages)) {
        if (typeof v === 'number') {
          normalized[k] = v > 1 ? v / 100 : v;
        }
      }
      customPercentages = normalized;
    }

    return {
      basePrice,
      minScrapPrice: rule.customScrapFloor ?? rule.minScrapPrice ?? rule.min_scrap_price,
      customDeductions: rule.customDeductions ?? rule.specific_deductions_inr,
      // Admin's % from the Pricing window; explicit engine-key overrides (customPercentages) win
      customPercentages: { ...ValuationEngine.optionPercentagesFromRule(rule), ...(customPercentages || {}) },
      accessoryDeductions: ValuationEngine.accessoryDeductionsFromRule(rule),
      deviceAgePercentages: ValuationEngine.deviceAgePercentagesFromRule(rule),
      displayNotOriginalPct: ValuationEngine.displayNotOriginalPctFromRule(rule),
    };
  }

  /**
   * Admin's % for every customer answer (Pricing window, saved as rule.deductionPercentages
   * [section][field], whole numbers), as engine-key fractions: { touch_screen_not_working: 0.62, ... }.
   * Fields the admin hasn't saved are left out, so the engine uses its default. "Display not original"
   * has its own field on the phone (displayNotOriginalPct).
   */
  public static optionPercentagesFromRule(rule: any): Record<string, number> {
    const saved = rule?.deductionPercentages;
    const out: Record<string, number> = {};
    if (!saved || typeof saved !== 'object') return out;
    for (const [section, fields] of Object.entries(PRICING_OPTIONS)) {
      for (const [field, option] of Object.entries(fields)) {
        if (option.key === 'display_not_original') continue;
        const raw = saved[section]?.[field];
        if (raw === null || raw === undefined || raw === '') continue;
        const pct = Number(raw);
        if (Number.isFinite(pct) && pct >= 0) out[option.key] = Math.min(pct, 100) / 100;
      }
    }
    return out;
  }

  /**
   * Admin's "Display not original" % for the model (Pricing window -> Basic working condition), read
   * the same way the window shows it: the saved %, else the saved rupee amount as a % of the rule's
   * base price, else undefined (the engine's 10% default, which is also what the window shows).
   */
  public static displayNotOriginalPctFromRule(rule: any): number | undefined {
    const pct = Number(rule?.deductionPercentages?.basicQuestions?.displayNotOriginal);
    if (rule?.deductionPercentages?.basicQuestions?.displayNotOriginal != null && Number.isFinite(pct) && pct >= 0) return pct;
    const amount = Number(rule?.deductions?.basicQuestions?.displayNotOriginal);
    const base = Number(rule?.ruleBasePrice ?? rule?.basePrice);
    if (rule?.deductions?.basicQuestions?.displayNotOriginal != null && Number.isFinite(amount) && amount > 0 && base > 0) {
      return Math.round((amount / base) * 100);
    }
    return undefined;
  }

  /**
   * Admin's per-model "% taken off" for each phone-age band. The model's own values
   * (SmartphoneModel.deviceAgeDeductions, passed in as rule.deviceAgeDeductions) win; older
   * rules may still carry them as PricingRule.deductionPercentages.deviceAge.
   */
  public static deviceAgePercentagesFromRule(rule: any): Partial<Record<DeviceAgeBand, number>> | undefined {
    const fromModel = ValuationEngine.sanitizeDeviceAgePercentages(rule?.deviceAgeDeductions);
    if (fromModel && Object.keys(fromModel).length > 0) return fromModel;
    return ValuationEngine.sanitizeDeviceAgePercentages(rule?.deductionPercentages?.deviceAge);
  }

  /** Keeps only valid bands with a number between 0 and 90 (whole %, 5 = 5%). */
  public static sanitizeDeviceAgePercentages(value: any): Partial<Record<DeviceAgeBand, number>> | undefined {
    const raw = value && typeof value.toObject === 'function' ? value.toObject() : value;
    if (!raw || typeof raw !== 'object') return undefined;
    const out: Partial<Record<DeviceAgeBand, number>> = {};
    for (const band of DEVICE_AGE_BANDS) {
      if (raw[band] === null || raw[band] === undefined || raw[band] === '') continue;
      const v = Number(raw[band]);
      if (Number.isFinite(v) && v >= 0) out[band] = Math.min(v, 90);
    }
    return out;
  }

  /**
   * Admin's per-model "taken off when missing" amounts for the charger and box
   * (stored as PricingRule.deductions.accessoriesBonus for compatibility).
   */
  public static accessoryDeductionsFromRule(rule: any): { original_charger?: number; box_same_imei?: number } | undefined {
    const acc = rule?.deductions?.accessoriesBonus;
    if (!acc) return undefined;
    const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : undefined);
    return { original_charger: num(acc.hasOriginalCharger), box_same_imei: num(acc.hasOriginalBox) };
  }

  /**
   * Master Pricing Calculation
   * Invokes calculatePrice and builds structured itemized breakdown for API & UI compatibility
   */
  public static calculate(rule: IPricingRule | any, condition: DeclaredCondition | any, config: PricingEngineConfig = {}): ValuationResult {
    const phone = ValuationEngine.mapDbToPhone(rule);
    const input = ValuationEngine.mapConditionToEngineInput(condition);

    // Live execution of calculatePrice engine
    const engineResult = calculatePrice(phone, input, config);

    const storageAdjustment = Number(rule.storagePriceAdjustment) || 0;
    const breakdown: ValuationBreakdownItem[] = [];

    breakdown.push({
      component: 'Base Price',
      description: 'Maximum assured base valuation for model variant',
      adjustment: engineResult.basePrice,
      rateSource: 'base',
    });

    if (storageAdjustment !== 0) {
      breakdown.push({
        component: 'Storage Variant',
        description: 'Storage capacity price adjustment',
        adjustment: storageAdjustment,
        rateSource: 'base',
      });
    }

    // Every amount taken off, named the way the customer answered it
    let screenDeduction = 0;
    let bodyDeduction = 0;
    let batteryDeduction = 0;
    let hardwareDeductions = 0;
    let warrantyDeduction = 0;

    const mapRateSource = (src: string): any => (src === 'admin_pct' ? 'admin_percentage' : src);
    const base = engineResult.basePrice;
    const pctOf = (amount: number) => (base > 0 ? Math.round((amount / base) * 1000) / 10 : 0);

    const ACCESSORY_LINES: Record<string, { component: string; description: string }> = {
      missing_original_charger: { component: 'Original charger not included', description: 'The price includes the original charger' },
      missing_box_same_imei: { component: 'Box with same IMEI not included', description: 'The price includes the original box with matching IMEI' },
    };
    const WARRANTY_REASONS: Record<string, string> = {
      no_warranty: 'no manufacturer warranty',
      physical_damage: 'the damage selected voids the manufacturer warranty',
      no_bill: 'no bill with the same IMEI',
    };

    for (const d of engineResult.deductions) {
      const rateSource = mapRateSource(d.source);
      if (ACCESSORY_LINES[d.key]) {
        breakdown.push({ ...ACCESSORY_LINES[d.key], adjustment: -d.amount, rateSource });
        continue;
      }
      if (d.key === 'device_age') {
        const label = d.band ? DEVICE_AGE_LABELS[d.band] : 'Phone age';
        breakdown.push({
          component: `Phone age: ${label}`,
          description: `${d.pct}% taken off for a phone that is ${label.toLowerCase()} old`,
          adjustment: -d.amount,
          rateSource,
        });
        continue;
      }
      if (d.key === WARRANTY_KEY) {
        warrantyDeduction += d.amount;
        breakdown.push({
          component: OPTION_LABELS[WARRANTY_KEY],
          description: `${pctOf(d.amount)}% taken off: ${WARRANTY_REASONS[d.reason ?? ''] ?? WARRANTY_REASONS.no_bill}`,
          adjustment: -d.amount,
          rateSource,
        });
        continue;
      }
      // Answers that take nothing off ("No defects", "No spot") aren't listed
      if (d.amount === 0) continue;

      const description =
        d.key === 'display_not_original'
          ? `${d.pct}% taken off: display replaced outside an authorised service centre`
          : `${pctOf(d.amount)}% taken off`;
      if (SCREEN_KEYS.has(d.key)) screenDeduction += d.amount;
      else if (d.key === input.bodyKey || d.key === input.backKey || d.key === input.sideKey) bodyDeduction += d.amount;
      else if (d.key === input.batteryKey) batteryDeduction += d.amount;
      else hardwareDeductions += d.amount;
      breakdown.push({
        component: OPTION_LABELS[d.key] ?? LEGACY_LABELS[d.key] ?? d.key.replace(/_/g, ' '),
        description,
        adjustment: -d.amount,
        rateSource,
      });
    }

    // Phone doesn't switch on: bought at what's left
    if (!input.phone_working_condition) {
      const notWorkingDeduction = base - engineResult.scrapFloor;
      breakdown.push({
        component: OPTION_LABELS.phone_not_working,
        description: `${pctOf(notWorkingDeduction)}% taken off: the phone doesn't switch on`,
        adjustment: -notWorkingDeduction,
        rateSource: phone.customPercentages?.phone_not_working !== undefined ? 'admin_percentage' : 'global_default',
      });
    }

    // A working phone is never priced below a phone that doesn't switch on
    if (engineResult.rawBodyPrice !== null && engineResult.rawBodyPrice < engineResult.scrapFloor) {
      const floorProtectionCredit = engineResult.scrapFloor - engineResult.rawBodyPrice;
      breakdown.push({
        component: 'Minimum price',
        description: `Never less than the price of a phone that doesn't switch on (₹${engineResult.scrapFloor})`,
        adjustment: floorProtectionCredit,
        rateSource: 'floor_protection',
      });
    }

    const itemizedBreakdown: ItemizedPricingBreakdown = {
      basePrice: engineResult.basePrice,
      maxAccPool: engineResult.maxAccPool,
      rawBodyPrice: engineResult.rawBodyPrice ?? engineResult.scrapFloor,
      scrapFloor: engineResult.scrapFloor,
      clampedBodyPrice: engineResult.clampedBodyPrice ?? engineResult.scrapFloor,
      screenDeduction,
      bodyDeduction,
      batteryDeduction,
      hardwareDeductions,
      warrantyDeduction,
      totalDefectDeductions: engineResult.totalDeductions,
      selectedAccBonus: engineResult.selectedAccBonus,
      chargerBonus: 0,
      boxBonus: 0,
      billBonus: 0,
      finalPrice: engineResult.finalPrice!,
    };

    const warrantyVoided =
      engineResult.deductions.some((d) => d.key === 'out_of_warranty_or_no_bill_penalty') ||
      !input.phone_working_condition;

    return {
      basePrice: engineResult.basePrice,
      storageAdjustment,
      scrapFloor: engineResult.scrapFloor,
      rawBodyPrice: engineResult.rawBodyPrice ?? engineResult.scrapFloor,
      clampedBodyPrice: engineResult.clampedBodyPrice ?? engineResult.scrapFloor,
      selectedAccBonus: engineResult.selectedAccBonus,
      maxAccPool: engineResult.maxAccPool,
      totalDeductions: engineResult.totalDeductions,
      totalBonuses: engineResult.selectedAccBonus,
      finalCalculatedAmount: engineResult.finalPrice!,
      finalPrice: engineResult.finalPrice!,
      warrantyVoided,
      pricingRuleVersion: rule.version || 1,
      breakdown,
      itemizedBreakdown,
      // Engine direct properties
      rule: engineResult.rule,
      deductions: engineResult.deductions as any,
    };
  }
}

export const calculateValuation = ValuationEngine.calculate;
