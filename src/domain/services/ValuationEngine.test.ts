import { ValuationEngine } from './ValuationEngine.js';
import { IPricingRule } from '../entities/PricingRule.js';
import { DeclaredCondition } from '../entities/DeviceCondition.js';

describe('ValuationEngine - Dofy Recommerce Master Pricing Tests', () => {
  const iphone18ProMaxRule: IPricingRule = {
    id: 'rule-iphone-18-pro-max-256',
    modelId: 'iphone-18-pro-max',
    variantId: 'variant-256gb',
    basePrice: 90900,
    storagePriceAdjustment: 0,
    minScrapPrice: 2000,
    version: 1,
    isActive: true,
    effectiveFrom: new Date(),
  };

  test('Scenario A: Severely damaged phone hits scrap floor and adds back accessories', () => {
    // BasePrice = 90900 (iPhone 18 Pro Max 256GB)
    // Selections:
    // - Touch Not Working (-56358) [Triggers Warranty Void]
    // - Minor Panel Scratches (-3636)
    // - Battery 83% (-7272)
    // - Camera Glass Broken (-8181) [Triggers Warranty Void]
    // - Charger (+250) + Box (+150) + Bill (+210) = +610
    // Warranty Void deduction: -16362 (18% of 90900)
    // Total Deductions = 56358 + 3636 + 7272 + 8181 + 16362 = 91809
    // RawBodyPrice = 90900 - 610 - 91809 = -1519
    // ClampedBodyPrice = Math.max(2000, -1519) = 2000
    // FinalPrice = 2000 + 610 = 2610
    const condition: DeclaredCondition = {
      phone_working_condition: true,
      screen_condition: 'touch_screen_not_working',
      body_condition: 'minor_scratches_center_or_side',
      battery_health: 83,
      hardware_defects: ['camera_glass_broken'],
      accessories: ['original_charger', 'box_same_imei', 'bill_same_imei'],
    };

    const result = ValuationEngine.calculate(iphone18ProMaxRule, condition);

    expect(result.basePrice).toBe(90900);
    expect(result.scrapFloor).toBe(2000);
    expect(result.warrantyVoided).toBe(true);
    expect(result.totalDeductions).toBe(91809);
    expect(result.itemizedBreakdown.screenDeduction).toBe(56358);
    expect(result.itemizedBreakdown.bodyDeduction).toBe(3636);
    expect(result.itemizedBreakdown.batteryDeduction).toBe(7272);
    expect(result.itemizedBreakdown.hardwareDeductions).toBe(8181);
    expect(result.itemizedBreakdown.warrantyDeduction).toBe(16362);
    expect(result.rawBodyPrice).toBe(-1519);
    expect(result.clampedBodyPrice).toBe(2000);
    expect(result.selectedAccBonus).toBe(610);
    expect(result.finalPrice).toBe(2610);
    expect(result.finalCalculatedAmount).toBe(2610);
  });

  test('Scenario B: Flawless phone with all accessories stays within Base Price', () => {
    // BasePrice = 90900
    // Total Deductions = 0, User has Charger + Box + Bill (+610)
    // RawBodyPrice = 90900 - 610 - 0 = 90290
    // ClampedBodyPrice = Math.max(2000, 90290) = 90290
    // FinalPrice = 90290 + 610 = 90900
    const condition: DeclaredCondition = {
      phone_working_condition: true,
      screen_condition: 'flawless',
      body_condition: 'no_scratches_flawless',
      battery_health: 'above_90_percent',
      hardware_defects: [],
      accessories: ['original_charger', 'box_same_imei', 'bill_same_imei'],
    };

    const result = ValuationEngine.calculate(iphone18ProMaxRule, condition);

    expect(result.basePrice).toBe(90900);
    expect(result.warrantyVoided).toBe(false);
    expect(result.totalDeductions).toBe(0);
    expect(result.rawBodyPrice).toBe(90290);
    expect(result.clampedBodyPrice).toBe(90290);
    expect(result.selectedAccBonus).toBe(610);
    expect(result.finalPrice).toBe(90900);
    expect(result.finalCalculatedAmount).toBe(90900);
  });

  test('Scenario C: Flawless phone missing charger deducts exactly charger value (-250)', () => {
    // BasePrice = 90900
    // Total Deductions = 0, User has Box (+150) + Bill (+210) = 360
    // RawBodyPrice = 90900 - 610 - 0 = 90290
    // ClampedBodyPrice = Math.max(2000, 90290) = 90290
    // FinalPrice = 90290 + 360 = 90650
    const condition: DeclaredCondition = {
      phone_working_condition: true,
      screen_condition: 'flawless',
      body_condition: 'no_scratches_flawless',
      battery_health: 'above_90_percent',
      hardware_defects: [],
      accessories: ['box_same_imei', 'bill_same_imei'], // Missing charger
    };

    const result = ValuationEngine.calculate(iphone18ProMaxRule, condition);

    expect(result.totalDeductions).toBe(0);
    expect(result.selectedAccBonus).toBe(360);
    expect(result.finalPrice).toBe(90650);
    expect(result.basePrice - result.finalPrice).toBe(250); // Exactly ₹250 less
  });

  test('Gatekeeper Rule: Phone does not turn on skips all defect deductions', () => {
    // phone_working_condition === false:
    // FinalPrice = ScrapFloor + SelectedAccBonus
    // ScrapFloor = 2000
    // User has original_charger (+250)
    // FinalPrice = 2000 + 250 = 2250
    const deadCondition: DeclaredCondition = {
      phone_working_condition: false,
      screen_condition: 'touch_screen_not_working', // Should be skipped
      body_condition: 'back_glass_cracked_or_broken', // Should be skipped
      battery_health: 'below_80_percent_or_service', // Should be skipped
      hardware_defects: ['camera_glass_broken', 'face_id_or_fingerprint_not_working'], // Should be skipped
      accessories: ['original_charger'],
    };

    const result = ValuationEngine.calculate(iphone18ProMaxRule, deadCondition);

    expect(result.scrapFloor).toBe(2000);
    expect(result.itemizedBreakdown.screenDeduction).toBe(0);
    expect(result.itemizedBreakdown.bodyDeduction).toBe(0);
    expect(result.itemizedBreakdown.batteryDeduction).toBe(0);
    expect(result.itemizedBreakdown.hardwareDeductions).toBe(0);
    expect(result.selectedAccBonus).toBe(250);
    expect(result.finalPrice).toBe(2250);
  });

  test('Override Priority 1: Admin Flat INR Override takes highest precedence', () => {
    const ruleWithFlatOverride: IPricingRule = {
      ...iphone18ProMaxRule,
      customDeductions: {
        touch_screen_not_working: 50000, // Custom INR override instead of default 56358 (62%)
      },
      customPercentages: {
        touch_screen_not_working: 0.70, // Should be ignored because flat INR exists
      },
    };

    const condition: DeclaredCondition = {
      phone_working_condition: true,
      screen_condition: 'touch_screen_not_working',
      body_condition: 'no_scratches_flawless',
      accessories: ['original_charger', 'box_same_imei', 'bill_same_imei'],
    };

    const result = ValuationEngine.calculate(ruleWithFlatOverride, condition);

    expect(result.itemizedBreakdown.screenDeduction).toBe(50000);
    const screenItem = result.breakdown.find((b) => b.component.includes('Screen'));
    expect(screenItem?.rateSource).toBe('admin_flat');
    expect(screenItem?.adjustment).toBe(-50000);
  });

  test('Override Priority 2: Admin Custom Percentage Override takes precedence over Global Default', () => {
    const ruleWithPctOverride: IPricingRule = {
      ...iphone18ProMaxRule,
      customPercentages: {
        rear_camera_not_working_or_blurry: 0.15, // 15% instead of default 18%
      },
    };

    const condition: DeclaredCondition = {
      phone_working_condition: true,
      screen_condition: 'flawless',
      body_condition: 'no_scratches_flawless',
      hardware_defects: ['rear_camera_not_working_or_blurry'],
      accessories: ['original_charger', 'box_same_imei', 'bill_same_imei'],
    };

    const result = ValuationEngine.calculate(ruleWithPctOverride, condition);

    // 15% of 90900 = Math.round(13635)
    expect(result.itemizedBreakdown.hardwareDeductions).toBe(13635);
    const hwItem = result.breakdown.find((b) => b.description.includes('rear camera'));
    expect(hwItem?.rateSource).toBe('admin_percentage');
    expect(hwItem?.adjustment).toBe(-13635);
  });

  test('Warranty Edge-Case: Any of the 6 physical damage triggers automatically voids warranty', () => {
    const damageTriggers = [
      { screen_condition: 'touch_screen_not_working' },
      { screen_condition: 'screen_cracked_glass_only' },
      { screen_condition: 'display_spots_or_dead_pixels' },
      { hardware_defects: ['camera_glass_broken'] },
      { body_condition: 'back_glass_cracked_or_broken' },
      { body_condition: 'dents_or_bent_side_panel' },
    ];

    for (const damage of damageTriggers) {
      const condition: DeclaredCondition = {
        phone_working_condition: true,
        accessories: ['bill_same_imei'], // Has valid bill, but physical damage should void warranty
        ...damage,
      };

      const result = ValuationEngine.calculate(iphone18ProMaxRule, condition);
      expect(result.warrantyVoided).toBe(true);
      expect(result.itemizedBreakdown.warrantyDeduction).toBe(Math.round(90900 * 0.18));
      // Compliance bonus +210 for GST bill is still preserved
      expect(result.itemizedBreakdown.billBonus).toBe(210);
    }
  });

  test('Missing Bill automatically triggers warranty penalty and forfeits bill bonus', () => {
    const condition: DeclaredCondition = {
      phone_working_condition: true,
      screen_condition: 'flawless',
      body_condition: 'no_scratches_flawless',
      accessories: ['original_charger', 'box_same_imei'], // Missing bill
    };

    const result = ValuationEngine.calculate(iphone18ProMaxRule, condition);
    expect(result.warrantyVoided).toBe(true);
    expect(result.itemizedBreakdown.warrantyDeduction).toBe(Math.round(90900 * 0.18));
    expect(result.itemizedBreakdown.billBonus).toBe(0);
  });

  test('Calculates default scrap floor via multiplier 0.022 when custom floor is omitted', () => {
    const ruleWithoutCustomFloor: IPricingRule = {
      id: 'rule-generic',
      basePrice: 50000,
      version: 1,
      isActive: true,
    };

    const condition: DeclaredCondition = {
      phone_working_condition: false,
    };

    const result = ValuationEngine.calculate(ruleWithoutCustomFloor, condition);
    // Math.round(50000 * 0.022) = 1100
    expect(result.scrapFloor).toBe(1100);
    expect(result.finalPrice).toBe(1100);
  });

  test('Supports backward compatible legacy DeclaredCondition structures', () => {
    const legacyCondition: DeclaredCondition = {
      basicQuestions: {
        isPhoneWorking: true,
        isTouchscreenWorking: false, // touch_screen_not_working
        isDisplayOriginal: true,
        hasValidWarranty: true,
      },
      backPanelCondition: 'MINOR_SCRATCHES', // minor_scratches_center_or_side
      sidePanelCondition: 'NO_DEFECTS',
      batteryHealth: 'GOOD', // 80_to_85_percent
      functionalFaults: {
        backCameraFaulty: true, // rear_camera_not_working_or_blurry
      },
      hasOriginalCharger: true,
      hasOriginalBox: true,
      hasValidBill: true,
    };

    const result = ValuationEngine.calculate(iphone18ProMaxRule, legacyCondition);
    expect(result.itemizedBreakdown.screenDeduction).toBe(56358);
    expect(result.itemizedBreakdown.bodyDeduction).toBe(3636);
    expect(result.itemizedBreakdown.batteryDeduction).toBe(7272);
    expect(result.itemizedBreakdown.hardwareDeductions).toBe(16362); // 18% of 90900
    expect(result.selectedAccBonus).toBe(610);
    expect(result.warrantyVoided).toBe(true); // Voided by touch not working
  });
});
