"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enquirySchema = exports.initiateReturnSchema = exports.recordPaymentSchema = exports.createFinalOfferSchema = exports.submitInspectionSchema = exports.updateCollectionStatusSchema = exports.assignCollectionSchema = exports.offerDecisionSchema = exports.submitRequestSchema = exports.calculateEstimateSchema = void 0;
const zod_1 = require("zod");
const types_js_1 = require("../../shared/types.js");
exports.calculateEstimateSchema = zod_1.z.object({
    modelId: zod_1.z.string().min(24, 'Invalid Model ID'),
    variantId: zod_1.z.string().optional(),
    displayCondition: zod_1.z.enum(['FLAWLESS', 'MINOR_SCRATCHES', 'DEEP_SCRATCHES', 'CRACKED_GLASS', 'BROKEN_OR_DEAD_PIXELS']),
    bodyCondition: zod_1.z.enum(['FLAWLESS', 'MINOR_SIGNS_OF_USE', 'DENTED_OR_SCRATCHED', 'BENT_OR_CRACKED_BACK']),
    batteryHealth: zod_1.z.enum(['EXCELLENT', 'GOOD', 'DEGRADED']),
    functionalFaults: zod_1.z.object({
        frontCameraFaulty: zod_1.z.boolean().default(false),
        backCameraFaulty: zod_1.z.boolean().default(false),
        faceIdOrFingerprintFaulty: zod_1.z.boolean().default(false),
        speakerOrMicFaulty: zod_1.z.boolean().default(false),
        chargingPortFaulty: zod_1.z.boolean().default(false),
        wirelessOrBluetoothFaulty: zod_1.z.boolean().default(false),
    }).default({}),
    hasOriginalBox: zod_1.z.boolean().default(false),
    hasOriginalCharger: zod_1.z.boolean().default(false),
});
exports.submitRequestSchema = zod_1.z.object({
    modelId: zod_1.z.string().min(24, 'Invalid Model ID'),
    variantId: zod_1.z.string().optional(),
    declaredCondition: zod_1.z.object({
        displayCondition: zod_1.z.enum(['FLAWLESS', 'MINOR_SCRATCHES', 'DEEP_SCRATCHES', 'CRACKED_GLASS', 'BROKEN_OR_DEAD_PIXELS']),
        bodyCondition: zod_1.z.enum(['FLAWLESS', 'MINOR_SIGNS_OF_USE', 'DENTED_OR_SCRATCHED', 'BENT_OR_CRACKED_BACK']),
        batteryHealth: zod_1.z.enum(['EXCELLENT', 'GOOD', 'DEGRADED']),
        functionalFaults: zod_1.z.object({
            frontCameraFaulty: zod_1.z.boolean().default(false),
            backCameraFaulty: zod_1.z.boolean().default(false),
            faceIdOrFingerprintFaulty: zod_1.z.boolean().default(false),
            speakerOrMicFaulty: zod_1.z.boolean().default(false),
            chargingPortFaulty: zod_1.z.boolean().default(false),
            wirelessOrBluetoothFaulty: zod_1.z.boolean().default(false),
        }).default({}),
        hasOriginalBox: zod_1.z.boolean().default(false),
        hasOriginalCharger: zod_1.z.boolean().default(false),
        additionalNotes: zod_1.z.string().optional(),
    }),
    pickupAddress: zod_1.z.object({
        street: zod_1.z.string().min(3, 'Street address is required'),
        city: zod_1.z.string().min(2, 'City is required'),
        state: zod_1.z.string().min(2, 'State is required'),
        pincode: zod_1.z.string().min(4, 'Valid pincode required'),
        landmark: zod_1.z.string().optional(),
        preferredSlot: zod_1.z.string().optional(),
    }),
    photoUrls: zod_1.z.array(zod_1.z.string()).default([]),
});
exports.offerDecisionSchema = zod_1.z.object({
    decision: zod_1.z.enum(['ACCEPTED', 'REJECTED']),
    rejectionReason: zod_1.z.string().optional(),
});
exports.assignCollectionSchema = zod_1.z.object({
    collectorStaffId: zod_1.z.string().min(24, 'Invalid Staff ID'),
    collectorStaffName: zod_1.z.string().min(2, 'Staff name required'),
    scheduledDate: zod_1.z.string(),
    timeSlot: zod_1.z.string().optional(),
    notes: zod_1.z.string().optional(),
});
exports.updateCollectionStatusSchema = zod_1.z.object({
    status: zod_1.z.enum(['COLLECTION_SCHEDULED', 'ASSIGNED_FOR_COLLECTION', 'COLLECTED', 'RECEIVED_AT_INSPECTION_CENTRE']),
    notes: zod_1.z.string().optional(),
});
exports.submitInspectionSchema = zod_1.z.object({
    actualCondition: zod_1.z.object({
        displayCondition: zod_1.z.enum(['FLAWLESS', 'MINOR_SCRATCHES', 'DEEP_SCRATCHES', 'CRACKED_GLASS', 'BROKEN_OR_DEAD_PIXELS']),
        bodyCondition: zod_1.z.enum(['FLAWLESS', 'MINOR_SIGNS_OF_USE', 'DENTED_OR_SCRATCHED', 'BENT_OR_CRACKED_BACK']),
        batteryHealth: zod_1.z.enum(['EXCELLENT', 'GOOD', 'DEGRADED']),
        functionalFaults: zod_1.z.object({
            frontCameraFaulty: zod_1.z.boolean().default(false),
            backCameraFaulty: zod_1.z.boolean().default(false),
            faceIdOrFingerprintFaulty: zod_1.z.boolean().default(false),
            speakerOrMicFaulty: zod_1.z.boolean().default(false),
            chargingPortFaulty: zod_1.z.boolean().default(false),
            wirelessOrBluetoothFaulty: zod_1.z.boolean().default(false),
        }).default({}),
        hasOriginalBox: zod_1.z.boolean().default(false),
        hasOriginalCharger: zod_1.z.boolean().default(false),
        screenFunctional: zod_1.z.boolean().default(true),
        touchFunctional: zod_1.z.boolean().default(true),
        camerasFunctional: zod_1.z.boolean().default(true),
        biometricsFunctional: zod_1.z.boolean().default(true),
    }),
    discrepancies: zod_1.z.array(zod_1.z.string()).default([]),
    evidencePhotoUrls: zod_1.z.array(zod_1.z.string()).default([]),
    suggestedOfferAmount: zod_1.z.number().min(0),
    internalInspectionNotes: zod_1.z.string().optional(),
    customerVisibleNotes: zod_1.z.string().optional(),
});
exports.createFinalOfferSchema = zod_1.z.object({
    finalOfferedAmount: zod_1.z.number().min(0, 'Offer amount must be positive'),
    valuationExplanation: zod_1.z.string().min(5, 'Customer explanation is required'),
    internalNotes: zod_1.z.string().optional(),
    validityDays: zod_1.z.number().min(1).max(30).default(7),
});
exports.recordPaymentSchema = zod_1.z.object({
    amount: zod_1.z.number().min(1, 'Payment amount must be greater than 0'),
    paymentMethod: zod_1.z.enum([types_js_1.PaymentMethod.BANK_TRANSFER, types_js_1.PaymentMethod.UPI, types_js_1.PaymentMethod.CASH, types_js_1.PaymentMethod.CHEQUE]),
    paymentReference: zod_1.z.string().min(3, 'Transaction reference is required'),
    paymentProofUrl: zod_1.z.string().optional(),
    notes: zod_1.z.string().optional(),
});
exports.initiateReturnSchema = zod_1.z.object({
    assignedStaffId: zod_1.z.string().optional(),
    assignedStaffName: zod_1.z.string().optional(),
    scheduledReturnDate: zod_1.z.string().optional(),
    trackingReference: zod_1.z.string().optional(),
    reason: zod_1.z.string().optional(),
    notes: zod_1.z.string().optional(),
});
exports.enquirySchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Name is required'),
    email: zod_1.z.string().email('Valid email required'),
    phone: zod_1.z.string().optional(),
    subject: zod_1.z.string().min(3, 'Subject is required'),
    message: zod_1.z.string().min(10, 'Message must be at least 10 characters'),
});
//# sourceMappingURL=request.validator.js.map