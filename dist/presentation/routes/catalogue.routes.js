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
// Admin catalogue & marketing management
router.get('/admin/banners', auth_middleware_js_1.authenticateAdmin, CatalogueController_js_1.CatalogueController.adminListBanners);
router.post('/admin/banners', auth_middleware_js_1.authenticateAdmin, CatalogueController_js_1.CatalogueController.adminCreateBanner);
router.put('/admin/banners/:id', auth_middleware_js_1.authenticateAdmin, CatalogueController_js_1.CatalogueController.adminUpdateBanner);
router.delete('/admin/banners/:id', auth_middleware_js_1.authenticateAdmin, CatalogueController_js_1.CatalogueController.adminDeleteBanner);
router.get('/admin/brands', auth_middleware_js_1.authenticateAdmin, CatalogueController_js_1.CatalogueController.adminListBrands);
router.post('/admin/brands', auth_middleware_js_1.authenticateAdmin, CatalogueController_js_1.CatalogueController.adminCreateBrand);
router.put('/admin/brands/:id', auth_middleware_js_1.authenticateAdmin, CatalogueController_js_1.CatalogueController.adminUpdateBrand);
router.get('/admin/models', auth_middleware_js_1.authenticateAdmin, CatalogueController_js_1.CatalogueController.adminListModels);
router.post('/admin/models', auth_middleware_js_1.authenticateAdmin, CatalogueController_js_1.CatalogueController.adminCreateModel);
router.put('/admin/models/:id', auth_middleware_js_1.authenticateAdmin, CatalogueController_js_1.CatalogueController.adminUpdateModel);
router.delete('/admin/models/:id/archive', auth_middleware_js_1.authenticateAdmin, CatalogueController_js_1.CatalogueController.adminArchiveModel);
router.post('/admin/models/:id/variants', auth_middleware_js_1.authenticateAdmin, CatalogueController_js_1.CatalogueController.adminCreateVariant);
router.post('/admin/refurbished', auth_middleware_js_1.authenticateAdmin, CatalogueController_js_1.CatalogueController.adminCreateRefurbishedProduct);
exports.default = router;
//# sourceMappingURL=catalogue.routes.js.map