import { ValuationEngine } from './ValuationEngine';
import { IPricingRule } from '../entities/PricingRule';
import { DeclaredCondition } from '../entities/DeviceCondition';

describe('ValuationEngine Unit Tests', () => {
  const dummyRule: IPricingRule = {
    id: 'rule-1',
    modelId: 'model-1',
    variantId: 'variant-1',
    basePrice: 50000,
    storagePriceAdjustment: 5000,
    version: 1,
    isActive: true,
    effectiveFrom: new Date(),
    deductions: {
      display: {
        FLAWLESS: 0,
        MINOR_SCRATCHES: 1500,
        DEEP_SCRATCHES: 3000,
        CRACKED_GLASS: 6000,
        BROKEN_OR_DEAD_PIXELS: 10000,
      },
      body: {
        FLAWLESS: 0,
        MINOR_SIGNS_OF_USE: 500,
        DENTED_OR_SCRATCHED: 2000,
        BENT_OR_CRACKED_BACK: 4500,
      },
      battery: {
        EXCELLENT: 0,
        GOOD: 1000,
        DEGRADED: 2500,
      },
      functional: {
        frontCameraFaulty: 2000,
        backCameraFaulty: 3500,
        faceIdOrFingerprintFaulty: 2500,
        speakerOrMicFaulty: 1200,
        chargingPortFaulty: 1500,
        wirelessOrBluetoothFaulty: 1800,
      },
      accessoriesBonus: {
        hasOriginalBox: 500,
        hasOriginalCharger: 500,
      },
    },
  };

  test('calculates flawless condition with accessories bonus accurately', () => {
    const condition: DeclaredCondition = {
      displayCondition: 'FLAWLESS',
      bodyCondition: 'FLAWLESS',
      batteryHealth: 'EXCELLENT',
      functionalFaults: {
        frontCameraFaulty: false,
        backCameraFaulty: false,
        faceIdOrFingerprintFaulty: false,
        speakerOrMicFaulty: false,
        chargingPortFaulty: false,
        wirelessOrBluetoothFaulty: false,
      },
      hasOriginalBox: true,
      hasOriginalCharger: true,
    };

    const result = ValuationEngine.calculate(dummyRule, condition);
    // Base 50000 + Storage 5000 + Box 500 + Charger 500 = 56000
    expect(result.basePrice).toBe(50000);
    expect(result.storageAdjustment).toBe(5000);
    expect(result.totalDeductions).toBe(0);
    expect(result.totalBonuses).toBe(1000);
    expect(result.finalCalculatedAmount).toBe(56000);
  });

  test('applies display and body deductions correctly', () => {
    const condition: DeclaredCondition = {
      displayCondition: 'CRACKED_GLASS', // -6000
      bodyCondition: 'DENTED_OR_SCRATCHED', // -2000
      batteryHealth: 'DEGRADED', // -2500
      functionalFaults: {
        frontCameraFaulty: true, // -2000
        backCameraFaulty: false,
        faceIdOrFingerprintFaulty: false,
        speakerOrMicFaulty: false,
        chargingPortFaulty: false,
        wirelessOrBluetoothFaulty: false,
      },
      hasOriginalBox: false,
      hasOriginalCharger: false,
    };

    const result = ValuationEngine.calculate(dummyRule, condition);
    // Base 50000 + Storage 5000 - (6000 + 2000 + 2500 + 2000) = 55000 - 12500 = 42500
    expect(result.totalDeductions).toBe(12500);
    expect(result.finalCalculatedAmount).toBe(42500);
  });

  test('enforces floor price guarantee for heavily damaged devices', () => {
    const veryLowRule: IPricingRule = {
      ...dummyRule,
      basePrice: 1000,
      storagePriceAdjustment: 0,
    };

    const destroyedCondition: DeclaredCondition = {
      displayCondition: 'BROKEN_OR_DEAD_PIXELS', // -10000
      bodyCondition: 'BENT_OR_CRACKED_BACK', // -4500
      batteryHealth: 'DEGRADED',
      functionalFaults: {
        frontCameraFaulty: true,
        backCameraFaulty: true,
        faceIdOrFingerprintFaulty: true,
        speakerOrMicFaulty: true,
        chargingPortFaulty: true,
        wirelessOrBluetoothFaulty: true,
      },
      hasOriginalBox: false,
      hasOriginalCharger: false,
    };

    const result = ValuationEngine.calculate(veryLowRule, destroyedCondition);
    // Even if deductions exceed base price, floor price guarantee is minimum 500
    expect(result.finalCalculatedAmount).toBe(500);
  });
});

