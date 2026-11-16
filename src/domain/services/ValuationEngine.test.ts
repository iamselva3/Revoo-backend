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

  // The client's standard takes nothing off for "No valid warranty"; tests of the warranty rule set 18%
  const warrantyRule = { ...iphone18ProMaxRule, deductionPercentages: { basicQuestions: { noWarranty: 18 } } } as any;

  test('Scenario A: Severely damaged phone: every answer adds up (accessories are never an extra)', () => {
    // BasePrice = 90900 (iPhone 18 Pro Max 256GB)
    // Selections:
    // - Touch Not Working 60% (-54540) [voids the warranty]
    // - Minor Panel Scratches, legacy body key 4% (-3636)
    // - Battery 83% 15% (-13635)
    // - Camera Glass Broken 9% (-8181) [voids the warranty]
    // - Charger + Box + Bill all handed over (nothing deducted for accessories)
    // No valid warranty: 0% in the client's standard
    // Total Deductions = 54540 + 3636 + 13635 + 8181 = 79992 -> 10908 (above the scrap floor)
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
    expect(result.totalDeductions).toBe(79992);
    expect(result.itemizedBreakdown.screenDeduction).toBe(54540);
    expect(result.itemizedBreakdown.bodyDeduction).toBe(3636);
    expect(result.itemizedBreakdown.batteryDeduction).toBe(13635);
    expect(result.itemizedBreakdown.hardwareDeductions).toBe(8181);
    expect(result.itemizedBreakdown.warrantyDeduction).toBe(0);
    expect(result.rawBodyPrice).toBe(10908);
    expect(result.clampedBodyPrice).toBe(10908);
    expect(result.selectedAccBonus).toBe(0);
    expect(result.finalPrice).toBe(10908);
    expect(result.finalCalculatedAmount).toBe(10908);

    // With an 18% "No valid warranty" the damage voids the warranty and it hits the scrap floor
    const withWarrantyPct = ValuationEngine.calculate(warrantyRule, condition);
    expect(withWarrantyPct.itemizedBreakdown.warrantyDeduction).toBe(16362);
    expect(withWarrantyPct.finalPrice).toBe(2000);
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

  describe('Warranty and bill (turncash flow)', () => {
    const perfect = (bq: Record<string, unknown> | undefined, bill: boolean) =>
      ({
        phone_working_condition: true,
        screen_condition: 'flawless',
        body_condition: 'no_scratches_flawless',
        battery_health: 'above_90_percent',
        hardware_defects: [],
        accessories: ['original_charger', 'box_same_imei', ...(bill ? ['bill_same_imei'] : [])],
        hasValidBill: bill, // the website always sends the bill answer
        ...(bq ? { basicQuestions: { isPhoneWorking: true, isTouchscreenWorking: true, isDisplayOriginal: true, ...bq } } : {}),
      }) as any;

    const NO_WARRANTY = Math.round(90900 * 0.18);

    test("client's standard: no warranty takes nothing off", () => {
      expect(ValuationEngine.calculate(iphone18ProMaxRule, perfect({ hasValidWarranty: false }, false)).finalPrice).toBe(90900);
    });

    test('no warranty (bill not asked): the "No valid warranty" % is taken off once', () => {
      const r = ValuationEngine.calculate(warrantyRule, perfect({ hasValidWarranty: false }, false));
      expect(r.finalPrice).toBe(90900 - NO_WARRANTY);
      expect(r.breakdown.find((b) => b.component === 'No valid warranty')?.adjustment).toBe(-NO_WARRANTY);
    });

    test('under warranty: with the bill nothing is taken off, without it the phone counts as out of warranty', () => {
      expect(ValuationEngine.calculate(warrantyRule, perfect({ hasValidWarranty: true }, true)).finalPrice).toBe(90900);
      const r = ValuationEngine.calculate(warrantyRule, perfect({ hasValidWarranty: true }, false));
      expect(r.finalPrice).toBe(90900 - NO_WARRANTY);
      expect(r.breakdown.find((b) => b.component === 'No valid warranty')?.description).toMatch(/no bill/);
    });

    test('no warranty answer at all (older apps): the bill decides', () => {
      expect(ValuationEngine.calculate(warrantyRule, perfect(undefined, false)).finalPrice).toBe(90900 - NO_WARRANTY);
      expect(ValuationEngine.calculate(warrantyRule, perfect(undefined, true)).finalPrice).toBe(90900);
    });

    test("uses the admin's No valid warranty %", () => {
      const rule = { ...iphone18ProMaxRule, deductionPercentages: { basicQuestions: { noWarranty: 5 } } } as any;
      expect(ValuationEngine.calculate(rule, perfect({ hasValidWarranty: false }, false)).finalPrice).toBe(90900 - 4545);
    });

    test('physical damage still voids the warranty without a warranty answer of yes', () => {
      const r = ValuationEngine.calculate(warrantyRule, { ...perfect({ hasValidWarranty: false }, false), screen_condition: 'screen_cracked_glass_only' });
      expect(r.itemizedBreakdown.warrantyDeduction).toBe(Math.round(90900 * 0.18));
    });
  });

  describe('Display not original', () => {
    const answers = (bq: Record<string, unknown>) =>
      ({
        phone_working_condition: bq.isPhoneWorking !== false,
        screen_condition: bq.isTouchscreenWorking === false ? 'touch_screen_not_working' : 'flawless',
        body_condition: 'no_scratches_flawless',
        battery_health: 'above_90_percent',
        hardware_defects: [],
        accessories: ['original_charger', 'box_same_imei', 'bill_same_imei'],
        basicQuestions: { isPhoneWorking: true, isTouchscreenWorking: true, isDisplayOriginal: true, ...bq },
      }) as any;
    const line = (r: any) => r.breakdown.find((b: any) => b.component === 'Display not original');

    test('"No" takes off the standard 65% when the model has no % of its own', () => {
      const r = ValuationEngine.calculate(iphone18ProMaxRule, answers({ isDisplayOriginal: false }));
      expect(r.finalPrice).toBe(90900 - 59085);
      expect(line(r)?.adjustment).toBe(-59085);
    });

    test("uses the admin's % for the model (Pricing window)", () => {
      const rule = { ...iphone18ProMaxRule, deductionPercentages: { basicQuestions: { displayNotOriginal: 20 } } } as any;
      expect(ValuationEngine.calculate(rule, answers({ isDisplayOriginal: false })).finalPrice).toBe(90900 - 18180);
    });

    test('older rules that saved only a rupee amount are read as a % of their base price', () => {
      const rule = { ...iphone18ProMaxRule, deductions: { basicQuestions: { displayNotOriginal: 4545 } } } as any;
      expect(ValuationEngine.calculate(rule, answers({ isDisplayOriginal: false })).finalPrice).toBe(90900 - 4545);
    });

    test('"Yes" or no answer takes nothing off', () => {
      expect(ValuationEngine.calculate(iphone18ProMaxRule, answers({ isDisplayOriginal: true })).finalPrice).toBe(90900);
      expect(ValuationEngine.calculate(iphone18ProMaxRule, answers({ isDisplayOriginal: undefined })).finalPrice).toBe(90900);
    });

    test('not charged on top of a dead touchscreen or a phone that does not switch on', () => {
      const deadTouch = ValuationEngine.calculate(iphone18ProMaxRule, answers({ isTouchscreenWorking: false, isDisplayOriginal: false }));
      expect(line(deadTouch)).toBeUndefined();
      const dead = ValuationEngine.calculate(iphone18ProMaxRule, answers({ isPhoneWorking: false, isDisplayOriginal: false }));
      expect(line(dead)).toBeUndefined();
      expect(dead.finalPrice).toBe(2000); // scrap value: nothing else is asked
    });
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

    test("0% takes nothing off; a band the model hasn't set uses the standard % (0 / 8 / 12 / 20)", () => {
      expect(ValuationEngine.calculate(ageRule, perfect('BELOW_3_MONTHS')).finalPrice).toBe(90900);
      expect(ValuationEngine.calculate(iphone18ProMaxRule, perfect('ABOVE_11_MONTHS')).finalPrice).toBe(90900 - 18180);
      expect(ValuationEngine.calculate(iphone18ProMaxRule, perfect('3_TO_6_MONTHS')).finalPrice).toBe(90900 - 7272);
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

  describe("Every website answer uses the admin's % (Pricing window)", () => {
    // What the website sends (declaredCondition), a working phone under warranty with its bill
    const site = (extra: Record<string, unknown> = {}) =>
      ({
        basicQuestions: { isPhoneWorking: true, isTouchscreenWorking: true, isDisplayOriginal: true, hasValidWarranty: true },
        screenDisplayCondition: 'NO_SPOT',
        touchGlassCondition: 'NO_SCRATCH',
        backPanelCondition: 'NO_DEFECTS',
        sidePanelCondition: 'NO_DEFECTS',
        hardwareFaults: {},
        hasOriginalCharger: true,
        hasOriginalBox: true,
        hasValidBill: true,
        // The estimate endpoint fills these legacy fields with defaults
        displayCondition: 'FLAWLESS',
        bodyCondition: 'FLAWLESS',
        batteryHealth: 'ABOVE_85',
        ...extra,
      }) as any;
    const pct = (p: number) => Math.round((90900 * p) / 100);

    test('a perfect phone keeps the full price', () => {
      expect(ValuationEngine.calculate(iphone18ProMaxRule, site()).finalPrice).toBe(90900);
    });

    test('defaults: screen, touch glass, back, side and each fault add up', () => {
      const r = ValuationEngine.calculate(
        iphone18ProMaxRule,
        site({
          screenDisplayCondition: 'MINOR_SPOTS', // 12
          touchGlassCondition: 'MINOR_SCRATCHES', // 6
          backPanelCondition: 'MINOR_SCRATCHES', // 3
          sidePanelCondition: 'MINOR_DENT_OR_SCRATCHES', // 3
          hardwareFaults: { vibratorNotWorking: true, proximitySensorNotWorking: true, microphoneNotWorking: true, earSpeakerNotWorking: true }, // 5 + 8 + 15 + 15
        })
      );
      expect(r.finalPrice).toBe(90900 - pct(12) - pct(6) - pct(3) - pct(3) - pct(5) - pct(8) - pct(15) - pct(15));
      expect(r.breakdown.find((b) => b.component === 'Vibration not working')?.adjustment).toBe(-pct(5));
      expect(r.breakdown.find((b) => b.component === 'Back panel: minor scratches')?.adjustment).toBe(-pct(3));
    });

    test("the admin's saved % replace the defaults", () => {
      const rule = {
        ...iphone18ProMaxRule,
        deductionPercentages: {
          screenDisplay: { MINOR_SPOTS: 3 },
          touchGlass: { HEAVY_SCRATCHES: 7 },
          backPanel: { BACK_PANEL_BROKEN: 20 },
          sidePanel: { HEAVY_DENT: 2 },
          hardwareFaults: { batteryHealthBelow83: 5, powerButtonNotWorking: 1, volumeButtonNotWorking: 1 },
        },
      } as any;
      const r = ValuationEngine.calculate(
        rule,
        site({
          screenDisplayCondition: 'MINOR_SPOTS',
          touchGlassCondition: 'HEAVY_SCRATCHES',
          backPanelCondition: 'BACK_PANEL_BROKEN', // also voids the warranty (0% in the standard)
          sidePanelCondition: 'HEAVY_DENT',
          hardwareFaults: { batteryHealthBelow83: true, powerButtonNotWorking: true, volumeButtonNotWorking: true },
        })
      );
      expect(r.finalPrice).toBe(90900 - pct(3) - pct(7) - pct(20) - pct(2) - pct(5) - pct(1) - pct(1));
      expect(r.breakdown.find((b) => b.component.startsWith('Battery health'))?.rateSource).toBe('admin_percentage');
    });

    test('touchscreen not working uses its own % (and voids the warranty)', () => {
      const rule = { ...iphone18ProMaxRule, deductionPercentages: { basicQuestions: { touchscreenNotWorking: 40 } } } as any;
      const answers = site({ basicQuestions: { isPhoneWorking: true, isTouchscreenWorking: false, isDisplayOriginal: false, hasValidWarranty: false } });
      expect(ValuationEngine.calculate(rule, answers).finalPrice).toBe(90900 - pct(40));
      expect(ValuationEngine.calculate(iphone18ProMaxRule, answers).finalPrice).toBe(90900 - pct(60));
      expect(ValuationEngine.calculate({ ...rule, deductionPercentages: { basicQuestions: { touchscreenNotWorking: 40, noWarranty: 18 } } }, answers).finalPrice).toBe(90900 - pct(40) - pct(18));
    });

    test("phone not working: bought at what's left after the admin's %; a working phone never goes below it", () => {
      const rule = { ...iphone18ProMaxRule, deductionPercentages: { basicQuestions: { phoneNotWorking: 90 } } } as any;
      const dead = site({ basicQuestions: { isPhoneWorking: false, isTouchscreenWorking: false, isDisplayOriginal: false, hasValidWarranty: false } });
      expect(ValuationEngine.calculate(rule, dead).finalPrice).toBe(9090);
      const wrecked = site({ touchGlassCondition: 'CRACKED_GLASS', screenDisplayCondition: 'MAJOR_SPOTS_OR_LINES', backPanelCondition: 'BACK_PANEL_BROKEN', sidePanelCondition: 'BENT_OR_BROKEN' });
      expect(ValuationEngine.calculate(rule, wrecked).finalPrice).toBe(9090);
    });

    test('network / SIM issue: 50% by default, the admin can change it', () => {
      const answers = site({ hardwareFaults: { networkProblem: true } });
      expect(ValuationEngine.calculate(iphone18ProMaxRule, answers).finalPrice).toBe(90900 - pct(50));
      const rule = { ...iphone18ProMaxRule, deductionPercentages: { hardwareFaults: { networkProblem: 30 } } } as any;
      expect(ValuationEngine.calculate(rule, answers).finalPrice).toBe(90900 - pct(30));
    });

    test('missing charger and box come off the price (the price includes them)', () => {
      expect(ValuationEngine.calculate(iphone18ProMaxRule, site({ hasOriginalCharger: false, hasOriginalBox: false })).finalPrice).toBe(90900 - 1000);
    });
  });

  test('Gatekeeper Rule: Phone does not turn on skips all defect deductions', () => {
    // phone_working_condition === false: FinalPrice = ScrapFloor = 2000 (accessories are not an extra)
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
    expect(result.selectedAccBonus).toBe(0);
    expect(result.finalPrice).toBe(2000);
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
    const screenItem = result.breakdown.find((b) => b.component === 'Touchscreen not working');
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
    const hwItem = result.breakdown.find((b) => b.component === 'Back camera not working');
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

      const result = ValuationEngine.calculate(warrantyRule, condition);
      expect(result.warrantyVoided).toBe(true);
      expect(result.itemizedBreakdown.warrantyDeduction).toBe(Math.round(90900 * 0.18));
      // The bill was provided, so nothing is taken off for it
      expect(result.breakdown.some((b) => b.component === 'No bill with same IMEI')).toBe(false);
    }
  });

  test('Missing bill (no warranty answer, older apps): priced as out of warranty, nothing else', () => {
    const condition: DeclaredCondition = {
      phone_working_condition: true,
      screen_condition: 'flawless',
      body_condition: 'no_scratches_flawless',
      accessories: ['original_charger', 'box_same_imei'], // Missing bill
    };

    const result = ValuationEngine.calculate(warrantyRule, condition);
    expect(result.warrantyVoided).toBe(true);
    expect(result.itemizedBreakdown.warrantyDeduction).toBe(Math.round(90900 * 0.18));
    expect(result.itemizedBreakdown.billBonus).toBe(0);
    expect(result.finalPrice).toBe(90900 - Math.round(90900 * 0.18));
  });

  test("Default scrap floor: what's left after the standard 87.9% for a phone that doesn't switch on", () => {
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
    // Math.round(50000 * 0.121) = 6050
    expect(result.scrapFloor).toBe(6050);
    expect(result.finalPrice).toBe(6050);
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
    // Client's standard: touchscreen 60%, back panel minor scratches 3%, battery 15%, back camera 18%
    expect(result.itemizedBreakdown.screenDeduction).toBe(54540);
    expect(result.itemizedBreakdown.bodyDeduction).toBe(2727);
    expect(result.itemizedBreakdown.batteryDeduction).toBe(13635);
    expect(result.itemizedBreakdown.hardwareDeductions).toBe(16362);
    expect(result.selectedAccBonus).toBe(0);
    expect(result.warrantyVoided).toBe(true); // Voided by touch not working
  });
});
