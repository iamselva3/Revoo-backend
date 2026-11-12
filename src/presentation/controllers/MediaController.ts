import { Response, NextFunction } from 'express';
import { AppError } from '../../shared/types.js';
import { AuthenticatedAdminRequest } from '../middlewares/auth.middleware.js';
import { IMAGE_FOLDERS, ImageFolder, StorageService } from '../../infrastructure/storage/StorageService.js';

export class MediaController {
  /**
   * POST /catalogue/admin/media  (multipart: image=<file>, folder=devices|brands|banners|..., name=<hint>)
   * Stores an admin photo (Cloudflare R2 when configured) and returns its public URL.
   */
  public static async uploadAdminImage(req: AuthenticatedAdminRequest, res: Response, next: NextFunction) {
    try {
      if (!req.file) return next(new AppError('No image received. Choose a JPEG, PNG or WebP photo.', 400));
      const requested = String(req.body?.folder || 'misc');
      const folder: ImageFolder = (IMAGE_FOLDERS as readonly string[]).includes(requested)
        ? (requested as ImageFolder)
        : 'misc';
      const { url, key } = await StorageService.saveImage(
        req.file.buffer,
        req.file.mimetype,
        folder,
        typeof req.body?.name === 'string' ? req.body.name : undefined
      );
      res.status(201).json({ success: true, message: 'Image uploaded.', data: { url, key } });
    } catch (err) {
      next(err);
    }
  }
}
