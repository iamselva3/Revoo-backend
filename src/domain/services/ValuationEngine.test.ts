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
    // - Charger + Box + Bill all handed over (nothing deducted for accessories)
    // Warranty Void deduction: -16362 (18% of 90900)
    // Total Deductions = 56358 + 3636 + 7272 + 8181 + 16362 = 91809
    // RawBodyPrice = 90900 - 91809 = -909  -> below the scrap floor
    // At scrap value the accessory extras apply (like a phone that doesn't switch on):
    // FinalPrice = 2000 + 250 + 150 + 210 = 2610
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
    expect(result.rawBodyPrice).toBe(-909);
    expect(result.clampedBodyPrice).toBe(2000);
    expect(result.selectedAccBonus).toBe(610);
    expect(result.finalPrice).toBe(2610);
    expect(result.finalCalculatedAmount).toBe(2610);
  });

  test('Scenario B: Flawless phone with all accessories stays within Base Price', () => {
    // BasePrice = 90900
    // Total Deductions = 0, User has Charger + Box + Bill: the price includes them
    // FinalPrice = 90900 (the full base price, nothing added on top)
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
    expect(result.rawBodyPrice).toBe(90900);
    expect(result.clampedBodyPrice).toBe(90900);
    expect(result.selectedAccBonus).toBe(0);
    expect(result.finalPrice).toBe(90900);
    expect(result.breakdown.some((b) => b.adjustment > 0 && b.component !== 'Base Price')).toBe(false);
    expect(result.finalCalculatedAmount).toBe(90900);
  });

  test('Scenario C: Flawless phone missing charger has the charger amount taken off (default ₹500)', () => {
    // BasePrice = 90900, Box + Bill handed over, no charger
    // Charger deduction = min(500, 5% of 90900 = 4545) = 500
    // FinalPrice = 90900 - 500 = 90400
    const condition: DeclaredCondition = {
      phone_working_condition: true,
      screen_condition: 'flawless',
      body_condition: 'no_scratches_flawless',
      battery_health: 'above_90_percent',
      hardware_defects: [],
      accessories: ['box_same_imei', 'bill_same_imei'], // Missing charger
    };

    const result = ValuationEngine.calculate(iphone18ProMaxRule, condition);

    expect(result.totalDeductions).toBe(500);
    expect(result.selectedAccBonus).toBe(0);
    expect(result.finalPrice).toBe(90400);
    expect(result.breakdown.find((b) => b.component === 'Original charger not included')?.adjustment).toBe(-500);
  });

  test("Per-model admin amounts are taken off for each missing accessory", () => {
    const rule = { ...iphone18ProMaxRule, deductions: { accessoriesBonus: { hasOriginalCharger: 1200, hasOriginalBox: 800 } } } as any;
    const condition: DeclaredCondition = {
      phone_working_condition: true,
      screen_condition: 'flawless',
      body_condition: 'no_scratches_flawless',
      battery_health: 'above_90_percent',
      hardware_defects: [],
      accessories: ['bill_same_imei'], // no charger, no box
    };
    const result = ValuationEngine.calculate(rule, condition);
    expect(result.finalPrice).toBe(90900 - 1200 - 800);
    expect(result.breakdown.find((b) => b.component === 'Box with same IMEI not included')?.adjustment).toBe(-800);
  });

  test('A missing accessory never costs more than 5% of a cheap phone', () => {
    const cheap = { ...iphone18ProMaxRule, basePrice: 4000, minScrapPrice: 100 } as any;
    const condition: DeclaredCondition = {
      phone_working_condition: true,
      screen_condition: 'flawless',
      body_condition: 'no_scratches_flawless',
      battery_health: 'above_90_percent',
      hardware_defects: [],
      accessories: ['bill_same_imei'],
    };
    // default ₹500 each, capped at 5% of 4000 = 200 each
    expect(ValuationEngine.calculate(cheap, condition).finalPrice).toBe(3600);
  });

  describe('Phone age', () => {
    const ageRule = {
      ...iphone18ProMaxRule,
      deductionPercentages: { deviceAge: { BELOW_3_MONTHS: 0, '3_TO_6_MONTHS': 3, '6_TO_11_MONTHS': 6, ABOVE_11_MONTHS: 10 } },
    } as any;
    const perfect = (deviceAge?: string) =>
      ({
        phone_working_condition: true,
        screen_condition: 'flawless',
        body_condition: 'no_scratches_flawless',
        battery_health: 'above_90_percent',
        hardware_defects: [],
        accessories: ['original_charger', 'box_same_imei', 'bill_same_imei'],
        deviceAge,
      }) as any;

    test("takes off the admin's % for the age the customer picked", () => {
      const result = ValuationEngine.calculate(ageRule, perfect('6_TO_11_MONTHS'));
      expect(result.finalPrice).toBe(90900 - Math.round(90900 * 0.06)); // 85446
      const line = result.breakdown.find((b) => b.component === 'Phone age: 6 to 11 months');
      expect(line?.adjustment).toBe(-5454);
    });

    test('0% (or a band the admin has not set) takes nothing off', () => {
      expect(ValuationEngine.calculate(ageRule, perfect('BELOW_3_MONTHS')).finalPrice).toBe(90900);
      expect(ValuationEngine.calculate(iphone18ProMaxRule, perfect('ABOVE_11_MONTHS')).finalPrice).toBe(90900);
    });

    test('no answer (e.g. older app versions) takes nothing off', () => {
      expect(ValuationEngine.calculate(ageRule, perfect(undefined)).finalPrice).toBe(90900);
    });

    test('adds up with missing accessories', () => {
      const condition = { ...perfect('ABOVE_11_MONTHS'), accessories: ['bill_same_imei'] };
      // 10% of 90900 = 9090, charger 500, box 500
      expect(ValuationEngine.calculate(ageRule, condition).finalPrice).toBe(90900 - 9090 - 500 - 500);
    });

    test('does not apply to a phone that does not switch on', () => {
      const result = ValuationEngine.calculate(ageRule, { phone_working_condition: false, deviceAge: 'ABOVE_11_MONTHS' } as any);
      expect(result.finalPrice).toBe(2000);
    });

    test("the model's own % win over older values on the pricing rule", () => {
      const rule = { ...ageRule, deviceAgeDeductions: { ABOVE_11_MONTHS: 20 } };
      expect(ValuationEngine.calculate(rule, perfect('ABOVE_11_MONTHS')).finalPrice).toBe(90900 - 18180);
      // empty model values fall back to the rule
      expect(ValuationEngine.calculate({ ...ageRule, deviceAgeDeductions: {} }, perfect('ABOVE_11_MONTHS')).finalPrice).toBe(90900 - 9090);
    });

    test('accepts the age in any common spelling', () => {
      expect(ValuationEngine.normalizeDeviceAge('3 to 6 months')).toBe('3_TO_6_MONTHS');
      expect(ValuationEngine.normalizeDeviceAge('above-11-months')).toBe('ABOVE_11_MONTHS');
      expect(ValuationEngine.normalizeDeviceAge('two years')).toBeUndefined();
    });
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
      // The bill was provided, so nothing is taken off for it
      expect(result.breakdown.some((b) => b.component === 'No bill with same IMEI')).toBe(false);
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
    expect(result.breakdown.find((b) => b.component === 'No bill with same IMEI')?.adjustment).toBe(-210);
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
