import mongoose, { Schema, Document } from 'mongoose';
import { UserStatus } from '../../../shared/types.js';

export interface IUserDocument extends Document {
  phone?: string;
  email?: string;
  fullName?: string;
  isVerified: boolean;
  status: UserStatus;
  referralCode?: string;
  referralPoints: number;
  referredBy?: string;
  referredCount: number;
  address?: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    landmark?: string;
  };
  passwordHash?: string;
  authProvider?: string;
  googleId?: string;
  refreshTokenHash?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUserDocument>(
  {
    phone: { type: String, trim: true, index: true, sparse: true },
    email: { type: String, trim: true, lowercase: true, index: true, sparse: true },
    fullName: { type: String, trim: true },
    isVerified: { type: Boolean, default: false },
    status: { type: String, enum: Object.values(UserStatus), default: UserStatus.ACTIVE },
    referralCode: { type: String, unique: true, sparse: true, uppercase: true, trim: true },
    referralPoints: { type: Number, default: 500 },
    referredBy: { type: String, trim: true },
    referredCount: { type: Number, default: 0 },
    address: {
      street: { type: String },
      city: { type: String },
      state: { type: String },
      pincode: { type: String },
      landmark: { type: String },
    },
    passwordHash: { type: String, select: false },
    authProvider: { type: String, default: 'local' },
    googleId: { type: String, sparse: true, index: true },
    refreshTokenHash: { type: String, select: false },
  },
  { timestamps: true }
);

export const UserModel = mongoose.model<IUserDocument>('User', UserSchema);

