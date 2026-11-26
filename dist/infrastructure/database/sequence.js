"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findMaxSequenceSuffix = findMaxSequenceSuffix;
exports.allocateNextSequence = allocateNextSequence;
exports.createWithUniqueSequence = createWithUniqueSequence;
const Counter_js_1 = require("./models/Counter.js");
/**
 * Finds the highest numeric suffix currently stored in `field` among documents
 * matching `pattern`, returning at least `defaultFloor`.
 */
async function findMaxSequenceSuffix(model, field, pattern, defaultFloor) {
    const docs = await model
        .find({ [field]: pattern })
        .select(field)
        .lean();
    let max = defaultFloor;
    for (const doc of docs) {
        const val = String(doc[field] || '');
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
async function allocateNextSequence(counterKey, getFloor, forceResync = false) {
    if (!forceResync) {
        const existing = await Counter_js_1.CounterModel.findOneAndUpdate({ _id: counterKey }, { $inc: { seq: 1 } }, { new: true });
        if (existing) {
            return existing.seq;
        }
    }
    const floor = await getFloor();
    try {
        await Counter_js_1.CounterModel.updateOne({ _id: counterKey }, { $max: { seq: floor } }, { upsert: true });
    }
    catch (err) {
        // Another concurrent caller may have initialized the counter first
        if (err?.code !== 11000)
            throw err;
        await Counter_js_1.CounterModel.updateOne({ _id: counterKey }, { $max: { seq: floor } });
    }
    const next = await Counter_js_1.CounterModel.findOneAndUpdate({ _id: counterKey }, { $inc: { seq: 1 } }, { new: true, upsert: true });
    return next.seq;
}
/**
 * Creates a document with an atomically allocated unique sequence string in `field`,
 * automatically resyncing and retrying if an external insert ever collides on `field`.
 */
async function createWithUniqueSequence(options) {
    const { model, field, counterKey, formatNumber, extractPattern, defaultFloor, buildDoc, maxRetries = 5 } = options;
    const getFloor = () => findMaxSequenceSuffix(model, field, extractPattern, defaultFloor);
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        const seq = await allocateNextSequence(counterKey, getFloor, attempt > 0);
        const sequenceNumber = formatNumber(seq);
        try {
            const doc = await model.create(buildDoc(sequenceNumber));
            return { doc: doc, sequenceNumber };
        }
        catch (err) {
            const isFieldDuplicate = err?.code === 11000 &&
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
//# sourceMappingURL=sequence.js.map