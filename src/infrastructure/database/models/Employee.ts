import mongoose, { Schema, Document } from 'mongoose';

export interface IEmployeeDocument extends Document {
  fullName: string;
  employeeCode: string;
  phone: string;
  email: string;
  state: string;
  district: string;
  assignedPincodes: string[];
  role: 'PICKUP_PARTNER' | 'FIELD_INSPECTOR' | 'LOGISTICS_LEAD';
  groupName: string;
  status: 'ACTIVE' | 'ON_DUTY' | 'LEAVE' | 'INACTIVE';
  vehicleType: 'BIKE' | 'EV_SCOOTER' | 'VAN';
  completedPickups: number;
  rating: number;
  createdAt: Date;
  updatedAt: Date;
}

const EmployeeSchema = new Schema<IEmployeeDocument>(
  {
    fullName: { type: String, required: true, trim: true },
    employeeCode: { type: String, required: true, unique: true, uppercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    state: { type: String, required: true, default: 'Tamil Nadu', trim: true },
    district: { type: String, required: true, trim: true, index: true },
    assignedPincodes: [{ type: String, trim: true, index: true }],
    role: {
      type: String,
      enum: ['PICKUP_PARTNER', 'FIELD_INSPECTOR', 'LOGISTICS_LEAD'],
      default: 'PICKUP_PARTNER',
    },
    groupName: { type: String, default: 'District Flying Squad', trim: true },
    status: {
      type: String,
      enum: ['ACTIVE', 'ON_DUTY', 'LEAVE', 'INACTIVE'],
      default: 'ACTIVE',
      index: true,
    },
    vehicleType: {
      type: String,
      enum: ['BIKE', 'EV_SCOOTER', 'VAN'],
      default: 'BIKE',
    },
    completedPickups: { type: Number, default: 0 },
    rating: { type: Number, default: 4.8 },
  },
  { timestamps: true }
);

EmployeeSchema.index({ district: 1, status: 1 });
EmployeeSchema.index({ assignedPincodes: 1 });

export const EmployeeModel = mongoose.model<IEmployeeDocument>('Employee', EmployeeSchema);
