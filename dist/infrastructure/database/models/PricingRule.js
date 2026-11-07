"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PricingRuleModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const PricingRuleSchema = new mongoose_1.Schema({
    modelId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'SmartphoneModel', required: true, index: true },
    variantId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'StorageVariant' },
    basePrice: { type: Number, required: true },
    storagePriceAdjustment: { type: Number, default: 0 },
    deductions: {
        display: {
            FLAWLESS: { type: Number, default: 0 },
            MINOR_SCRATCHES: { type: Number, default: 1000 },
            DEEP_SCRATCHES: { type: Number, default: 2500 },
            CRACKED_GLASS: { type: Number, default: 4500 },
            BROKEN_OR_DEAD_PIXELS: { type: Number, default: 7000 },
        },
        body: {
            FLAWLESS: { type: Number, default: 0 },
            MINOR_SIGNS_OF_USE: { type: Number, default: 500 },
            DENTED_OR_SCRATCHED: { type: Number, default: 1500 },
            BENT_OR_CRACKED_BACK: { type: Number, default: 3500 },
        },
        battery: {
            EXCELLENT: { type: Number, default: 0 },
            GOOD: { type: Number, default: 800 },
            DEGRADED: { type: Number, default: 2000 },
        },
        functional: {
            frontCameraFaulty: { type: Number, default: 1500 },
            backCameraFaulty: { type: Number, default: 2500 },
            faceIdOrFingerprintFaulty: { type: Number, default: 2000 },
            speakerOrMicFaulty: { type: Number, default: 1000 },
            chargingPortFaulty: { type: Number, default: 1200 },
            wirelessOrBluetoothFaulty: { type: Number, default: 1500 },
        },
        accessoriesBonus: {
            hasOriginalBox: { type: Number, default: 500 },
            hasOriginalCharger: { type: Number, default: 500 },
        },
        basicQuestions: {
            phoneNotWorking: { type: Number },
            touchscreenNotWorking: { type: Number },
            displayNotOriginal: { type: Number },
            noWarranty: { type: Number },
        },
        backPanel: {
            NO_DEFECTS: { type: Number, default: 0 },
            MINOR_SCRATCHES: { type: Number },
            HEAVY_SCRATCHES: { type: Number },
            BACK_PANEL_BROKEN: { type: Number },
        },
        sidePanel: {
            NO_DEFECTS: { type: Number, default: 0 },
            MINOR_DENT_OR_SCRATCHES: { type: Number },
            HEAVY_DENT: { type: Number },
            BENT_OR_BROKEN: { type: Number },
        },
        hardwareFaults: {
            volumeButtonNotWorking: { type: Number },
            wifiOrBluetoothNotWorking: { type: Number },
            chargingPortNotWorking: { type: Number },
            proximitySensorNotWorking: { type: Number },
            powerButtonNotWorking: { type: Number },
            earSpeakerNotWorking: { type: Number },
            vibratorNotWorking: { type: Number },
        },
    },
    deductionPercentages: { type: mongoose_1.Schema.Types.Mixed },
    version: { type: Number, default: 1 },
    isActive: { type: Boolean, default: true, index: true },
    effectiveFrom: { type: Date, default: Date.now },
    updatedByAdminId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'AdminUser' },
}, { timestamps: true });
PricingRuleSchema.index({ modelId: 1, variantId: 1, isActive: 1 });
exports.PricingRuleModel = mongoose_1.default.model('PricingRule', PricingRuleSchema);
//# sourceMappingURL=PricingRule.js.map