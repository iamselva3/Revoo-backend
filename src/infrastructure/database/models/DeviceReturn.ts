import mongoose, { Schema, Document, Types } from 'mongoose';
import { ReturnStatus } from '../../../shared/types.js';

export interface IDeviceReturnDocument extends Document {
  requestId: Types.ObjectId;
  assignedStaffId?: Types.ObjectId;
  assignedStaffName?: string;
  scheduledReturnDate?: Date;
  trackingReference?: string;
  status: ReturnStatus;
  reason?: string;
  notes?: string;
  returnedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DeviceReturnSchema = new Schema<IDeviceReturnDocument>(
  {
    requestId: { type: Schema.Types.ObjectId, ref: 'BuybackRequest', required: true, index: true },
    assignedStaffId: { type: Schema.Types.ObjectId, ref: 'AdminUser' },
    assignedStaffName: { type: String },
    scheduledReturnDate: { type: Date },
    trackingReference: { type: String },
    status: { type: String, enum: Object.values(ReturnStatus), default: ReturnStatus.INITIATED, index: true },
    reason: { type: String },
    notes: { type: String },
    returnedAt: { type: Date },
  },
  { timestamps: true }
);

export const DeviceReturnModel = mongoose.model<IDeviceReturnDocument>('DeviceReturn', DeviceReturnSchema);

