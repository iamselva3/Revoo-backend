"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.persistBodyImages = exports.StorageService = exports.upload = exports.IMAGE_FOLDERS = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const multer_1 = __importDefault(require("multer"));
const client_s3_1 = require("@aws-sdk/client-s3");
const types_js_1 = require("../../shared/types.js");
const index_js_1 = require("../../config/index.js");
/**
 * Image storage.
 *
 * With R2 configured (STORAGE_DRIVER=r2 plus R2 keys) every image goes to the Cloudflare R2 bucket
 * and is stored as an absolute public URL, e.g. https://images.genietn.in/uploads/devices/x-1a2b.webp.
 * Without R2 keys (local development) images are written to the local uploads folder and served
 * from /uploads/... by the API itself.
 */
const uploadBasePath = path_1.default.resolve(process.cwd(), index_js_1.config.storage.uploadDir);
exports.IMAGE_FOLDERS = [
    'devices',
    'brands',
    'banners',
    'popups',
    'products',
    'categories',
    'requests',
    'payments',
    'misc',
];
const MIME_EXT = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/avif': '.avif',
    'image/gif': '.gif',
};
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
/** Multipart image uploads, kept in memory (nothing is written to the server's disk). */
exports.upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: MAX_IMAGE_BYTES },
    fileFilter: (req, file, cb) => {
        if (MIME_EXT[file.mimetype]) {
            cb(null, true);
        }
        else {
            cb(new types_js_1.AppError('Invalid file type. Only JPEG, PNG, WebP, AVIF and GIF images are allowed.', 400));
        }
    },
});
const slugify = (value) => (value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
class StorageService {
    static s3Client = null;
    /** True when uploads go to Cloudflare R2. */
    static isR2Enabled() {
        const r2 = index_js_1.config.storage.r2;
        return (index_js_1.config.storage.driver === 'r2' &&
            Boolean(r2.accountId && r2.accessKeyId && r2.secretAccessKey && r2.bucketName && r2.publicDomain));
    }
    static getS3Client() {
        if (!this.s3Client) {
            this.s3Client = new client_s3_1.S3Client({
                region: 'auto',
                endpoint: `https://${index_js_1.config.storage.r2.accountId}.r2.cloudflarestorage.com`,
                credentials: {
                    accessKeyId: index_js_1.config.storage.r2.accessKeyId,
                    secretAccessKey: index_js_1.config.storage.r2.secretAccessKey,
                },
            });
        }
        return this.s3Client;
    }
    /**
     * Stores an image and returns its public URL. The file name includes a hash of the content, so
     * a changed photo always gets a new URL (no stale caches) and re-uploading the same photo is free.
     */
    static async saveImage(buffer, mimeType, folder, nameHint) {
        const ext = MIME_EXT[mimeType.toLowerCase()];
        if (!ext)
            throw new types_js_1.AppError('Unsupported image type.', 400);
        if (!buffer.length)
            throw new types_js_1.AppError('The image is empty.', 400);
        if (buffer.length > MAX_IMAGE_BYTES)
            throw new types_js_1.AppError('Image is too large (max 10 MB).', 413);
        const hash = crypto_1.default.createHash('sha256').update(buffer).digest('hex').slice(0, 12);
        const fileName = `${slugify(nameHint) || 'image'}-${hash}${ext}`;
        const key = `uploads/${folder}/${fileName}`;
        if (this.isR2Enabled()) {
            try {
                await this.getS3Client().send(new client_s3_1.PutObjectCommand({
                    Bucket: index_js_1.config.storage.r2.bucketName,
                    Key: key,
                    Body: buffer,
                    ContentType: mimeType === 'image/jpg' ? 'image/jpeg' : mimeType,
                    CacheControl: 'public, max-age=31536000, immutable',
                }));
            }
            catch (err) {
                console.error('[StorageService] R2 upload failed:', err?.name || err?.message || err);
                throw new types_js_1.AppError('Could not store the image right now. Please try again.', 502);
            }
            return { url: `${index_js_1.config.storage.r2.publicDomain}/${key}`, key };
        }
        const dir = path_1.default.join(uploadBasePath, folder);
        await fs_1.default.promises.mkdir(dir, { recursive: true });
        await fs_1.default.promises.writeFile(path_1.default.join(dir, fileName), buffer);
        return { url: `/${key}`, key };
    }
    /** Decodes a base64 "data:image/...;base64,..." URL. Returns null for anything else. */
    static parseDataUrl(value) {
        if (typeof value !== 'string')
            return null;
        const match = /^data:(image\/[a-z0-9.+-]+);base64,([a-z0-9+/=\s]+)$/i.exec(value.trim());
        if (!match)
            return null;
        return { mimeType: match[1].toLowerCase(), buffer: Buffer.from(match[2], 'base64') };
    }
    /** If the value is an inline base64 image, stores it and returns its URL; otherwise returns it as is. */
    static async persistImageValue(value, folder, nameHint) {
        const parsed = this.parseDataUrl(value);
        if (!parsed)
            return value;
        const { url } = await this.saveImage(parsed.buffer, parsed.mimeType, folder, nameHint);
        return url;
    }
}
exports.StorageService = StorageService;
/**
 * Route middleware: converts inline base64 images in the request body (e.g. imageUrl / logoUrl
 * from older admin pages) into stored files, so the database only ever keeps URLs.
 */
const persistBodyImages = (folder, fields = ['imageUrl', 'logoUrl']) => async (req, _res, next) => {
    try {
        const body = req.body;
        if (body && typeof body === 'object') {
            const nameHint = body.slug || body.name || body.title || undefined;
            for (const field of fields) {
                if (!(field in body))
                    continue;
                body[field] = Array.isArray(body[field])
                    ? await Promise.all(body[field].map((v) => StorageService.persistImageValue(v, folder, nameHint)))
                    : await StorageService.persistImageValue(body[field], folder, nameHint);
            }
        }
        next();
    }
    catch (err) {
        next(err);
    }
};
exports.persistBodyImages = persistBodyImages;
//# sourceMappingURL=StorageService.js.map