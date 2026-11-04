import mongoose, { Schema, Document } from 'mongoose';

export enum DeviceGrade {
  PRISTINE = 'PRISTINE', // Like New - Flawless
  EXCELLENT = 'EXCELLENT', // Minimal signs of use
  VERY_GOOD = 'VERY_GOOD', // Fully functional with minor cosmetic marks
}

export interface IRefurbishedProductDocument extends Document {
  name: string;
  brand: string;
  storage: string;
  color: string;
  grade: DeviceGrade;
  batteryHealth: number;
  originalPrice: number;
  salePrice: number;
  discountPercentage: number;
  warrantyMonths: number;
  imageUrl: string;
  inspectionScore: number;
  inStock: boolean;
  isFeatured: boolean;
  highlights: string[];
  createdAt: Date;
  updatedAt: Date;
}

const RefurbishedProductSchema = new Schema<IRefurbishedProductDocument>(
  {
    name: { type: String, required: true, trim: true, index: true },
    brand: { type: String, required: true, trim: true, index: true },
    storage: { type: String, required: true },
    color: { type: String, default: 'Space Gray' },
    grade: { type: String, enum: Object.values(DeviceGrade), default: DeviceGrade.EXCELLENT },
    batteryHealth: { type: Number, default: 95 },
    originalPrice: { type: Number, required: true },
    salePrice: { type: Number, required: true },
    discountPercentage: { type: Number, default: 0 },
    warrantyMonths: { type: Number, default: 12 },
    imageUrl: { type: String, required: true },
    inspectionScore: { type: Number, default: 98 },
    inStock: { type: Boolean, default: true, index: true },
    isFeatured: { type: Boolean, default: true },
    highlights: [{ type: String }],
  },
  { timestamps: true }
);

export const RefurbishedProductModel = mongoose.model<IRefurbishedProductDocument>(
  'RefurbishedProduct',
  RefurbishedProductSchema
);

