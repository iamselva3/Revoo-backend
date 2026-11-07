import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import crypto from 'crypto';
import { BuybackRequestModel } from '../../infrastructure/database/models/BuybackRequest.js';
import { SmartphoneModel } from '../../infrastructure/database/models/SmartphoneModel.js';
import { StorageVariantModel } from '../../infrastructure/database/models/StorageVariant.js';
import { PricingRuleModel } from '../../infrastructure/database/models/PricingRule.js';
import { InspectionModel } from '../../infrastructure/database/models/Inspection.js';
import { FinalOfferModel } from '../../infrastructure/database/models/FinalOffer.js';
import { CustomerOfferDecisionModel } from '../../infrastructure/database/models/CustomerOfferDecision.js';
import { PaymentModel } from '../../infrastructure/database/models/Payment.js';
import { DeviceReturnModel } from '../../infrastructure/database/models/DeviceReturn.js';
import { ValuationEngine } from '../../domain/services/ValuationEngine.js';
import { NotificationService } from '../../infrastructure/notifications/NotificationService.js';
import { AppError, RequestStatus, FinalOfferStatus, PaymentStatus, ReturnStatus } from '../../shared/types.js';
import { logAuditEvent } from '../middlewares/audit.middleware.js';
import { AuthenticatedCustomerRequest, AuthenticatedAdminRequest } from '../middlewares/auth.middleware.js';
import { StorageService } from '../../infrastructure/storage/StorageService.js';
import { DeviceImageModel } from '../../infrastructure/database/models/DeviceImage.js';
import { config } from '../../config/index.js';

