import mongoose, { Schema, Document } from 'mongoose';

export interface ICategoryDocument extends Document {
  name: string;
  slug: string;
  iconName: string;
  description: string;
  isActive: boolean;
  displayOrder: number;
  badgeText?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<ICategoryDocument>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    iconName: { type: String, required: true },
    description: { type: String, trim: true },
    isActive: { type: Boolean, default: true, index: true },
    displayOrder: { type: Number, default: 0 },
    badgeText: { type: String, trim: true },
  },
  { timestamps: true }
);

export const CategoryModel = mongoose.model<ICategoryDocument>('Category', CategorySchema);

