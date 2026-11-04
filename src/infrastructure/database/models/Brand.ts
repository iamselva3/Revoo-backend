import mongoose, { Schema, Document } from 'mongoose';

export interface IBrandDocument extends Document {
  name: string;
  slug: string;
  logoUrl?: string;
  isActive: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const BrandSchema = new Schema<IBrandDocument>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    logoUrl: { type: String },
    isActive: { type: Boolean, default: true, index: true },
    displayOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const BrandModel = mongoose.model<IBrandDocument>('Brand', BrandSchema);

