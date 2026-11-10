import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { BrandModel } from '../../infrastructure/database/models/Brand.js';
import { SmartphoneModel } from '../../infrastructure/database/models/SmartphoneModel.js';
import { StorageVariantModel } from '../../infrastructure/database/models/StorageVariant.js';
import { PricingRuleModel } from '../../infrastructure/database/models/PricingRule.js';
import { CategoryModel } from '../../infrastructure/database/models/Category.js';
import { RefurbishedProductModel, DeviceGrade } from '../../infrastructure/database/models/RefurbishedProduct.js';
import { BannerModel } from '../../infrastructure/database/models/Banner.js';
import { InvoiceModel } from '../../infrastructure/database/models/Invoice.js';
import { ValuationEngine, calculatePrice } from '../../domain/services/ValuationEngine.js';
import { AppError } from '../../shared/types.js';
import { logAuditEvent } from '../middlewares/audit.middleware.js';
import { AuthenticatedAdminRequest } from '../middlewares/auth.middleware.js';

export class CatalogueController {
  // --- Public Customer Endpoints ---
  public static async getActiveBrands(req: Request, res: Response, next: NextFunction) {
    try {
      const brands = await BrandModel.find({ isActive: true }).sort({ displayOrder: 1, name: 1 });
      res.status(200).json({ success: true, data: brands });
    } catch (err) {
      next(err);
    }
  }

  public static async getModelsByBrand(req: Request, res: Response, next: NextFunction) {
    try {
      const { brandId } = req.params;
      let targetBrandId: any = brandId;
      if (!mongoose.Types.ObjectId.isValid(brandId)) {
        const cleanSlug = brandId.split('-')[0].toLowerCase();
        const brandDoc = await BrandModel.findOne({
          $or: [
            { slug: cleanSlug },
            { name: new RegExp(`^${cleanSlug}$`, 'i') }
          ]
        });
        if (brandDoc) {
          targetBrandId = brandDoc._id;
        } else {
          return res.status(200).json({ success: true, data: [] });
        }
      }

      const { category } = req.query;
      let filterQuery: any = {
        brandId: targetBrandId,
        isPublished: true,
        isArchived: false,
      };

      if (category) {
        const catStr = (category as string).toLowerCase();
        if (catStr === 'mobile' || catStr === 'phones' || catStr === 'phone') {
          filterQuery.name = { $not: /(macbook|laptop|notebook|thinkpad|alienware|xps|ipad|tablet|tv|oled|bravia|air|pro 1[46])/i };
        } else if (catStr === 'laptops' || catStr === 'laptop' || catStr === 'macbook' || catStr === 'macbooks') {
          filterQuery.name = { $regex: /(macbook|laptop|notebook|thinkpad|xps|alienware|zenbook|vivobook|omen|predator|swift|air|pro 1[46])/i };
        } else if (catStr === 'tablets' || catStr === 'tablet' || catStr === 'ipad' || catStr === 'ipads') {
          filterQuery.name = { $regex: /(ipad|tab|pad)/i };
        } else if (catStr === 'tv' || catStr === 'tvs' || catStr === 'smart_tv') {
          filterQuery.name = { $regex: /(tv|bravia|oled|qled|crystal|uhd)/i };
        }
      }

      const models = await SmartphoneModel.find(filterQuery).sort({ releaseYear: -1, name: 1 });

      res.status(200).json({ success: true, data: models });
    } catch (err) {
      next(err);
    }
  }

