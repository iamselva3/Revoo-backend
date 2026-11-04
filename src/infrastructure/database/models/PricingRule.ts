import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IPricingRuleDocument extends Document {
  modelId: Types.ObjectId;
  variantId?: Types.ObjectId;
  basePrice: number;
  storagePriceAdjustment: number;
  deductions: {
    display: {
      FLAWLESS: number;
      MINOR_SCRATCHES: number;
      DEEP_SCRATCHES: number;
      CRACKED_GLASS: number;
      BROKEN_OR_DEAD_PIXELS: number;
    };
    body: {
      FLAWLESS: number;
      MINOR_SIGNS_OF_USE: number;
      DENTED_OR_SCRATCHED: number;
      BENT_OR_CRACKED_BACK: number;
    };
    battery: {
      EXCELLENT: number;
      GOOD: number;
      DEGRADED: number;
    };
    functional: {
      frontCameraFaulty: number;
      backCameraFaulty: number;
      faceIdOrFingerprintFaulty: number;
      speakerOrMicFaulty: number;
      chargingPortFaulty: number;
      wirelessOrBluetoothFaulty: number;
    };
    accessoriesBonus: {
      hasOriginalBox: number;
      hasOriginalCharger: number;
    };
  };
  version: number;
  isActive: boolean;
  effectiveFrom: Date;
  updatedByAdminId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PricingRuleSchema = new Schema<IPricingRuleDocument>(
  {
    modelId: { type: Schema.Types.ObjectId, ref: 'SmartphoneModel', required: true, index: true },
    variantId: { type: Schema.Types.ObjectId, ref: 'StorageVariant' },
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
    },
    version: { type: Number, default: 1 },
    isActive: { type: Boolean, default: true, index: true },
    effectiveFrom: { type: Date, default: Date.now },
    updatedByAdminId: { type: Schema.Types.ObjectId, ref: 'AdminUser' },
  },
  { timestamps: true }
);

PricingRuleSchema.index({ modelId: 1, variantId: 1, isActive: 1 });

export const PricingRuleModel = mongoose.model<IPricingRuleDocument>('PricingRule', PricingRuleSchema);

