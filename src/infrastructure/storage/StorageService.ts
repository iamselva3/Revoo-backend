import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import multer from 'multer';
import { Request } from 'express';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { AppError } from '../../shared/types.js';
import { config } from '../../config/index.js';

// Ensure upload directory exists
const uploadBasePath = path.resolve(process.cwd(), config.storage.uploadDir);
if (!fs.existsSync(uploadBasePath)) {
  fs.mkdirSync(uploadBasePath, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadBasePath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = crypto.randomBytes(16).toString('hex');
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];

export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
  fileFilter: (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError('Invalid file type. Only JPEG, PNG, and WebP images are allowed.', 400));
    }
  },
});

export class StorageService {
  private static s3Client: S3Client | null = null;

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

  public static async uploadToR2(filename: string, filePath: string, mimeType: string): Promise<string> {
    try {
      const fileBuffer = fs.readFileSync(filePath);
      const s3 = this.getS3Client();
      const r2Key = `revoo/uploads/${filename}`;

      await s3.send(
        new PutObjectCommand({
          Bucket: config.storage.r2.bucketName,
          Key: r2Key,
          Body: fileBuffer,
          ContentType: mimeType,
        })
      );

      console.log(`[StorageService] Uploaded ${filename} successfully to Cloudflare R2 bucket ${config.storage.r2.bucketName}`);

      if (config.storage.r2.publicDomain) {
        return `${config.storage.r2.publicDomain}/${r2Key}`;
      }
      return `https://${config.storage.r2.bucketName}.${config.storage.r2.accountId}.r2.cloudflarestorage.com/${r2Key}`;
    } catch (err: any) {
      console.error('[StorageService] Failed to upload to Cloudflare R2, falling back to local file:', err?.message || err);
      return `/uploads/${filename}`;
    }
  }

  public static getFileUrl(filename: string): string {
    return `/uploads/${filename}`;
  }

  public static async deleteFile(filename: string): Promise<void> {
    const filePath = path.join(uploadBasePath, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    if (config.storage.driver === 'r2') {
      try {
        const s3 = this.getS3Client();
        await s3.send(
          new DeleteObjectCommand({
            Bucket: config.storage.r2.bucketName,
            Key: `revoo/uploads/${filename}`,
          })
        );
      } catch (e) {
        // Silently continue
      }
    }
  }
}