  public static async getModelDetails(req: Request, res: Response, next: NextFunction) {
    try {
      const { modelId } = req.params;
      let model = null;
      if (mongoose.Types.ObjectId.isValid(modelId)) {
        model = await SmartphoneModel.findById(modelId).populate('brandId', 'name logoUrl');
      } else {
        model = await SmartphoneModel.findOne({
          $or: [
            { slug: modelId },
            { name: new RegExp(`^${modelId}$`, 'i') }
          ]
        }).populate('brandId', 'name logoUrl');
      }

      if (!model || model.isArchived) {
        return next(new AppError('Smartphone model not found or currently unavailable.', 404));
      }

      const variants = await StorageVariantModel.find({
        modelId: model._id,
        isPublished: true,
      }).sort({ priceModifier: 1 });

      res.status(200).json({
        success: true,
        data: {
          model,
          variants,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async calculateIndicativeEstimate(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        modelId,
        variantId,
        modelName,
        brandName,
        basePrice: customBasePrice,
        declaredCondition,
        // DOFY fields
        basicQuestions,
        backPanelCondition,
        sidePanelCondition,
        hardwareFaults,
        isPhoneWorking,
        isTouchscreenWorking,
        isDisplayOriginal,
        hasValidWarranty,
        volumeButtonNotWorking,
        wifiOrBluetoothNotWorking,
        chargingPortNotWorking,
        proximitySensorNotWorking,
        powerButtonNotWorking,
        earSpeakerNotWorking,
        vibratorNotWorking,
        // Legacy fields
        displayCondition = 'FLAWLESS',
        bodyCondition = 'FLAWLESS',
        batteryHealth = 'ABOVE_85',
        functionalFaults = {},
        hasOriginalBox = false,
        hasOriginalCharger = false,
        hasValidBill = false,
      } = req.body;

      let pricingRule: any = null;
      let modelDoc: any = null;
      let effectiveBasePrice = typeof customBasePrice === 'number' && customBasePrice > 0 ? customBasePrice : 0;
      let storageModifier = 0;

      // 1. Resolve modelDoc & real model ObjectId if possible
      if (modelId) {
        if (mongoose.Types.ObjectId.isValid(modelId)) {
          modelDoc = await SmartphoneModel.findById(modelId);
        } else {
          modelDoc = await SmartphoneModel.findOne({
            $or: [
              { slug: modelId },
              { name: new RegExp(`^${modelId}$`, 'i') },
              ...(modelName ? [{ name: new RegExp(`^${modelName}$`, 'i') }] : []),
            ],
          });
        }
      }

      if (modelDoc) {
        effectiveBasePrice = effectiveBasePrice || modelDoc.basePrice;
      }

      // 2. Resolve variant & storage modifier if provided
      if (variantId) {
        if (mongoose.Types.ObjectId.isValid(variantId)) {
          const variant = await StorageVariantModel.findById(variantId);
          if (variant) storageModifier = variant.priceModifier;
        } else if (modelDoc) {
          const variant = await StorageVariantModel.findOne({
            modelId: modelDoc._id,
            $or: [{ capacity: variantId }, { capacity: new RegExp(variantId, 'i') }],
          });
          if (variant) storageModifier = variant.priceModifier;
        }
      }

      // 3. Search for existing PricingRule
      const targetModelId = modelDoc ? modelDoc._id : (modelId && mongoose.Types.ObjectId.isValid(modelId) ? modelId : null);
      if (targetModelId) {
        const query: any = { modelId: targetModelId, isActive: true };
        if (variantId && mongoose.Types.ObjectId.isValid(variantId)) {
          query.variantId = variantId;
        }
        pricingRule = await PricingRuleModel.findOne(query).sort({ version: -1 });
        if (!pricingRule) {
          pricingRule = await PricingRuleModel.findOne({ modelId: targetModelId, isActive: true }).sort({ version: -1 });
        }
      }

      // 4. Fallback estimated base price from model name or standard tier if not resolved
      if (!effectiveBasePrice) {
        const lowerName = (modelName || modelId || '').toLowerCase();
        if (lowerName.includes('pro max') || lowerName.includes('ultra')) {
          effectiveBasePrice = 65000;
        } else if (lowerName.includes('pro') || lowerName.includes('plus')) {
          effectiveBasePrice = 45000;
        } else if (lowerName.includes('macbook') || lowerName.includes('xps') || lowerName.includes('alienware')) {
          effectiveBasePrice = 85000;
        } else if (lowerName.includes('laptop') || lowerName.includes('thinkpad') || lowerName.includes('zenbook')) {
          effectiveBasePrice = 55000;
        } else {
          effectiveBasePrice = 28000;
        }
      }

      // Resolve DOFY conditions from structured or flattened input
      const resolvedBasicQuestions = declaredCondition?.basicQuestions || basicQuestions || (
        isPhoneWorking !== undefined || isTouchscreenWorking !== undefined || isDisplayOriginal !== undefined || hasValidWarranty !== undefined
          ? {
              isPhoneWorking: isPhoneWorking !== false && isPhoneWorking !== 'false',
              isTouchscreenWorking: isTouchscreenWorking !== false && isTouchscreenWorking !== 'false',
              isDisplayOriginal: isDisplayOriginal !== false && isDisplayOriginal !== 'false',
              hasValidWarranty: hasValidWarranty === true || hasValidWarranty === 'true',
            }
          : undefined
      );

      const resolvedBackPanel = declaredCondition?.backPanelCondition || backPanelCondition;
      const resolvedSidePanel = declaredCondition?.sidePanelCondition || sidePanelCondition;

      const resolvedHardwareFaults = declaredCondition?.hardwareFaults || hardwareFaults || (
        volumeButtonNotWorking !== undefined || powerButtonNotWorking !== undefined || chargingPortNotWorking !== undefined ||
        wifiOrBluetoothNotWorking !== undefined || proximitySensorNotWorking !== undefined || earSpeakerNotWorking !== undefined || vibratorNotWorking !== undefined
          ? {
              volumeButtonNotWorking: volumeButtonNotWorking === true || volumeButtonNotWorking === 'true',
              wifiOrBluetoothNotWorking: wifiOrBluetoothNotWorking === true || wifiOrBluetoothNotWorking === 'true',
              chargingPortNotWorking: chargingPortNotWorking === true || chargingPortNotWorking === 'true',
              proximitySensorNotWorking: proximitySensorNotWorking === true || proximitySensorNotWorking === 'true',
              powerButtonNotWorking: powerButtonNotWorking === true || powerButtonNotWorking === 'true',
              earSpeakerNotWorking: earSpeakerNotWorking === true || earSpeakerNotWorking === 'true',
              vibratorNotWorking: vibratorNotWorking === true || vibratorNotWorking === 'true',
            }
          : undefined
      );

      const resolvedBox = declaredCondition?.hasOriginalBox ?? (hasOriginalBox === true || hasOriginalBox === 'true' || req.body.box_same_imei === true);
      const resolvedCharger = declaredCondition?.hasOriginalCharger ?? (hasOriginalCharger === true || hasOriginalCharger === 'true' || req.body.original_charger === true);
      const resolvedBill = declaredCondition?.hasValidBill ?? declaredCondition?.bill_same_imei ?? (
        hasValidBill === true || hasValidBill === 'true' || req.body.bill_same_imei === true ||
        (req.body.hasValidWarranty !== undefined ? (req.body.hasValidWarranty === true || req.body.hasValidWarranty === 'true') : false) ||
        (basicQuestions?.hasValidWarranty !== undefined ? (basicQuestions.hasValidWarranty === true || basicQuestions.hasValidWarranty === 'true') : false)
      );

      const fullCondition: any = {
        ...req.body,
        ...(declaredCondition || {}),
        basicQuestions: resolvedBasicQuestions,
        backPanelCondition: resolvedBackPanel,
        sidePanelCondition: resolvedSidePanel,
        hardwareFaults: resolvedHardwareFaults,
        displayCondition: displayCondition || 'FLAWLESS',
        bodyCondition: bodyCondition || 'FLAWLESS',
        batteryHealth: batteryHealth || 'ABOVE_85',
        functionalFaults: functionalFaults || {},
        hasOriginalBox: !!resolvedBox,
        hasOriginalCharger: !!resolvedCharger,
        hasValidBill: !!resolvedBill,
        bill_same_imei: !!resolvedBill,
        box_same_imei: !!resolvedBox,
        original_charger: !!resolvedCharger,
      };

      // Check for unmapped or unexpected fields in request and log warnings
      const unmappedFields: string[] = [];
      const hf = (fullCondition.hardwareFaults || {}) as any;
      if (hf.proximitySensorNotWorking || fullCondition.proximitySensorNotWorking) {
        unmappedFields.push('proximitySensorNotWorking (no deduction rate in Dofy model)');
      }
      if (hf.vibratorNotWorking || fullCondition.vibratorNotWorking) {
        unmappedFields.push('vibratorNotWorking (no deduction rate in Dofy model)');
      }
      const bq = (fullCondition.basicQuestions || {}) as any;
      if (bq.isDisplayOriginal === false || fullCondition.isDisplayOriginal === false) {
        unmappedFields.push('isDisplayOriginal=false (display original check has no separate deduction in Dofy model)');
      }

      if (unmappedFields.length > 0) {
        console.warn(`[PRICING ENGINE WARNING] Unmapped fields received in estimate request: ${unmappedFields.join(', ')}`);
      }

      // STEP 3: Map DB fields to engine's phone object live from DB
      const baseVariantPrice = pricingRule
        ? pricingRule.basePrice + (pricingRule.storagePriceAdjustment || 0)
        : effectiveBasePrice + storageModifier;

      const phoneData = {
        basePrice: baseVariantPrice,
        minScrapPrice: (pricingRule as any)?.minScrapPrice ?? (pricingRule as any)?.customScrapFloor,
        customDeductions: (pricingRule as any)?.customDeductions ?? (pricingRule as any)?.specific_deductions_inr,
        customPercentages: (pricingRule as any)?.customPercentages,
      };

      // STEP 4: Map app's answers to engine's input object
      const engineInput = ValuationEngine.mapConditionToEngineInput(fullCondition);

      // STEP 5: Config with criticalKeys if configured in DB
      const engineConfig = {
        criticalKeys: (pricingRule as any)?.criticalKeys ?? (pricingRule as any)?.criticalFaults ?? undefined,
      };

      // STEP 2 & 6: Authoritative calculation using calculatePrice
      const engineResult = calculatePrice(phoneData, engineInput, engineConfig);

      // Log engine result for every quote for debugging price mismatches
      console.log('[PRICING ENGINE RESULT]', JSON.stringify(engineResult, null, 2));

      // Build structured breakdown for mobile app & UI display
      const valuation = ValuationEngine.calculate(
        pricingRule || {
          basePrice: effectiveBasePrice,
          storagePriceAdjustment: storageModifier,
          version: 1,
        },
        fullCondition,
        engineConfig
      );

      res.status(200).json({
        success: true,
        message: 'Indicative estimate calculated successfully.',
        data: {
          // STEP 6: Engine's full result object
          basePrice: engineResult.basePrice,
          scrapFloor: engineResult.scrapFloor,
          maxAccPool: engineResult.maxAccPool,
          selectedAccBonus: engineResult.selectedAccBonus,
          deductions: engineResult.deductions,
          totalDeductions: engineResult.totalDeductions,
          rawBodyPrice: engineResult.rawBodyPrice,
          clampedBodyPrice: engineResult.clampedBodyPrice,
          finalPrice: engineResult.finalPrice,
          rule: engineResult.rule,

          // Valuation object for existing UI and test suite compatibility
          valuation: {
            ...valuation,
            basePrice: engineResult.basePrice,
            storageAdjustment: storageModifier || (pricingRule?.storagePriceAdjustment || 0),
            scrapFloor: engineResult.scrapFloor,
            rawBodyPrice: engineResult.rawBodyPrice ?? engineResult.scrapFloor,
            clampedBodyPrice: engineResult.clampedBodyPrice ?? engineResult.scrapFloor,
            selectedAccBonus: engineResult.selectedAccBonus,
            maxAccPool: engineResult.maxAccPool,
            totalDeductions: engineResult.totalDeductions,
            totalBonuses: engineResult.selectedAccBonus,
            finalCalculatedAmount: engineResult.finalPrice,
            finalPrice: engineResult.finalPrice,
            rule: engineResult.rule,
            deductions: engineResult.deductions,
          },
          disclaimer: 'This is an indicative estimate only. Your final offer will be confirmed after physical inspection of your device.',
        },
      });
    } catch (err: any) {
      if (err instanceof Error && (
        err.message.includes('Unknown condition key') ||
        err.message.includes('Invalid basePrice') ||
        err.message.includes('phone_working_condition')
      )) {
        return next(new AppError(err.message, 400));
      }
      next(err);
    }
  }

  // --- Admin Catalogue Operations ---
  public static async adminListBrands(req: AuthenticatedAdminRequest, res: Response, next: NextFunction) {
    try {
      const brands = await BrandModel.find().sort({ displayOrder: 1, name: 1 });
      res.status(200).json({ success: true, data: brands });
    } catch (err) {
      next(err);
    }
  }

  public static async adminCreateBrand(req: AuthenticatedAdminRequest, res: Response, next: NextFunction) {
    try {
      const brand = await BrandModel.create(req.body);
      await logAuditEvent({
        req,
        actorType: 'ADMIN',
        actorId: req.admin?.id,
        actorEmail: req.admin?.email,
        action: 'CREATE_BRAND',
        resourceType: 'Brand',
        resourceId: brand._id.toString(),
        diff: brand.toObject(),
      });
      res.status(201).json({ success: true, message: 'Brand created successfully.', data: brand });
    } catch (err) {
      next(err);
    }
  }

  public static async adminUpdateBrand(req: AuthenticatedAdminRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const brand = await BrandModel.findByIdAndUpdate(id, req.body, { new: true });
      if (!brand) return next(new AppError('Brand not found', 404));

      await logAuditEvent({
        req,
        actorType: 'ADMIN',
        actorId: req.admin?.id,
        actorEmail: req.admin?.email,
        action: 'UPDATE_BRAND',
        resourceType: 'Brand',
        resourceId: brand._id.toString(),
        diff: req.body,
      });

      res.status(200).json({ success: true, message: 'Brand updated.', data: brand });
    } catch (err) {
      next(err);
    }
  }

  public static async adminListModels(req: AuthenticatedAdminRequest, res: Response, next: NextFunction) {
    try {
      const { brandId, includeArchived } = req.query;
      const filter: any = {};
      if (brandId) filter.brandId = brandId;
      if (includeArchived !== 'true') filter.isArchived = false;

      const models = await SmartphoneModel.find(filter)
        .populate('brandId', 'name slug logoUrl')
        .sort({ releaseYear: -1, name: 1 });

      res.status(200).json({ success: true, data: models });
    } catch (err) {
      next(err);
    }
  }

  public static async adminCreateModel(req: AuthenticatedAdminRequest, res: Response, next: NextFunction) {
    try {
      const model = await SmartphoneModel.create(req.body);

      // Create default base pricing rule for this model
      await PricingRuleModel.create({
        modelId: model._id,
        basePrice: model.basePrice,
        version: 1,
        isActive: true,
      });

      await logAuditEvent({
        req,
        actorType: 'ADMIN',
        actorId: req.admin?.id,
        actorEmail: req.admin?.email,
        action: 'CREATE_MODEL',
        resourceType: 'SmartphoneModel',
        resourceId: model._id.toString(),
        diff: model.toObject(),
      });

      res.status(201).json({ success: true, message: 'Smartphone model created.', data: model });
    } catch (err) {
      next(err);
    }
  }

  public static async adminUpdateModel(req: AuthenticatedAdminRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const model = await SmartphoneModel.findByIdAndUpdate(id, req.body, { new: true });
      if (!model) return next(new AppError('Model not found', 404));

      await logAuditEvent({
        req,
        actorType: 'ADMIN',
        actorId: req.admin?.id,
        actorEmail: req.admin?.email,
        action: 'UPDATE_MODEL',
        resourceType: 'SmartphoneModel',
        resourceId: model._id.toString(),
        diff: req.body,
      });

      res.status(200).json({ success: true, message: 'Model updated.', data: model });
    } catch (err) {
      next(err);
    }
  }

  public static async adminArchiveModel(req: AuthenticatedAdminRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      // Soft-archive to preserve historical buyback records
      const model = await SmartphoneModel.findByIdAndUpdate(
        id,
        { isArchived: true, isPublished: false },
        { new: true }
      );
      if (!model) return next(new AppError('Model not found', 404));

      await logAuditEvent({
        req,
        actorType: 'ADMIN',
        actorId: req.admin?.id,
        actorEmail: req.admin?.email,
        action: 'ARCHIVE_MODEL',
        resourceType: 'SmartphoneModel',
        resourceId: model._id.toString(),
      });

      res.status(200).json({ success: true, message: 'Model archived safely.', data: model });
    } catch (err) {
      next(err);
    }
  }

