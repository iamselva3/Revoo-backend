import mongoose, { Schema, Document } from 'mongoose';

export interface IBannerDocument extends Document {
  /** Text is optional: a banner can be just a photo (a poster with its own text) */
  tag?: string;
  title?: string;
  subtitle?: string;
  badge: string;
  color1: string;
  color2: string;
  icon: string;
  imageUrl?: string;
  isPopupModal?: boolean;
  popupActionText?: string;
  popupActionUrl?: string;
  linkUrl?: string;
  isActive: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const BannerSchema = new Schema<IBannerDocument>(
  {
    // Optional; the controller checks that every banner has a photo or a title
    tag: { type: String, trim: true },
    title: { type: String, trim: true },
    subtitle: { type: String, trim: true, default: '' },
    badge: { type: String, default: 'Special Offer' },
    color1: { type: String, default: '#059669' },
    color2: { type: String, default: '#022C22' },
    icon: { type: String, default: 'flash_on' },
    imageUrl: { type: String, trim: true },
    isPopupModal: { type: Boolean, default: false },
    popupActionText: { type: String, default: 'BUY NOW — LIVE SALE' },
    popupActionUrl: { type: String, default: '/buy' },
    linkUrl: { type: String, default: '/catalogue/brands' },
    isActive: { type: Boolean, default: true, index: true },
    displayOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const BannerModel = mongoose.model<IBannerDocument>('Banner', BannerSchema);
