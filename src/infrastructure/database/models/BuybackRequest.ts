import mongoose, { Schema, Document, Types } from 'mongoose';
import { RequestStatus } from '../../../shared/types.js';

export interface IBuybackRequestDocument extends Document {
  requestNumber: string; // e.g. "REV-2026-1001"
  userId: Types.ObjectId;
  customerDetails: {
    fullName: string;
    phone: string;
    email?: string;
  };
  deviceDetails: {
    brandId: Types.ObjectId;
    brandName: string;
    modelId: Types.ObjectId;
    modelName: string;
    variantId?: Types.ObjectId;
    storageCapacity: string;
    imeiOrSerial?: string;
  };
  declaredCondition: {
    displayCondition: string;
    bodyCondition: string;
    batteryHealth: string;
    functionalFaults: {
      frontCameraFaulty: boolean;
      backCameraFaulty: boolean;
      faceIdOrFingerprintFaulty: boolean;
      speakerOrMicFaulty: boolean;
      chargingPortFaulty: boolean;
      wirelessOrBluetoothFaulty: boolean;
    };
    hasOriginalBox: boolean;
    hasOriginalCharger: boolean;
    additionalNotes?: string;
  };
  indicativeEstimate: {
    basePrice: number;
    storageAdjustment: number;
    totalDeductions: number;
    totalBonuses: number;
    estimatedAmount: number;
    pricingRuleVersion: number;
    breakdown: Array<{
      component: string;
      description: string;
      adjustment: number;
    }>;
  };
  photoUrls: string[];
  pickupAddress: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    landmark?: string;
    preferredSlot?: string;
  };
  status: RequestStatus;
  timeline: Array<{
    status: RequestStatus;
    timestamp: Date;
    note?: string;
    updatedBy?: string;
  }>;
  assignedCollector?: {
    staffId?: Types.ObjectId;
    staffName?: string;
    scheduledDate?: Date;
    timeSlot?: string;
  };
  activeOfferId?: Types.ObjectId;
  inspectionId?: Types.ObjectId;
  paymentId?: Types.ObjectId;
  returnId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const BuybackRequestSchema = new Schema<IBuybackRequestDocument>(
  {
    requestNumber: { type: String, required: true, unique: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    customerDetails: {
      fullName: { type: String, required: true },
      phone: { type: String, required: true },
      email: { type: String },
    },
    deviceDetails: {
      brandId: { type: Schema.Types.ObjectId, ref: 'Brand', required: true },
      brandName: { type: String, required: true },
      modelId: { type: Schema.Types.ObjectId, ref: 'SmartphoneModel', required: true },
      modelName: { type: String, required: true },
      variantId: { type: Schema.Types.ObjectId, ref: 'StorageVariant' },
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
    status: {
      type: String,
      enum: Object.values(RequestStatus),
      default: RequestStatus.SUBMITTED,
      index: true,
    },
    timeline: [
      {
        status: { type: String, enum: Object.values(RequestStatus), required: true },
        timestamp: { type: Date, default: Date.now },
        note: { type: String },
        updatedBy: { type: String },
      },
    ],
    assignedCollector: {
      staffId: { type: Schema.Types.ObjectId, ref: 'AdminUser' },
      staffName: { type: String },
      scheduledDate: { type: Date },
      timeSlot: { type: String },
    },
    activeOfferId: { type: Schema.Types.ObjectId, ref: 'FinalOffer' },
    inspectionId: { type: Schema.Types.ObjectId, ref: 'Inspection' },
    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment' },
    returnId: { type: Schema.Types.ObjectId, ref: 'DeviceReturn' },
  },
  { timestamps: true }
);

BuybackRequestSchema.index({ userId: 1, createdAt: -1 });
BuybackRequestSchema.index({ status: 1, createdAt: -1 });

export const BuybackRequestModel = mongoose.model<IBuybackRequestDocument>('BuybackRequest', BuybackRequestSchema);

