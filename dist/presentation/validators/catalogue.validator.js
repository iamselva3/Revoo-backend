"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createVariantSchema = exports.updateModelSchema = exports.createModelSchema = exports.updateBrandSchema = exports.createBrandSchema = void 0;
const zod_1 = require("zod");
exports.createBrandSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Brand name must be at least 2 characters'),
    slug: zod_1.z.string().min(2, 'Slug is required'),
    logoUrl: zod_1.z.string().optional(),
    displayOrder: zod_1.z.number().optional().default(0),
    isActive: zod_1.z.boolean().optional().default(true),
});
exports.updateBrandSchema = exports.createBrandSchema.partial();
exports.createModelSchema = zod_1.z.object({
    brandId: zod_1.z.string().min(24, 'Invalid Brand ID'),
    name: zod_1.z.string().min(2, 'Model name must be at least 2 characters'),
    slug: zod_1.z.string().min(2, 'Slug is required'),
    releaseYear: zod_1.z.number().min(2015).max(2030).default(2024),
    imageUrl: zod_1.z.string().optional(),
    basePrice: zod_1.z.number().min(0, 'Base price must be positive'),
    isPublished: zod_1.z.boolean().optional().default(true),
});
exports.updateModelSchema = exports.createModelSchema.partial();
exports.createVariantSchema = zod_1.z.object({
    modelId: zod_1.z.string().min(24, 'Invalid Model ID'),
    capacity: zod_1.z.string().min(2, 'Capacity is required (e.g., 128GB)'),
    priceModifier: zod_1.z.number().default(0),
    isPublished: zod_1.z.boolean().optional().default(true),
});
//# sourceMappingURL=catalogue.validator.js.map