  public static async adminDeleteModel(req: AuthenticatedAdminRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const model = await SmartphoneModel.findByIdAndDelete(id);
      if (!model) return next(new AppError('Model not found', 404));

      await logAuditEvent({
        req,
        actorType: 'ADMIN',
        actorId: req.admin?.id,
        actorEmail: req.admin?.email,
        action: 'DELETE_MODEL',
        resourceType: 'SmartphoneModel',
        resourceId: id,
      });

      res.status(200).json({ success: true, message: 'Model deleted successfully.' });
    } catch (err) {
      next(err);
    }
  }

  public static async adminCreateVariant(req: AuthenticatedAdminRequest, res: Response, next: NextFunction) {
    try {
      const variant = await StorageVariantModel.create(req.body);

      // Create pricing rule variation for this storage variant
      const model = await SmartphoneModel.findById(variant.modelId);
      if (model) {
        await PricingRuleModel.create({
          modelId: model._id,
          variantId: variant._id,
          basePrice: model.basePrice,
          storagePriceAdjustment: variant.priceModifier,
          version: 1,
          isActive: true,
        });
      }

      res.status(201).json({ success: true, message: 'Storage variant added.', data: variant });
    } catch (err) {
      next(err);
    }
  }

  // --- Multi-Category Endpoints ---
  public static async getCategories(req: Request, res: Response, next: NextFunction) {
    try {
      let categories = await CategoryModel.find({ isActive: true }).sort({ displayOrder: 1 });
      if (categories.length === 0) {
        // Default official categories
        const defaults = [
          { name: 'Mobile Phones', slug: 'mobile', iconName: 'phone_android', description: 'Instant valuation & free doorstep pickup', isActive: true, displayOrder: 1, badgeText: 'Most Popular' },
          { name: 'Laptops', slug: 'laptop', iconName: 'laptop_chromebook', description: 'MacBook, Dell, HP, ThinkPad & more', isActive: true, displayOrder: 2, badgeText: 'High Value' },
          { name: 'Tablets & iPads', slug: 'tablet', iconName: 'tablet_mac', description: 'Apple iPads, Galaxy Tab & Surface', isActive: true, displayOrder: 3, badgeText: 'Instant Cash' },
          { name: 'MacBooks', slug: 'macbook', iconName: 'laptop_mac', description: 'MacBook Air & MacBook Pro M-Series', isActive: true, displayOrder: 4, badgeText: 'Top Payout' },
          { name: 'Wireless Earbuds', slug: 'earbuds', iconName: 'headphones', description: 'AirPods, Galaxy Buds, Sony ANC', isActive: true, displayOrder: 5, badgeText: 'Doorstep Pickup' },
          { name: 'Smart TVs', slug: 'smart_tv', iconName: 'tv', description: '4K UHD, OLED & QLED Large Screens', isActive: true, displayOrder: 6, badgeText: 'Free Inspection' },
          { name: 'Refrigerators', slug: 'refrigerator', iconName: 'kitchen', description: 'Double Door, Frost Free & Smart Fridges', isActive: true, displayOrder: 7, badgeText: 'Heavy Appliance Pickup' },
        ];
        categories = await CategoryModel.insertMany(defaults);
      }
      res.status(200).json({ success: true, data: categories });
    } catch (err) {
      next(err);
    }
  }

  // --- Refurbished Second-Hand Phones (Buy Section) ---
  public static async getRefurbishedProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const { search, brand, grade, maxPrice, category } = req.query;
      const query: any = { inStock: true };

      if (category && typeof category === 'string' && category !== 'all' && category !== 'ALL') {
        query.category = new RegExp(category, 'i');
      }
      if (brand && typeof brand === 'string' && brand !== 'ALL') {
        query.brand = new RegExp(brand, 'i');
      }
      if (grade && typeof grade === 'string') {
        query.grade = grade;
      }
      if (maxPrice && !isNaN(Number(maxPrice))) {
        query.salePrice = { $lte: Number(maxPrice) };
      }
      if (search && typeof search === 'string' && search.trim() !== '') {
        query.$or = [
          { name: new RegExp(search.trim(), 'i') },
          { brand: new RegExp(search.trim(), 'i') },
          { offerTag: new RegExp(search.trim(), 'i') },
        ];
      }

      let products = await RefurbishedProductModel.find(query).sort({ isFeatured: -1, createdAt: -1 });

      if (products.length === 0 && !search && !brand && !grade && !maxPrice) {
        // Seed default high-quality second-hand inventory across all brands
        const defaultRefurbished = [
          {
            name: 'iPhone 15 Pro',
            brand: 'Apple',
            storage: '256GB',
            color: 'Natural Titanium',
            grade: DeviceGrade.PRISTINE,
            batteryHealth: 99,
            originalPrice: 134900,
            salePrice: 84999,
            discountPercentage: 37,
            warrantyMonths: 12,
            imageUrl: 'https://pub-ebb60884050ceb5a3565e132a7ef9394.r2.dev/revoo/uploads/devices/iphone-15-pro.png',
            inspectionScore: 99,
            inStock: true,
            isFeatured: true,
            highlights: ['A17 Pro Titanium Architecture', '12-Month REVOO Warranty', 'Original Box & Cable Included', 'Free 7-Day Replacement'],
          },
          {
            name: 'Galaxy S24 Ultra 5G',
            brand: 'Samsung',
            storage: '256GB',
            color: 'Titanium Gray',
            grade: DeviceGrade.PRISTINE,
            batteryHealth: 98,
            originalPrice: 129999,
            salePrice: 81999,
            discountPercentage: 37,
            warrantyMonths: 12,
            imageUrl: 'https://pub-ebb60884050ceb5a3565e132a7ef9394.r2.dev/revoo/uploads/devices/galaxy-s24-ultra.png',
            inspectionScore: 99,
            inStock: true,
            isFeatured: true,
            highlights: ['Galaxy AI Enabled', 'S-Pen Verified & Pristine', '12-Month REVOO Warranty', 'Free Doorstep Delivery'],
          },
          {
            name: 'Vivo X100 Pro 5G',
            brand: 'Vivo',
            storage: '256GB',
            color: 'Sunset Orange',
            grade: DeviceGrade.PRISTINE,
            batteryHealth: 97,
            originalPrice: 89999,
            salePrice: 56999,
            discountPercentage: 37,
            warrantyMonths: 12,
            imageUrl: 'https://pub-ebb60884050ceb5a3565e132a7ef9394.r2.dev/revoo/uploads/devices/vivo-x100-pro.png',
            inspectionScore: 98,
            inStock: true,
            isFeatured: true,
            highlights: ['Zeiss APO Telephoto Camera', 'Dimensity 9300 Flagship', '12-Month Warranty', '32-Point Quality Certified'],
          },
          {
            name: 'Oppo Find X7 Ultra',
            brand: 'Oppo',
            storage: '256GB',
            color: 'Sepia Brown Leather',
            grade: DeviceGrade.EXCELLENT,
            batteryHealth: 96,
            originalPrice: 94999,
            salePrice: 59999,
            discountPercentage: 37,
            warrantyMonths: 12,
            imageUrl: 'https://pub-ebb60884050ceb5a3565e132a7ef9394.r2.dev/revoo/uploads/devices/oppo-find-x7-ultra.png',
            inspectionScore: 97,
            inStock: true,
            isFeatured: false,
            highlights: ['Dual Periscope Telephoto', 'Hasselblad Color Science', '100W Fast Charger Included', 'Zero Defects'],
          },
          {
            name: 'Nothing Phone (2)',
            brand: 'Nothing',
            storage: '256GB',
            color: 'Dark Gray',
            grade: DeviceGrade.PRISTINE,
            batteryHealth: 98,
            originalPrice: 49999,
            salePrice: 32999,
            discountPercentage: 34,
            warrantyMonths: 12,
            imageUrl: 'https://pub-ebb60884050ceb5a3565e132a7ef9394.r2.dev/revoo/uploads/devices/nothing-phone-2.png',
            inspectionScore: 98,
            inStock: true,
            isFeatured: true,
            highlights: ['Glyph Interface Matrix 100% Tested', 'Snapdragon 8+ Gen 1', 'Clean Nothing OS 2.5', '12-Month Warranty'],
          },
          {
            name: 'Redmi Note 13 Pro+ 5G',
            brand: 'Redmi',
            storage: '256GB',
            color: 'Fusion Purple',
            grade: DeviceGrade.EXCELLENT,
            batteryHealth: 96,
            originalPrice: 33999,
            salePrice: 21999,
            discountPercentage: 35,
            warrantyMonths: 6,
            imageUrl: 'https://pub-ebb60884050ceb5a3565e132a7ef9394.r2.dev/revoo/uploads/devices/redmi-note-13-pro-plus.png',
            inspectionScore: 96,
            inStock: true,
            isFeatured: false,
            highlights: ['200MP OIS Camera Verified', '120W HyperCharge Ready', 'IP68 Water Resistance Tested', '6-Month Warranty'],
          },
          {
            name: 'Realme 12 Pro+ 5G',
            brand: 'Realme',
            storage: '256GB',
            color: 'Submarine Blue',
            grade: DeviceGrade.EXCELLENT,
            batteryHealth: 95,
            originalPrice: 31999,
            salePrice: 20499,
            discountPercentage: 36,
            warrantyMonths: 6,
            imageUrl: 'https://pub-ebb60884050ceb5a3565e132a7ef9394.r2.dev/revoo/uploads/devices/realme-12-pro-plus.png',
            inspectionScore: 95,
            inStock: true,
            isFeatured: false,
            highlights: ['Periscope Portrait Camera', 'Luxury Watch Dial Design', 'Vegan Leather Back', '6-Month Warranty'],
          },
          {
            name: 'iQOO 12 5G',
            brand: 'iQOO',
            storage: '256GB',
            color: 'Legend White BMW',
            grade: DeviceGrade.PRISTINE,
            batteryHealth: 99,
            originalPrice: 59999,
            salePrice: 42999,
            discountPercentage: 28,
            warrantyMonths: 12,
            imageUrl: 'https://pub-ebb60884050ceb5a3565e132a7ef9394.r2.dev/revoo/uploads/devices/iqoo-12-5g.png',
            inspectionScore: 99,
            inStock: true,
            isFeatured: true,
            highlights: ['Snapdragon 8 Gen 3 Gaming Beast', 'Supercomputing Chip Q1', '120W FlashCharge', '12-Month Warranty'],
          },
          {
            name: 'OnePlus 12 5G',
            brand: 'OnePlus',
            storage: '256GB',
            color: 'Flowy Emerald',
            grade: DeviceGrade.PRISTINE,
            batteryHealth: 98,
            originalPrice: 64999,
            salePrice: 44999,
            discountPercentage: 31,
            warrantyMonths: 12,
            imageUrl: 'https://pub-ebb60884050ceb5a3565e132a7ef9394.r2.dev/revoo/uploads/devices/oneplus-12.png',
            inspectionScore: 98,
            inStock: true,
            isFeatured: true,
            highlights: ['4th Gen Hasselblad Camera', '2K ProXDR 120Hz Display', '100W SuperVOOC', '12-Month Warranty'],
          },
          {
            name: 'Pixel 8 Pro',
            brand: 'Google',
            storage: '128GB',
            color: 'Bay Blue',
            grade: DeviceGrade.EXCELLENT,
            batteryHealth: 96,
            originalPrice: 106999,
            salePrice: 54999,
            discountPercentage: 49,
            warrantyMonths: 12,
            imageUrl: 'https://pub-ebb60884050ceb5a3565e132a7ef9394.r2.dev/revoo/uploads/devices/pixel-8-pro.png',
            inspectionScore: 97,
            inStock: true,
            isFeatured: true,
            highlights: ['Google Tensor G3 & Best Take AI', 'Temperature Sensor Tested', 'Pro Camera Controls', '12-Month Warranty'],
          },
        ];
        products = await RefurbishedProductModel.insertMany(defaultRefurbished);
      }

      res.status(200).json({ success: true, count: products.length, data: products });
    } catch (err) {
      next(err);
    }
  }

  public static async adminListRefurbishedProducts(req: AuthenticatedAdminRequest, res: Response, next: NextFunction) {
    try {
      const { search, brand, category, inStock } = req.query;
      const query: any = {};
      if (brand && typeof brand === 'string' && brand !== 'ALL') {
        query.brand = new RegExp(`^${brand}$`, 'i');
      }
      if (category && typeof category === 'string' && category !== 'ALL') {
        query.category = new RegExp(category, 'i');
      }
      if (inStock !== undefined && inStock !== 'ALL' && inStock !== '') {
        query.inStock = String(inStock) === 'true';
      }
      if (search && typeof search === 'string' && search.trim() !== '') {
        query.$or = [
          { name: new RegExp(search.trim(), 'i') },
          { brand: new RegExp(search.trim(), 'i') },
          { offerTag: new RegExp(search.trim(), 'i') },
        ];
      }
      const products = await RefurbishedProductModel.find(query).sort({ createdAt: -1 });
      res.status(200).json({ success: true, count: products.length, data: products });
    } catch (err) {
      next(err);
    }
  }

  public static async adminCreateRefurbishedProduct(req: AuthenticatedAdminRequest, res: Response, next: NextFunction) {
    try {
      const payload = { ...req.body };
      if (payload.originalPrice && payload.salePrice && (!payload.discountPercentage || payload.discountPercentage === 0)) {
        payload.discountPercentage = Math.max(0, Math.round(((payload.originalPrice - payload.salePrice) / payload.originalPrice) * 100));
      }
      const product = await RefurbishedProductModel.create(payload);
      res.status(201).json({ success: true, message: 'Certified phone listed in buy store successfully.', data: product });
    } catch (err) {
      next(err);
    }
  }

  public static async adminUpdateRefurbishedProduct(req: AuthenticatedAdminRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const payload = { ...req.body };
      delete payload._id;
      delete payload.__v;
      delete payload.createdAt;
      delete payload.updatedAt;

      if (payload.originalPrice && payload.salePrice && (!payload.discountPercentage || payload.discountPercentage === 0)) {
        payload.discountPercentage = Math.max(0, Math.round(((payload.originalPrice - payload.salePrice) / payload.originalPrice) * 100));
      }

      let product: any = null;
      if (id && mongoose.Types.ObjectId.isValid(id)) {
        product = await RefurbishedProductModel.findByIdAndUpdate(id, { $set: payload }, { new: true });
      }
      if (!product && id) {
        product = await RefurbishedProductModel.findOneAndUpdate(
          { $or: [{ name: new RegExp(`^${id}$`, 'i') }, { offerTag: id }] },
          { $set: payload },
          { new: true }
        );
      }

      if (!product) {
        return res.status(404).json({ success: false, message: 'Certified phone not found.' });
      }
      res.status(200).json({ success: true, message: 'Certified phone updated successfully.', data: product });
    } catch (err) {
      next(err);
    }
  }

  public static async adminDeleteRefurbishedProduct(req: AuthenticatedAdminRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      let product: any = null;
      if (id && mongoose.Types.ObjectId.isValid(id)) {
        product = await RefurbishedProductModel.findByIdAndDelete(id);
      }
      if (!product && id) {
        product = await RefurbishedProductModel.findOneAndDelete({
          $or: [{ name: new RegExp(`^${id}$`, 'i') }, { offerTag: id }],
        });
      }
      if (!product) {
        return res.status(404).json({ success: false, message: 'Certified phone not found.' });
      }
      res.status(200).json({ success: true, message: 'Certified phone deleted from store inventory.' });
    } catch (err) {
      next(err);
    }
  }

  // --- Verified Customer Reviews (For Sell & Buy) ---
  public static async getCustomerReviews(req: Request, res: Response, next: NextFunction) {
    try {
      const { type } = req.query; // 'sell' or 'buy'
      const sellReviews = [
        {
          id: 'rev-s-1',
          name: 'Arjun Nambiar',
          city: 'Bengaluru',
          rating: 5,
          type: 'SELL',
          device: 'iPhone 13 Pro (128GB)',
          amount: 47500,
          quote: 'Sold my iPhone in less than 3 hours from booking. The collection executive tested the screen and transferred ₹47,500 instantly to my Google Pay before stepping out!',
          date: 'Yesterday',
          verified: true,
        },
        {
          id: 'rev-s-2',
          name: 'Pooja Deshmukh',
          city: 'Pune',
          rating: 5,
          type: 'SELL',
          device: 'Samsung Galaxy S22 Ultra',
          amount: 42000,
          quote: 'Local shops offered only ₹34k citing minor edge wear. REVOO gave an indicative estimate of ₹44k and paid ₹42k after physical check. Truly transparent pricing!',
          date: '3 days ago',
          verified: true,
        },
        {
          id: 'rev-s-3',
          name: 'Karan Singhania',
          city: 'Delhi NCR',
          rating: 5,
          type: 'SELL',
          device: 'OnePlus 10 Pro',
          amount: 26000,
          quote: 'Free doorstep pickup was on exact time. Data erasure certificate gave me complete peace of mind before handing the device over. 10/10 service!',
          date: '1 week ago',
          verified: true,
        },
      ];

      const buyReviews = [
        {
          id: 'rev-b-1',
          name: 'Rohan Varma',
          city: 'Mumbai',
          rating: 5,
          type: 'BUY',
          device: 'Certified iPhone 14 Pro',
          amount: 66999,
          quote: 'Got this pristine iPhone 14 Pro at almost half price. Battery health is at 98%, not a single mark on the display, and 1-year REVOO warranty card was inside the box!',
          date: '2 days ago',
          verified: true,
        },
        {
          id: 'rev-b-2',
          name: 'Meera Iyer',
          city: 'Chennai',
          rating: 5,
          type: 'BUY',
          device: 'Galaxy S23 Ultra',
          amount: 58999,
          quote: 'Looked completely brand new. 32-point inspection diagnostic report was shared with the delivery. Best experience buying refurbished electronics in India.',
          date: '4 days ago',
          verified: true,
        },
      ];

      const reviews = type === 'buy' ? buyReviews : type === 'sell' ? sellReviews : [...sellReviews, ...buyReviews];
      res.status(200).json({ success: true, count: reviews.length, data: reviews });
    } catch (err) {
      next(err);
    }
  }

  // --- Banner Management (Admin Editable) ---
  public static async getBanners(req: Request, res: Response, next: NextFunction) {
    try {
      let banners = await BannerModel.find({ isActive: true }).sort({ displayOrder: 1, createdAt: -1 });

      if (banners.length === 0) {
        const defaultBanners = [
          {
            tag: 'INSTANT VALUATION',
            title: 'Sell Old Phone at Highest Price',
            subtitle: 'Zero deductions for normal wear • Free doorstep pickup',
            badge: 'Verified Payout',
            color1: '#0F172A',
            color2: '#1E293B',
            icon: 'flash_on',
            linkUrl: '/catalogue/brands',
            isActive: true,
            displayOrder: 1,
          },
          {
            tag: 'REVOO GREEN FINANCE',
            title: 'Instant UPI Cash in 60 Seconds',
            subtitle: 'Payment credited to UPI / Bank before inspector leaves',
            badge: '100% Guaranteed',
            color1: '#0B6623',
            color2: '#073814',
            icon: 'account_balance_wallet',
            linkUrl: '/catalogue/brands',
            isActive: true,
            displayOrder: 2,
          },
          {
            tag: 'DATA SECURITY',
            title: 'Certified ISO Data Erasure',
            subtitle: 'Government-grade data wipe certificate issued instantly',
            badge: 'Zero Data Risk',
            color1: '#1E3A8A',
            color2: '#0F172A',
            icon: 'shield_outlined',
            linkUrl: '/catalogue/brands',
            isActive: true,
            displayOrder: 3,
          },
        ];
        banners = await BannerModel.insertMany(defaultBanners);
      }

      res.status(200).json({ success: true, data: banners });
    } catch (err) {
      next(err);
    }
  }

  public static async adminListBanners(req: AuthenticatedAdminRequest, res: Response, next: NextFunction) {
    try {
      const banners = await BannerModel.find().sort({ displayOrder: 1, createdAt: -1 });
      res.status(200).json({ success: true, data: banners });
    } catch (err) {
      next(err);
    }
  }

  public static async adminCreateBanner(req: AuthenticatedAdminRequest, res: Response, next: NextFunction) {
    try {
      const banner = await BannerModel.create(req.body);
      res.status(201).json({ success: true, message: 'Banner created successfully.', data: banner });
    } catch (err) {
      next(err);
    }
  }

  public static async adminUpdateBanner(req: AuthenticatedAdminRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const banner = await BannerModel.findByIdAndUpdate(id, req.body, { new: true });
      if (!banner) return next(new AppError('Banner not found.', 404));
      res.status(200).json({ success: true, message: 'Banner updated successfully.', data: banner });
    } catch (err) {
      next(err);
    }
  }

  public static async adminDeleteBanner(req: AuthenticatedAdminRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await BannerModel.findByIdAndDelete(id);
      res.status(200).json({ success: true, message: 'Banner deleted successfully.' });
    } catch (err) {
      next(err);
    }
  }

  // --- Dedicated App Launch Popup Endpoints ---
  public static async getAppPopup(req: Request, res: Response, next: NextFunction) {
    try {
      const popup = await BannerModel.findOne({ isPopupModal: true });
      if (!popup) {
        return res.status(200).json({ success: true, data: { isEnabled: false } });
      }
      res.status(200).json({
        success: true,
        data: {
          isEnabled: popup.isActive === true,
          ...popup.toObject(),
        },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async adminSavePopup(req: AuthenticatedAdminRequest, res: Response, next: NextFunction) {
    try {
      const {
        isEnabled = false,
        tag = 'LIVE SALE',
        title = 'Special Promotion',
        subtitle = '',
        badge = 'Exclusive Deal',
        popupActionText = 'BUY NOW',
        popupActionUrl = '/buy',
        imageUrl = '',
        color1 = '#059669',
        color2 = '#022C22',
      } = req.body;

      let popup = await BannerModel.findOne({ isPopupModal: true });

      if (popup) {
        popup.isActive = isEnabled;
        popup.tag = tag;
        popup.title = title;
        popup.subtitle = subtitle;
        popup.badge = badge;
        popup.popupActionText = popupActionText;
        popup.popupActionUrl = popupActionUrl;
        popup.linkUrl = popupActionUrl;
        popup.imageUrl = imageUrl;
        popup.color1 = color1;
        popup.color2 = color2;
        await popup.save();
      } else {
        popup = await BannerModel.create({
          tag,
          title,
          subtitle,
          badge,
          icon: 'local_fire_department',
          imageUrl,
          isPopupModal: true,
          popupActionText,
          popupActionUrl,
          linkUrl: popupActionUrl,
          isActive: isEnabled,
          color1,
          color2,
          displayOrder: 0,
        });
      }

      res.status(200).json({
        success: true,
        message: 'Launch popup updated successfully.',
        data: {
          isEnabled: popup.isActive,
          ...popup.toObject(),
        },
      });
    } catch (err) {
      next(err);
    }
  }

  // --- Admin Category Endpoints ---
  public static async adminListCategories(req: AuthenticatedAdminRequest, res: Response, next: NextFunction) {
    try {
      const categories = await CategoryModel.find().sort({ displayOrder: 1, createdAt: 1 });
      res.status(200).json({ success: true, data: categories });
    } catch (err) {
      next(err);
    }
  }

  public static async adminCreateCategory(req: AuthenticatedAdminRequest, res: Response, next: NextFunction) {
    try {
      const category = await CategoryModel.create(req.body);
      res.status(201).json({ success: true, message: 'Category created successfully.', data: category });
    } catch (err) {
      next(err);
    }
  }

  public static async adminUpdateCategory(req: AuthenticatedAdminRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const category = await CategoryModel.findByIdAndUpdate(id, req.body, { new: true });
      if (!category) return next(new AppError('Category not found.', 404));
      res.status(200).json({ success: true, message: 'Category updated successfully.', data: category });
    } catch (err) {
      next(err);
    }
  }

  // --- Orders & Invoices Management ---
  public static async createOrderInvoice(req: Request, res: Response, next: NextFunction) {
    try {
      const invoiceData = req.body;
      if (!invoiceData.invoiceNumber) {
        invoiceData.invoiceNumber = `REV-INV-${Math.floor(100000 + Math.random() * 900000)}`;
      }
      if (!invoiceData.orderNumber) {
        invoiceData.orderNumber = `REV-${Date.now().toString().slice(-6)}`;
      }

      const invoice = await InvoiceModel.create(invoiceData);
      res.status(201).json({
        success: true,
        message: 'Order placed & invoice generated successfully.',
        data: invoice,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async adminListInvoices(req: AuthenticatedAdminRequest, res: Response, next: NextFunction) {
    try {
      let invoices = await InvoiceModel.find().sort({ createdAt: -1 });

      if (invoices.length === 0) {
        // Seed realistic starter customer tax invoices so admin immediately sees historical data
        const sampleInvoices = [
          {
            invoiceNumber: 'REV-INV-849201',
            orderNumber: 'REV-982142',
            customerName: 'Aarav Sharma',
            customerPhone: '+91 98450 12345',
            customerEmail: 'aarav.sharma@gmail.com',
            shippingAddress: '42, Indiranagar 100ft Road, Bengaluru, Karnataka - 560038',
            addressTag: 'Home',
            productName: 'iPhone 15 Pro 256GB Natural Titanium',
            brand: 'Apple',
            storage: '256GB',
            color: 'Natural Titanium',
            grade: 'PRISTINE',
            quantity: 1,
            unitPrice: 84999,
            totalAmount: 84999,
            paymentMethod: 'Cash on Delivery (COD)',
            status: 'CONFIRMED',
            orderDate: new Date(Date.now() - 3600000 * 4),
          },
          {
            invoiceNumber: 'REV-INV-732915',
            orderNumber: 'REV-610492',
            customerName: 'Priya Sundaram',
            customerPhone: '+91 99620 67890',
            customerEmail: 'priya.sundaram@outlook.com',
            shippingAddress: '15, Anna Nagar 2nd Avenue, Chennai, Tamil Nadu - 600040',
            addressTag: 'Work',
            productName: 'Galaxy S24 Ultra 256GB Titanium Gray',
            brand: 'Samsung',
            storage: '256GB',
            color: 'Titanium Gray',
            grade: 'EXCELLENT',
            quantity: 1,
            unitPrice: 74999,
            totalAmount: 74999,
            paymentMethod: 'Instant UPI Transfer',
            status: 'CONFIRMED',
            orderDate: new Date(Date.now() - 3600000 * 24),
          },
          {
            invoiceNumber: 'REV-INV-619482',
            orderNumber: 'REV-452109',
            customerName: 'Vikram Joshi',
            customerPhone: '+91 97110 54321',
            customerEmail: 'vikram.joshi@techcorp.in',
            shippingAddress: 'Flat 702, Lodha Bellissimo, Worli, Mumbai, Maharashtra - 400018',
            addressTag: 'Home',
            productName: 'OnePlus 12 512GB Silky Black',
            brand: 'OnePlus',
            storage: '512GB',
            color: 'Silky Black',
            grade: 'GOOD',
            quantity: 1,
            unitPrice: 47999,
            totalAmount: 47999,
            paymentMethod: 'Pre-order Direct Verification',
            status: 'PROCESSING',
            orderDate: new Date(Date.now() - 3600000 * 48),
          },
        ];
        invoices = await InvoiceModel.insertMany(sampleInvoices);
      }

      res.status(200).json({ success: true, count: invoices.length, data: invoices });
    } catch (err) {
      next(err);
    }
  }
}

