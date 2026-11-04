import { z } from 'zod';

export const createBrandSchema = z.object({
  name: z.string().min(2, 'Brand name must be at least 2 characters'),
  slug: z.string().min(2, 'Slug is required'),
  logoUrl: z.string().optional(),
  displayOrder: z.number().optional().default(0),
  isActive: z.boolean().optional().default(true),
});

export const updateBrandSchema = createBrandSchema.partial();

export const createModelSchema = z.object({
  brandId: z.string().min(24, 'Invalid Brand ID'),
  name: z.string().min(2, 'Model name must be at least 2 characters'),
  slug: z.string().min(2, 'Slug is required'),
  releaseYear: z.number().min(2015).max(2030).default(2024),
  imageUrl: z.string().optional(),
  basePrice: z.number().min(0, 'Base price must be positive'),
  isPublished: z.boolean().optional().default(true),
});

export const updateModelSchema = createModelSchema.partial();

export const createVariantSchema = z.object({
  modelId: z.string().min(24, 'Invalid Model ID'),
  capacity: z.string().min(2, 'Capacity is required (e.g., 128GB)'),
  priceModifier: z.number().default(0),
  isPublished: z.boolean().optional().default(true),
});

