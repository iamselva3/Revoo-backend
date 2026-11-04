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
  },
  { timestamps: true }
);

export const AdminUserModel = mongoose.model<IAdminUserDocument>('AdminUser', AdminUserSchema);

