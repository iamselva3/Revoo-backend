import mongoose, { Schema, Document, Types } from 'mongoose';
import { DeviceImageType } from '../../../shared/types.js';

export interface IDeviceImageDocument extends Document {
  requestId?: Types.ObjectId;
  imageUrl: string;
  thumbnailUrl?: string;
  imageType: DeviceImageType;
  uploadedByRole: 'CUSTOMER' | 'ADMIN' | 'INSPECTOR';
  uploadedById?: Types.ObjectId;
  fileSizeBytes: number;
  mimeType: string;
  createdAt: Date;
}

const DeviceImageSchema = new Schema<IDeviceImageDocument>(
  {
    requestId: { type: Schema.Types.ObjectId, ref: 'BuybackRequest', index: true },
    imageUrl: { type: String, required: true },
    thumbnailUrl: { type: String },
    imageType: { type: String, enum: Object.values(DeviceImageType), default: DeviceImageType.CUSTOMER_FRONT },
    uploadedByRole: { type: String, enum: ['CUSTOMER', 'ADMIN', 'INSPECTOR'], required: true },
    uploadedById: { type: Schema.Types.ObjectId },
    fileSizeBytes: { type: Number, required: true },
    mimeType: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const DeviceImageModel = mongoose.model<IDeviceImageDocument>('DeviceImage', DeviceImageSchema);

