import { z } from 'zod';
import { PaymentMethod, RequestStatus } from '../../shared/types.js';

export const calculateEstimateSchema = z.object({
  modelId: z.string().min(1, 'Model ID is required'),
  variantId: z.string().optional(),
  displayCondition: z.enum(['FLAWLESS', 'MINOR_SCRATCHES', 'DEEP_SCRATCHES', 'CRACKED_GLASS', 'BROKEN_OR_DEAD_PIXELS']),
  bodyCondition: z.enum(['FLAWLESS', 'MINOR_SIGNS_OF_USE', 'DENTED_OR_SCRATCHED', 'BENT_OR_CRACKED_BACK']),
  batteryHealth: z.enum(['EXCELLENT', 'GOOD', 'DEGRADED']),
  functionalFaults: z.object({
    frontCameraFaulty: z.boolean().default(false),
    backCameraFaulty: z.boolean().default(false),
    faceIdOrFingerprintFaulty: z.boolean().default(false),
    speakerOrMicFaulty: z.boolean().default(false),
    chargingPortFaulty: z.boolean().default(false),
    wirelessOrBluetoothFaulty: z.boolean().default(false),
  }).default({}),
  hasOriginalBox: z.boolean().default(false),
  hasOriginalCharger: z.boolean().default(false),
});

export const submitRequestSchema = z.object({
  modelId: z.string().min(1, 'Model ID is required'),
  variantId: z.string().optional(),
  declaredCondition: z.object({
    displayCondition: z.enum(['FLAWLESS', 'MINOR_SCRATCHES', 'DEEP_SCRATCHES', 'CRACKED_GLASS', 'BROKEN_OR_DEAD_PIXELS']),
    bodyCondition: z.enum(['FLAWLESS', 'MINOR_SIGNS_OF_USE', 'DENTED_OR_SCRATCHED', 'BENT_OR_CRACKED_BACK']),
    batteryHealth: z.enum(['EXCELLENT', 'GOOD', 'DEGRADED']),
    functionalFaults: z.object({
      frontCameraFaulty: z.boolean().default(false),
      backCameraFaulty: z.boolean().default(false),
      faceIdOrFingerprintFaulty: z.boolean().default(false),
      speakerOrMicFaulty: z.boolean().default(false),
      chargingPortFaulty: z.boolean().default(false),
      wirelessOrBluetoothFaulty: z.boolean().default(false),
    }).default({}),
    hasOriginalBox: z.boolean().default(false),
    hasOriginalCharger: z.boolean().default(false),
    additionalNotes: z.string().optional(),
  }),
  pickupAddress: z.object({
    street: z.string().min(3, 'Street address is required'),
    city: z.string().min(2, 'City is required'),
    state: z.string().min(2, 'State is required'),
    pincode: z.string().min(4, 'Valid pincode required'),
    landmark: z.string().optional(),
    preferredSlot: z.string().optional(),
  }),
  photoUrls: z.array(z.string()).default([]),
});

export const offerDecisionSchema = z.object({
  decision: z.enum(['ACCEPTED', 'REJECTED']),
  rejectionReason: z.string().optional(),
});

export const assignCollectionSchema = z.object({
  collectorStaffId: z.string().min(24, 'Invalid Staff ID'),
  collectorStaffName: z.string().min(2, 'Staff name required'),
  scheduledDate: z.string(),
  timeSlot: z.string().optional(),
  notes: z.string().optional(),
});

export const updateCollectionStatusSchema = z.object({
  status: z.enum(['COLLECTION_SCHEDULED', 'ASSIGNED_FOR_COLLECTION', 'COLLECTED', 'RECEIVED_AT_INSPECTION_CENTRE']),
  notes: z.string().optional(),
});

export const submitInspectionSchema = z.object({
  actualCondition: z.object({
    displayCondition: z.enum(['FLAWLESS', 'MINOR_SCRATCHES', 'DEEP_SCRATCHES', 'CRACKED_GLASS', 'BROKEN_OR_DEAD_PIXELS']),
    bodyCondition: z.enum(['FLAWLESS', 'MINOR_SIGNS_OF_USE', 'DENTED_OR_SCRATCHED', 'BENT_OR_CRACKED_BACK']),
    batteryHealth: z.enum(['EXCELLENT', 'GOOD', 'DEGRADED']),
    functionalFaults: z.object({
      frontCameraFaulty: z.boolean().default(false),
      backCameraFaulty: z.boolean().default(false),
      faceIdOrFingerprintFaulty: z.boolean().default(false),
      speakerOrMicFaulty: z.boolean().default(false),
      chargingPortFaulty: z.boolean().default(false),
      wirelessOrBluetoothFaulty: z.boolean().default(false),
    }).default({}),
    hasOriginalBox: z.boolean().default(false),
    hasOriginalCharger: z.boolean().default(false),
    screenFunctional: z.boolean().default(true),
    touchFunctional: z.boolean().default(true),
    camerasFunctional: z.boolean().default(true),
    biometricsFunctional: z.boolean().default(true),
  }),
  discrepancies: z.array(z.string()).default([]),
  evidencePhotoUrls: z.array(z.string()).default([]),
  suggestedOfferAmount: z.number().min(0),
  internalInspectionNotes: z.string().optional(),
  customerVisibleNotes: z.string().optional(),
});

export const createFinalOfferSchema = z.object({
  finalOfferedAmount: z.number().min(0, 'Offer amount must be positive'),
  valuationExplanation: z.string().min(5, 'Customer explanation is required'),
  internalNotes: z.string().optional(),
  validityDays: z.number().min(1).max(30).default(7),
});

export const recordPaymentSchema = z.object({
  amount: z.number().min(1, 'Payment amount must be greater than 0'),
  paymentMethod: z.enum([PaymentMethod.BANK_TRANSFER, PaymentMethod.UPI, PaymentMethod.CASH, PaymentMethod.CHEQUE]),
  paymentReference: z.string().min(3, 'Transaction reference is required'),
  paymentProofUrl: z.string().optional(),
  notes: z.string().optional(),
});

export const initiateReturnSchema = z.object({
  assignedStaffId: z.string().optional(),
  assignedStaffName: z.string().optional(),
  scheduledReturnDate: z.string().optional(),
  trackingReference: z.string().optional(),
  reason: z.string().optional(),
  notes: z.string().optional(),
});

export const enquirySchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Valid email required'),
  phone: z.string().optional(),
  subject: z.string().min(3, 'Subject is required'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
});

