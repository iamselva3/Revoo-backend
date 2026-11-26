import { Model } from 'mongoose';
import { CounterModel } from './models/Counter.js';

/**
 * Finds the highest numeric suffix currently stored in `field` among documents
 * matching `pattern`, returning at least `defaultFloor`.
 */
export async function findMaxSequenceSuffix(
  model: Model<any>,
  field: string,
  pattern: RegExp,
  defaultFloor: number
): Promise<number> {
  const docs = await model
    .find({ [field]: pattern })
    .select(field)
    .lean();

  let max = defaultFloor;
  for (const doc of docs) {
    const val = String((doc as any)[field] || '');
    const match = pattern.exec(val);
    if (match?.[1]) {
      const n = parseInt(match[1], 10);
      if (Number.isFinite(n) && n > max) {
        max = n;
      }
    }
  }
  return max;
}

/**
 * Allocates the next strictly increasing sequence number for `counterKey`.
 * On first use (or when `forceResync` is set), raises the counter to the current
 * collection maximum so deleted records or numbering gaps can never cause collisions.
 */
export async function allocateNextSequence(
  counterKey: string,
  getFloor: () => Promise<number>,
  forceResync = false
): Promise<number> {
  if (!forceResync) {
    const existing = await CounterModel.findOneAndUpdate(
      { _id: counterKey },
      { $inc: { seq: 1 } },
      { new: true }
    );
    if (existing) {
      return existing.seq;
    }
  }

  const floor = await getFloor();
  try {
    await CounterModel.updateOne(
      { _id: counterKey },
      { $max: { seq: floor } },
      { upsert: true }
    );
  } catch (err: any) {
    // Another concurrent caller may have initialized the counter first
    if (err?.code !== 11000) throw err;
    await CounterModel.updateOne({ _id: counterKey }, { $max: { seq: floor } });
  }

  const next = await CounterModel.findOneAndUpdate(
    { _id: counterKey },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return next!.seq;
}

/**
 * Creates a document with an atomically allocated unique sequence string in `field`,
 * automatically resyncing and retrying if an external insert ever collides on `field`.
 */
export async function createWithUniqueSequence<T>(options: {
  model: Model<any>;
  field: string;
  counterKey: string;
  formatNumber: (seq: number) => string;
  extractPattern: RegExp;
  defaultFloor: number;
  buildDoc: (generatedNumber: string) => Record<string, any>;
  maxRetries?: number;
}): Promise<{ doc: T; sequenceNumber: string }> {
  const { model, field, counterKey, formatNumber, extractPattern, defaultFloor, buildDoc, maxRetries = 5 } = options;
  const getFloor = () => findMaxSequenceSuffix(model, field, extractPattern, defaultFloor);

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const seq = await allocateNextSequence(counterKey, getFloor, attempt > 0);
    const sequenceNumber = formatNumber(seq);
    try {
      const doc = await model.create(buildDoc(sequenceNumber));
      return { doc: doc as T, sequenceNumber };
    } catch (err: any) {
      const isFieldDuplicate =
        err?.code === 11000 &&
        (Object.prototype.hasOwnProperty.call(err?.keyValue || {}, field) ||
          String(err?.message || '').includes(field));
      if (isFieldDuplicate && attempt < maxRetries - 1) {
        continue;
      }
      throw err;
    }
  }

  throw new Error(`Unable to allocate unique ${field} after ${maxRetries} attempts.`);
}
