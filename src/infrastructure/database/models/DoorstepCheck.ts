import mongoose, { Schema, Document, Types } from 'mongoose';

/**
 * A pickup partner's check of the device at the customer's door (partner app, genietn.in/partner).
 *
 * The partner answers the same condition questions the customer answered, starting from the
 * customer's answers. The price is never typed: it is the customer's quote minus what the changed
 * answers take off, using the admin's prices. Every check is kept, so the admin can see who changed
 * the price, by how much and why.
 */
export type DoorstepOutcome = 'AGREED' | 'DECLINED' | 'NOT_BUYABLE';

export interface PriceChangeLine {
  /** Line of the price breakdown, e.g. "Cracked or broken glass" */
  component: string;
  /** Amount on the customer's quote (negative = taken off), 0 when the line wasn't there */
  quoted: number;
  /** Amount after the partner's check */
  checked: number;
  /** checked − quoted: negative when the change lowered the price */
  difference: number;
}

export interface IDoorstepCheckDocument extends Document {
  requestId: Types.ObjectId;
  requestNumber: string;
  partnerId: Types.ObjectId;
  partnerName: string;
  partnerCode: string;
  device: {
    modelId: Types.ObjectId;
    modelName: string;
    brandName: string;
    bookedVariantId?: Types.ObjectId;
    bookedStorage: string;
    checkedVariantId?: Types.ObjectId;
    checkedStorage: string;
  };
  customerCondition: any;
  checkedCondition: any;
  /** What the customer was quoted when booking */
  quotedAmount: number;
  /** The customer's answers at today's prices (differs from quotedAmount only if prices changed) */
  requotedAmount: number;
  /** The partner's answers at today's prices */
  checkedAmount: number;
  /** The final price: the quote, minus what the changed answers take off */
  finalAmount: number;
  /** finalAmount − quotedAmount (negative = price reduced at the door) */
  difference: number;
  bestAmount: number;
  worstAmount: number;
  changes: PriceChangeLine[];
  checkedBreakdown: Array<{ component: string; description?: string; adjustment: number }>;
  outcome: DoorstepOutcome;
  notBuyableReason?: string;
  imei?: string;
  photoUrls: string[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const LineSchema = new Schema(
  {
    component: { type: String, required: true },
    quoted: { type: Number, default: 0 },
    checked: { type: Number, default: 0 },
    difference: { type: Number, default: 0 },
  },
  { _id: false }
);

const DoorstepCheckSchema = new Schema<IDoorstepCheckDocument>(
  {
    requestId: { type: Schema.Types.ObjectId, ref: 'BuybackRequest', required: true, index: true },
    requestNumber: { type: String, required: true, index: true },
    partnerId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    partnerName: { type: String, required: true },
    partnerCode: { type: String, required: true },
    device: {
      modelId: { type: Schema.Types.ObjectId, ref: 'SmartphoneModel', required: true },
      modelName: { type: String, required: true },
      brandName: { type: String, default: '' },
      bookedVariantId: { type: Schema.Types.ObjectId, ref: 'StorageVariant' },
      bookedStorage: { type: String, default: '' },
      checkedVariantId: { type: Schema.Types.ObjectId, ref: 'StorageVariant' },
      checkedStorage: { type: String, default: '' },
    },
    customerCondition: { type: Schema.Types.Mixed },
    checkedCondition: { type: Schema.Types.Mixed },
    quotedAmount: { type: Number, required: true },
    requotedAmount: { type: Number, required: true },
    checkedAmount: { type: Number, required: true },
    finalAmount: { type: Number, required: true },
    difference: { type: Number, required: true, index: true },
    bestAmount: { type: Number, default: 0 },
    worstAmount: { type: Number, default: 0 },
    changes: { type: [LineSchema], default: [] },
    checkedBreakdown: [
      {
        _id: false,
        component: { type: String },
        description: { type: String },
        adjustment: { type: Number },
      },
    ],
    outcome: { type: String, enum: ['AGREED', 'DECLINED', 'NOT_BUYABLE'], required: true, index: true },
    notBuyableReason: { type: String },
    imei: { type: String },
    photoUrls: [{ type: String }],
    notes: { type: String },
  },
  { timestamps: true }
);

DoorstepCheckSchema.index({ createdAt: -1 });

export const DoorstepCheckModel = mongoose.model<IDoorstepCheckDocument>('DoorstepCheck', DoorstepCheckSchema);
