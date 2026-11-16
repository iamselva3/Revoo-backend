import mongoose, { Schema, Document, Types } from 'mongoose';

/** What kind of device a model is. Phones, laptops, tablets and TVs are listed separately. */
export const DEVICE_CATEGORIES = ['phone', 'laptop', 'tablet', 'tv'] as const;
export type DeviceCategory = (typeof DEVICE_CATEGORIES)[number];

/**
 * "phones", "mobile", "laptops", "macbook", "tablets", "ipad", "smart_tv", ... (the website and the app
 * use different words) -> the stored category; anything else -> undefined.
 */
export const normalizeDeviceCategory = (value: unknown): DeviceCategory | undefined => {
  const v = String(value ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (['phone', 'phones', 'mobile', 'mobiles', 'mobile_phones', 'smartphone', 'smartphones'].includes(v)) return 'phone';
  if (['laptop', 'laptops', 'macbook', 'macbooks', 'notebook', 'notebooks'].includes(v)) return 'laptop';
  if (['tablet', 'tablets', 'ipad', 'ipads', 'tab', 'tabs'].includes(v)) return 'tablet';
  if (['tv', 'tvs', 'smart_tv', 'smart_tvs', 'smarttv', 'television'].includes(v)) return 'tv';
  return undefined;
};

/** Mongo filter for one category (models saved before categories existed count as phones). */
export const deviceCategoryFilter = (category: DeviceCategory) =>
  category === 'phone' ? { category: { $in: ['phone', null] } } : { category };

export interface ISmartphoneModelDocument extends Document {
  brandId: Types.ObjectId;
  name: string;
  slug: string;
  releaseYear: number;
  imageUrl?: string;
  basePrice: number;
  displayOrder?: number;
  /** Phone, laptop, tablet or TV (default phone) */
  category: DeviceCategory;
  /** % of the price taken off for each phone-age band the customer can pick (unset = nothing). */
  deviceAgeDeductions?: {
    BELOW_3_MONTHS?: number;
    '3_TO_6_MONTHS'?: number;
    '6_TO_11_MONTHS'?: number;
    ABOVE_11_MONTHS?: number;
  };
  isPublished: boolean;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SmartphoneModelSchema = new Schema<ISmartphoneModelDocument>(
  {
    brandId: { type: Schema.Types.ObjectId, ref: 'Brand', required: true, index: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    releaseYear: { type: Number, default: 2024 },
    imageUrl: { type: String },
    basePrice: { type: Number, required: true, min: 0 },
    displayOrder: { type: Number, default: 9999, index: true },
    category: { type: String, enum: DEVICE_CATEGORIES, default: 'phone', index: true },
    // "How old is your phone?" (asked when the warranty is valid): % of the price taken off per age band.
    // Set in the admin model editor or the Pricing Engine page; read by the valuation engine.
    deviceAgeDeductions: {
      BELOW_3_MONTHS: { type: Number, min: 0, max: 90 },
      '3_TO_6_MONTHS': { type: Number, min: 0, max: 90 },
      '6_TO_11_MONTHS': { type: Number, min: 0, max: 90 },
      ABOVE_11_MONTHS: { type: Number, min: 0, max: 90 },
    },
    isPublished: { type: Boolean, default: true, index: true },
    isArchived: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

SmartphoneModelSchema.index({ brandId: 1, displayOrder: 1, releaseYear: -1 });
SmartphoneModelSchema.index({ brandId: 1, isPublished: 1, isArchived: 1 });

export const SmartphoneModel = mongoose.model<ISmartphoneModelDocument>('SmartphoneModel', SmartphoneModelSchema);

