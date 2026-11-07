import { DeclaredCondition } from '../entities/DeviceCondition.js';
import { IPricingRule, ValuationResult, ValuationBreakdownItem } from '../entities/PricingRule.js';

export class ValuationEngine {
  /**
   * Deterministically calculates the buyback valuation based on model base price,
   * storage adjustment, and condition deductions.
   */
  public static calculate(rule: IPricingRule, condition: DeclaredCondition): ValuationResult {
    const breakdown: ValuationBreakdownItem[] = [];

    const basePrice = rule.basePrice;
    breakdown.push({
      component: 'Base Price',
      description: 'Standard model base valuation',
      adjustment: basePrice,
    });

    const storageAdjustment = rule.storagePriceAdjustment;
    if (storageAdjustment !== 0) {
      breakdown.push({
        component: 'Storage Variant',
        description: `Capacity price adjustment`,
        adjustment: storageAdjustment,
      });
    }

    let totalDeductions = 0;
    let totalBonuses = 0;

    // 1. DOFY Basic Questions Assessment
    if (condition.basicQuestions) {
      const bq = condition.basicQuestions;
      const bqRule = rule.deductions?.basicQuestions || {
        phoneNotWorking: Math.round(basePrice * 0.60),
        touchscreenNotWorking: Math.round(basePrice * 0.15),
        displayNotOriginal: Math.round(basePrice * 0.10),
        noWarranty: Math.round(basePrice * 0.05),
      };

      if (!bq.isPhoneWorking) {
        const p = bqRule.phoneNotWorking ?? Math.round(basePrice * 0.60);
        totalDeductions += p;
        breakdown.push({ component: 'Working Condition', description: 'Phone not in working condition (Powers off / dead)', adjustment: -p });
      }
      if (!bq.isTouchscreenWorking) {
        const p = bqRule.touchscreenNotWorking ?? Math.round(basePrice * 0.15);
        totalDeductions += p;
        breakdown.push({ component: 'Touchscreen', description: 'Touchscreen not working properly', adjustment: -p });
      }
      if (!bq.isDisplayOriginal) {
        const p = bqRule.displayNotOriginal ?? Math.round(basePrice * 0.10);
        totalDeductions += p;
        breakdown.push({ component: 'Display Authenticity', description: 'Display is not original / replaced locally', adjustment: -p });
      }
      if (!bq.hasValidWarranty) {
        const p = bqRule.noWarranty ?? Math.round(basePrice * 0.05);
        totalDeductions += p;
        breakdown.push({ component: 'Warranty Status', description: 'No valid manufacturer warranty', adjustment: -p });
      }
    }

    // 2. DOFY Back Panel Condition
    if (condition.backPanelCondition) {
      const bpRule = rule.deductions?.backPanel || {
        NO_DEFECTS: 0,
        MINOR_SCRATCHES: Math.round(basePrice * 0.03),
        HEAVY_SCRATCHES: Math.round(basePrice * 0.08),
        BACK_PANEL_BROKEN: Math.round(basePrice * 0.15),
      };
      const p = bpRule[condition.backPanelCondition] ?? 0;
      if (p > 0) {
        totalDeductions += p;
        breakdown.push({
          component: 'Back Panel',
          description: `Back panel: ${condition.backPanelCondition.replace(/_/g, ' ').toLowerCase()}`,
          adjustment: -p,
        });
      }
    }

    // 3. DOFY Center or Side Frame Condition
    if (condition.sidePanelCondition) {
      const spRule = rule.deductions?.sidePanel || {
        NO_DEFECTS: 0,
        MINOR_DENT_OR_SCRATCHES: Math.round(basePrice * 0.03),
        HEAVY_DENT: Math.round(basePrice * 0.08),
        BENT_OR_BROKEN: Math.round(basePrice * 0.12),
      };
      const p = spRule[condition.sidePanelCondition] ?? 0;
      if (p > 0) {
        totalDeductions += p;
        breakdown.push({
          component: 'Center / Side Frame',
          description: `Side panel: ${condition.sidePanelCondition.replace(/_/g, ' ').toLowerCase()}`,
          adjustment: -p,
        });
      }
    }

    // 4. DOFY Hardware & Component Faults
    if (condition.hardwareFaults) {
      const hf = condition.hardwareFaults;
      const hfRule = rule.deductions?.hardwareFaults || {
        volumeButtonNotWorking: Math.round(basePrice * 0.03),
        wifiOrBluetoothNotWorking: Math.round(basePrice * 0.05),
        chargingPortNotWorking: Math.round(basePrice * 0.08),
        proximitySensorNotWorking: Math.round(basePrice * 0.03),
        powerButtonNotWorking: Math.round(basePrice * 0.05),
        earSpeakerNotWorking: Math.round(basePrice * 0.03),
        vibratorNotWorking: Math.round(basePrice * 0.02),
      };

      if (hf.powerButtonNotWorking) {
        const p = hfRule.powerButtonNotWorking ?? Math.round(basePrice * 0.05);
        totalDeductions += p;
        breakdown.push({ component: 'Power Button', description: 'Power button not functioning', adjustment: -p });
      }
      if (hf.volumeButtonNotWorking) {
        const p = hfRule.volumeButtonNotWorking ?? Math.round(basePrice * 0.03);
        totalDeductions += p;
        breakdown.push({ component: 'Volume Buttons', description: 'Volume buttons faulty', adjustment: -p });
      }
      if (hf.chargingPortNotWorking) {
        const p = hfRule.chargingPortNotWorking ?? Math.round(basePrice * 0.08);
        totalDeductions += p;
        breakdown.push({ component: 'Charging Port', description: 'Charging port not working', adjustment: -p });
      }
      if (hf.earSpeakerNotWorking) {
        const p = hfRule.earSpeakerNotWorking ?? Math.round(basePrice * 0.03);
        totalDeductions += p;
        breakdown.push({ component: 'Ear Speaker', description: 'Ear speaker faulty or low volume', adjustment: -p });
      }
      if (hf.proximitySensorNotWorking) {
        const p = hfRule.proximitySensorNotWorking ?? Math.round(basePrice * 0.03);
        totalDeductions += p;
        breakdown.push({ component: 'Proximity Sensor', description: 'Proximity sensor not working', adjustment: -p });
      }
      if (hf.wifiOrBluetoothNotWorking) {
        const p = hfRule.wifiOrBluetoothNotWorking ?? Math.round(basePrice * 0.05);
        totalDeductions += p;
        breakdown.push({ component: 'WiFi / Bluetooth', description: 'Wireless connectivity issue', adjustment: -p });
      }
      if (hf.vibratorNotWorking) {
        const p = hfRule.vibratorNotWorking ?? Math.round(basePrice * 0.02);
        totalDeductions += p;
        breakdown.push({ component: 'Vibrator', description: 'Vibration motor not working', adjustment: -p });
      }
    }

    // Legacy Display deduction (if DOFY basic questions not used)
    if (!condition.basicQuestions && condition.displayCondition && rule.deductions?.display) {
      const displayPenalty = rule.deductions.display[condition.displayCondition] || 0;
      if (displayPenalty > 0) {
        totalDeductions += displayPenalty;
        breakdown.push({
          component: 'Display Condition',
          description: `Deduction for ${condition.displayCondition.replace(/_/g, ' ').toLowerCase()}`,
          adjustment: -displayPenalty,
        });
      }
    }

    // Legacy Body deduction
    if (!condition.backPanelCondition && !condition.sidePanelCondition && condition.bodyCondition && rule.deductions?.body) {
      const bodyPenalty = rule.deductions.body[condition.bodyCondition] || 0;
      if (bodyPenalty > 0) {
        totalDeductions += bodyPenalty;
        breakdown.push({
          component: 'Body Condition',
          description: `Deduction for ${condition.bodyCondition.replace(/_/g, ' ').toLowerCase()}`,
          adjustment: -bodyPenalty,
        });
      }
    }

    // Legacy Battery health deduction
    if (condition.batteryHealth && rule.deductions?.battery) {
      const batteryPenalty = rule.deductions.battery[condition.batteryHealth] || 0;
      if (batteryPenalty > 0) {
        totalDeductions += batteryPenalty;
        breakdown.push({
          component: 'Battery Health',
          description: `Deduction for ${condition.batteryHealth.toLowerCase()} battery condition`,
          adjustment: -batteryPenalty,
        });
      }
    }

    // Legacy Functional faults (if DOFY hardwareFaults not supplied)
    if (!condition.hardwareFaults && condition.functionalFaults && rule.deductions?.functional) {
      const faults = condition.functionalFaults;
      if (faults.frontCameraFaulty) {
        const p = rule.deductions.functional.frontCameraFaulty || 0;
        totalDeductions += p;
        breakdown.push({ component: 'Front Camera', description: 'Faulty front camera', adjustment: -p });
      }
      if (faults.backCameraFaulty) {
        const p = rule.deductions.functional.backCameraFaulty || 0;
        totalDeductions += p;
        breakdown.push({ component: 'Back Camera', description: 'Faulty back camera', adjustment: -p });
      }
      if (faults.faceIdOrFingerprintFaulty) {
        const p = rule.deductions.functional.faceIdOrFingerprintFaulty || 0;
        totalDeductions += p;
        breakdown.push({ component: 'Biometrics', description: 'Faulty FaceID / Fingerprint sensor', adjustment: -p });
      }
      if (faults.speakerOrMicFaulty) {
        const p = rule.deductions.functional.speakerOrMicFaulty || 0;
        totalDeductions += p;
        breakdown.push({ component: 'Audio', description: 'Speaker or Microphone issue', adjustment: -p });
      }
      if (faults.chargingPortFaulty) {
        const p = rule.deductions.functional.chargingPortFaulty || 0;
        totalDeductions += p;
        breakdown.push({ component: 'Charging Port', description: 'Charging port issue', adjustment: -p });
      }
      if (faults.wirelessOrBluetoothFaulty) {
        const p = rule.deductions.functional.wirelessOrBluetoothFaulty || 0;
        totalDeductions += p;
        breakdown.push({ component: 'Connectivity', description: 'Wi-Fi / Bluetooth issue', adjustment: -p });
      }
    }

    // Accessories bonus
    if (condition.hasOriginalBox && rule.deductions.accessoriesBonus?.hasOriginalBox) {
      const b = rule.deductions.accessoriesBonus.hasOriginalBox;
      totalBonuses += b;
      breakdown.push({ component: 'Original Box', description: 'Included original packaging bonus', adjustment: b });
    }
    if (condition.hasOriginalCharger && rule.deductions.accessoriesBonus?.hasOriginalCharger) {
      const b = rule.deductions.accessoriesBonus.hasOriginalCharger;
      totalBonuses += b;
      breakdown.push({ component: 'Original Charger', description: 'Included authentic charger bonus', adjustment: b });
    }

    // Floor price guarantee: Minimum value is 500 (scrap/parts value), cannot be negative
    const rawValuation = basePrice + storageAdjustment - totalDeductions + totalBonuses;
    const finalCalculatedAmount = Math.max(500, Math.round(rawValuation));

    return {
      basePrice,
      storageAdjustment,
      totalDeductions,
      totalBonuses,
      finalCalculatedAmount,
      pricingRuleVersion: rule.version,
      breakdown,
    };
  }
}

