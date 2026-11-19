import { calculatePrice } from './pricingEngine.js';

describe('PricingEngine - Official Acceptance Tests', () => {
  test('Test 1 (BasePrice 90900, severe damage): screenKey touch_screen_not_working, bodyKey minor_scratches_center_or_side, batteryKey 80_to_85_percent, hardwareKeys [camera_glass_broken], all three accessories true', () => {
    const phone = { basePrice: 90900, minScrapPrice: 2000 };
    const input = {
      phone_working_condition: true,
      screenKey: 'touch_screen_not_working',
      bodyKey: 'minor_scratches_center_or_side',
      batteryKey: '80_to_85_percent',
      hardwareKeys: ['camera_glass_broken'],
      accessories: {
        original_charger: true,
        box_same_imei: true,
        bill_same_imei: true,
      },
    };

    const result = calculatePrice(phone, input);

    // Client's standard: touch 60% + legacy minor scratches 4% + battery 15% + camera glass 9% + damage voids
    // the warranty 25% -> below the scrap floor
    expect(result.totalDeductions).toBe(102717);
    expect(result.finalPrice).toBe(2000);
  });

  test('Test 2 (BasePrice 90900, flawless, all accessories): screenKey flawless, bodyKey no_scratches_flawless, batteryKey above_90_percent, hardwareKeys [], all accessories true', () => {
    const phone = { basePrice: 90900 };
    const input = {
      phone_working_condition: true,
      screenKey: 'flawless',
      bodyKey: 'no_scratches_flawless',
      batteryKey: 'above_90_percent',
      hardwareKeys: [],
      accessories: {
        original_charger: true,
        box_same_imei: true,
        bill_same_imei: true,
      },
    };

    const result = calculatePrice(phone, input);

    expect(result.finalPrice).toBe(90900);
  });

  test('Test 3 (BasePrice 90900, flawless, no charger, box + bill true): charger amount taken off (default 500)', () => {
    const phone = { basePrice: 90900 };
    const input = {
      phone_working_condition: true,
      screenKey: 'flawless',
      bodyKey: 'no_scratches_flawless',
      batteryKey: 'above_90_percent',
      hardwareKeys: [],
      accessories: {
        original_charger: false,
        box_same_imei: true,
        bill_same_imei: true,
      },
    };

    const result = calculatePrice(phone, input);

    expect(result.finalPrice).toBe(90400);
  });

  test('Test 4 (BasePrice 45000, Samsung Galaxy S24 8GB/128GB style case): screenKey flawless, bodyKey minor_dent, batteryKey above_90_percent, hardwareKeys [network_or_sim_tray_issue], charger + box true, bill false', () => {
    const phone = { basePrice: 45000 };
    const input = {
      phone_working_condition: true,
      screenKey: 'flawless',
      bodyKey: 'minor_dent',
      batteryKey: 'above_90_percent',
      hardwareKeys: ['network_or_sim_tray_issue'],
      accessories: {
        original_charger: true,
        box_same_imei: true,
        bill_same_imei: false,
      },
    };

    const result = calculatePrice(phone, input);

    // Network / SIM 50% + legacy minor dent 5% + no bill ("No valid warranty" 25%)
    expect(result.finalPrice).toBe(9000);
    expect(result.deductions.find((d) => d.key === 'network_or_sim_tray_issue')?.amount).toBe(22500);
  });

  test('Test 5 (same as Test 4 but hardwareKeys [])', () => {
    const phone = { basePrice: 45000 };
    const input = {
      phone_working_condition: true,
      screenKey: 'flawless',
      bodyKey: 'minor_dent',
      batteryKey: 'above_90_percent',
      hardwareKeys: [],
      accessories: {
        original_charger: true,
        box_same_imei: true,
        bill_same_imei: false,
      },
    };

    const result = calculatePrice(phone, input);

    // 45000 - 2250 (legacy minor dent 5%) - 11250 (no bill: "No valid warranty" 25%)
    expect(result.finalPrice).toBe(31500);
  });

  test('Test 6: pass an unknown key, e.g. screenKey: abc. Expected: throws Unknown condition key', () => {
    const phone = { basePrice: 90900 };
    const input = {
      phone_working_condition: true,
      screenKey: 'abc',
      bodyKey: 'no_scratches_flawless',
      batteryKey: 'above_90_percent',
      hardwareKeys: [],
      accessories: {
        original_charger: true,
        box_same_imei: true,
        bill_same_imei: true,
      },
    };

    expect(() => calculatePrice(phone, input)).toThrow(/Unknown condition key/);
  });
});

