"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediaController = void 0;
const path_1 = __importDefault(require("path"));
const index_js_1 = require("../../config/index.js");
const types_js_1 = require("../../shared/types.js");
const StorageService_js_1 = require("../../infrastructure/storage/StorageService.js");
class MediaController {
    /**
     * POST /catalogue/admin/media  (multipart: image=<file>, folder=devices|brands|banners|..., name=<hint>)
     * Stores an admin photo (Cloudflare R2 when configured) and returns its public URL.
     */
    static async uploadAdminImage(req, res, next) {
        try {
            if (!req.file)
                return next(new types_js_1.AppError('No image received. Choose a JPEG, PNG or WebP photo.', 400));
            const requested = String(req.body?.folder || 'misc');
            const folder = StorageService_js_1.IMAGE_FOLDERS.includes(requested)
                ? requested
                : 'misc';
            const { url, key } = await StorageService_js_1.StorageService.saveImage(req.file.buffer, req.file.mimetype, folder, typeof req.body?.name === 'string' ? req.body.name : undefined);
            res.status(201).json({ success: true, message: 'Image uploaded.', data: { url, key } });
        }
        catch (err) {
            next(err);
        }
    }
    /**
     * GET /catalogue/admin/media/source?url=<one of our photos>
     * Hands a stored photo back to the admin site so the banner "Adjust" editor can redraw it (the
     * image domain sends no CORS headers, which stops the browser from doing that directly).
     * Only our image domain's /uploads/ and our own /uploads/ folder: never any other address.
     */
    static async fetchAdminImage(req, res, next) {
        try {
            const raw = typeof req.query.url === 'string' ? req.query.url.trim() : '';
            const imageHost = new URL(index_js_1.config.storage.r2.publicDomain);
            let remote = null;
            let localPath = null;
            try {
                if (raw.startsWith('/uploads/')) {
                    const p = new URL(raw, 'http://local').pathname; // resolves "/uploads/../x" to "/x"
                    if (p.startsWith('/uploads/'))
                        localPath = p;
                }
                else {
                    const u = new URL(raw);
                    if (u.pathname.startsWith('/uploads/')) {
                        if (u.protocol === 'https:' && u.host === imageHost.host)
                            remote = `${imageHost.origin}${u.pathname}`;
                        else if (u.host === req.get('host'))
                            localPath = u.pathname;
                    }
                }
            }
            catch {
                // not a web address: refused below
            }
            if (!remote && !localPath)
                return next(new types_js_1.AppError('Only photos stored by Genie can be adjusted.', 400));
            if (localPath) {
                const base = path_1.default.resolve(process.cwd(), index_js_1.config.storage.uploadDir);
                const file = path_1.default.resolve(base, '.' + decodeURIComponent(localPath.slice('/uploads'.length)));
                if (!file.startsWith(base + path_1.default.sep))
                    return next(new types_js_1.AppError('Only photos stored by Genie can be adjusted.', 400));
                return res.sendFile(file, { headers: { 'Cache-Control': 'private, max-age=300' } }, (err) => {
                    if (err && !res.headersSent)
                        next(new types_js_1.AppError('Photo not found.', 404));
                });
            }
            const upstream = await fetch(remote, { signal: AbortSignal.timeout(10000) });
            const type = upstream.headers.get('content-type') || '';
            if (!upstream.ok || !type.startsWith('image/'))
                return next(new types_js_1.AppError('Photo not found.', 404));
            const body = Buffer.from(await upstream.arrayBuffer());
            if (body.length > 20 * 1024 * 1024)
                return next(new types_js_1.AppError('This photo is too large to adjust.', 413));
            res.set({ 'Content-Type': type, 'Cache-Control': 'private, max-age=300' }).send(body);
        }
        catch (err) {
            next(err);
        }
    }
}
exports.MediaController = MediaController;
//# sourceMappingURL=MediaController.js.map