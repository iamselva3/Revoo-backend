import { Router } from 'express';
import { CatalogueController } from '../controllers/CatalogueController.js';
import { authenticateAdmin } from '../middlewares/auth.middleware.js';

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

// Admin catalogue & marketing management
router.get('/admin/banners', authenticateAdmin, CatalogueController.adminListBanners);
router.post('/admin/banners', authenticateAdmin, CatalogueController.adminCreateBanner);
router.put('/admin/banners/:id', authenticateAdmin, CatalogueController.adminUpdateBanner);
router.delete('/admin/banners/:id', authenticateAdmin, CatalogueController.adminDeleteBanner);

router.get('/admin/brands', authenticateAdmin, CatalogueController.adminListBrands);
router.post('/admin/brands', authenticateAdmin, CatalogueController.adminCreateBrand);
router.put('/admin/brands/:id', authenticateAdmin, CatalogueController.adminUpdateBrand);

router.get('/admin/categories', authenticateAdmin, CatalogueController.adminListCategories);
router.post('/admin/categories', authenticateAdmin, CatalogueController.adminCreateCategory);
router.put('/admin/categories/:id', authenticateAdmin, CatalogueController.adminUpdateCategory);

router.get('/admin/models', authenticateAdmin, CatalogueController.adminListModels);
router.post('/admin/models', authenticateAdmin, CatalogueController.adminCreateModel);
router.put('/admin/models/:id', authenticateAdmin, CatalogueController.adminUpdateModel);
router.delete('/admin/models/:id/archive', authenticateAdmin, CatalogueController.adminArchiveModel);

router.post('/admin/models/:id/variants', authenticateAdmin, CatalogueController.adminCreateVariant);
router.post('/admin/refurbished', authenticateAdmin, CatalogueController.adminCreateRefurbishedProduct);

export default router;

