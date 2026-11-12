import mongoose, { Schema, Document } from 'mongoose';

/** Records which version of a data seed has been applied, so heavy seeds run once. */
export interface ISeedMarkerDocument extends Document {
  key: string;
  version: string;
  appliedAt: Date;
  summary?: Record<string, any>;
}

const SeedMarkerSchema = new Schema<ISeedMarkerDocument>(
  {
    key: { type: String, required: true, unique: true },
    version: { type: String, required: true },
    appliedAt: { type: Date, default: Date.now },
    summary: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

export const SeedMarkerModel = mongoose.model<ISeedMarkerDocument>('SeedMarker', SeedMarkerSchema);
