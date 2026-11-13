"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateValuation = exports.ValuationEngine = exports.GlobalDefaultPct = exports.WARRANTY_VOID_TRIGGERS = exports.DEFAULT_WARRANTY_PENALTY_PCT = exports.DEFAULT_SCRAP_FLOOR_MULTIPLIER = exports.MAX_ACC_POOL = exports.BILL_BONUS = exports.BOX_BONUS = exports.CHARGER_BONUS = exports.ACC_BONUS = exports.WARRANTY_VOID_KEYS = exports.DEFAULT_PCT = exports.calculatePrice = void 0;
const pricingEngine_js_1 = require("./pricingEngine.js");
Object.defineProperty(exports, "calculatePrice", { enumerable: true, get: function () { return pricingEngine_js_1.calculatePrice; } });
Object.defineProperty(exports, "DEFAULT_PCT", { enumerable: true, get: function () { return pricingEngine_js_1.DEFAULT_PCT; } });
Object.defineProperty(exports, "WARRANTY_VOID_KEYS", { enumerable: true, get: function () { return pricingEngine_js_1.WARRANTY_VOID_KEYS; } });
Object.defineProperty(exports, "ACC_BONUS", { enumerable: true, get: function () { return pricingEngine_js_1.ACC_BONUS; } });
exports.CHARGER_BONUS = pricingEngine_js_1.ACC_BONUS.original_charger; // 250
exports.BOX_BONUS = pricingEngine_js_1.ACC_BONUS.box_same_imei; // 150
exports.BILL_BONUS = pricingEngine_js_1.ACC_BONUS.bill_same_imei; // 210
exports.MAX_ACC_POOL = exports.CHARGER_BONUS + exports.BOX_BONUS + exports.BILL_BONUS; // 610
exports.DEFAULT_SCRAP_FLOOR_MULTIPLIER = 0.022;
exports.DEFAULT_WARRANTY_PENALTY_PCT = 0.18;
exports.WARRANTY_VOID_TRIGGERS = Array.from(pricingEngine_js_1.WARRANTY_VOID_KEYS);
exports.GlobalDefaultPct = pricingEngine_js_1.DEFAULT_PCT;
class ValuationEngine {
    /**
     * Maps arbitrary request body / condition input to standardized PricingEngineInput
     */
    static mapConditionToEngineInput(condition) {
        const c = condition || {};
        // 1. Phone working condition
        let phone_working_condition = true;
        if (c.phone_working_condition !== undefined) {
            phone_working_condition = c.phone_working_condition === true || c.phone_working_condition === 'true';
        }
        else if (c.isPhoneWorking !== undefined) {
            phone_working_condition = c.isPhoneWorking === true || c.isPhoneWorking === 'true';
        }
        else if (c.basicQuestions?.isPhoneWorking !== undefined) {
            phone_working_condition = c.basicQuestions.isPhoneWorking === true || c.basicQuestions.isPhoneWorking === 'true';
        }
        // 2. Screen & touch condition
        let screenKey = 'flawless';
        if (c.screenKey !== undefined) {
            screenKey = c.screenKey;
        }
        else if (c.screen_condition !== undefined) {
            screenKey = c.screen_condition;
        }
        else if (c.touch_screen_not_working === true ||
            c.touch_screen_working === false ||
            c.isTouchscreenWorking === false ||
            c.isTouchscreenWorking === 'false' ||
            c.basicQuestions?.isTouchscreenWorking === false) {
            screenKey = 'touch_screen_not_working';
        }
        else if (c.touchGlassCondition !== undefined && c.touchGlassCondition !== null) {
            // Website "Physical condition" step: touch-glass scratches/cracks (single select)
            const glass = String(c.touchGlassCondition).toUpperCase();
            if (glass === 'CRACKED_GLASS' || glass === 'GLASS_CRACKED') {
                screenKey = 'screen_cracked_glass_only';
            }
            else if (glass === 'HEAVY_SCRATCHES') {
                screenKey = 'heavy_screen_scratches';
            }
            else if (glass === 'MINOR_SCRATCHES') {
                screenKey = 'minor_screen_scratches';
            }
            else {
                screenKey = 'flawless';
            }
        }
        else if (c.displayCondition) {
            const dc = String(c.displayCondition).toUpperCase();
            if (dc === 'BROKEN_OR_DEAD_PIXELS' || dc === 'DEAD_PIXELS' || dc === 'DISPLAY_SPOTS_OR_DEAD_PIXELS') {
                screenKey = 'display_spots_or_dead_pixels';
            }
            else if (dc === 'CRACKED_GLASS' || dc === 'SCREEN_CRACKED_GLASS_ONLY') {
                screenKey = 'screen_cracked_glass_only';
            }
            else if (dc === 'DEEP_SCRATCHES' || dc === 'HEAVY_SCREEN_SCRATCHES') {
                screenKey = 'heavy_screen_scratches';
            }
            else if (dc === 'MINOR_SCRATCHES' || dc === 'MINOR_SCREEN_SCRATCHES') {
                screenKey = 'minor_screen_scratches';
            }
            else if (dc === 'FLAWLESS') {
                screenKey = 'flawless';
            }
            else {
                screenKey = c.displayCondition;
            }
        }
        // 3. Body, center & side panel condition
        let bodyKey = 'no_scratches_flawless';
        if (c.bodyKey !== undefined) {
            bodyKey = c.bodyKey;
        }
        else if (c.body_condition !== undefined) {
            bodyKey = c.body_condition;
        }
        else {
            const back = c.backPanelCondition ? String(c.backPanelCondition).toUpperCase() : '';
            const side = c.sidePanelCondition ? String(c.sidePanelCondition).toUpperCase() : '';
            const body = c.bodyCondition ? String(c.bodyCondition).toUpperCase() : '';
            if (back === 'BACK_PANEL_BROKEN' || c.back_glass_cracked_or_broken === true) {
                bodyKey = 'back_glass_cracked_or_broken';
            }
            else if (side === 'BENT_OR_BROKEN' || body === 'BENT_OR_CRACKED_BACK' || c.dents_or_bent_side_panel === true) {
                bodyKey = 'dents_or_bent_side_panel';
            }
            else if (back === 'HEAVY_SCRATCHES' ||
                side === 'HEAVY_DENT' ||
                body === 'DENTED_OR_SCRATCHED' ||
                c.major_scratches_or_paint_peel === true) {
                bodyKey = 'major_scratches_or_paint_peel';
            }
            else if (side === 'MINOR_DENT_OR_SCRATCHES' ||
                side === 'MINOR_DENT' ||
                c.minor_dent === true ||
                body === 'MINOR_DENT') {
                // "Minor dent" MUST map to minor_dent (5%), NOT dents_or_bent_side_panel (16% + warranty void)
                bodyKey = 'minor_dent';
            }
            else if (back === 'MINOR_SCRATCHES' ||
                body === 'MINOR_SIGNS_OF_USE' ||
                c.minor_scratches_center_or_side === true) {
                bodyKey = 'minor_scratches_center_or_side';
            }
            else if (back === 'NO_DEFECTS' && side === 'NO_DEFECTS') {
                bodyKey = 'no_scratches_flawless';
            }
            else if (body === 'FLAWLESS') {
                bodyKey = 'no_scratches_flawless';
            }
        }
        // 4. Battery health
        let batteryKey = 'above_90_percent';
        if (c.batteryKey !== undefined) {
            batteryKey = c.batteryKey;
        }
        else {
            const rawBattery = c.battery_health ?? c.batteryHealth;
            if (typeof rawBattery === 'number') {
                if (rawBattery > 90)
                    batteryKey = 'above_90_percent';
                else if (rawBattery >= 86)
                    batteryKey = '86_to_90_percent';
                else if (rawBattery >= 80)
                    batteryKey = '80_to_85_percent';
                else
                    batteryKey = 'below_80_percent_or_service';
            }
            else if (typeof rawBattery === 'string') {
                const bStr = rawBattery.trim().toLowerCase();
                if (bStr === 'above_90_percent' || bStr === '86_to_90_percent' || bStr === '80_to_85_percent' || bStr === 'below_80_percent_or_service') {
                    batteryKey = bStr;
                }
                else if (bStr === 'excellent' || bStr === 'above_85' || bStr === 'above_90') {
                    batteryKey = 'above_90_percent';
                }
                else if (bStr === 'good' || bStr.includes('80_to_85') || bStr.includes('80-85') || bStr === '83') {
                    batteryKey = '80_to_85_percent';
                }
                else if (bStr.includes('86_to_90') || bStr.includes('86-90')) {
                    batteryKey = '86_to_90_percent';
                }
                else if (bStr === 'degraded' || bStr.includes('below_80') || bStr.includes('service')) {
                    batteryKey = 'below_80_percent_or_service';
                }
                else {
                    batteryKey = rawBattery;
                }
            }
            else if (c.batteryHealthBelow83 === true || c.hardwareFaults?.batteryHealthBelow83 === true) {
                batteryKey = '80_to_85_percent';
            }
        }
        // 5. Functional & Hardware defects (multi-select)
        const hardwareSet = new Set();
        if (Array.isArray(c.hardwareKeys)) {
            for (const k of c.hardwareKeys)
                hardwareSet.add(k);
        }
        if (Array.isArray(c.hardware_defects)) {
            for (const k of c.hardware_defects) {
                const kl = String(k).toLowerCase();
                if (kl === 'camera_glass_broken' || kl === 'broken_camera_glass')
                    hardwareSet.add('camera_glass_broken');
                else if (kl === 'rear_camera_not_working_or_blurry' || kl === 'rear_camera_faulty' || kl === 'backcamerafaulty')
                    hardwareSet.add('rear_camera_not_working_or_blurry');
                else if (kl === 'front_camera_not_working' || kl === 'frontcamerafaulty')
                    hardwareSet.add('front_camera_not_working');
                else if (kl === 'face_id_or_fingerprint_not_working' || kl === 'face_id_not_working' || kl === 'biometrics_faulty')
                    hardwareSet.add('face_id_or_fingerprint_not_working');
                else if (kl === 'wifi_bluetooth_gps_issue' || kl === 'wifi_or_bluetooth_not_working')
                    hardwareSet.add('wifi_bluetooth_gps_issue');
                else if (kl === 'speaker_or_mic_faulty' || kl === 'speaker_faulty' || kl === 'mic_faulty')
                    hardwareSet.add('speaker_or_mic_faulty');
                else if (kl === 'charging_port_faulty' || kl === 'charging_port_not_working')
                    hardwareSet.add('charging_port_faulty');
                else if (kl === 'volume_or_power_button_faulty' || kl === 'volume_button_not_working' || kl === 'power_button_not_working')
                    hardwareSet.add('volume_or_power_button_faulty');
                else if (kl === 'network_or_sim_tray_issue' || kl === 'network_faulty' || kl === 'network_problem' || kl === 'sim_tray_issue')
                    hardwareSet.add('network_or_sim_tray_issue');
                else
                    hardwareSet.add(k);
            }
        }
        const hf = c.hardwareFaults || {};
        const ff = c.functionalFaults || {};
        // Website "Physical condition" step: display spots / lines (single select). Ignored when the
        // touchscreen is dead, which is already priced as the most severe screen condition.
        if (screenKey !== 'touch_screen_not_working' && c.screenDisplayCondition) {
            const display = String(c.screenDisplayCondition).toUpperCase();
            if (display === 'MAJOR_SPOTS_OR_LINES' || display === 'DEAD_PIXELS' || display === 'LINES_ON_DISPLAY') {
                hardwareSet.add('display_spots_or_dead_pixels');
            }
            else if (display === 'MINOR_SPOTS') {
                hardwareSet.add('minor_display_spots');
            }
        }
        if (hf.cameraGlassBroken || c.cameraGlassBroken || c.camera_glass_broken) {
            hardwareSet.add('camera_glass_broken');
        }
        if (hf.rearCameraNotWorking ||
            c.rearCameraNotWorking ||
            hf.backCameraNotWorking ||
            c.backCameraNotWorking ||
            ff.backCameraFaulty ||
            c.rear_camera_not_working_or_blurry) {
            hardwareSet.add('rear_camera_not_working_or_blurry');
        }
        if (hf.frontCameraNotWorking || c.frontCameraNotWorking || ff.frontCameraFaulty || c.front_camera_not_working) {
            hardwareSet.add('front_camera_not_working');
        }
        if (hf.faceIdOrFingerprintNotWorking || c.faceIdOrFingerprintNotWorking || hf.biometricsNotWorking || c.biometricsNotWorking || ff.faceIdOrFingerprintFaulty || c.face_id_or_fingerprint_not_working) {
            hardwareSet.add('face_id_or_fingerprint_not_working');
        }
        if (hf.wifiOrBluetoothNotWorking || c.wifiOrBluetoothNotWorking || ff.wirelessOrBluetoothFaulty || c.wifi_bluetooth_gps_issue) {
            hardwareSet.add('wifi_bluetooth_gps_issue');
        }
        if (hf.earSpeakerNotWorking || c.earSpeakerNotWorking || hf.speakerNotWorking || c.speakerNotWorking || hf.microphoneNotWorking || c.microphoneNotWorking || ff.speakerOrMicFaulty || c.speaker_or_mic_faulty) {
            hardwareSet.add('speaker_or_mic_faulty');
        }
        if (hf.chargingPortNotWorking || c.chargingPortNotWorking || ff.chargingPortFaulty || c.charging_port_faulty) {
            hardwareSet.add('charging_port_faulty');
        }
        if (hf.powerButtonNotWorking || c.powerButtonNotWorking || hf.volumeButtonNotWorking || c.volumeButtonNotWorking || c.volume_or_power_button_faulty) {
            hardwareSet.add('volume_or_power_button_faulty');
        }
        // "Network problem / not working" MUST map to network_or_sim_tray_issue
        if (hf.networkProblem || c.networkProblem || hf.networkOrSimTrayIssue || c.networkOrSimTrayIssue || c.network_or_sim_tray_issue) {
            hardwareSet.add('network_or_sim_tray_issue');
        }
        // 6. Accessories
        const accArray = Array.isArray(c.accessories) ? c.accessories : [];
        const accObj = (typeof c.accessories === 'object' && !Array.isArray(c.accessories)) ? c.accessories : {};
        const original_charger = accObj.original_charger === true ||
            c.original_charger === true ||
            c.hasOriginalCharger === true ||
            c.hasOriginalCharger === 'true' ||
            accArray.includes('original_charger') ||
            accArray.includes('charger');
        const box_same_imei = accObj.box_same_imei === true ||
            c.box_same_imei === true ||
            c.hasOriginalBox === true ||
            c.hasOriginalBox === 'true' ||
            accArray.includes('box_same_imei') ||
            accArray.includes('box');
        let bill_same_imei = false;
        if (accObj.bill_same_imei !== undefined) {
            bill_same_imei = accObj.bill_same_imei === true;
        }
        else if (c.bill_same_imei !== undefined) {
            bill_same_imei = c.bill_same_imei === true;
        }
        else if (c.hasValidBill !== undefined) {
            bill_same_imei = c.hasValidBill === true || c.hasValidBill === 'true';
        }
        else if (c.hasValidWarranty !== undefined) {
            bill_same_imei = c.hasValidWarranty === true || c.hasValidWarranty === 'true';
        }
        else if (c.basicQuestions?.hasValidWarranty !== undefined) {
            bill_same_imei = c.basicQuestions.hasValidWarranty === true || c.basicQuestions.hasValidWarranty === 'true';
        }
        else if (accArray.includes('bill_same_imei') || accArray.includes('bill')) {
            bill_same_imei = true;
        }
        return {
            phone_working_condition,
            screenKey,
            bodyKey,
            batteryKey,
            hardwareKeys: Array.from(hardwareSet),
            accessories: {
                original_charger: !!original_charger,
                box_same_imei: !!box_same_imei,
                bill_same_imei: !!bill_same_imei,
            },
        };
    }
    /**
     * Maps database PricingRule or variant/model info into engine's phone object
     */
    static mapDbToPhone(rule) {
        const rawBasePrice = Number(rule.basePrice) || 0;
        const storageAdjustment = Number(rule.storagePriceAdjustment) || 0;
        const basePrice = rawBasePrice + storageAdjustment;
        // Normalizing customPercentages: if any admin entered whole percentage numbers (e.g. 4 for 4%), convert to fraction 0.04
        let customPercentages = rule.customPercentages;
        if (customPercentages && typeof customPercentages === 'object') {
            const normalized = {};
            for (const [k, v] of Object.entries(customPercentages)) {
                if (typeof v === 'number') {
                    normalized[k] = v > 1 ? v / 100 : v;
                }
            }
            customPercentages = normalized;
        }
        return {
            basePrice,
            minScrapPrice: rule.customScrapFloor ?? rule.minScrapPrice ?? rule.min_scrap_price,
            customDeductions: rule.customDeductions ?? rule.specific_deductions_inr,
            customPercentages,
            accessoryDeductions: ValuationEngine.accessoryDeductionsFromRule(rule),
        };
    }
    /**
     * Admin's per-model "taken off when missing" amounts for the charger and box
     * (stored as PricingRule.deductions.accessoriesBonus for compatibility).
     */
    static accessoryDeductionsFromRule(rule) {
        const acc = rule?.deductions?.accessoriesBonus;
        if (!acc)
            return undefined;
        const num = (v) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : undefined);
        return { original_charger: num(acc.hasOriginalCharger), box_same_imei: num(acc.hasOriginalBox) };
    }
    /**
     * Master Pricing Calculation
     * Invokes calculatePrice and builds structured itemized breakdown for API & UI compatibility
     */
    static calculate(rule, condition, config = {}) {
        const phone = ValuationEngine.mapDbToPhone(rule);
        const input = ValuationEngine.mapConditionToEngineInput(condition);
        // Live execution of calculatePrice engine
        const engineResult = (0, pricingEngine_js_1.calculatePrice)(phone, input, config);
        const storageAdjustment = Number(rule.storagePriceAdjustment) || 0;
        const breakdown = [];
        breakdown.push({
            component: 'Base Price',
            description: 'Maximum assured base valuation for model variant',
            adjustment: engineResult.basePrice,
            rateSource: 'base',
        });
        if (storageAdjustment !== 0) {
            breakdown.push({
                component: 'Storage Variant',
                description: 'Storage capacity price adjustment',
                adjustment: storageAdjustment,
                rateSource: 'base',
            });
        }
        // Populate deductions breakdown
        let screenDeduction = 0;
        let bodyDeduction = 0;
        let batteryDeduction = 0;
        let hardwareDeductions = 0;
        let warrantyDeduction = 0;
        const mapRateSource = (src) => {
            if (src === 'admin_pct')
                return 'admin_percentage';
            return src;
        };
        const ACCESSORY_LINES = {
            missing_original_charger: { component: 'Original charger not included', description: 'The price includes the original charger' },
            missing_box_same_imei: { component: 'Box with same IMEI not included', description: 'The price includes the original box with matching IMEI' },
            missing_bill_document: { component: 'No bill with same IMEI', description: 'Valid invoice with matching IMEI not provided' },
        };
        for (const d of engineResult.deductions) {
            const rateSource = mapRateSource(d.source);
            if (ACCESSORY_LINES[d.key]) {
                breakdown.push({ ...ACCESSORY_LINES[d.key], adjustment: -d.amount, rateSource });
            }
            else if (d.key === input.screenKey) {
                screenDeduction = d.amount;
                breakdown.push({
                    component: 'Screen & Touch Condition',
                    description: `Condition: ${d.key.replace(/_/g, ' ')}`,
                    adjustment: -d.amount,
                    rateSource,
                });
            }
            else if (d.key === input.bodyKey) {
                bodyDeduction = d.amount;
                breakdown.push({
                    component: 'Body & Side Panel Condition',
                    description: `Condition: ${d.key.replace(/_/g, ' ')}`,
                    adjustment: -d.amount,
                    rateSource,
                });
            }
            else if (d.key === input.batteryKey) {
                batteryDeduction = d.amount;
                breakdown.push({
                    component: 'Battery Health Tier',
                    description: `Battery health tier: ${d.key.replace(/_/g, ' ')}`,
                    adjustment: -d.amount,
                    rateSource,
                });
            }
            else if (d.key === 'out_of_warranty_or_no_bill_penalty') {
                warrantyDeduction = d.amount;
                breakdown.push({
                    component: 'Warranty & Document Penalty',
                    description: d.reason === 'physical_damage'
                        ? 'Physical damage automatically voids manufacturer warranty per policy'
                        : 'No valid invoice with matching IMEI provided',
                    adjustment: -d.amount,
                    rateSource,
                });
            }
            else if (d.key === 'display_spots_or_dead_pixels' || d.key === 'minor_display_spots') {
                screenDeduction += d.amount;
                breakdown.push({
                    component: 'Display Condition',
                    description: `Condition: ${d.key.replace(/_/g, ' ')}`,
                    adjustment: -d.amount,
                    rateSource,
                });
            }
            else {
                // Hardware faults
                hardwareDeductions += d.amount;
                breakdown.push({
                    component: 'Functional & Hardware Defect',
                    description: `Hardware fault: ${d.key.replace(/_/g, ' ')}`,
                    adjustment: -d.amount,
                    rateSource,
                });
            }
        }
        // Gatekeeper rule description if phone does not turn on
        if (!input.phone_working_condition) {
            const gatekeeperDeduction = engineResult.basePrice - engineResult.scrapFloor;
            breakdown.push({
                component: 'Gatekeeper: Phone Does Not Turn On',
                description: 'Device cannot power on; dropped to scrap motherboard and parts floor value',
                adjustment: -gatekeeperDeduction,
                rateSource: 'global_default',
            });
        }
        // Floor protection guarantee credit if raw body price dropped below scrap floor
        if (engineResult.rawBodyPrice !== null && engineResult.rawBodyPrice < engineResult.scrapFloor) {
            const floorProtectionCredit = engineResult.scrapFloor - engineResult.rawBodyPrice;
            breakdown.push({
                component: 'Minimum Scrap Floor Guarantee',
                description: `Device evaluated at minimum parts/scrap floor (₹${engineResult.scrapFloor})`,
                adjustment: floorProtectionCredit,
                rateSource: 'floor_protection',
            });
        }
        // Accessory extras only apply at scrap value (phone doesn't switch on, or its price fell to the
        // scrap floor). Otherwise the price already includes them and missing ones are deductions above.
        const atScrapValue = !input.phone_working_condition ||
            (engineResult.rawBodyPrice !== null && engineResult.rawBodyPrice < engineResult.scrapFloor);
        if (atScrapValue) {
            const extras = [
                [input.accessories.original_charger, 'Original Charger', 'Included authentic charger', exports.CHARGER_BONUS],
                [input.accessories.box_same_imei, 'Original Box', 'Included original box with matching IMEI', exports.BOX_BONUS],
                [input.accessories.bill_same_imei, 'Valid GST Bill', 'Valid invoice with matching IMEI', exports.BILL_BONUS],
            ];
            for (const [present, component, description, amount] of extras) {
                if (present)
                    breakdown.push({ component, description, adjustment: amount, rateSource: 'bonus' });
            }
        }
        const itemizedBreakdown = {
            basePrice: engineResult.basePrice,
            maxAccPool: engineResult.maxAccPool,
            rawBodyPrice: engineResult.rawBodyPrice ?? engineResult.scrapFloor,
            scrapFloor: engineResult.scrapFloor,
            clampedBodyPrice: engineResult.clampedBodyPrice ?? engineResult.scrapFloor,
            screenDeduction,
            bodyDeduction,
            batteryDeduction,
            hardwareDeductions,
            warrantyDeduction,
            totalDefectDeductions: engineResult.totalDeductions,
            selectedAccBonus: engineResult.selectedAccBonus,
            chargerBonus: atScrapValue && input.accessories.original_charger ? exports.CHARGER_BONUS : 0,
            boxBonus: atScrapValue && input.accessories.box_same_imei ? exports.BOX_BONUS : 0,
            billBonus: atScrapValue && input.accessories.bill_same_imei ? exports.BILL_BONUS : 0,
            finalPrice: engineResult.finalPrice,
        };
        const warrantyVoided = engineResult.deductions.some((d) => d.key === 'out_of_warranty_or_no_bill_penalty') ||
            !input.phone_working_condition;
        return {
            basePrice: engineResult.basePrice,
            storageAdjustment,
            scrapFloor: engineResult.scrapFloor,
            rawBodyPrice: engineResult.rawBodyPrice ?? engineResult.scrapFloor,
            clampedBodyPrice: engineResult.clampedBodyPrice ?? engineResult.scrapFloor,
            selectedAccBonus: engineResult.selectedAccBonus,
            maxAccPool: engineResult.maxAccPool,
            totalDeductions: engineResult.totalDeductions,
            totalBonuses: engineResult.selectedAccBonus,
            finalCalculatedAmount: engineResult.finalPrice,
            finalPrice: engineResult.finalPrice,
            warrantyVoided,
            pricingRuleVersion: rule.version || 1,
            breakdown,
            itemizedBreakdown,
            // Engine direct properties
            rule: engineResult.rule,
            deductions: engineResult.deductions,
        };
    }
}
exports.ValuationEngine = ValuationEngine;
exports.calculateValuation = ValuationEngine.calculate;
//# sourceMappingURL=ValuationEngine.js.map