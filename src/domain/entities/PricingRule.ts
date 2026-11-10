import { DeclaredCondition } from './DeviceCondition.js';

export interface DamageDeductionMatrix {
  // Legacy fields
  display?: {
    FLAWLESS: number;
    MINOR_SCRATCHES: number;
    DEEP_SCRATCHES: number;
    CRACKED_GLASS: number;
    BROKEN_OR_DEAD_PIXELS: number;
  };
  body?: {
    FLAWLESS: number;
    MINOR_SIGNS_OF_USE: number;
    DENTED_OR_SCRATCHED: number;
    BENT_OR_CRACKED_BACK: number;
  };
  battery?: {
    EXCELLENT: number;
    GOOD: number;
    DEGRADED: number;
  };
  functional?: {
    frontCameraFaulty: number;
    backCameraFaulty: number;
    faceIdOrFingerprintFaulty: number;
    speakerOrMicFaulty: number;
    chargingPortFaulty: number;
    wirelessOrBluetoothFaulty: number;
  };

  // DOFY Damage Deductions (Calculated ₹ amounts)
  basicQuestions?: {
    phoneNotWorking?: number;
    touchscreenNotWorking?: number;
    displayNotOriginal?: number;
    noWarranty?: number;
  };
  backPanel?: {
    NO_DEFECTS?: number;
    MINOR_SCRATCHES?: number;
    HEAVY_SCRATCHES?: number;
    BACK_PANEL_BROKEN?: number;
  };
  sidePanel?: {
    NO_DEFECTS?: number;
    MINOR_DENT_OR_SCRATCHES?: number;
    HEAVY_DENT?: number;
    BENT_OR_BROKEN?: number;
  };
  hardwareFaults?: {
    volumeButtonNotWorking?: number;
    wifiOrBluetoothNotWorking?: number;
    chargingPortNotWorking?: number;
    proximitySensorNotWorking?: number;
    powerButtonNotWorking?: number;
    earSpeakerNotWorking?: number;
    vibratorNotWorking?: number;
  };

  accessoriesBonus?: {
    hasOriginalBox?: number;
    hasOriginalCharger?: number;
  };
}

export interface IPricingRule {
  id?: string;
  modelId?: string;
  variantId?: string;
  basePrice: number;
  storagePriceAdjustment?: number;
  minScrapPrice?: number;
  customScrapFloor?: number;
  customDeductions?: Record<string, number>;
  specific_deductions_inr?: Record<string, number>;
  customPercentages?: Record<string, number>;
  deductions?: DamageDeductionMatrix;
  deductionPercentages?: any;
  version?: number;
  isActive?: boolean;
  effectiveFrom?: Date;
}

export interface ValuationBreakdownItem {
  component: string;
  description: string;
  adjustment: number; // positive for bonus, negative for deduction
  percentage?: number;
  rateSource?: 'admin_flat' | 'admin_percentage' | 'global_default' | 'bonus' | 'base' | 'floor_protection';
}

export interface ItemizedPricingBreakdown {
  basePrice: number;
  maxAccPool: number;
  rawBodyPrice: number;
  scrapFloor: number;
  clampedBodyPrice: number;
  screenDeduction: number;
  bodyDeduction: number;
  batteryDeduction: number;
  hardwareDeductions: number;
  warrantyDeduction: number;
  totalDefectDeductions: number;
  selectedAccBonus: number;
  chargerBonus: number;
  boxBonus: number;
  billBonus: number;
  finalPrice: number;
}

export interface ValuationResult {
  basePrice: number;
  storageAdjustment: number;
  scrapFloor: number;
  rawBodyPrice: number;
  clampedBodyPrice: number;
  selectedAccBonus: number;
  maxAccPool: number;
  totalDeductions: number;
  totalBonuses: number;
  finalCalculatedAmount: number;
  finalPrice: number;
  warrantyVoided: boolean;
  pricingRuleVersion: number;
  breakdown: ValuationBreakdownItem[];
  itemizedBreakdown: ItemizedPricingBreakdown;
  rule?: string | null;
  deductions?: any;
}
