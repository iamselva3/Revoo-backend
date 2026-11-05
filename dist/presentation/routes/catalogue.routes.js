"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const CatalogueController_js_1 = require("../controllers/CatalogueController.js");
const auth_middleware_js_1 = require("../middlewares/auth.middleware.js");
const router = (0, express_1.Router)();
// Customer public endpoints
router.get('/banners', CatalogueController_js_1.CatalogueController.getBanners);
router.get('/categories', CatalogueController_js_1.CatalogueController.getCategories);
router.get('/brands', CatalogueController_js_1.CatalogueController.getActiveBrands);
router.get('/brands/:brandId/models', CatalogueController_js_1.CatalogueController.getModelsByBrand);
router.get('/models/:modelId', CatalogueController_js_1.CatalogueController.getModelDetails);
router.post('/estimate', CatalogueController_js_1.CatalogueController.calculateIndicativeEstimate);
router.get('/refurbished', CatalogueController_js_1.CatalogueController.getRefurbishedProducts);
router.get('/reviews', CatalogueController_js_1.CatalogueController.getCustomerReviews);
router.get('/popup', CatalogueController_js_1.CatalogueController.getAppPopup);
router.post('/orders', CatalogueController_js_1.CatalogueController.createOrderInvoice);
// Admin catalogue & marketing management
router.get('/admin/popup', auth_middleware_js_1.authenticateAdmin, CatalogueController_js_1.CatalogueController.getAppPopup);
router.post('/admin/popup', auth_middleware_js_1.authenticateAdmin, CatalogueController_js_1.CatalogueController.adminSavePopup);
router.get('/admin/banners', auth_middleware_js_1.authenticateAdmin, CatalogueController_js_1.CatalogueController.adminListBanners);
router.post('/admin/banners', auth_middleware_js_1.authenticateAdmin, CatalogueController_js_1.CatalogueController.adminCreateBanner);
router.put('/admin/banners/:id', auth_middleware_js_1.authenticateAdmin, CatalogueController_js_1.CatalogueController.adminUpdateBanner);
router.delete('/admin/banners/:id', auth_middleware_js_1.authenticateAdmin, CatalogueController_js_1.CatalogueController.adminDeleteBanner);
router.get('/admin/brands', auth_middleware_js_1.authenticateAdmin, CatalogueController_js_1.CatalogueController.adminListBrands);
router.post('/admin/brands', auth_middleware_js_1.authenticateAdmin, CatalogueController_js_1.CatalogueController.adminCreateBrand);
router.put('/admin/brands/:id', auth_middleware_js_1.authenticateAdmin, CatalogueController_js_1.CatalogueController.adminUpdateBrand);
router.get('/admin/categories', auth_middleware_js_1.authenticateAdmin, CatalogueController_js_1.CatalogueController.adminListCategories);
router.post('/admin/categories', auth_middleware_js_1.authenticateAdmin, CatalogueController_js_1.CatalogueController.adminCreateCategory);
router.put('/admin/categories/:id', auth_middleware_js_1.authenticateAdmin, CatalogueController_js_1.CatalogueController.adminUpdateCategory);
router.get('/admin/models', auth_middleware_js_1.authenticateAdmin, CatalogueController_js_1.CatalogueController.adminListModels);
router.post('/admin/models', auth_middleware_js_1.authenticateAdmin, CatalogueController_js_1.CatalogueController.adminCreateModel);
router.put('/admin/models/:id', auth_middleware_js_1.authenticateAdmin, CatalogueController_js_1.CatalogueController.adminUpdateModel);
router.delete('/admin/models/:id', auth_middleware_js_1.authenticateAdmin, CatalogueController_js_1.CatalogueController.adminDeleteModel);
router.delete('/admin/models/:id/archive', auth_middleware_js_1.authenticateAdmin, CatalogueController_js_1.CatalogueController.adminArchiveModel);
router.post('/admin/models/:id/variants', auth_middleware_js_1.authenticateAdmin, CatalogueController_js_1.CatalogueController.adminCreateVariant);
// Admin Refurbished / Buy Phones Store Management
router.get('/admin/refurbished', auth_middleware_js_1.authenticateAdmin, CatalogueController_js_1.CatalogueController.adminListRefurbishedProducts);
router.post('/admin/refurbished', auth_middleware_js_1.authenticateAdmin, CatalogueController_js_1.CatalogueController.adminCreateRefurbishedProduct);
router.put('/admin/refurbished/:id', auth_middleware_js_1.authenticateAdmin, CatalogueController_js_1.CatalogueController.adminUpdateRefurbishedProduct);
router.delete('/admin/refurbished/:id', auth_middleware_js_1.authenticateAdmin, CatalogueController_js_1.CatalogueController.adminDeleteRefurbishedProduct);
router.get('/admin/invoices', auth_middleware_js_1.authenticateAdmin, CatalogueController_js_1.CatalogueController.adminListInvoices);
exports.default = router;
//# sourceMappingURL=catalogue.routes.js.map