export class BuybackRequestController {
  // --- Customer Operations ---
  public static async submitRequest(req: AuthenticatedCustomerRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const rawBody = req.body || {};
      const modelId = rawBody.modelId || rawBody.device?.modelId || rawBody.device?.modelName;
      const variantId = rawBody.variantId || rawBody.device?.variantId;
      const declaredCondition = rawBody.declaredCondition || rawBody.conditions || {};
      const pickupAddress = rawBody.pickupAddress;
      const photoUrls = rawBody.photoUrls;

      let model: any = null;
      if (mongoose.Types.ObjectId.isValid(modelId)) {
        model = await SmartphoneModel.findById(modelId).populate('brandId', 'name');
      }
      if (!model) {
        model = await SmartphoneModel.findOne({
          $or: [
            { slug: modelId },
            { name: new RegExp(String(modelId).replace(/[-_]/g, ' '), 'i') },
          ],
        }).populate('brandId', 'name');
      }
      if (!model) {
        model = await SmartphoneModel.findOne({ isPublished: true, isArchived: false }).populate('brandId', 'name');
      }

      if (!model || model.isArchived) {
        return next(new AppError('Selected smartphone model is unavailable.', 400));
      }

      let storageCapacity = 'Standard';
      let storagePriceAdjustment = 0;
      if (variantId && mongoose.Types.ObjectId.isValid(variantId)) {
        const variant = await StorageVariantModel.findById(variantId);
        if (variant) {
          storageCapacity = variant.capacity;
          storagePriceAdjustment = variant.priceModifier;
        }
      }

      // Authoritative pricing calculation
      let pricingRule = null;
      if (mongoose.Types.ObjectId.isValid(model._id)) {
        pricingRule = await PricingRuleModel.findOne({ modelId: model._id, isActive: true }).sort({ version: -1 });
      }

      if (!pricingRule) {
        pricingRule = await PricingRuleModel.create({
          modelId: model._id,
          variantId: variantId && mongoose.Types.ObjectId.isValid(variantId) ? variantId : undefined,
          basePrice: model.basePrice || 35000,
          storagePriceAdjustment,
          version: 1,
          isActive: true,
        });
      }

      // Normalize declared condition for both DOFY and legacy formats
      const normCondition: any = { ...(declaredCondition || {}) };
      if (!normCondition.basicQuestions && (
        normCondition.isPhoneWorking !== undefined || normCondition.isTouchscreenWorking !== undefined ||
        normCondition.isDisplayOriginal !== undefined || normCondition.hasValidWarranty !== undefined
      )) {
        normCondition.basicQuestions = {
          isPhoneWorking: normCondition.isPhoneWorking !== false && normCondition.isPhoneWorking !== 'false',
          isTouchscreenWorking: normCondition.isTouchscreenWorking !== false && normCondition.isTouchscreenWorking !== 'false',
          isDisplayOriginal: normCondition.isDisplayOriginal !== false && normCondition.isDisplayOriginal !== 'false',
          hasValidWarranty: normCondition.hasValidWarranty === true || normCondition.hasValidWarranty === 'true',
        };
      }
      if (!normCondition.hardwareFaults && (
        normCondition.volumeButtonNotWorking !== undefined || normCondition.powerButtonNotWorking !== undefined ||
        normCondition.chargingPortNotWorking !== undefined || normCondition.wifiOrBluetoothNotWorking !== undefined ||
        normCondition.proximitySensorNotWorking !== undefined || normCondition.earSpeakerNotWorking !== undefined ||
        normCondition.vibratorNotWorking !== undefined
      )) {
        normCondition.hardwareFaults = {
          volumeButtonNotWorking: normCondition.volumeButtonNotWorking === true || normCondition.volumeButtonNotWorking === 'true',
          wifiOrBluetoothNotWorking: normCondition.wifiOrBluetoothNotWorking === true || normCondition.wifiOrBluetoothNotWorking === 'true',
          chargingPortNotWorking: normCondition.chargingPortNotWorking === true || normCondition.chargingPortNotWorking === 'true',
          proximitySensorNotWorking: normCondition.proximitySensorNotWorking === true || normCondition.proximitySensorNotWorking === 'true',
          powerButtonNotWorking: normCondition.powerButtonNotWorking === true || normCondition.powerButtonNotWorking === 'true',
          earSpeakerNotWorking: normCondition.earSpeakerNotWorking === true || normCondition.earSpeakerNotWorking === 'true',
          vibratorNotWorking: normCondition.vibratorNotWorking === true || normCondition.vibratorNotWorking === 'true',
        };
      }

      const valuation = ValuationEngine.calculate(
        {
          id: pricingRule._id.toString(),
          modelId: pricingRule.modelId.toString(),
          variantId: pricingRule.variantId?.toString() || '',
          basePrice: pricingRule.basePrice,
          storagePriceAdjustment: pricingRule.storagePriceAdjustment,
          deductions: pricingRule.deductions as any,
          version: pricingRule.version,
          isActive: pricingRule.isActive,
          effectiveFrom: pricingRule.effectiveFrom,
        },
        normCondition
      );

      // Generate unique sequential request number: GENIE-2026-XXXX
      const count = await BuybackRequestModel.countDocuments();
      const requestNumber = `GENIE-${new Date().getFullYear()}-${(1000 + count + 1).toString()}`;

      const buybackRequest = await BuybackRequestModel.create({
        requestNumber,
        userId,
        customerDetails: {
          fullName: req.user?.email || req.user?.phone || 'Valued Customer',
          phone: req.user?.phone || 'N/A',
          email: req.user?.email,
        },
        deviceDetails: {
          brandId: (model.brandId as any)._id,
          brandName: (model.brandId as any).name,
          modelId: model._id,
          modelName: model.name,
          variantId: variantId && mongoose.Types.ObjectId.isValid(variantId) ? variantId : undefined,
          storageCapacity,
        },
        declaredCondition,
        indicativeEstimate: {
          basePrice: valuation.basePrice,
          storageAdjustment: valuation.storageAdjustment,
          totalDeductions: valuation.totalDeductions,
          totalBonuses: valuation.totalBonuses,
          estimatedAmount: valuation.finalCalculatedAmount,
          pricingRuleVersion: valuation.pricingRuleVersion,
          breakdown: valuation.breakdown,
        },
        photoUrls: photoUrls || [],
        pickupAddress,
        status: RequestStatus.SUBMITTED,
        timeline: [
          {
            status: RequestStatus.SUBMITTED,
            timestamp: new Date(),
            note: 'Buyback request submitted by customer with indicative valuation.',
            updatedBy: 'Customer',
          },
        ],
      });

      // Dispatch notification to operations
      await NotificationService.notify({
        recipientType: 'ADMIN',
        destination: 'admin@revoo.com',
        channel: 'IN_APP',
        title: `New Buyback Request: ${requestNumber}`,
        body: `New request for ${model.name} (${storageCapacity}) with estimate ₹${valuation.finalCalculatedAmount}.`,
        metadata: { requestId: buybackRequest._id, requestNumber },
      });

      res.status(201).json({
        success: true,
        message: 'Buyback request submitted successfully.',
        data: buybackRequest,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getMyRequests(req: AuthenticatedCustomerRequest, res: Response, next: NextFunction) {
    try {
      const requests = await BuybackRequestModel.find({ userId: req.user?.id }).sort({ createdAt: -1 });
      res.status(200).json({ success: true, data: requests });
    } catch (err) {
      next(err);
    }
  }

  public static async getMyRequestDetails(req: AuthenticatedCustomerRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const request = await BuybackRequestModel.findOne({ _id: id, userId: req.user?.id })
        .populate('activeOfferId')
        .populate('inspectionId')
        .populate('paymentId')
        .populate('returnId');

      if (!request) {
        return next(new AppError('Buyback request not found.', 404));
      }

      res.status(200).json({ success: true, data: request });
    } catch (err) {
      next(err);
    }
  }

  public static async handleCustomerOfferDecision(req: AuthenticatedCustomerRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { decision, rejectionReason } = req.body;

      const request = await BuybackRequestModel.findOne({ _id: id, userId: req.user?.id });
      if (!request) return next(new AppError('Request not found.', 404));

      if (request.status !== RequestStatus.AWAITING_CUSTOMER_DECISION && request.status !== RequestStatus.FINAL_OFFER_GENERATED) {
        return next(new AppError(`Cannot make decision on request in status: ${request.status}`, 400));
      }

      const activeOffer = await FinalOfferModel.findOne({ requestId: request._id, status: FinalOfferStatus.ISSUED });
      if (!activeOffer) {
        return next(new AppError('No active final offer found for this request.', 404));
      }

      const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
      const userAgent = req.headers['user-agent'] || '';

      // Record immutable customer decision
      await CustomerOfferDecisionModel.create({
        requestId: request._id,
        offerId: activeOffer._id,
        decision,
        rejectionReason: decision === 'REJECTED' ? rejectionReason : undefined,
        ipAddress: Array.isArray(ipAddress) ? ipAddress[0] : ipAddress,
        userAgent,
      });

      // Update offer status
      activeOffer.status = decision === 'ACCEPTED' ? FinalOfferStatus.ACCEPTED : FinalOfferStatus.REJECTED;
      activeOffer.customerDecision = decision;
      activeOffer.decidedAt = new Date();
      activeOffer.rejectionReason = rejectionReason;
      await activeOffer.save();

      // Transition request status
      const nextStatus = decision === 'ACCEPTED' ? RequestStatus.OFFER_ACCEPTED : RequestStatus.OFFER_REJECTED;
      request.status = nextStatus;
      request.timeline.push({
        status: nextStatus,
        timestamp: new Date(),
        note: decision === 'ACCEPTED' 
          ? `Customer accepted final offer of ₹${activeOffer.finalOfferedAmount}. Proceeding to payment.`
          : `Customer rejected final offer of ₹${activeOffer.finalOfferedAmount}. Reason: ${rejectionReason || 'None stated'}. Proceeding to return coordination.`,
        updatedBy: 'Customer',
      });
      await request.save();

      // Notify Admin
      await NotificationService.notify({
        recipientType: 'ADMIN',
        destination: 'admin@revoo.com',
        channel: 'IN_APP',
        title: `Offer ${decision} for ${request.requestNumber}`,
        body: `Customer ${decision.toLowerCase()} offer for ${request.deviceDetails.modelName}. Amount: ₹${activeOffer.finalOfferedAmount}.`,
        metadata: { requestId: request._id, decision },
      });

      res.status(200).json({
        success: true,
        message: `Offer ${decision.toLowerCase()} successfully.`,
        data: { request, offer: activeOffer },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async uploadDeviceImage(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        return next(new AppError('No file uploaded or file rejected by validator.', 400));
      }

      let fileUrl = StorageService.getFileUrl(req.file.filename);
      if (config.storage.driver === 'r2') {
        fileUrl = await StorageService.uploadToR2(req.file.filename, req.file.path, req.file.mimetype);
      }

      const deviceImage = await DeviceImageModel.create({
        imageUrl: fileUrl,
        imageType: req.body.imageType || 'CUSTOMER_FRONT',
        uploadedByRole: 'CUSTOMER',
        fileSizeBytes: req.file.size,
        mimeType: req.file.mimetype,
      });

      res.status(201).json({
        success: true,
        message: 'Image uploaded successfully.',
        data: {
          id: deviceImage._id,
          imageUrl: fileUrl,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  // --- Admin Operations ---
  public static async adminListRequests(req: AuthenticatedAdminRequest, res: Response, next: NextFunction) {
    try {
      const { status, brandId, search, page = '1', limit = '20' } = req.query;
      const filter: any = {};

      if (status) filter.status = status;
      if (brandId) filter['deviceDetails.brandId'] = brandId;
      if (search) {
        filter.$or = [
          { requestNumber: { $regex: search, $options: 'i' } },
          { 'customerDetails.fullName': { $regex: search, $options: 'i' } },
          { 'customerDetails.phone': { $regex: search, $options: 'i' } },
          { 'deviceDetails.modelName': { $regex: search, $options: 'i' } },
        ];
      }

      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      const skip = (pageNum - 1) * limitNum;

      const [requests, total] = await Promise.all([
        BuybackRequestModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
        BuybackRequestModel.countDocuments(filter),
      ]);

      res.status(200).json({
        success: true,
        data: requests,
        meta: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async adminGetRequestDetails(req: AuthenticatedAdminRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const request = await BuybackRequestModel.findById(id)
        .populate('userId', 'fullName phone email address')
        .populate('activeOfferId')
        .populate('inspectionId')
        .populate('paymentId')
        .populate('returnId');

      if (!request) return next(new AppError('Request not found', 404));

      res.status(200).json({ success: true, data: request });
    } catch (err) {
      next(err);
    }
  }

  public static async adminAssignCollection(req: AuthenticatedAdminRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { collectorStaffId, collectorStaffName, scheduledDate, timeSlot, notes } = req.body;

      const request = await BuybackRequestModel.findById(id);
      if (!request) return next(new AppError('Request not found', 404));

      request.assignedCollector = {
        staffId: collectorStaffId,
        staffName: collectorStaffName,
        scheduledDate: new Date(scheduledDate),
        timeSlot: timeSlot || 'Morning (10 AM - 1 PM)',
      };
      request.status = RequestStatus.ASSIGNED_FOR_COLLECTION;
      request.timeline.push({
        status: RequestStatus.ASSIGNED_FOR_COLLECTION,
        timestamp: new Date(),
        note: `Collection assigned to ${collectorStaffName} for ${new Date(scheduledDate).toLocaleDateString()}. Notes: ${notes || 'None'}`,
        updatedBy: req.admin?.fullName || 'Admin',
      });
      await request.save();

      await logAuditEvent({
        req,
        actorType: 'ADMIN',
        actorId: req.admin?.id,
        actorEmail: req.admin?.email,
        action: 'ASSIGN_COLLECTION',
        resourceType: 'BuybackRequest',
        resourceId: request._id.toString(),
        diff: { collectorStaffName, scheduledDate },
      });

      res.status(200).json({ success: true, message: 'Collection staff assigned successfully.', data: request });
    } catch (err) {
      next(err);
    }
  }

  public static async adminUpdateCollectionStatus(req: AuthenticatedAdminRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;

      const request = await BuybackRequestModel.findById(id);
      if (!request) return next(new AppError('Request not found', 404));

      request.status = status;
      request.timeline.push({
        status,
        timestamp: new Date(),
        note: notes || `Collection status updated to ${status}.`,
        updatedBy: req.admin?.fullName || 'Admin',
      });
      await request.save();

      res.status(200).json({ success: true, message: 'Collection status updated.', data: request });
    } catch (err) {
      next(err);
    }
  }

  public static async adminSubmitInspection(req: AuthenticatedAdminRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { actualCondition, discrepancies, evidencePhotoUrls, suggestedOfferAmount, internalInspectionNotes, customerVisibleNotes } = req.body;

      const request = await BuybackRequestModel.findById(id);
      if (!request) return next(new AppError('Request not found', 404));

      const inspection = await InspectionModel.create({
        requestId: request._id,
        inspectorId: req.admin?.id,
        inspectorName: req.admin?.fullName || 'Inspection Specialist',
        actualCondition,
        discrepancies: discrepancies || [],
        evidencePhotoUrls: evidencePhotoUrls || [],
        suggestedOfferAmount,
        internalInspectionNotes,
        customerVisibleNotes,
        completedAt: new Date(),
      });

      request.inspectionId = inspection._id as any;
      request.status = RequestStatus.UNDER_INSPECTION;
      request.timeline.push({
        status: RequestStatus.UNDER_INSPECTION,
        timestamp: new Date(),
        note: `Physical inspection completed by ${req.admin?.fullName}. Condition verified. Discrepancies noted: ${discrepancies?.length || 0}.`,
        updatedBy: req.admin?.fullName || 'Inspector',
      });
      await request.save();

      await logAuditEvent({
        req,
        actorType: 'ADMIN',
        actorId: req.admin?.id,
        actorEmail: req.admin?.email,
        action: 'SUBMIT_INSPECTION',
        resourceType: 'Inspection',
        resourceId: inspection._id.toString(),
        diff: { suggestedOfferAmount, discrepanciesCount: discrepancies?.length },
      });

      res.status(201).json({ success: true, message: 'Inspection report recorded.', data: { inspection, request } });
    } catch (err) {
      next(err);
    }
  }

  public static async adminGenerateFinalOffer(req: AuthenticatedAdminRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { finalOfferedAmount, valuationExplanation, internalNotes, validityDays = 7 } = req.body;

      const request = await BuybackRequestModel.findById(id);
      if (!request) return next(new AppError('Request not found', 404));

      // Supersede any prior open offer
      await FinalOfferModel.updateMany(
        { requestId: request._id, status: FinalOfferStatus.ISSUED },
        { status: FinalOfferStatus.SUPERSEDED }
      );

      const offerCount = await FinalOfferModel.countDocuments({ requestId: request._id });
      const offerVersion = offerCount + 1;
      const validUntil = new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000);

      const finalOffer = await FinalOfferModel.create({
        requestId: request._id,
        inspectionId: request.inspectionId,
        offerVersion,
        originalEstimatedAmount: request.indicativeEstimate.estimatedAmount,
        finalOfferedAmount,
        valuationExplanation,
        internalNotes,
        issuedByAdminId: req.admin?.id,
        issuedByAdminName: req.admin?.fullName,
        status: FinalOfferStatus.ISSUED,
        validUntil,
      });

      request.activeOfferId = finalOffer._id as any;
      request.status = RequestStatus.AWAITING_CUSTOMER_DECISION;
      request.timeline.push({
        status: RequestStatus.AWAITING_CUSTOMER_DECISION,
        timestamp: new Date(),
        note: `Final offer (v${offerVersion}) of ₹${finalOfferedAmount} generated and sent to customer. Valid until ${validUntil.toLocaleDateString()}.`,
        updatedBy: req.admin?.fullName || 'Admin',
      });
      await request.save();

      // Notify customer
      await NotificationService.notify({
        recipientType: 'USER',
        recipientId: request.userId.toString(),
        destination: request.customerDetails.phone,
        channel: 'IN_APP',
        title: `Final Offer Ready: ${request.deviceDetails.modelName}`,
        body: `Your device inspection is complete! Final offer: ₹${finalOfferedAmount}. Review and make your decision in the app.`,
        metadata: { requestId: request._id, offerId: finalOffer._id, amount: finalOfferedAmount },
      });

      await logAuditEvent({
        req,
        actorType: 'ADMIN',
        actorId: req.admin?.id,
        actorEmail: req.admin?.email,
        action: 'GENERATE_FINAL_OFFER',
        resourceType: 'FinalOffer',
        resourceId: finalOffer._id.toString(),
        diff: { offerVersion, finalOfferedAmount, originalEstimatedAmount: request.indicativeEstimate.estimatedAmount },
      });

      res.status(201).json({ success: true, message: 'Final offer generated and customer notified.', data: finalOffer });
    } catch (err) {
      next(err);
    }
  }

  public static async adminRecordPayment(req: AuthenticatedAdminRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { amount, paymentMethod, paymentReference, paymentProofUrl, notes } = req.body;

      const request = await BuybackRequestModel.findById(id);
      if (!request) return next(new AppError('Request not found', 404));

      if (request.status !== RequestStatus.OFFER_ACCEPTED && request.status !== RequestStatus.PAYMENT_PROCESSING) {
        return next(new AppError(`Cannot record payment for request in status: ${request.status}`, 400));
      }

      const payment = await PaymentModel.create({
        requestId: request._id,
        offerId: request.activeOfferId,
        amount,
        paymentMethod,
        paymentReference,
        paymentProofUrl,
        status: PaymentStatus.COMPLETED,
        recordedByAdminId: req.admin?.id,
        recordedByAdminName: req.admin?.fullName,
        notes,
        paidAt: new Date(),
      });

      request.paymentId = payment._id as any;
      request.status = RequestStatus.PAYMENT_COMPLETED;
      request.timeline.push({
        status: RequestStatus.PAYMENT_COMPLETED,
        timestamp: new Date(),
        note: `Payment of ₹${amount} recorded via ${paymentMethod} (Ref: ${paymentReference}). Transaction completed.`,
        updatedBy: req.admin?.fullName || 'Finance',
      });
      await request.save();

      // Notify customer
      await NotificationService.notify({
        recipientType: 'USER',
        recipientId: request.userId.toString(),
        destination: request.customerDetails.phone,
        channel: 'IN_APP',
        title: `Payment Received: ₹${amount}`,
        body: `Payment of ₹${amount} has been successfully dispatched for ${request.deviceDetails.modelName}. Ref: ${paymentReference}.`,
        metadata: { requestId: request._id, paymentReference, amount },
      });

      await logAuditEvent({
        req,
        actorType: 'ADMIN',
        actorId: req.admin?.id,
        actorEmail: req.admin?.email,
        action: 'RECORD_PAYMENT',
        resourceType: 'Payment',
        resourceId: payment._id.toString(),
        diff: { amount, paymentMethod, paymentReference },
      });

      res.status(201).json({ success: true, message: 'Payment recorded and order completed.', data: payment });
    } catch (err) {
      next(err);
    }
  }

  public static async adminInitiateReturn(req: AuthenticatedAdminRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { assignedStaffId, assignedStaffName, scheduledReturnDate, trackingReference, reason, notes } = req.body;

      const request = await BuybackRequestModel.findById(id);
      if (!request) return next(new AppError('Request not found', 404));

      const deviceReturn = await DeviceReturnModel.create({
        requestId: request._id,
        assignedStaffId,
        assignedStaffName,
        scheduledReturnDate: scheduledReturnDate ? new Date(scheduledReturnDate) : undefined,
        trackingReference,
        status: ReturnStatus.INITIATED,
        reason: reason || 'Customer rejected final offer',
        notes,
      });

      request.returnId = deviceReturn._id as any;
      request.status = RequestStatus.RETURN_INITIATED;
      request.timeline.push({
        status: RequestStatus.RETURN_INITIATED,
        timestamp: new Date(),
        note: `Return initiated for rejected device. Return staff: ${assignedStaffName || 'Internal logistics'}.`,
        updatedBy: req.admin?.fullName || 'Admin',
      });
      await request.save();

      await logAuditEvent({
        req,
        actorType: 'ADMIN',
        actorId: req.admin?.id,
        actorEmail: req.admin?.email,
        action: 'INITIATE_RETURN',
        resourceType: 'DeviceReturn',
        resourceId: deviceReturn._id.toString(),
        diff: { assignedStaffName, trackingReference },
      });

      res.status(201).json({ success: true, message: 'Return initiated successfully.', data: deviceReturn });
    } catch (err) {
      next(err);
    }
  }

  public static async adminCompleteReturn(req: AuthenticatedAdminRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const request = await BuybackRequestModel.findById(id);
      if (!request || !request.returnId) return next(new AppError('Return record not found', 404));

      await DeviceReturnModel.findByIdAndUpdate(request.returnId, {
        status: ReturnStatus.RETURNED,
        returnedAt: new Date(),
      });

      request.status = RequestStatus.RETURNED;
      request.timeline.push({
        status: RequestStatus.RETURNED,
        timestamp: new Date(),
        note: 'Device safely returned and handed back to customer.',
        updatedBy: req.admin?.fullName || 'Logistics',
      });
      await request.save();

      res.status(200).json({ success: true, message: 'Device marked as returned.', data: request });
    } catch (err) {
      next(err);
    }
  }
}

