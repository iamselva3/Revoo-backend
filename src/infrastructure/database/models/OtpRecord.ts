import mongoose, { Schema, Document } from 'mongoose';

export interface IOtpDocument extends Document {
  destination: string; // phone or email
  channel: 'WHATSAPP' | 'EMAIL';
  otpHash: string;
  attempts: number;
  maxAttempts: number;
  expiresAt: Date;
  resendAvailableAt: Date;
  isUsed: boolean;
  createdAt: Date;
}

const OtpRecordSchema = new Schema<IOtpDocument>(
  {
    destination: { type: String, required: true, index: true },
    channel: { type: String, enum: ['WHATSAPP', 'EMAIL'], required: true },
    otpHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 3 },
    expiresAt: { type: Date, required: true, index: { expires: '10m' } },
    resendAvailableAt: { type: Date, required: true },
    isUsed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const OtpRecordModel = mongoose.model<IOtpDocument>('OtpRecord', OtpRecordSchema);

