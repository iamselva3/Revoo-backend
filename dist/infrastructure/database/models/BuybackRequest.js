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
exports.BuybackRequestModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const types_js_1 = require("../../../shared/types.js");
const BuybackRequestSchema = new mongoose_1.Schema({
    requestNumber: { type: String, required: true, unique: true, index: true },
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    customerDetails: {
        fullName: { type: String, required: true },
        phone: { type: String, required: true },
        email: { type: String },
    },
    deviceDetails: {
        brandId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Brand', required: true },
        brandName: { type: String, required: true },
        modelId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'SmartphoneModel', required: true },
        modelName: { type: String, required: true },
        variantId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'StorageVariant' },
        storageCapacity: { type: String, required: true },
        imeiOrSerial: { type: String },
    },
    declaredCondition: {
        // Legacy fields
        displayCondition: { type: String, required: false },
        bodyCondition: { type: String, required: false },
        batteryHealth: { type: String, required: false },
        functionalFaults: {
            frontCameraFaulty: { type: Boolean, default: false },
            backCameraFaulty: { type: Boolean, default: false },
            faceIdOrFingerprintFaulty: { type: Boolean, default: false },
            speakerOrMicFaulty: { type: Boolean, default: false },
            chargingPortFaulty: { type: Boolean, default: false },
            wirelessOrBluetoothFaulty: { type: Boolean, default: false },
        },
        // DOFY Condition Assessment fields
        basicQuestions: {
            isPhoneWorking: { type: Boolean, default: true },
            isTouchscreenWorking: { type: Boolean, default: true },
            isDisplayOriginal: { type: Boolean, default: true },
            hasValidWarranty: { type: Boolean, default: false },
        },
        backPanelCondition: { type: String },
        sidePanelCondition: { type: String },
        hardwareFaults: {
            volumeButtonNotWorking: { type: Boolean, default: false },
            wifiOrBluetoothNotWorking: { type: Boolean, default: false },
            chargingPortNotWorking: { type: Boolean, default: false },
            proximitySensorNotWorking: { type: Boolean, default: false },
            powerButtonNotWorking: { type: Boolean, default: false },
            earSpeakerNotWorking: { type: Boolean, default: false },
            vibratorNotWorking: { type: Boolean, default: false },
        },
        hasOriginalBox: { type: Boolean, default: false },
        hasOriginalCharger: { type: Boolean, default: false },
        additionalNotes: { type: String },
    },
    indicativeEstimate: {
        basePrice: { type: Number, required: true },
        storageAdjustment: { type: Number, default: 0 },
        totalDeductions: { type: Number, default: 0 },
        totalBonuses: { type: Number, default: 0 },
        estimatedAmount: { type: Number, required: true },
        pricingRuleVersion: { type: Number, required: true },
        breakdown: [
            {
                component: { type: String },
                description: { type: String },
                adjustment: { type: Number },
            },
        ],
    },
    photoUrls: [{ type: String }],
    pickupAddress: {
        street: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true },
        pincode: { type: String, required: true },
        landmark: { type: String },
        preferredSlot: { type: String },
    },
    scheduledPickupDate: { type: String },
    preferredTimeWindow: { type: String },
    status: {
        type: String,
        enum: Object.values(types_js_1.RequestStatus),
        default: types_js_1.RequestStatus.SUBMITTED,
        index: true,
    },
    timeline: [
        {
            status: { type: String, enum: Object.values(types_js_1.RequestStatus), required: true },
            timestamp: { type: Date, default: Date.now },
            note: { type: String },
            updatedBy: { type: String },
        },
    ],
    assignedCollector: {
        staffId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'AdminUser' },
        staffName: { type: String },
        scheduledDate: { type: Date },
        timeSlot: { type: String },
    },
    activeOfferId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'FinalOffer' },
    inspectionId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Inspection' },
    paymentId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Payment' },
    returnId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'DeviceReturn' },
}, { timestamps: true });
BuybackRequestSchema.index({ userId: 1, createdAt: -1 });
BuybackRequestSchema.index({ status: 1, createdAt: -1 });
exports.BuybackRequestModel = mongoose_1.default.model('BuybackRequest', BuybackRequestSchema);
//# sourceMappingURL=BuybackRequest.js.map