import mongoose, { Schema, Document, Types } from 'mongoose';
import { PaymentMethod, PaymentStatus } from '../../../shared/types.js';

export interface IPaymentDocument extends Document {
  requestId: Types.ObjectId;
  offerId: Types.ObjectId;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentReference: string;
  paymentProofUrl?: string;
  status: PaymentStatus;
  recordedByAdminId: Types.ObjectId;
  recordedByAdminName?: string;
  notes?: string;
  paidAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPaymentDocument>(
  {
    requestId: { type: Schema.Types.ObjectId, ref: 'BuybackRequest', required: true, index: true },
    offerId: { type: Schema.Types.ObjectId, ref: 'FinalOffer', required: true },
    amount: { type: Number, required: true },
    paymentMethod: { type: String, enum: Object.values(PaymentMethod), required: true },
    paymentReference: { type: String, required: true, trim: true },
    paymentProofUrl: { type: String },
    status: { type: String, enum: Object.values(PaymentStatus), default: PaymentStatus.COMPLETED, index: true },
    recordedByAdminId: { type: Schema.Types.ObjectId, ref: 'AdminUser', required: true },
    recordedByAdminName: { type: String },
    notes: { type: String },
    paidAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const PaymentModel = mongoose.model<IPaymentDocument>('Payment', PaymentSchema);

