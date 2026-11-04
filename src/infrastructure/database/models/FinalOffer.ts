import mongoose, { Schema, Document, Types } from 'mongoose';
import { FinalOfferStatus } from '../../../shared/types.js';

export interface IFinalOfferDocument extends Document {
  requestId: Types.ObjectId;
  inspectionId: Types.ObjectId;
  offerVersion: number;
  originalEstimatedAmount: number;
  finalOfferedAmount: number;
  valuationExplanation: string;
  internalNotes?: string;
  issuedByAdminId: Types.ObjectId;
  issuedByAdminName?: string;
  status: FinalOfferStatus;
  validUntil: Date;
  customerDecision?: 'ACCEPTED' | 'REJECTED';
  decidedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const FinalOfferSchema = new Schema<IFinalOfferDocument>(
  {
    requestId: { type: Schema.Types.ObjectId, ref: 'BuybackRequest', required: true, index: true },
    inspectionId: { type: Schema.Types.ObjectId, ref: 'Inspection', required: true },
    offerVersion: { type: Number, default: 1 },
    originalEstimatedAmount: { type: Number, required: true },
    finalOfferedAmount: { type: Number, required: true },
    valuationExplanation: { type: String, required: true },
    internalNotes: { type: String },
    issuedByAdminId: { type: Schema.Types.ObjectId, ref: 'AdminUser', required: true },
    issuedByAdminName: { type: String },
    status: {
      type: String,
      enum: Object.values(FinalOfferStatus),
      default: FinalOfferStatus.ISSUED,
      index: true,
    },
    validUntil: { type: Date, required: true },
    customerDecision: { type: String, enum: ['ACCEPTED', 'REJECTED'] },
    decidedAt: { type: Date },
    rejectionReason: { type: String },
  },
  { timestamps: true }
);

FinalOfferSchema.index({ requestId: 1, offerVersion: -1 });

export const FinalOfferModel = mongoose.model<IFinalOfferDocument>('FinalOffer', FinalOfferSchema);

