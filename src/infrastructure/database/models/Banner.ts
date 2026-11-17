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
  /** The photo customers see (already framed with the admin's "Adjust") */
  imageUrl?: string;
  /** The photo as uploaded, before "Adjust"; kept so the framing can be changed again */
  sourceImageUrl?: string;
  /** How the admin framed sourceImageUrl: zoom (1 = fills the banner) and the photo centre's offset
   * as a share of the banner's width / height; background = 'blur' or a #colour for empty space */
  imageAdjust?: { zoom: number; x: number; y: number; background?: string };
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
    sourceImageUrl: { type: String, trim: true },
    imageAdjust: {
      type: new Schema({ zoom: Number, x: Number, y: Number, background: String }, { _id: false }),
      default: undefined,
    },
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
