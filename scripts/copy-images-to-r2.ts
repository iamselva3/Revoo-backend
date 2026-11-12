/**
 * Copies every project image into a Cloudflare R2 bucket (default: "genie").
 *
 *   npx tsx scripts/copy-images-to-r2.ts            # dry run: lists what would be copied
 *   npx tsx scripts/copy-images-to-r2.ts --apply    # uploads
 *
 * Sources
 *   1. backend/uploads/**                      -> uploads/<same path>      (/uploads/devices/x.webp -> uploads/devices/x.webp)
 *   2. legacy bucket objects under revoo/       -> uploads/<rest>           (old backend default bucket)
 *   3. database images that are only stored as base64 "data:" URLs, and /uploads paths whose file is
 *      not in the repo (fetched from the live API)                         -> uploads/<folder>/<name>-<hash>.<ext>
 *
 * The database is only READ. A manifest (backups/r2-copy-manifest-*.json) records which database
 * fields map to which bucket key, for switching the stored URLs later.
 *
 * Env: R2_ACCOUNT_ID (or CLOUDFLARE_ACCOUNT_ID), R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, MONGO_URI.
 * Optional: R2_TARGET_BUCKET (default genie), R2_LEGACY_BUCKET (default imagix-photography-images),
 *           LIVE_API_ORIGIN (default https://revoo-backend-ivqq.onrender.com).
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import mongoose from 'mongoose';
import {
  S3Client,
  ListObjectsV2Command,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';

const APPLY = process.argv.includes('--apply');
const TARGET = process.env.R2_TARGET_BUCKET || 'genie';
const LEGACY = process.env.R2_LEGACY_BUCKET || 'imagix-photography-images';
const LIVE_ORIGIN = process.env.LIVE_API_ORIGIN || 'https://revoo-backend-ivqq.onrender.com';
const accountId = process.env.R2_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
if (!accountId || !accessKeyId || !secretAccessKey) {
  console.error('Missing R2 credentials (R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY).');
  process.exit(1);
}

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId, secretAccessKey },
});

const UPLOADS_DIR = path.resolve(__dirname, '..', 'uploads');
const CONTENT_TYPES: Record<string, string> = {
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
};
const EXT_FOR_MIME: Record<string, string> = {
  'image/webp': '.webp',
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/gif': '.gif',
  'image/avif': '.avif',
  'image/svg+xml': '.svg',
};

interface Job {
  key: string;
  source: string;
  contentType: string;
  load: () => Promise<Buffer>;
}

const jobs = new Map<string, Job>();
const dbMappings: Array<{ collection: string; id: string; field: string; from: string; key: string }> = [];
const problems: string[] = [];

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'image';

const addJob = (job: Job) => {
  if (!jobs.has(job.key)) jobs.set(job.key, job);
};

const walk = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    return e.isDirectory() ? walk(full) : [full];
  });

async function listKeys(bucket: string, prefix = ''): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  let token: string | undefined;
  do {
    const page = await s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, ContinuationToken: token }));
    for (const o of page.Contents || []) if (o.Key) out.set(o.Key, o.Size || 0);
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);
  return out;
}

async function readLegacyObject(key: string): Promise<Buffer> {
  const res = await s3.send(new GetObjectCommand({ Bucket: LEGACY, Key: key }));
  return Buffer.from(await res.Body!.transformToByteArray());
}

async function main() {
  // 1. Repo files
  if (fs.existsSync(UPLOADS_DIR)) {
    for (const file of walk(UPLOADS_DIR)) {
      const rel = path.relative(UPLOADS_DIR, file).split(path.sep).join('/');
      const ext = path.extname(file).toLowerCase();
      if (!CONTENT_TYPES[ext]) continue;
      addJob({ key: `uploads/${rel}`, source: `repo:uploads/${rel}`, contentType: CONTENT_TYPES[ext], load: async () => fs.readFileSync(file) });
    }
  }
  const repoCount = jobs.size;

  // 2. Legacy bucket objects of this project
  let legacyCount = 0;
  try {
    const legacy = await listKeys(LEGACY, 'revoo/');
    for (const key of legacy.keys()) {
      const ext = path.extname(key).toLowerCase();
      if (!CONTENT_TYPES[ext]) continue;
      const target = key.replace(/^revoo\//, '');
      if (jobs.has(target)) continue; // the repo copy wins
      addJob({ key: target, source: `${LEGACY}:${key}`, contentType: CONTENT_TYPES[ext], load: () => readLegacyObject(key) });
      legacyCount++;
    }
  } catch (err: any) {
    problems.push(`Could not list legacy bucket ${LEGACY}: ${err?.name || err}`);
  }

  // 3. Database images (read only)
  await mongoose.connect(process.env.MONGO_URI as string);
  const db = mongoose.connection.db!;
  const FIELDS: Array<{ collection: string; fields: string[]; folder: string; nameFrom: string[] }> = [
    { collection: 'smartphonemodels', fields: ['imageUrl'], folder: 'devices', nameFrom: ['slug', 'name'] },
    { collection: 'brands', fields: ['logoUrl'], folder: 'brands', nameFrom: ['slug', 'name'] },
    { collection: 'banners', fields: ['imageUrl'], folder: 'banners', nameFrom: ['title'] },
    { collection: 'refurbishedproducts', fields: ['imageUrl'], folder: 'products', nameFrom: ['slug', 'name'] },
    { collection: 'deviceimages', fields: ['imageUrl', 'thumbnailUrl'], folder: 'requests', nameFrom: [] },
    { collection: 'payments', fields: ['paymentProofUrl'], folder: 'payments', nameFrom: [] },
  ];
  const existing = new Set((await db.listCollections().toArray()).map((c) => c.name));
  let dataUrlCount = 0;
  let fetchedCount = 0;

  for (const spec of FIELDS) {
    if (!existing.has(spec.collection)) continue;
    const projection: Record<string, 1> = {};
    [...spec.fields, ...spec.nameFrom].forEach((f) => (projection[f] = 1));
    const docs = await db.collection(spec.collection).find({}, { projection }).toArray();
    for (const doc of docs) {
      for (const field of spec.fields) {
        const value = doc[field];
        if (typeof value !== 'string' || !value) continue;
        const id = String(doc._id);
        const base = slugify(spec.nameFrom.map((f) => doc[f]).find(Boolean) || id);

        const dataMatch = /^data:(image\/[a-z0-9.+-]+);base64,(.+)$/is.exec(value);
        if (dataMatch) {
          const mime = dataMatch[1].toLowerCase();
          const buffer = Buffer.from(dataMatch[2], 'base64');
          const hash = crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 10);
          const key = `uploads/${spec.folder}/${base}-${hash}${EXT_FOR_MIME[mime] || '.jpg'}`;
          addJob({ key, source: `db:${spec.collection}.${field}(${id}) data-url`, contentType: mime, load: async () => buffer });
          dbMappings.push({ collection: spec.collection, id, field, from: 'data-url', key });
          dataUrlCount++;
          continue;
        }

        const rel = value.startsWith('/uploads/') ? value.slice(1) : null;
        if (rel) {
          const key = rel.split('?')[0];
          dbMappings.push({ collection: spec.collection, id, field, from: value, key });
          if (!jobs.has(key)) {
            // Uploaded at runtime on the server (not in the repo): fetch it from the live API
            const url = `${LIVE_ORIGIN}/${key}`;
            const ext = path.extname(key).toLowerCase();
            addJob({
              key,
              source: `live:${url}`,
              contentType: CONTENT_TYPES[ext] || 'application/octet-stream',
              load: async () => {
                const res = await fetch(url);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return Buffer.from(await res.arrayBuffer());
              },
            });
            fetchedCount++;
          }
          continue;
        }

        const legacyUrl = /r2\.(cloudflarestorage\.com|dev)\/(?:[^/]+\/)?revoo\/(uploads\/.+)$/.exec(value);
        if (legacyUrl) {
          dbMappings.push({ collection: spec.collection, id, field, from: value, key: legacyUrl[2] });
        }
      }
    }
  }
  await mongoose.disconnect();

  // Plan
  const already = await listKeys(TARGET);
  const todo = [...jobs.values()].filter((j) => !already.has(j.key));
  console.log(`Target bucket: ${TARGET} (${already.size} objects already there)`);
  console.log(`Sources: repo ${repoCount}, legacy bucket ${legacyCount}, database data-URLs ${dataUrlCount}, live-only files ${fetchedCount}`);
  console.log(`To upload: ${todo.length} (skipping ${jobs.size - todo.length} already present)`);
  console.log(`Database fields mapped to bucket keys: ${dbMappings.length}`);

  let uploaded = 0;
  let bytes = 0;
  if (APPLY) {
    const queue = [...todo];
    const worker = async () => {
      for (let job = queue.shift(); job; job = queue.shift()) {
        try {
          const body = await job.load();
          await s3.send(
            new PutObjectCommand({
              Bucket: TARGET,
              Key: job.key,
              Body: body,
              ContentType: job.contentType,
              CacheControl: 'public, max-age=604800',
            })
          );
          uploaded++;
          bytes += body.length;
          if (uploaded % 200 === 0) console.log(`  uploaded ${uploaded}/${todo.length}`);
        } catch (err: any) {
          problems.push(`${job.key} <- ${job.source}: ${err?.message || err}`);
        }
      }
    };
    await Promise.all(Array.from({ length: 12 }, worker));
    console.log(`Uploaded ${uploaded} files (${(bytes / 1024 / 1024).toFixed(1)} MB)`);
  } else {
    todo.slice(0, 8).forEach((j) => console.log(`  would upload ${j.key}  <- ${j.source}`));
    console.log('Dry run only. Re-run with --apply to upload.');
  }

  const backupDir = path.resolve(__dirname, '..', 'backups');
  fs.mkdirSync(backupDir, { recursive: true });
  const manifest = path.join(backupDir, `r2-copy-manifest-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(
    manifest,
    JSON.stringify({ target: TARGET, applied: APPLY, uploaded, problems, dbMappings, keys: [...jobs.keys()] }, null, 1)
  );
  console.log(`Manifest: ${manifest}`);
  if (problems.length) {
    console.log(`Problems (${problems.length}):`);
    problems.slice(0, 20).forEach((p) => console.log('  ' + p));
  }
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
