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
exports.InspectionModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const InspectionSchema = new mongoose_1.Schema({
    requestId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'BuybackRequest', required: true, index: true },
    inspectorId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'AdminUser', required: true },
    inspectorName: { type: String, required: true },
    actualCondition: {
        displayCondition: { type: String, required: true },
        bodyCondition: { type: String, required: true },
        batteryHealth: { type: String, required: true },
        functionalFaults: {
            frontCameraFaulty: { type: Boolean, default: false },
            backCameraFaulty: { type: Boolean, default: false },
            faceIdOrFingerprintFaulty: { type: Boolean, default: false },
            speakerOrMicFaulty: { type: Boolean, default: false },
            chargingPortFaulty: { type: Boolean, default: false },
            wirelessOrBluetoothFaulty: { type: Boolean, default: false },
        },
        hasOriginalBox: { type: Boolean, default: false },
        hasOriginalCharger: { type: Boolean, default: false },
        screenFunctional: { type: Boolean, default: true },
        touchFunctional: { type: Boolean, default: true },
        camerasFunctional: { type: Boolean, default: true },
        biometricsFunctional: { type: Boolean, default: true },
    },
    discrepancies: [{ type: String }],
    evidencePhotoUrls: [{ type: String }],
    suggestedOfferAmount: { type: Number, required: true },
    internalInspectionNotes: { type: String },
    customerVisibleNotes: { type: String },
    completedAt: { type: Date, default: Date.now },
}, { timestamps: true });
exports.InspectionModel = mongoose_1.default.model('Inspection', InspectionSchema);
//# sourceMappingURL=Inspection.js.map