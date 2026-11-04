import mongoose, { Schema, Document, Types } from 'mongoose';
import { CustomerDecision } from '../../../shared/types.js';

export interface ICustomerOfferDecisionDocument extends Document {
  requestId: Types.ObjectId;
  offerId: Types.ObjectId;
  decision: CustomerDecision;
  decisionTimestamp: Date;
  rejectionReason?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

const CustomerOfferDecisionSchema = new Schema<ICustomerOfferDecisionDocument>(
  {
    requestId: { type: Schema.Types.ObjectId, ref: 'BuybackRequest', required: true, index: true },
    offerId: { type: Schema.Types.ObjectId, ref: 'FinalOffer', required: true, index: true },
    decision: { type: String, enum: Object.values(CustomerDecision), required: true },
    decisionTimestamp: { type: Date, default: Date.now },
    rejectionReason: { type: String },
    ipAddress: { type: String },
    userAgent: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const CustomerOfferDecisionModel = mongoose.model<ICustomerOfferDecisionDocument>(
  'CustomerOfferDecision',
  CustomerOfferDecisionSchema
);

