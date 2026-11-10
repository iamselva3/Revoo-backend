import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IStorageVariantDocument extends Document {
  modelId: Types.ObjectId;
  capacity: string; // e.g. "8GB / 128GB", "8GB / 256GB", "12GB / 512GB", "12GB / 1TB"
  ram?: string; // e.g. "8GB"
  storage?: string; // e.g. "256GB" (ROM)
  priceModifier: number; // e.g. 0 for base, +3500 for 256GB, etc.
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const StorageVariantSchema = new Schema<IStorageVariantDocument>(
  {
    modelId: { type: Schema.Types.ObjectId, ref: 'SmartphoneModel', required: true, index: true },
    capacity: { type: String, required: true, trim: true },
    ram: { type: String, trim: true },
    storage: { type: String, trim: true },
    priceModifier: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: true },
  },
  { timestamps: true }
);

StorageVariantSchema.index({ modelId: 1, capacity: 1 }, { unique: true });

export const StorageVariantModel = mongoose.model<IStorageVariantDocument>('StorageVariant', StorageVariantSchema);
