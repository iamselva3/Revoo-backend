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

    expect(result.totalDeductions).toBe(91809);
    // Scrap floor only: accessories are part of the price, never an extra
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

    // 97.8% off by default (admin can change it): lands on the scrap value, 2.2% of 45000
    expect(result.finalPrice).toBe(990);
    expect(result.deductions.find((d) => d.key === 'network_or_sim_tray_issue')?.amount).toBe(44010);
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

    // 45000 - 2250 (minor dent 5%) - 8100 (no bill: out of warranty 18%)
    expect(result.finalPrice).toBe(34650);
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

