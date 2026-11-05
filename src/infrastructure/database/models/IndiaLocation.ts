import mongoose, { Schema, Document } from 'mongoose';

export interface IIndiaStateDocument extends Document {
  name: string;
  code: string;
  type: 'State' | 'Union Territory';
  displayOrder: number;
}

export interface IIndiaLocationDocument extends Document {
  pincode: string;
  city: string;
  district: string;
  state: string;
  isPopular?: boolean;
}

const IndiaStateSchema = new Schema<IIndiaStateDocument>(
  {
    name: { type: String, required: true, unique: true, trim: true, index: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    type: { type: String, enum: ['State', 'Union Territory'], default: 'State' },
    displayOrder: { type: Number, default: 999 },
  },
  { timestamps: true }
);

const IndiaLocationSchema = new Schema<IIndiaLocationDocument>(
  {
    pincode: { type: String, required: true, trim: true, index: true },
    city: { type: String, required: true, trim: true, index: true },
    district: { type: String, trim: true },
    state: { type: String, required: true, trim: true, index: true },
    isPopular: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Compound index for quick city-state lookups
IndiaLocationSchema.index({ city: 1, state: 1 });
IndiaLocationSchema.index({ pincode: 1, city: 1 });

export const IndiaStateModel = mongoose.model<IIndiaStateDocument>('IndiaState', IndiaStateSchema);
export const IndiaLocationModel = mongoose.model<IIndiaLocationDocument>('IndiaLocation', IndiaLocationSchema);
