import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { AppError } from '../../shared/types.js';
import { config } from '../../config/index.js';

/**
 * Image storage.
 *
 * With R2 configured (STORAGE_DRIVER=r2 plus R2 keys) every image goes to the Cloudflare R2 bucket
 * and is stored as an absolute public URL, e.g. https://images.genietn.in/uploads/devices/x-1a2b.webp.
 * Without R2 keys (local development) images are written to the local uploads folder and served
 * from /uploads/... by the API itself.
 */

const uploadBasePath = path.resolve(process.cwd(), config.storage.uploadDir);

export const IMAGE_FOLDERS = [
  'devices',
  'brands',
  'banners',
  'popups',
  'products',
  'categories',
  'requests',
  'payments',
  'misc',
] as const;
export type ImageFolder = (typeof IMAGE_FOLDERS)[number];

const MIME_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/avif': '.avif',
  'image/gif': '.gif',
};
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/** Multipart image uploads, kept in memory (nothing is written to the server's disk). */
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES },
  fileFilter: (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (MIME_EXT[file.mimetype]) {
      cb(null, true);
    } else {
      cb(new AppError('Invalid file type. Only JPEG, PNG, WebP, AVIF and GIF images are allowed.', 400));
    }
  },
});

const slugify = (value?: string) =>
  (value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

export class StorageService {
  private static s3Client: S3Client | null = null;

  /** True when uploads go to Cloudflare R2. */
  static isR2Enabled(): boolean {
    const r2 = config.storage.r2;
    return (
      config.storage.driver === 'r2' &&
      Boolean(r2.accountId && r2.accessKeyId && r2.secretAccessKey && r2.bucketName && r2.publicDomain)
    );
  }

  private static getS3Client(): S3Client {
    if (!this.s3Client) {
      this.s3Client = new S3Client({
        region: 'auto',
        endpoint: `https://${config.storage.r2.accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: config.storage.r2.accessKeyId,
          secretAccessKey: config.storage.r2.secretAccessKey,
        },
      });
    }
    return this.s3Client;
  }

  /**
   * Stores an image and returns its public URL. The file name includes a hash of the content, so
   * a changed photo always gets a new URL (no stale caches) and re-uploading the same photo is free.
   */
  static async saveImage(
    buffer: Buffer,
    mimeType: string,
    folder: ImageFolder,
    nameHint?: string
  ): Promise<{ url: string; key: string }> {
    const ext = MIME_EXT[mimeType.toLowerCase()];
    if (!ext) throw new AppError('Unsupported image type.', 400);
    if (!buffer.length) throw new AppError('The image is empty.', 400);
    if (buffer.length > MAX_IMAGE_BYTES) throw new AppError('Image is too large (max 10 MB).', 413);

    const hash = crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 12);
    const fileName = `${slugify(nameHint) || 'image'}-${hash}${ext}`;
    const key = `uploads/${folder}/${fileName}`;

    if (this.isR2Enabled()) {
      try {
        await this.getS3Client().send(
          new PutObjectCommand({
            Bucket: config.storage.r2.bucketName,
            Key: key,
            Body: buffer,
            ContentType: mimeType === 'image/jpg' ? 'image/jpeg' : mimeType,
            CacheControl: 'public, max-age=31536000, immutable',
          })
        );
      } catch (err: any) {
        console.error('[StorageService] R2 upload failed:', err?.name || err?.message || err);
        throw new AppError('Could not store the image right now. Please try again.', 502);
      }
      return { url: `${config.storage.r2.publicDomain}/${key}`, key };
    }

    const dir = path.join(uploadBasePath, folder);
    await fs.promises.mkdir(dir, { recursive: true });
    await fs.promises.writeFile(path.join(dir, fileName), buffer);
    return { url: `/${key}`, key };
  }

  /** Decodes a base64 "data:image/...;base64,..." URL. Returns null for anything else. */
  static parseDataUrl(value: unknown): { mimeType: string; buffer: Buffer } | null {
    if (typeof value !== 'string') return null;
    const match = /^data:(image\/[a-z0-9.+-]+);base64,([a-z0-9+/=\s]+)$/i.exec(value.trim());
    if (!match) return null;
    return { mimeType: match[1].toLowerCase(), buffer: Buffer.from(match[2], 'base64') };
  }

  /** If the value is an inline base64 image, stores it and returns its URL; otherwise returns it as is. */
  static async persistImageValue<T>(value: T, folder: ImageFolder, nameHint?: string): Promise<T | string> {
    const parsed = this.parseDataUrl(value);
    if (!parsed) return value;
    const { url } = await this.saveImage(parsed.buffer, parsed.mimeType, folder, nameHint);
    return url;
  }
}

/**
 * Route middleware: converts inline base64 images in the request body (e.g. imageUrl / logoUrl
 * from older admin pages) into stored files, so the database only ever keeps URLs.
 */
export const persistBodyImages =
  (folder: ImageFolder, fields: string[] = ['imageUrl', 'logoUrl']) =>
  async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const body = req.body;
      if (body && typeof body === 'object') {
        const nameHint = body.slug || body.name || body.title || undefined;
        for (const field of fields) {
          if (!(field in body)) continue;
          body[field] = Array.isArray(body[field])
            ? await Promise.all(body[field].map((v: unknown) => StorageService.persistImageValue(v, folder, nameHint)))
            : await StorageService.persistImageValue(body[field], folder, nameHint);
        }
      }
      next();
    } catch (err) {
      next(err);
    }
  };
