"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValuationEngine = void 0;
class ValuationEngine {
    /**
     * Deterministically calculates the buyback valuation based on model base price,
     * storage adjustment, and condition deductions.
     */
    static calculate(rule, condition) {
        const breakdown = [];
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
        // Display deduction
        const displayPenalty = rule.deductions.display[condition.displayCondition] || 0;
        if (displayPenalty > 0) {
            totalDeductions += displayPenalty;
            breakdown.push({
                component: 'Display Condition',
                description: `Deduction for ${condition.displayCondition.replace(/_/g, ' ').toLowerCase()}`,
                adjustment: -displayPenalty,
            });
        }
        // Body deduction
        const bodyPenalty = rule.deductions.body[condition.bodyCondition] || 0;
        if (bodyPenalty > 0) {
            totalDeductions += bodyPenalty;
            breakdown.push({
                component: 'Body Condition',
                description: `Deduction for ${condition.bodyCondition.replace(/_/g, ' ').toLowerCase()}`,
                adjustment: -bodyPenalty,
            });
        }
        // Battery health deduction
        const batteryPenalty = rule.deductions.battery[condition.batteryHealth] || 0;
        if (batteryPenalty > 0) {
            totalDeductions += batteryPenalty;
            breakdown.push({
                component: 'Battery Health',
                description: `Deduction for ${condition.batteryHealth.toLowerCase()} battery condition`,
                adjustment: -batteryPenalty,
            });
        }
        // Functional faults
        const faults = condition.functionalFaults;
        if (faults) {
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
exports.ValuationEngine = ValuationEngine;
//# sourceMappingURL=ValuationEngine.js.map