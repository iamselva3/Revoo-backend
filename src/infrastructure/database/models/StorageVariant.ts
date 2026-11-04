import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IStorageVariantDocument extends Document {
  modelId: Types.ObjectId;
  capacity: string; // e.g. "64GB", "128GB", "256GB", "512GB", "1TB"
  priceModifier: number; // e.g. 0 for base, +2000 for 256GB, +5000 for 512GB
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const StorageVariantSchema = new Schema<IStorageVariantDocument>(
  {
    modelId: { type: Schema.Types.ObjectId, ref: 'SmartphoneModel', required: true, index: true },
    capacity: { type: String, required: true, trim: true },
    priceModifier: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: true },
  },
  { timestamps: true }
);

StorageVariantSchema.index({ modelId: 1, capacity: 1 }, { unique: true });

export const StorageVariantModel = mongoose.model<IStorageVariantDocument>('StorageVariant', StorageVariantSchema);

