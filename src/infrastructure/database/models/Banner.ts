import mongoose, { Schema, Document } from 'mongoose';

export interface IBannerDocument extends Document {
  tag: string;
  title: string;
  subtitle: string;
  badge: string;
  color1: string;
  color2: string;
  icon: string;
  linkUrl?: string;
  isActive: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const BannerSchema = new Schema<IBannerDocument>(
  {
    tag: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    subtitle: { type: String, required: true, trim: true },
    badge: { type: String, default: 'Special Offer' },
    color1: { type: String, default: '#0F172A' },
    color2: { type: String, default: '#1E293B' },
    icon: { type: String, default: 'flash_on' },
    linkUrl: { type: String, default: '/catalogue/brands' },
    isActive: { type: Boolean, default: true, index: true },
    displayOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const BannerModel = mongoose.model<IBannerDocument>('Banner', BannerSchema);

