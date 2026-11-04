import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IInspectionDocument extends Document {
  requestId: Types.ObjectId;
  inspectorId: Types.ObjectId;
  inspectorName: string;
  actualCondition: {
    displayCondition: string;
    bodyCondition: string;
    batteryHealth: string;
    functionalFaults: {
      frontCameraFaulty: boolean;
      backCameraFaulty: boolean;
      faceIdOrFingerprintFaulty: boolean;
      speakerOrMicFaulty: boolean;
      chargingPortFaulty: boolean;
      wirelessOrBluetoothFaulty: boolean;
    };
    hasOriginalBox: boolean;
    hasOriginalCharger: boolean;
    screenFunctional: boolean;
    touchFunctional: boolean;
    camerasFunctional: boolean;
    biometricsFunctional: boolean;
  };
  discrepancies: string[];
  evidencePhotoUrls: string[];
  suggestedOfferAmount: number;
  internalInspectionNotes?: string;
  customerVisibleNotes?: string;
  completedAt: Date;
  createdAt: Date;
}

const InspectionSchema = new Schema<IInspectionDocument>(
  {
    requestId: { type: Schema.Types.ObjectId, ref: 'BuybackRequest', required: true, index: true },
    inspectorId: { type: Schema.Types.ObjectId, ref: 'AdminUser', required: true },
    inspectorName: { type: String, required: true },
    actualCondition: {
      displayCondition: { type: String, required: true },
      bodyCondition: { type: String, required: true },
      batteryHealth: { type: String, required: true },
      functionalFaults: {
        frontCameraFaulty: { type: Boolean, default: false },
        backCameraFaulty: { type: Boolean, default: false },
        faceIdOrFingerprintFaulty: { type: Boolean, default: false },
        speakerOrMicFaulty: { type: Boolean, default: false },
        chargingPortFaulty: { type: Boolean, default: false },
        wirelessOrBluetoothFaulty: { type: Boolean, default: false },
      },
      hasOriginalBox: { type: Boolean, default: false },
      hasOriginalCharger: { type: Boolean, default: false },
      screenFunctional: { type: Boolean, default: true },
      touchFunctional: { type: Boolean, default: true },
      camerasFunctional: { type: Boolean, default: true },
      biometricsFunctional: { type: Boolean, default: true },
    },
    discrepancies: [{ type: String }],
    evidencePhotoUrls: [{ type: String }],
    suggestedOfferAmount: { type: Number, required: true },
    internalInspectionNotes: { type: String },
    customerVisibleNotes: { type: String },
    completedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const InspectionModel = mongoose.model<IInspectionDocument>('Inspection', InspectionSchema);

