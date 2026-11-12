import { Router } from 'express';
import { CatalogueController } from '../controllers/CatalogueController.js';
import { authenticateAdmin } from '../middlewares/auth.middleware.js';
import { MediaController } from '../controllers/MediaController.js';
import { upload, persistBodyImages } from '../../infrastructure/storage/StorageService.js';

const router = Router();

// Customer public endpoints
router.get('/banners', CatalogueController.getBanners);
router.get('/categories', CatalogueController.getCategories);
router.get('/brands', CatalogueController.getActiveBrands);
router.get('/brands/:brandId/models', CatalogueController.getModelsByBrand);
router.get('/models/:modelId', CatalogueController.getModelDetails);
router.post('/estimate', CatalogueController.calculateIndicativeEstimate);
router.get('/refurbished', CatalogueController.getRefurbishedProducts);
router.get('/reviews', CatalogueController.getCustomerReviews);
router.get('/popup', CatalogueController.getAppPopup);
router.post('/orders', CatalogueController.createOrderInvoice);

// Admin catalogue & marketing management
router.get('/admin/popup', authenticateAdmin, CatalogueController.getAppPopup);
// Admin photo upload -> Cloudflare R2 (returns the public URL to save on the record)
router.post('/admin/media', authenticateAdmin, upload.single('image'), MediaController.uploadAdminImage);
router.post('/admin/popup', authenticateAdmin, persistBodyImages('popups'), CatalogueController.adminSavePopup);
router.get('/admin/banners', authenticateAdmin, CatalogueController.adminListBanners);
router.post('/admin/banners', authenticateAdmin, persistBodyImages('banners'), CatalogueController.adminCreateBanner);
router.put('/admin/banners/:id', authenticateAdmin, persistBodyImages('banners'), CatalogueController.adminUpdateBanner);
router.delete('/admin/banners/:id', authenticateAdmin, CatalogueController.adminDeleteBanner);

router.get('/admin/brands', authenticateAdmin, CatalogueController.adminListBrands);
router.post('/admin/brands', authenticateAdmin, persistBodyImages('brands'), CatalogueController.adminCreateBrand);
router.put('/admin/brands/:id', authenticateAdmin, persistBodyImages('brands'), CatalogueController.adminUpdateBrand);

router.get('/admin/categories', authenticateAdmin, CatalogueController.adminListCategories);
router.post('/admin/categories', authenticateAdmin, persistBodyImages('categories', ['imageUrl', 'iconUrl']), CatalogueController.adminCreateCategory);
router.put('/admin/categories/:id', authenticateAdmin, persistBodyImages('categories', ['imageUrl', 'iconUrl']), CatalogueController.adminUpdateCategory);

router.get('/admin/models', authenticateAdmin, CatalogueController.adminListModels);
router.post('/admin/models', authenticateAdmin, persistBodyImages('devices'), CatalogueController.adminCreateModel);
router.put('/admin/models/:id', authenticateAdmin, persistBodyImages('devices'), CatalogueController.adminUpdateModel);
router.delete('/admin/models/:id', authenticateAdmin, CatalogueController.adminDeleteModel);
router.delete('/admin/models/:id/archive', authenticateAdmin, CatalogueController.adminArchiveModel);

router.post('/admin/models/:id/variants', authenticateAdmin, CatalogueController.adminCreateVariant);

// Admin Refurbished / Buy Phones Store Management
router.get('/admin/refurbished', authenticateAdmin, CatalogueController.adminListRefurbishedProducts);
router.post('/admin/refurbished', authenticateAdmin, persistBodyImages('products', ['imageUrl', 'galleryImages']), CatalogueController.adminCreateRefurbishedProduct);
router.put('/admin/refurbished/:id', authenticateAdmin, persistBodyImages('products', ['imageUrl', 'galleryImages']), CatalogueController.adminUpdateRefurbishedProduct);
router.post('/admin/refurbished/:id/update', authenticateAdmin, persistBodyImages('products', ['imageUrl', 'galleryImages']), CatalogueController.adminUpdateRefurbishedProduct);
router.delete('/admin/refurbished/:id', authenticateAdmin, CatalogueController.adminDeleteRefurbishedProduct);
router.post('/admin/refurbished/:id/delete', authenticateAdmin, CatalogueController.adminDeleteRefurbishedProduct);

router.get('/admin/invoices', authenticateAdmin, CatalogueController.adminListInvoices);

export default router;

