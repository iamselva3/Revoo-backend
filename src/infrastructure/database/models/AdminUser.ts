import mongoose, { Schema, Document } from 'mongoose';
import { AdminRole } from '../../../shared/types.js';

export interface IAdminUserDocument extends Document {
  email: string;
  fullName: string;
  passwordHash: string;
  role: AdminRole;
  isActive: boolean;
  lastLogin?: Date;
  refreshTokenHash?: string;
  /** One entry per signed-in device/browser (see AdminSessionService). */
  sessions?: Array<{
    sid: string;
    hash: string;
    prevHash?: string;
    rotatedAt?: Date;
    createdAt: Date;
    lastUsedAt: Date;
    userAgent?: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const AdminUserSchema = new Schema<IAdminUserDocument>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    fullName: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: Object.values(AdminRole), default: AdminRole.ADMIN },
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date },
    refreshTokenHash: { type: String, select: false },
    sessions: {
      type: [
        {
          _id: false,
          sid: { type: String, required: true },
          hash: { type: String, required: true },
          prevHash: { type: String },
          rotatedAt: { type: Date },
          createdAt: { type: Date, default: Date.now },
          lastUsedAt: { type: Date, default: Date.now },
          userAgent: { type: String },
        },
      ],
      select: false,
      default: undefined,
    },
  },
  { timestamps: true }
);

export const AdminUserModel = mongoose.model<IAdminUserDocument>('AdminUser', AdminUserSchema);

