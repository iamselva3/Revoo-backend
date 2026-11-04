import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IPricingHistoryDocument extends Document {
  pricingRuleId: Types.ObjectId;
  modelId: Types.ObjectId;
  changedByAdminId: Types.ObjectId;
  changedByAdminName?: string;
  previousValues: Record<string, any>;
  newValues: Record<string, any>;
  reason: string;
  createdAt: Date;
}

const PricingHistorySchema = new Schema<IPricingHistoryDocument>(
  {
    pricingRuleId: { type: Schema.Types.ObjectId, ref: 'PricingRule', required: true, index: true },
    modelId: { type: Schema.Types.ObjectId, ref: 'SmartphoneModel', required: true, index: true },
    changedByAdminId: { type: Schema.Types.ObjectId, ref: 'AdminUser', required: true },
    changedByAdminName: { type: String },
    previousValues: { type: Schema.Types.Mixed, required: true },
    newValues: { type: Schema.Types.Mixed, required: true },
    reason: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const PricingHistoryModel = mongoose.model<IPricingHistoryDocument>('PricingHistory', PricingHistorySchema);

