"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BuybackRequestController = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const crypto_1 = __importDefault(require("crypto"));
const BuybackRequest_js_1 = require("../../infrastructure/database/models/BuybackRequest.js");
const Inspection_js_1 = require("../../infrastructure/database/models/Inspection.js");
const FinalOffer_js_1 = require("../../infrastructure/database/models/FinalOffer.js");
const CustomerOfferDecision_js_1 = require("../../infrastructure/database/models/CustomerOfferDecision.js");
const Payment_js_1 = require("../../infrastructure/database/models/Payment.js");
const DeviceReturn_js_1 = require("../../infrastructure/database/models/DeviceReturn.js");
const ValuationEngine_js_1 = require("../../domain/services/ValuationEngine.js");
const DevicePriceResolver_js_1 = require("../../infrastructure/pricing/DevicePriceResolver.js");
const contact_js_1 = require("../../shared/contact.js");
const NotificationService_js_1 = require("../../infrastructure/notifications/NotificationService.js");
const types_js_1 = require("../../shared/types.js");
const audit_middleware_js_1 = require("../middlewares/audit.middleware.js");
const StorageService_js_1 = require("../../infrastructure/storage/StorageService.js");
const DeviceImage_js_1 = require("../../infrastructure/database/models/DeviceImage.js");
const User_js_1 = require("../../infrastructure/database/models/User.js");
const PAYOUT_METHODS = ['UPI', 'BANK_TRANSFER', 'INSTANT_CASH'];
const cleanText = (value, max = 200) => {
    if (value === undefined || value === null)
        return undefined;
    const text = String(value).trim().slice(0, max);
    return text || undefined;
};
/** Accepts both the website shape (addressLine1/addressLine2) and the app shape (street). */
const normalizePickupAddress = (raw) => {
    if (!raw || typeof raw !== 'object')
        return null;
    return {
        street: cleanText(raw.street ?? raw.addressLine1) || '',
        area: cleanText(raw.area ?? raw.addressLine2, 120),
        city: cleanText(raw.city, 80) || '',
        state: cleanText(raw.state, 80) || '',
        pincode: String(raw.pincode ?? '').replace(/\D/g, '').slice(0, 6),
        landmark: cleanText(raw.landmark, 120),
        preferredSlot: cleanText(raw.preferredSlot, 80),
    };
};
/** Payout preference chosen on the booking form (UPI ID or bank account, or cash). */
const normalizePayout = (raw) => {
    if (!raw || typeof raw !== 'object')
        return undefined;
    const method = String(raw.paymentMethod ?? raw.method ?? '').toUpperCase();
    if (!PAYOUT_METHODS.includes(method))
        return undefined;
    const bank = raw.bankAccount || raw;
    return {
        method: method,
        upiId: method === 'UPI' ? cleanText(raw.upiId, 100) : undefined,
        accountNumber: method === 'BANK_TRANSFER' ? cleanText(String(bank.accountNumber ?? '').replace(/\s/g, ''), 20) : undefined,
        ifscCode: method === 'BANK_TRANSFER' ? cleanText(String(bank.ifscCode ?? '').toUpperCase(), 11) : undefined,
        bankName: method === 'BANK_TRANSFER' ? cleanText(bank.bankName, 80) : undefined,
    };
};
const maskAccountNumber = (value) => (value ? `•••• ${value.slice(-4)}` : undefined);
/** Shape returned to customers: normalized device/contact fields, masked bank details, no internal notes. */
const toCustomerRequestView = (obj) => {
    const modelRef = obj.deviceDetails?.modelId;
    const populatedModel = modelRef && typeof modelRef === 'object' && 'slug' in modelRef ? modelRef : null;
    const view = {
        ...obj,
        requestNumber: obj.requestNumber ? String(obj.requestNumber).replace(/^REV-/i, 'GENIE-') : obj.requestNumber,
        deviceDetails: obj.deviceDetails
            ? { ...obj.deviceDetails, modelId: populatedModel ? populatedModel._id : modelRef }
            : obj.deviceDetails,
        device: {
            brand: obj.deviceDetails?.brandName || obj.device?.brand || '',
            modelName: obj.deviceDetails?.modelName || obj.device?.modelName || 'Smartphone',
            variant: obj.deviceDetails?.storageCapacity || obj.device?.variant || '',
            imageUrl: populatedModel?.imageUrl,
            slug: populatedModel?.slug,
        },
        customer: {
            fullName: obj.customerDetails?.fullName || obj.pickupAddress?.fullName || '',
            phone: obj.customerDetails?.phone || obj.pickupAddress?.phone || '',
            email: obj.customerDetails?.email,
        },
        scheduledPickupDate: obj.scheduledPickupDate ||
            obj.pickupAddress?.scheduledDate ||
            obj.pickupAddress?.preferredSlot ||
            obj.assignedCollector?.scheduledDate ||
            (obj.createdAt ? new Date(obj.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Tomorrow'),
        preferredTimeWindow: obj.preferredTimeWindow ||
            obj.pickupAddress?.preferredSlot ||
            obj.assignedCollector?.timeSlot ||
            '10:00 AM - 1:00 PM',
        indicativeValuation: obj.indicativeEstimate?.estimatedAmount || obj.indicativeValuation || 0,
        payoutDetails: obj.payoutDetails?.method
            ? { ...obj.payoutDetails, accountNumber: maskAccountNumber(obj.payoutDetails.accountNumber) }
            : undefined,
    };
    if (obj.activeOfferId && typeof obj.activeOfferId === 'object') {
        const { internalNotes: _internal, ...offer } = obj.activeOfferId;
        view.activeOfferId = offer;
        view.finalOfferAmount = offer.finalOfferedAmount;
    }
    if (obj.inspectionId && typeof obj.inspectionId === 'object') {
        const { internalInspectionNotes: _internal, ...inspection } = obj.inspectionId;
        view.inspectionId = inspection;
    }
    return view;
};
class BuybackRequestController {
    // --- Customer Operations ---
    static async submitRequest(req, res, next) {
        try {
            const userId = req.user?.id;
            const rawBody = req.body || {};
            const modelId = rawBody.modelId || rawBody.device?.modelId;
            const modelName = rawBody.device?.modelName;
            const variantIdInput = rawBody.variantId || rawBody.device?.variantId;
            const variantCapacityInput = rawBody.variantCapacity || rawBody.device?.variant;
            const declaredCondition = rawBody.declaredCondition || rawBody.conditions || {};
            // The website sends addressLine1/addressLine2, the mobile app sends street — accept both
            const pickupAddress = normalizePickupAddress(rawBody.pickupAddress);
            const payoutDetails = normalizePayout(rawBody.paymentDetails || rawBody.payoutDetails);
            if (!pickupAddress?.street || !pickupAddress.city || !pickupAddress.state || !/^\d{6}$/.test(pickupAddress.pincode)) {
                return next(new types_js_1.AppError('Please enter your full pickup address with a valid 6-digit pincode.', 400));
            }
            const photoUrls = rawBody.photoUrls;
            // Resolve the exact catalogue device and its admin-configured price. Never fall back to an
            // unrelated model: booking the wrong device would quote the customer the wrong price.
            const resolved = await DevicePriceResolver_js_1.DevicePriceResolver.resolve({
                modelId: typeof modelId === 'string' ? modelId : undefined,
                modelName: typeof modelName === 'string' ? modelName : undefined,
                variantId: typeof variantIdInput === 'string' ? variantIdInput : undefined,
                variantCapacity: typeof variantCapacityInput === 'string' ? variantCapacityInput : undefined,
            });
            const model = resolved?.model;
            if (!resolved || !model || model.isArchived) {
                return next(new types_js_1.AppError('Selected device is unavailable. Please choose it again from the catalogue.', 400));
            }
            const variantId = resolved.variant?._id?.toString();
            const storageCapacity = resolved.variant?.capacity || (typeof variantCapacityInput === 'string' && variantCapacityInput) || 'Standard';
            const configRule = resolved.configRule;
            const pricingRule = {
                ...(configRule || {}),
                _id: configRule?._id ?? new mongoose_1.default.Types.ObjectId(),
                modelId: model._id,
                variantId: resolved.variant?._id,
                basePrice: resolved.basePrice,
                storagePriceAdjustment: resolved.variantAdjustment,
                version: configRule?.version || 1,
                isActive: true,
                effectiveFrom: configRule?.effectiveFrom || new Date(),
            };
            // Normalize declared condition for both DOFY and legacy formats
            const normCondition = { ...(declaredCondition || {}) };
            if (!normCondition.basicQuestions && (normCondition.isPhoneWorking !== undefined || normCondition.isTouchscreenWorking !== undefined ||
                normCondition.isDisplayOriginal !== undefined || normCondition.hasValidWarranty !== undefined)) {
                normCondition.basicQuestions = {
                    isPhoneWorking: normCondition.isPhoneWorking !== false && normCondition.isPhoneWorking !== 'false',
                    isTouchscreenWorking: normCondition.isTouchscreenWorking !== false && normCondition.isTouchscreenWorking !== 'false',
                    isDisplayOriginal: normCondition.isDisplayOriginal !== false && normCondition.isDisplayOriginal !== 'false',
                    hasValidWarranty: normCondition.hasValidWarranty === true || normCondition.hasValidWarranty === 'true',
                };
            }
            if (!normCondition.hardwareFaults && (normCondition.volumeButtonNotWorking !== undefined || normCondition.powerButtonNotWorking !== undefined ||
                normCondition.chargingPortNotWorking !== undefined || normCondition.wifiOrBluetoothNotWorking !== undefined ||
                normCondition.proximitySensorNotWorking !== undefined || normCondition.earSpeakerNotWorking !== undefined ||
                normCondition.vibratorNotWorking !== undefined)) {
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
            const valuation = ValuationEngine_js_1.ValuationEngine.calculate({
                id: pricingRule._id.toString(),
                modelId: pricingRule.modelId.toString(),
                variantId: pricingRule.variantId?.toString() || '',
                basePrice: pricingRule.basePrice,
                storagePriceAdjustment: pricingRule.storagePriceAdjustment,
                customDeductions: pricingRule.customDeductions,
                customPercentages: pricingRule.customPercentages,
                minScrapPrice: pricingRule.minScrapPrice,
                deductions: pricingRule.deductions,
                deductionPercentages: pricingRule.deductionPercentages,
                deviceAgeDeductions: model.deviceAgeDeductions,
                version: pricingRule.version,
                isActive: pricingRule.isActive,
                effectiveFrom: pricingRule.effectiveFrom,
            }, normCondition);
            // Resolve Customer Contact Details
            const customerFullName = rawBody.pickupAddress?.fullName ||
                rawBody.customer?.fullName ||
                req.user?.fullName ||
                req.user?.email ||
                'Valued Customer';
            const customerPhone = (0, contact_js_1.normalizeIndianMobile)(rawBody.pickupAddress?.phone) ||
                (0, contact_js_1.normalizeIndianMobile)(rawBody.customer?.phone) ||
                (0, contact_js_1.normalizeIndianMobile)(rawBody.phone) ||
                rawBody.pickupAddress?.phone ||
                rawBody.customer?.phone ||
                rawBody.phone ||
                req.user?.phone ||
                'N/A';
            // If user profile is missing a phone number, update UserModel permanently
            if (userId && customerPhone && customerPhone !== 'N/A') {
                const userDoc = await User_js_1.UserModel.findById(userId);
                if (userDoc && !userDoc.phone) {
                    userDoc.phone = customerPhone;
                    if (customerFullName && customerFullName !== 'Valued Customer' && !userDoc.fullName) {
                        userDoc.fullName = customerFullName;
                    }
                    await userDoc.save();
                }
            }
            // Generate unique sequential request number: GENIE-2026-XXXX
            const count = await BuybackRequest_js_1.BuybackRequestModel.countDocuments();
            const requestNumber = `GENIE-${new Date().getFullYear()}-${(1000 + count + 1).toString()}`;
            const buybackRequest = await BuybackRequest_js_1.BuybackRequestModel.create({
                requestNumber,
                userId,
                customerDetails: {
                    fullName: customerFullName,
                    phone: customerPhone,
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
                payoutDetails,
                scheduledPickupDate: rawBody.scheduledPickupDate || rawBody.pickupAddress?.scheduledDate || rawBody.pickupAddress?.preferredSlot,
                preferredTimeWindow: rawBody.preferredTimeWindow || rawBody.pickupAddress?.preferredSlot,
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
            const requests = await BuybackRequest_js_1.BuybackRequestModel.find({ userId: req.user?.id })
                .sort({ createdAt: -1 })
                .populate('deviceDetails.modelId', 'imageUrl slug');
            // If user profile is missing a phone number, sync from historical requests
            if (req.user?.id && requests.length > 0) {
                const userDoc = await User_js_1.UserModel.findById(req.user.id);
                if (userDoc && !userDoc.phone) {
                    const foundPhone = requests.find((r) => r.customerDetails?.phone && r.customerDetails.phone !== 'N/A')?.customerDetails?.phone ||
                        requests[0].pickupAddress?.phone;
                    if (foundPhone && foundPhone !== 'N/A') {
                        userDoc.phone = foundPhone;
                        await userDoc.save();
                    }
                }
            }
            const mapped = requests.map((r) => toCustomerRequestView(r.toObject ? r.toObject() : r));
            res.status(200).json({ success: true, data: mapped });
        }
        catch (err) {
            next(err);
        }
    }
    static async getMyRequestDetails(req, res, next) {
        try {
            const { id } = req.params;
            // Accept either the Mongo id or the human request number (e.g. GENIE-2026-1011)
            const lookup = mongoose_1.default.Types.ObjectId.isValid(id) ? { _id: id } : { requestNumber: String(id).toUpperCase() };
            const request = await BuybackRequest_js_1.BuybackRequestModel.findOne({ ...lookup, userId: req.user?.id })
                .populate('activeOfferId')
                .populate('inspectionId')
                .populate('paymentId')
                .populate('returnId')
                .populate('deviceDetails.modelId', 'imageUrl slug');
            if (!request) {
                return next(new types_js_1.AppError('Buyback request not found.', 404));
            }
            res.status(200).json({ success: true, data: toCustomerRequestView(request.toObject()) });
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
            // Random name: customer photos must not be guessable from their URL
            const { url: fileUrl } = await StorageService_js_1.StorageService.saveImage(req.file.buffer, req.file.mimetype, 'requests', crypto_1.default.randomBytes(8).toString('hex'));
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
                const cleanSearch = String(search).replace(/^(GENIE|REV)-/i, '');
                filter.$or = [
                    { requestNumber: { $regex: search, $options: 'i' } },
                    { requestNumber: { $regex: cleanSearch, $options: 'i' } },
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
            const normalizedRequests = requests.map((doc) => {
                const item = doc.toObject ? doc.toObject() : doc;
                if (item.requestNumber && /^REV-/i.test(item.requestNumber)) {
                    item.requestNumber = item.requestNumber.replace(/^REV-/i, 'GENIE-');
                }
                return item;
            });
            res.status(200).json({
                success: true,
                data: normalizedRequests,
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
            const item = request.toObject ? request.toObject() : request;
            if (item.requestNumber && /^REV-/i.test(item.requestNumber)) {
                item.requestNumber = item.requestNumber.replace(/^REV-/i, 'GENIE-');
            }
            res.status(200).json({ success: true, data: item });
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
            if (!Object.values(types_js_1.RequestStatus).includes(status)) {
                return next(new types_js_1.AppError('Choose a valid status.', 400));
            }
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
            // Check everything before touching the current offer (it is superseded below)
            if (!(Number(finalOfferedAmount) > 0))
                return next(new types_js_1.AppError('Enter the final offer amount.', 400));
            if (!request.inspectionId)
                return next(new types_js_1.AppError('Submit the inspection before the final offer.', 400));
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