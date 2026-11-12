import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ISmartphoneModelDocument extends Document {
  brandId: Types.ObjectId;
  name: string;
  slug: string;
  releaseYear: number;
  imageUrl?: string;
  basePrice: number;
  displayOrder?: number;
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
    isPublished: { type: Boolean, default: true, index: true },
    isArchived: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

SmartphoneModelSchema.index({ brandId: 1, displayOrder: 1, releaseYear: -1 });
SmartphoneModelSchema.index({ brandId: 1, isPublished: 1, isArchived: 1 });

export const SmartphoneModel = mongoose.model<ISmartphoneModelDocument>('SmartphoneModel', SmartphoneModelSchema);

