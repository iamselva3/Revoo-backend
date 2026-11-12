"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediaController = void 0;
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
}
exports.MediaController = MediaController;
//# sourceMappingURL=MediaController.js.map