import mongoose, { Schema, Document, Types } from 'mongoose';
import { EnquiryStatus } from '../../../shared/types.js';

export interface ICustomerEnquiryDocument extends Document {
  ticketNumber: string;
  userId?: Types.ObjectId;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  status: EnquiryStatus;
  adminResponse?: string;
  respondedByAdminId?: Types.ObjectId;
  respondedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerEnquirySchema = new Schema<ICustomerEnquiryDocument>(
  {
    ticketNumber: { type: String, required: true, unique: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    subject: { type: String, required: true, trim: true },
    message: { type: String, required: true },
    status: { type: String, enum: Object.values(EnquiryStatus), default: EnquiryStatus.OPEN, index: true },
    adminResponse: { type: String },
    respondedByAdminId: { type: Schema.Types.ObjectId, ref: 'AdminUser' },
    respondedAt: { type: Date },
  },
  { timestamps: true }
);

export const CustomerEnquiryModel = mongoose.model<ICustomerEnquiryDocument>('CustomerEnquiry', CustomerEnquirySchema);

