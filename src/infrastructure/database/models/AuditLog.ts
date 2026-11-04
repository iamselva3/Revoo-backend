import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IAuditLogDocument extends Document {
  actorType: 'ADMIN' | 'CUSTOMER' | 'SYSTEM';
  actorId?: Types.ObjectId;
  actorEmail?: string;
  action: string; // e.g. "PRICE_CHANGE", "FINAL_OFFER_ISSUED", "DECISION_RECORDED", "PAYMENT_RECORDED"
  resourceType: string; // e.g. "BuybackRequest", "PricingRule", "Payment"
  resourceId?: string;
  diff?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLogDocument>(
  {
    actorType: { type: String, enum: ['ADMIN', 'CUSTOMER', 'SYSTEM'], required: true },
    actorId: { type: Schema.Types.ObjectId, index: true },
    actorEmail: { type: String },
    action: { type: String, required: true, index: true },
    resourceType: { type: String, required: true, index: true },
    resourceId: { type: String, index: true },
    diff: { type: Schema.Types.Mixed },
    ipAddress: { type: String },
    userAgent: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

AuditLogSchema.index({ resourceType: 1, resourceId: 1, createdAt: -1 });

export const AuditLogModel = mongoose.model<IAuditLogDocument>('AuditLog', AuditLogSchema);

