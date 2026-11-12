/**
 * Points stored photo links at the Cloudflare R2 bucket (public domain, e.g. https://images.genietn.in).
 *
 *   npx tsx scripts/switch-image-urls-to-r2.ts            # dry run
 *   npx tsx scripts/switch-image-urls-to-r2.ts --apply    # writes (backup first, in backups/)
 *
 *  - "/uploads/<path>"           -> "<public>/uploads/<path>"   only if that object exists in the bucket
 *  - base64 "data:image/..."     -> uploaded to the bucket, then "<public>/uploads/<folder>/<name>-<hash>.<ext>"
 *  - old ".../revoo/uploads/..." -> "<public>/uploads/..."       only if that object exists in the bucket
 *  - anything else (other websites, missing files) is left unchanged and listed.
 *
 * Re-running is safe (already-switched links are skipped). Restore with the backup file if needed.
 * Env: R2_ACCOUNT_ID (or CLOUDFLARE_ACCOUNT_ID), R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, MONGO_URI,
 *      R2_TARGET_BUCKET (default genie), R2_PUBLIC_DOMAIN (default https://images.genietn.in).
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { S3Client, ListObjectsV2Command, PutObjectCommand } from '@aws-sdk/client-s3';

const APPLY = process.argv.includes('--apply');
const BUCKET = process.env.R2_TARGET_BUCKET || 'genie';
const PUBLIC = (process.env.R2_PUBLIC_DOMAIN || 'https://images.genietn.in').replace(/\/+$/, '');
const accountId = process.env.R2_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID;
if (!accountId || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
  console.error('Missing R2 credentials.');
  process.exit(1);
}
const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID!, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY! },
});

const EXT_FOR_MIME: Record<string, string> = {
  'image/webp': '.webp',
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/gif': '.gif',
  'image/avif': '.avif',
};
const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'image';

// Collections and fields that hold photos shown in the website, admin and app
const SPECS: Array<{ collection: string; field: string; array?: boolean; folder: string; nameFrom: string[] }> = [
  { collection: 'smartphonemodels', field: 'imageUrl', folder: 'devices', nameFrom: ['slug', 'name'] },
  { collection: 'brands', field: 'logoUrl', folder: 'brands', nameFrom: ['slug', 'name'] },
  { collection: 'banners', field: 'imageUrl', folder: 'banners', nameFrom: ['title'] },
  { collection: 'refurbishedproducts', field: 'imageUrl', folder: 'products', nameFrom: ['slug', 'name'] },
  { collection: 'refurbishedproducts', field: 'galleryImages', array: true, folder: 'products', nameFrom: ['slug', 'name'] },
  { collection: 'categories', field: 'imageUrl', folder: 'categories', nameFrom: ['slug', 'name'] },
  { collection: 'deviceimages', field: 'imageUrl', folder: 'requests', nameFrom: [] },
  { collection: 'deviceimages', field: 'thumbnailUrl', folder: 'requests', nameFrom: [] },
  { collection: 'payments', field: 'paymentProofUrl', folder: 'payments', nameFrom: [] },
];

async function bucketKeys(): Promise<Set<string>> {
  const keys = new Set<string>();
  let token: string | undefined;
  do {
    const page = await s3.send(new ListObjectsV2Command({ Bucket: BUCKET, ContinuationToken: token }));
    (page.Contents || []).forEach((o) => o.Key && keys.add(o.Key));
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);
  return keys;
}

async function main() {
  const keys = await bucketKeys();
  console.log(`Bucket ${BUCKET}: ${keys.size} objects; public address ${PUBLIC}`);

  await mongoose.connect(process.env.MONGO_URI as string);
  const db = mongoose.connection.db!;
  const existing = new Set((await db.listCollections().toArray()).map((c) => c.name));

  const backup: Array<{ collection: string; _id: string; field: string; before: unknown; after: unknown }> = [];
  const ops = new Map<string, Array<{ updateOne: { filter: any; update: any } }>>();
  const stats = { switched: 0, uploaded: 0, already: 0, missing: [] as string[], external: 0 };

  const mapValue = async (value: string, folder: string, nameHint: string, where: string): Promise<string> => {
    if (value.startsWith(`${PUBLIC}/`)) {
      stats.already++;
      return value;
    }
    const data = /^data:(image\/[a-z0-9.+-]+);base64,(.+)$/is.exec(value);
    if (data) {
      const mime = data[1].toLowerCase();
      const buffer = Buffer.from(data[2], 'base64');
      const hash = crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 10);
      const key = `uploads/${folder}/${slugify(nameHint)}-${hash}${EXT_FOR_MIME[mime] || '.jpg'}`;
      if (!keys.has(key)) {
        if (APPLY) {
          await s3.send(
            new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: buffer, ContentType: mime, CacheControl: 'public, max-age=604800' })
          );
          keys.add(key);
        }
        stats.uploaded++;
      }
      stats.switched++;
      return `${PUBLIC}/${key}`;
    }
    const rel = value.startsWith('/uploads/') ? value.slice(1).split('?')[0] : null;
    const legacy = /r2\.(?:cloudflarestorage\.com|dev)\/(?:[^/]+\/)?revoo\/(uploads\/[^?]+)/.exec(value)?.[1] || null;
    const key = rel || legacy;
    if (key) {
      if (keys.has(key)) {
        stats.switched++;
        return `${PUBLIC}/${key}`;
      }
      stats.missing.push(`${where}: ${value}`);
      return value;
    }
    stats.external++;
    return value;
  };

  for (const spec of SPECS) {
    if (!existing.has(spec.collection)) continue;
    const projection: Record<string, 1> = { [spec.field]: 1 };
    spec.nameFrom.forEach((f) => (projection[f] = 1));
    const docs = await db.collection(spec.collection).find({ [spec.field]: { $exists: true } }, { projection }).toArray();
    for (const doc of docs) {
      const nameHint = String(spec.nameFrom.map((f) => doc[f]).find(Boolean) || doc._id);
      const where = `${spec.collection}.${spec.field} ${doc._id}`;
      const before = doc[spec.field];
      let after: unknown = before;
      if (spec.array && Array.isArray(before)) {
        after = await Promise.all(
          before.map((v: unknown) => (typeof v === 'string' && v ? mapValue(v, spec.folder, nameHint, where) : v))
        );
        if (JSON.stringify(after) === JSON.stringify(before)) continue;
      } else if (typeof before === 'string' && before) {
        after = await mapValue(before, spec.folder, nameHint, where);
        if (after === before) continue;
      } else {
        continue;
      }
      backup.push({ collection: spec.collection, _id: String(doc._id), field: spec.field, before, after });
      const list = ops.get(spec.collection) || [];
      list.push({ updateOne: { filter: { _id: doc._id, [spec.field]: before }, update: { $set: { [spec.field]: after } } } });
      ops.set(spec.collection, list);
    }
  }

  console.log(`Links to switch: ${stats.switched} (base64 photos to upload: ${stats.uploaded}); already switched: ${stats.already}`);
  console.log(`Left unchanged: ${stats.missing.length} missing from the bucket, ${stats.external} on other websites`);
  stats.missing.slice(0, 25).forEach((m) => console.log('  missing ' + m));
  backup.slice(0, 4).forEach((b) => console.log(`  e.g. ${b.collection}.${b.field}: ${String(b.before).slice(0, 60)} -> ${String(b.after).slice(0, 90)}`));

  const dir = path.resolve(__dirname, '..', 'backups');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `image-urls-before-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(file, JSON.stringify({ applied: APPLY, public: PUBLIC, changes: backup }, null, 1));
  console.log(`Backup of every change: ${file}`);

  if (APPLY) {
    for (const [collection, list] of ops) {
      const res = await db.collection(collection).bulkWrite(list as any, { ordered: false });
      console.log(`  ${collection}: ${res.modifiedCount} updated`);
    }
  } else {
    console.log('Dry run only. Re-run with --apply to write.');
  }
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
