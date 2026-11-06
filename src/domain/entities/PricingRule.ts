import { DeclaredCondition } from './DeviceCondition.js';

export interface DamageDeductionMatrix {
  display: {
    FLAWLESS: number;
    MINOR_SCRATCHES: number;
    DEEP_SCRATCHES: number;
    CRACKED_GLASS: number;
    BROKEN_OR_DEAD_PIXELS: number;
  };
  body: {
    FLAWLESS: number;
    MINOR_SIGNS_OF_USE: number;
    DENTED_OR_SCRATCHED: number;
    BENT_OR_CRACKED_BACK: number;
  };
  battery: {
    EXCELLENT: number;
    GOOD: number;
    DEGRADED: number;
  };
  functional: {
    frontCameraFaulty: number;
    backCameraFaulty: number;
    faceIdOrFingerprintFaulty: number;
    speakerOrMicFaulty: number;
    chargingPortFaulty: number;
    wirelessOrBluetoothFaulty: number;
  };
  accessoriesBonus: {
    hasOriginalBox: number;
    hasOriginalCharger: number;
  };
}

export interface IPricingRule {
  id: string;
  modelId: string;
  variantId: string;
  basePrice: number;
  storagePriceAdjustment: number;
  deductions: DamageDeductionMatrix;
  deductionPercentages?: any;
  version: number;
  isActive: boolean;
  effectiveFrom: Date;
}

export interface ValuationBreakdownItem {
  component: string;
  description: string;
  adjustment: number; // positive for bonus, negative for deduction
}

export interface ValuationResult {
  basePrice: number;
  storageAdjustment: number;
  totalDeductions: number;
  totalBonuses: number;
  finalCalculatedAmount: number;
  pricingRuleVersion: number;
  breakdown: ValuationBreakdownItem[];
}

