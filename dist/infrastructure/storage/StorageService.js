"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageService = exports.upload = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const multer_1 = __importDefault(require("multer"));
const client_s3_1 = require("@aws-sdk/client-s3");
const types_js_1 = require("../../shared/types.js");
const index_js_1 = require("../../config/index.js");
// Ensure upload directory exists
const uploadBasePath = path_1.default.resolve(process.cwd(), index_js_1.config.storage.uploadDir);
if (!fs_1.default.existsSync(uploadBasePath)) {
    fs_1.default.mkdirSync(uploadBasePath, { recursive: true });
}
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadBasePath);
    },
    filename: (req, file, cb) => {
        const ext = path_1.default.extname(file.originalname).toLowerCase();
        const uniqueSuffix = crypto_1.default.randomBytes(16).toString('hex');
        cb(null, `${uniqueSuffix}${ext}`);
    },
});
const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
exports.upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max
    },
    fileFilter: (req, file, cb) => {
        if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new types_js_1.AppError('Invalid file type. Only JPEG, PNG, and WebP images are allowed.', 400));
        }
    },
});
class StorageService {
    static s3Client = null;
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
    static async uploadToR2(filename, filePath, mimeType) {
        try {
            const fileBuffer = fs_1.default.readFileSync(filePath);
            const s3 = this.getS3Client();
            const r2Key = `revoo/uploads/${filename}`;
            await s3.send(new client_s3_1.PutObjectCommand({
                Bucket: index_js_1.config.storage.r2.bucketName,
                Key: r2Key,
                Body: fileBuffer,
                ContentType: mimeType,
            }));
            console.log(`[StorageService] Uploaded ${filename} successfully to Cloudflare R2 bucket ${index_js_1.config.storage.r2.bucketName}`);
            if (index_js_1.config.storage.r2.publicDomain) {
                return `${index_js_1.config.storage.r2.publicDomain}/${r2Key}`;
            }
            return `https://${index_js_1.config.storage.r2.bucketName}.${index_js_1.config.storage.r2.accountId}.r2.cloudflarestorage.com/${r2Key}`;
        }
        catch (err) {
            console.error('[StorageService] Failed to upload to Cloudflare R2, falling back to local file:', err?.message || err);
            return `/uploads/${filename}`;
        }
    }
    static getFileUrl(filename) {
        return `/uploads/${filename}`;
    }
    static async deleteFile(filename) {
        const filePath = path_1.default.join(uploadBasePath, filename);
        if (fs_1.default.existsSync(filePath)) {
            fs_1.default.unlinkSync(filePath);
        }
        if (index_js_1.config.storage.driver === 'r2') {
            try {
                const s3 = this.getS3Client();
                await s3.send(new client_s3_1.DeleteObjectCommand({
                    Bucket: index_js_1.config.storage.r2.bucketName,
                    Key: `revoo/uploads/${filename}`,
                }));
            }
            catch (e) {
                // Silently continue
            }
        }
    }
}
exports.StorageService = StorageService;
//# sourceMappingURL=StorageService.js.map