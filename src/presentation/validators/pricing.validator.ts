import { z } from 'zod';

export const pricingRuleSchema = z.object({
  modelId: z.string().min(24, 'Invalid Model ID'),
  variantId: z.string().optional(),
  basePrice: z.number().min(0, 'Base price must be positive'),
  storagePriceAdjustment: z.number().default(0),
  deductions: z.object({
    display: z.object({
      FLAWLESS: z.number().default(0),
      MINOR_SCRATCHES: z.number().default(1000),
      DEEP_SCRATCHES: z.number().default(2500),
      CRACKED_GLASS: z.number().default(4500),
      BROKEN_OR_DEAD_PIXELS: z.number().default(7000),
    }),
    body: z.object({
      FLAWLESS: z.number().default(0),
      MINOR_SIGNS_OF_USE: z.number().default(500),
      DENTED_OR_SCRATCHED: z.number().default(1500),
      BENT_OR_CRACKED_BACK: z.number().default(3500),
    }),
    battery: z.object({
      EXCELLENT: z.number().default(0),
      GOOD: z.number().default(800),
      DEGRADED: z.number().default(2000),
    }),
    functional: z.object({
      frontCameraFaulty: z.number().default(1500),
      backCameraFaulty: z.number().default(2500),
      faceIdOrFingerprintFaulty: z.number().default(2000),
      speakerOrMicFaulty: z.number().default(1000),
      chargingPortFaulty: z.number().default(1200),
      wirelessOrBluetoothFaulty: z.number().default(1500),
    }),
    accessoriesBonus: z.object({
      hasOriginalBox: z.number().default(500),
      hasOriginalCharger: z.number().default(500),
    }),
  }),
  reasonForChange: z.string().optional().default('Regular price adjustment'),
});

