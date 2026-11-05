"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BuybackRequestController = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const BuybackRequest_js_1 = require("../../infrastructure/database/models/BuybackRequest.js");
const SmartphoneModel_js_1 = require("../../infrastructure/database/models/SmartphoneModel.js");
const StorageVariant_js_1 = require("../../infrastructure/database/models/StorageVariant.js");
const PricingRule_js_1 = require("../../infrastructure/database/models/PricingRule.js");
const Inspection_js_1 = require("../../infrastructure/database/models/Inspection.js");
const FinalOffer_js_1 = require("../../infrastructure/database/models/FinalOffer.js");
const CustomerOfferDecision_js_1 = require("../../infrastructure/database/models/CustomerOfferDecision.js");
const Payment_js_1 = require("../../infrastructure/database/models/Payment.js");
const DeviceReturn_js_1 = require("../../infrastructure/database/models/DeviceReturn.js");
const ValuationEngine_js_1 = require("../../domain/services/ValuationEngine.js");
const NotificationService_js_1 = require("../../infrastructure/notifications/NotificationService.js");
const types_js_1 = require("../../shared/types.js");
const audit_middleware_js_1 = require("../middlewares/audit.middleware.js");
const StorageService_js_1 = require("../../infrastructure/storage/StorageService.js");
const DeviceImage_js_1 = require("../../infrastructure/database/models/DeviceImage.js");
const index_js_1 = require("../../config/index.js");
class BuybackRequestController {
    // --- Customer Operations ---
    static async submitRequest(req, res, next) {
        try {
            const userId = req.user?.id;
            const { modelId, variantId, declaredCondition, pickupAddress, photoUrls } = req.body;
            let model = null;
            if (mongoose_1.default.Types.ObjectId.isValid(modelId)) {
                model = await SmartphoneModel_js_1.SmartphoneModel.findById(modelId).populate('brandId', 'name');
            }
            if (!model) {
                model = await SmartphoneModel_js_1.SmartphoneModel.findOne({
                    $or: [
                        { slug: modelId },
                        { name: new RegExp(String(modelId).replace(/[-_]/g, ' '), 'i') },
                    ],
                }).populate('brandId', 'name');
            }
            if (!model) {
                model = await SmartphoneModel_js_1.SmartphoneModel.findOne({ isPublished: true, isArchived: false }).populate('brandId', 'name');
            }
            if (!model || model.isArchived) {
                return next(new types_js_1.AppError('Selected smartphone model is unavailable.', 400));
            }
            let storageCapacity = 'Standard';
            let storagePriceAdjustment = 0;
            if (variantId && mongoose_1.default.Types.ObjectId.isValid(variantId)) {
                const variant = await StorageVariant_js_1.StorageVariantModel.findById(variantId);
                if (variant) {
                    storageCapacity = variant.capacity;
                    storagePriceAdjustment = variant.priceModifier;
                }
            }
            // Authoritative pricing calculation
            let pricingRule = null;
            if (mongoose_1.default.Types.ObjectId.isValid(model._id)) {
                pricingRule = await PricingRule_js_1.PricingRuleModel.findOne({ modelId: model._id, isActive: true }).sort({ version: -1 });
            }
            if (!pricingRule) {
                pricingRule = await PricingRule_js_1.PricingRuleModel.create({
                    modelId: model._id,
                    variantId: variantId && mongoose_1.default.Types.ObjectId.isValid(variantId) ? variantId : undefined,
                    basePrice: model.basePrice || 35000,
                    storagePriceAdjustment,
                    version: 1,
                    isActive: true,
                });
            }
            const valuation = ValuationEngine_js_1.ValuationEngine.calculate({
                id: pricingRule._id.toString(),
                modelId: pricingRule.modelId.toString(),
                variantId: pricingRule.variantId?.toString() || '',
                basePrice: pricingRule.basePrice,
                storagePriceAdjustment: pricingRule.storagePriceAdjustment,
                deductions: pricingRule.deductions,
                version: pricingRule.version,
                isActive: pricingRule.isActive,
                effectiveFrom: pricingRule.effectiveFrom,
            }, declaredCondition);
            // Generate unique sequential request number: REV-2026-XXXX
            const count = await BuybackRequest_js_1.BuybackRequestModel.countDocuments();
            const requestNumber = `REV-${new Date().getFullYear()}-${(1000 + count + 1).toString()}`;
            const buybackRequest = await BuybackRequest_js_1.BuybackRequestModel.create({
                requestNumber,
                userId,
                customerDetails: {
                    fullName: req.user?.email || req.user?.phone || 'Valued Customer',
                    phone: req.user?.phone || 'N/A',
                    email: req.user?.email,
                },
                deviceDetails: {
                    brandId: model.brandId._id,
                    brandName: model.brandId.name,
                    modelId: model._id,
                    modelName: model.name,
                    variantId: variantId && mongoose_1.default.Types.ObjectId.isValid(variantId) ? variantId : undefined,
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
                status: types_js_1.RequestStatus.SUBMITTED,
                timeline: [
                    {
                        status: types_js_1.RequestStatus.SUBMITTED,
                        timestamp: new Date(),
                        note: 'Buyback request submitted by customer with indicative valuation.',
                        updatedBy: 'Customer',
                    },
                ],
            });
            // Dispatch notification to operations
            await NotificationService_js_1.NotificationService.notify({
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
        }
        catch (err) {
            next(err);
        }
    }
    static async getMyRequests(req, res, next) {
        try {
            const requests = await BuybackRequest_js_1.BuybackRequestModel.find({ userId: req.user?.id }).sort({ createdAt: -1 });
            res.status(200).json({ success: true, data: requests });
        }
        catch (err) {
            next(err);
        }
    }
    static async getMyRequestDetails(req, res, next) {
        try {
            const { id } = req.params;
            const request = await BuybackRequest_js_1.BuybackRequestModel.findOne({ _id: id, userId: req.user?.id })
                .populate('activeOfferId')
                .populate('inspectionId')
                .populate('paymentId')
                .populate('returnId');
            if (!request) {
                return next(new types_js_1.AppError('Buyback request not found.', 404));
            }
            res.status(200).json({ success: true, data: request });
        }
        catch (err) {
            next(err);
        }
    }
    static async handleCustomerOfferDecision(req, res, next) {
        try {
            const { id } = req.params;
            const { decision, rejectionReason } = req.body;
            const request = await BuybackRequest_js_1.BuybackRequestModel.findOne({ _id: id, userId: req.user?.id });
            if (!request)
                return next(new types_js_1.AppError('Request not found.', 404));
            if (request.status !== types_js_1.RequestStatus.AWAITING_CUSTOMER_DECISION && request.status !== types_js_1.RequestStatus.FINAL_OFFER_GENERATED) {
                return next(new types_js_1.AppError(`Cannot make decision on request in status: ${request.status}`, 400));
            }
            const activeOffer = await FinalOffer_js_1.FinalOfferModel.findOne({ requestId: request._id, status: types_js_1.FinalOfferStatus.ISSUED });
            if (!activeOffer) {
                return next(new types_js_1.AppError('No active final offer found for this request.', 404));
            }
            const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
            const userAgent = req.headers['user-agent'] || '';
            // Record immutable customer decision
            await CustomerOfferDecision_js_1.CustomerOfferDecisionModel.create({
                requestId: request._id,
                offerId: activeOffer._id,
                decision,
                rejectionReason: decision === 'REJECTED' ? rejectionReason : undefined,
                ipAddress: Array.isArray(ipAddress) ? ipAddress[0] : ipAddress,
                userAgent,
            });
            // Update offer status
            activeOffer.status = decision === 'ACCEPTED' ? types_js_1.FinalOfferStatus.ACCEPTED : types_js_1.FinalOfferStatus.REJECTED;
            activeOffer.customerDecision = decision;
            activeOffer.decidedAt = new Date();
            activeOffer.rejectionReason = rejectionReason;
            await activeOffer.save();
            // Transition request status
            const nextStatus = decision === 'ACCEPTED' ? types_js_1.RequestStatus.OFFER_ACCEPTED : types_js_1.RequestStatus.OFFER_REJECTED;
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
            await NotificationService_js_1.NotificationService.notify({
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
        }
        catch (err) {
            next(err);
        }
    }
    static async uploadDeviceImage(req, res, next) {
        try {
            if (!req.file) {
                return next(new types_js_1.AppError('No file uploaded or file rejected by validator.', 400));
            }
            let fileUrl = StorageService_js_1.StorageService.getFileUrl(req.file.filename);
            if (index_js_1.config.storage.driver === 'r2') {
                fileUrl = await StorageService_js_1.StorageService.uploadToR2(req.file.filename, req.file.path, req.file.mimetype);
            }
            const deviceImage = await DeviceImage_js_1.DeviceImageModel.create({
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
        }
        catch (err) {
            next(err);
        }
    }
    // --- Admin Operations ---
    static async adminListRequests(req, res, next) {
        try {
            const { status, brandId, search, page = '1', limit = '20' } = req.query;
            const filter = {};
            if (status)
                filter.status = status;
            if (brandId)
                filter['deviceDetails.brandId'] = brandId;
            if (search) {
                filter.$or = [
                    { requestNumber: { $regex: search, $options: 'i' } },
                    { 'customerDetails.fullName': { $regex: search, $options: 'i' } },
                    { 'customerDetails.phone': { $regex: search, $options: 'i' } },
                    { 'deviceDetails.modelName': { $regex: search, $options: 'i' } },
                ];
            }
            const pageNum = parseInt(page, 10);
            const limitNum = parseInt(limit, 10);
            const skip = (pageNum - 1) * limitNum;
            const [requests, total] = await Promise.all([
                BuybackRequest_js_1.BuybackRequestModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
                BuybackRequest_js_1.BuybackRequestModel.countDocuments(filter),
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
        }
        catch (err) {
            next(err);
        }
    }
    static async adminGetRequestDetails(req, res, next) {
        try {
            const { id } = req.params;
            const request = await BuybackRequest_js_1.BuybackRequestModel.findById(id)
                .populate('userId', 'fullName phone email address')
                .populate('activeOfferId')
                .populate('inspectionId')
                .populate('paymentId')
                .populate('returnId');
            if (!request)
                return next(new types_js_1.AppError('Request not found', 404));
            res.status(200).json({ success: true, data: request });
        }
        catch (err) {
            next(err);
        }
    }
    static async adminAssignCollection(req, res, next) {
        try {
            const { id } = req.params;
            const { collectorStaffId, collectorStaffName, scheduledDate, timeSlot, notes } = req.body;
            const request = await BuybackRequest_js_1.BuybackRequestModel.findById(id);
            if (!request)
                return next(new types_js_1.AppError('Request not found', 404));
            request.assignedCollector = {
                staffId: collectorStaffId,
                staffName: collectorStaffName,
                scheduledDate: new Date(scheduledDate),
                timeSlot: timeSlot || 'Morning (10 AM - 1 PM)',
            };
            request.status = types_js_1.RequestStatus.ASSIGNED_FOR_COLLECTION;
            request.timeline.push({
                status: types_js_1.RequestStatus.ASSIGNED_FOR_COLLECTION,
                timestamp: new Date(),
                note: `Collection assigned to ${collectorStaffName} for ${new Date(scheduledDate).toLocaleDateString()}. Notes: ${notes || 'None'}`,
                updatedBy: req.admin?.fullName || 'Admin',
            });
            await request.save();
            await (0, audit_middleware_js_1.logAuditEvent)({
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
        }
        catch (err) {
            next(err);
        }
    }
    static async adminUpdateCollectionStatus(req, res, next) {
        try {
            const { id } = req.params;
            const { status, notes } = req.body;
            const request = await BuybackRequest_js_1.BuybackRequestModel.findById(id);
            if (!request)
                return next(new types_js_1.AppError('Request not found', 404));
            request.status = status;
            request.timeline.push({
                status,
                timestamp: new Date(),
                note: notes || `Collection status updated to ${status}.`,
                updatedBy: req.admin?.fullName || 'Admin',
            });
            await request.save();
            res.status(200).json({ success: true, message: 'Collection status updated.', data: request });
        }
        catch (err) {
            next(err);
        }
    }
    static async adminSubmitInspection(req, res, next) {
        try {
            const { id } = req.params;
            const { actualCondition, discrepancies, evidencePhotoUrls, suggestedOfferAmount, internalInspectionNotes, customerVisibleNotes } = req.body;
            const request = await BuybackRequest_js_1.BuybackRequestModel.findById(id);
            if (!request)
                return next(new types_js_1.AppError('Request not found', 404));
            const inspection = await Inspection_js_1.InspectionModel.create({
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
            request.inspectionId = inspection._id;
            request.status = types_js_1.RequestStatus.UNDER_INSPECTION;
            request.timeline.push({
                status: types_js_1.RequestStatus.UNDER_INSPECTION,
                timestamp: new Date(),
                note: `Physical inspection completed by ${req.admin?.fullName}. Condition verified. Discrepancies noted: ${discrepancies?.length || 0}.`,
                updatedBy: req.admin?.fullName || 'Inspector',
            });
            await request.save();
            await (0, audit_middleware_js_1.logAuditEvent)({
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
        }
        catch (err) {
            next(err);
        }
    }
    static async adminGenerateFinalOffer(req, res, next) {
        try {
            const { id } = req.params;
            const { finalOfferedAmount, valuationExplanation, internalNotes, validityDays = 7 } = req.body;
            const request = await BuybackRequest_js_1.BuybackRequestModel.findById(id);
            if (!request)
                return next(new types_js_1.AppError('Request not found', 404));
            // Supersede any prior open offer
            await FinalOffer_js_1.FinalOfferModel.updateMany({ requestId: request._id, status: types_js_1.FinalOfferStatus.ISSUED }, { status: types_js_1.FinalOfferStatus.SUPERSEDED });
            const offerCount = await FinalOffer_js_1.FinalOfferModel.countDocuments({ requestId: request._id });
            const offerVersion = offerCount + 1;
            const validUntil = new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000);
            const finalOffer = await FinalOffer_js_1.FinalOfferModel.create({
                requestId: request._id,
                inspectionId: request.inspectionId,
                offerVersion,
                originalEstimatedAmount: request.indicativeEstimate.estimatedAmount,
                finalOfferedAmount,
                valuationExplanation,
                internalNotes,
                issuedByAdminId: req.admin?.id,
                issuedByAdminName: req.admin?.fullName,
                status: types_js_1.FinalOfferStatus.ISSUED,
                validUntil,
            });
            request.activeOfferId = finalOffer._id;
            request.status = types_js_1.RequestStatus.AWAITING_CUSTOMER_DECISION;
            request.timeline.push({
                status: types_js_1.RequestStatus.AWAITING_CUSTOMER_DECISION,
                timestamp: new Date(),
                note: `Final offer (v${offerVersion}) of ₹${finalOfferedAmount} generated and sent to customer. Valid until ${validUntil.toLocaleDateString()}.`,
                updatedBy: req.admin?.fullName || 'Admin',
            });
            await request.save();
            // Notify customer
            await NotificationService_js_1.NotificationService.notify({
                recipientType: 'USER',
                recipientId: request.userId.toString(),
                destination: request.customerDetails.phone,
                channel: 'IN_APP',
                title: `Final Offer Ready: ${request.deviceDetails.modelName}`,
                body: `Your device inspection is complete! Final offer: ₹${finalOfferedAmount}. Review and make your decision in the app.`,
                metadata: { requestId: request._id, offerId: finalOffer._id, amount: finalOfferedAmount },
            });
            await (0, audit_middleware_js_1.logAuditEvent)({
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
        }
        catch (err) {
            next(err);
        }
    }
    static async adminRecordPayment(req, res, next) {
        try {
            const { id } = req.params;
            const { amount, paymentMethod, paymentReference, paymentProofUrl, notes } = req.body;
            const request = await BuybackRequest_js_1.BuybackRequestModel.findById(id);
            if (!request)
                return next(new types_js_1.AppError('Request not found', 404));
            if (request.status !== types_js_1.RequestStatus.OFFER_ACCEPTED && request.status !== types_js_1.RequestStatus.PAYMENT_PROCESSING) {
                return next(new types_js_1.AppError(`Cannot record payment for request in status: ${request.status}`, 400));
            }
            const payment = await Payment_js_1.PaymentModel.create({
                requestId: request._id,
                offerId: request.activeOfferId,
                amount,
                paymentMethod,
                paymentReference,
                paymentProofUrl,
                status: types_js_1.PaymentStatus.COMPLETED,
                recordedByAdminId: req.admin?.id,
                recordedByAdminName: req.admin?.fullName,
                notes,
                paidAt: new Date(),
            });
            request.paymentId = payment._id;
            request.status = types_js_1.RequestStatus.PAYMENT_COMPLETED;
            request.timeline.push({
                status: types_js_1.RequestStatus.PAYMENT_COMPLETED,
                timestamp: new Date(),
                note: `Payment of ₹${amount} recorded via ${paymentMethod} (Ref: ${paymentReference}). Transaction completed.`,
                updatedBy: req.admin?.fullName || 'Finance',
            });
            await request.save();
            // Notify customer
            await NotificationService_js_1.NotificationService.notify({
                recipientType: 'USER',
                recipientId: request.userId.toString(),
                destination: request.customerDetails.phone,
                channel: 'IN_APP',
                title: `Payment Received: ₹${amount}`,
                body: `Payment of ₹${amount} has been successfully dispatched for ${request.deviceDetails.modelName}. Ref: ${paymentReference}.`,
                metadata: { requestId: request._id, paymentReference, amount },
            });
            await (0, audit_middleware_js_1.logAuditEvent)({
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
        }
        catch (err) {
            next(err);
        }
    }
    static async adminInitiateReturn(req, res, next) {
        try {
            const { id } = req.params;
            const { assignedStaffId, assignedStaffName, scheduledReturnDate, trackingReference, reason, notes } = req.body;
            const request = await BuybackRequest_js_1.BuybackRequestModel.findById(id);
            if (!request)
                return next(new types_js_1.AppError('Request not found', 404));
            const deviceReturn = await DeviceReturn_js_1.DeviceReturnModel.create({
                requestId: request._id,
                assignedStaffId,
                assignedStaffName,
                scheduledReturnDate: scheduledReturnDate ? new Date(scheduledReturnDate) : undefined,
                trackingReference,
                status: types_js_1.ReturnStatus.INITIATED,
                reason: reason || 'Customer rejected final offer',
                notes,
            });
            request.returnId = deviceReturn._id;
            request.status = types_js_1.RequestStatus.RETURN_INITIATED;
            request.timeline.push({
                status: types_js_1.RequestStatus.RETURN_INITIATED,
                timestamp: new Date(),
                note: `Return initiated for rejected device. Return staff: ${assignedStaffName || 'Internal logistics'}.`,
                updatedBy: req.admin?.fullName || 'Admin',
            });
            await request.save();
            await (0, audit_middleware_js_1.logAuditEvent)({
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
        }
        catch (err) {
            next(err);
        }
    }
    static async adminCompleteReturn(req, res, next) {
        try {
            const { id } = req.params;
            const request = await BuybackRequest_js_1.BuybackRequestModel.findById(id);
            if (!request || !request.returnId)
                return next(new types_js_1.AppError('Return record not found', 404));
            await DeviceReturn_js_1.DeviceReturnModel.findByIdAndUpdate(request.returnId, {
                status: types_js_1.ReturnStatus.RETURNED,
                returnedAt: new Date(),
            });
            request.status = types_js_1.RequestStatus.RETURNED;
            request.timeline.push({
                status: types_js_1.RequestStatus.RETURNED,
                timestamp: new Date(),
                note: 'Device safely returned and handed back to customer.',
                updatedBy: req.admin?.fullName || 'Logistics',
            });
            await request.save();
            res.status(200).json({ success: true, message: 'Device marked as returned.', data: request });
        }
        catch (err) {
            next(err);
        }
    }
}
exports.BuybackRequestController = BuybackRequestController;
//# sourceMappingURL=BuybackRequestController.js.map