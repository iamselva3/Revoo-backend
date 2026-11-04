"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pricingRuleSchema = void 0;
const zod_1 = require("zod");
exports.pricingRuleSchema = zod_1.z.object({
    modelId: zod_1.z.string().min(24, 'Invalid Model ID'),
    variantId: zod_1.z.string().optional(),
    basePrice: zod_1.z.number().min(0, 'Base price must be positive'),
    storagePriceAdjustment: zod_1.z.number().default(0),
    deductions: zod_1.z.object({
        display: zod_1.z.object({
            FLAWLESS: zod_1.z.number().default(0),
            MINOR_SCRATCHES: zod_1.z.number().default(1000),
            DEEP_SCRATCHES: zod_1.z.number().default(2500),
            CRACKED_GLASS: zod_1.z.number().default(4500),
            BROKEN_OR_DEAD_PIXELS: zod_1.z.number().default(7000),
        }),
        body: zod_1.z.object({
            FLAWLESS: zod_1.z.number().default(0),
            MINOR_SIGNS_OF_USE: zod_1.z.number().default(500),
            DENTED_OR_SCRATCHED: zod_1.z.number().default(1500),
            BENT_OR_CRACKED_BACK: zod_1.z.number().default(3500),
        }),
        battery: zod_1.z.object({
            EXCELLENT: zod_1.z.number().default(0),
            GOOD: zod_1.z.number().default(800),
            DEGRADED: zod_1.z.number().default(2000),
        }),
        functional: zod_1.z.object({
            frontCameraFaulty: zod_1.z.number().default(1500),
            backCameraFaulty: zod_1.z.number().default(2500),
            faceIdOrFingerprintFaulty: zod_1.z.number().default(2000),
            speakerOrMicFaulty: zod_1.z.number().default(1000),
            chargingPortFaulty: zod_1.z.number().default(1200),
            wirelessOrBluetoothFaulty: zod_1.z.number().default(1500),
        }),
        accessoriesBonus: zod_1.z.object({
            hasOriginalBox: zod_1.z.number().default(500),
            hasOriginalCharger: zod_1.z.number().default(500),
        }),
    }),
    reasonForChange: zod_1.z.string().optional().default('Regular price adjustment'),
});
//# sourceMappingURL=pricing.validator.js.map