import mongoose, { Schema, Document } from 'mongoose';

/** Atomic monotonically-increasing sequence counter keyed by resource & year (e.g. `buyback-request-2026`). */
export interface ICounterDocument extends Document<string> {
  _id: string;
  seq: number;
}

const CounterSchema = new Schema<ICounterDocument>(
  {
    _id: { type: String, required: true },
    seq: { type: Number, required: true, default: 0 },
  },
  { versionKey: false }
);

export const CounterModel = mongoose.model<ICounterDocument>('Counter', CounterSchema);
