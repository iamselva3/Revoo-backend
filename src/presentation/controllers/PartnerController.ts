import { Response, NextFunction, Request } from 'express';
import mongoose from 'mongoose';
import { EmployeeModel } from '../../infrastructure/database/models/Employee.js';
import { BuybackRequestModel } from '../../infrastructure/database/models/BuybackRequest.js';
import { StorageVariantModel } from '../../infrastructure/database/models/StorageVariant.js';
import { SmartphoneModel } from '../../infrastructure/database/models/SmartphoneModel.js';
import { DoorstepCheckModel, DoorstepOutcome } from '../../infrastructure/database/models/DoorstepCheck.js';
import { DoorstepPricing } from '../../infrastructure/pricing/DoorstepPricing.js';
import { TokenService, PARTNER_SESSION_HOURS } from '../../infrastructure/security/tokenService.js';
import { NotificationService } from '../../infrastructure/notifications/NotificationService.js';
import { doorstepCheckAlert } from '../../infrastructure/notifications/adminAlerts.js';
import { normalizeIndianMobile } from '../../shared/contact.js';
import { AppError, RequestStatus } from '../../shared/types.js';
import { AuthenticatedAdminRequest, AuthenticatedPartnerRequest } from '../middlewares/auth.middleware.js';
import { logAuditEvent } from '../middlewares/audit.middleware.js';

const MAX_WRONG_PINS = 5;
const LOCK_MINUTES = 15;
const PIN_PATTERN = /^\d{6}$/;
/** A finished or cancelled request can be opened but not checked again. */
const CLOSED_STATUSES: string[] = [RequestStatus.CANCELLED, RequestStatus.RETURNED, RequestStatus.PAYMENT_COMPLETED];
const NOT_BUYABLE_REASONS = [
  'Phone locked (iCloud / Google account / screen lock)',
  'Different model from the booking',
  'IMEI or serial number mismatch',
  'Device looks stolen or has no proof of ownership',
  'Customer not available',
  'Customer cancelled the pickup',
  'Other',
];

const partnerView = (e: any) => ({
  id: String(e._id),
  fullName: e.fullName,
  employeeCode: e.employeeCode,
  phone: e.phone,
  district: e.district,
  role: e.role,
});

const maskAccount = (v?: string) => (v ? `•••• ${String(v).slice(-4)}` : undefined);
const displayNumber = (n?: string) => (n ? String(n).replace(/^REV-/i, 'GENIE-') : n);

/** "GENIE-2026-1011", "genie 2026 1011", a QR link ".../partner?r=GENIE-2026-1011" or the Mongo id. */
const findRequest = async (ref: string) => {
  const raw = decodeURIComponent(String(ref || '')).trim();
  if (mongoose.Types.ObjectId.isValid(raw) && /^[a-f0-9]{24}$/i.test(raw)) return BuybackRequestModel.findById(raw);
  const match = /(?:GENIE|REV)[\s-]*(\d{4})[\s-]*(\d{3,6})/i.exec(raw) || /^(\d{4})[\s-]*(\d{3,6})$/.exec(raw);
  if (!match) return null;
  const tail = `${match[1]}-${match[2]}`;
  return BuybackRequestModel.findOne({ requestNumber: { $in: [`GENIE-${tail}`, `REV-${tail}`] } });
};

/** What the partner sees about a booking: who to meet, the device, the customer's answers and the quote. */
const requestView = async (r: any) => {
  const modelId = r.deviceDetails?.modelId;
  const [variants, model, checks] = await Promise.all([
    StorageVariantModel.find({ modelId, isPublished: true }).select('capacity priceModifier').sort({ priceModifier: 1 }).lean(),
    SmartphoneModel.findById(modelId).select('imageUrl name').lean() as Promise<any>,
    DoorstepCheckModel.find({ requestId: r._id }).sort({ createdAt: -1 }).limit(10).lean(),
  ]);
  const a = r.pickupAddress || {};
  const p = r.payoutDetails || {};
  const declared = r.declaredCondition?.toObject ? r.declaredCondition.toObject() : r.declaredCondition || {};
  return {
    id: String(r._id),
    requestNumber: displayNumber(r.requestNumber),
    status: r.status,
    closed: CLOSED_STATUSES.includes(r.status),
    bookedOn: r.createdAt,
    device: {
      brandName: r.deviceDetails?.brandName,
      modelName: r.deviceDetails?.modelName,
      storage: r.deviceDetails?.storageCapacity,
      variantId: r.deviceDetails?.variantId ? String(r.deviceDetails.variantId) : undefined,
      imageUrl: model?.imageUrl,
    },
    variants: variants.map((v: any) => ({ id: String(v._id), capacity: v.capacity })),
    customer: {
      fullName: r.customerDetails?.fullName,
      phone: r.customerDetails?.phone,
      alternatePhone: r.customerDetails?.alternatePhone,
    },
    pickupAddress: { street: a.street, area: a.area, landmark: a.landmark, city: a.city, state: a.state, pincode: a.pincode },
    scheduledPickupDate: r.scheduledPickupDate,
    preferredTimeWindow: r.preferredTimeWindow,
    payout: p.method ? { method: p.method, upiId: p.upiId, bankName: p.bankName, accountNumber: maskAccount(p.accountNumber), ifscCode: p.ifscCode } : undefined,
    assignedTo: r.assignedCollector?.staffName,
    customerCondition: {
      basicQuestions: declared.basicQuestions,
      screenDisplayCondition: declared.screenDisplayCondition,
      touchGlassCondition: declared.touchGlassCondition,
      backPanelCondition: declared.backPanelCondition,
      sidePanelCondition: declared.sidePanelCondition,
      hardwareFaults: declared.hardwareFaults,
      hasOriginalCharger: declared.hasOriginalCharger,
      hasOriginalBox: declared.hasOriginalBox,
      hasValidBill: declared.hasValidBill,
      deviceAge: declared.deviceAge,
      summary: declared.summary,
    },
    quotedAmount: Math.round(Number(r.indicativeEstimate?.estimatedAmount) || 0),
    checks: checks.map((c: any) => ({
      id: String(c._id),
      partnerName: c.partnerName,
      finalAmount: c.finalAmount,
      difference: c.difference,
      outcome: c.outcome,
      createdAt: c.createdAt,
    })),
  };
};

const cleanPhotoUrls = (raw: unknown): string[] =>
  (Array.isArray(raw) ? raw : [])
    .map((u) => String(u || '').trim())
    .filter((u) => /^https?:\/\/\S+$/i.test(u) && u.length <= 500)
    .slice(0, 8);

export class PartnerController {
  /** POST /partner/login: phone number (or employee code) and the 6-digit PIN the admin set. */
  public static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const identifier = String(req.body?.phone ?? req.body?.identifier ?? '').trim();
      const pin = String(req.body?.pin ?? '').trim();
      if (!identifier || !PIN_PATTERN.test(pin)) {
        return next(new AppError('Enter your phone number and your 6-digit PIN.', 400));
      }
      const mobile = normalizeIndianMobile(identifier);
      const candidates = await EmployeeModel.find({ partnerAccessEnabled: true, status: { $ne: 'INACTIVE' } }).select(
        '+partnerPinHash +partnerFailedAttempts +partnerLockedUntil'
      );
      const employee = candidates.find((e) =>
        mobile ? normalizeIndianMobile(e.phone) === mobile : e.employeeCode === identifier.toUpperCase()
      );
      if (!employee || !employee.partnerPinHash) {
        return next(new AppError('Wrong phone number or PIN.', 401));
      }
      if (employee.partnerLockedUntil && employee.partnerLockedUntil > new Date()) {
        const minutes = Math.ceil((employee.partnerLockedUntil.getTime() - Date.now()) / 60000);
        return next(new AppError(`Too many wrong PINs. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}, or ask the Genie team to reset your PIN.`, 429));
      }
      const ok = await TokenService.comparePassword(pin, employee.partnerPinHash);
      if (!ok) {
        const attempts = (employee.partnerFailedAttempts || 0) + 1;
        const lock = attempts >= MAX_WRONG_PINS;
        await EmployeeModel.updateOne(
          { _id: employee._id },
          lock
            ? { $set: { partnerFailedAttempts: 0, partnerLockedUntil: new Date(Date.now() + LOCK_MINUTES * 60000) } }
            : { $set: { partnerFailedAttempts: attempts } }
        );
        return next(
          new AppError(
            lock
              ? `Too many wrong PINs. Try again in ${LOCK_MINUTES} minutes, or ask the Genie team to reset your PIN.`
              : `Wrong phone number or PIN. ${MAX_WRONG_PINS - attempts} tr${MAX_WRONG_PINS - attempts === 1 ? 'y' : 'ies'} left.`,
            lock ? 429 : 401
          )
        );
      }
      await EmployeeModel.updateOne(
        { _id: employee._id },
        { $set: { partnerFailedAttempts: 0, partnerLastLoginAt: new Date() }, $unset: { partnerLockedUntil: 1 } }
      );
      const token = TokenService.generatePartnerToken({
        employeeId: String(employee._id),
        fullName: employee.fullName,
        employeeCode: employee.employeeCode,
        type: 'PARTNER',
      });
      res.status(200).json({
        success: true,
        message: 'Signed in.',
        data: { token, expiresInHours: PARTNER_SESSION_HOURS, partner: partnerView(employee) },
      });
    } catch (err) {
      next(err);
    }
  }

  /** GET /partner/me */
  public static async me(req: AuthenticatedPartnerRequest, res: Response, next: NextFunction) {
    try {
      const employee = await EmployeeModel.findById(req.partner!.id);
      if (!employee) return next(new AppError('Please sign in again.', 401));
      res.status(200).json({ success: true, data: partnerView(employee) });
    } catch (err) {
      next(err);
    }
  }

  /** GET /partner/requests/:ref: the booking, the customer's answers, the quote and the price range. */
  public static async getRequest(req: AuthenticatedPartnerRequest, res: Response, next: NextFunction) {
    try {
      const request = await findRequest(req.params.ref);
      if (!request) return next(new AppError('No booking found with this number. Check the number and try again.', 404));
      const view = await requestView(request);
      const pricing = await DoorstepPricing.quote(request, { condition: view.customerCondition });
      res.status(200).json({ success: true, data: { ...view, pricing, notBuyableReasons: NOT_BUYABLE_REASONS } });
    } catch (err) {
      next(err);
    }
  }

  /** POST /partner/requests/:ref/price: the price for the partner's answers (nothing is saved). */
  public static async price(req: AuthenticatedPartnerRequest, res: Response, next: NextFunction) {
    try {
      const request = await findRequest(req.params.ref);
      if (!request) return next(new AppError('No booking found with this number.', 404));
      const pricing = await DoorstepPricing.quote(request, {
        variantId: typeof req.body?.variantId === 'string' ? req.body.variantId : undefined,
        condition: req.body?.condition,
      });
      if (!pricing) return next(new AppError('This device is no longer in the catalogue. Please call the Genie team.', 409));
      res.status(200).json({ success: true, data: pricing });
    } catch (err) {
      next(err);
    }
  }

  /** POST /partner/requests/:ref/checks: saves the check with the customer's decision. */
  public static async submitCheck(req: AuthenticatedPartnerRequest, res: Response, next: NextFunction) {
    try {
      const request = await findRequest(req.params.ref);
      if (!request) return next(new AppError('No booking found with this number.', 404));
      if (CLOSED_STATUSES.includes(request.status)) {
        return next(new AppError('This booking is already closed. Please call the Genie team.', 409));
      }

      const body = req.body || {};
      const outcome = String(body.outcome || '').toUpperCase() as DoorstepOutcome;
      if (!['AGREED', 'DECLINED', 'NOT_BUYABLE'].includes(outcome)) {
        return next(new AppError('Choose what the customer decided.', 400));
      }
      const notBuyableReason = String(body.notBuyableReason || '').trim().slice(0, 200);
      if (outcome === 'NOT_BUYABLE' && !notBuyableReason) {
        return next(new AppError('Choose why the device can’t be bought.', 400));
      }
      const imei = String(body.imei || '').replace(/[\s-]/g, '').toUpperCase();
      if (imei && !/^(\d{15}|[A-Z0-9]{8,20})$/.test(imei)) {
        return next(new AppError('Enter the 15-digit IMEI (or the serial number), or leave it empty.', 400));
      }
      const notes = String(body.notes || '').trim().slice(0, 500) || undefined;

      const pricing = await DoorstepPricing.quote(request, {
        variantId: typeof body.variantId === 'string' ? body.variantId : undefined,
        condition: body.condition,
      });
      if (!pricing) return next(new AppError('This device is no longer in the catalogue. Please call the Genie team.', 409));

      const declared = request.declaredCondition as any;
      const check = await DoorstepCheckModel.create({
        requestId: request._id,
        requestNumber: displayNumber(request.requestNumber),
        partnerId: req.partner!.id,
        partnerName: req.partner!.fullName,
        partnerCode: req.partner!.employeeCode,
        device: {
          modelId: request.deviceDetails.modelId,
          modelName: request.deviceDetails.modelName,
          brandName: request.deviceDetails.brandName,
          bookedVariantId: request.deviceDetails.variantId,
          bookedStorage: request.deviceDetails.storageCapacity,
          checkedVariantId: pricing.checkedVariantId,
          checkedStorage: pricing.checkedStorage,
        },
        customerCondition: declared?.toObject ? declared.toObject() : declared,
        checkedCondition: pricing.checkedCondition,
        quotedAmount: pricing.quotedAmount,
        requotedAmount: pricing.requotedAmount,
        checkedAmount: pricing.checkedAmount,
        finalAmount: pricing.finalAmount,
        difference: pricing.difference,
        bestAmount: pricing.bestAmount,
        worstAmount: pricing.worstAmount,
        changes: pricing.changes,
        checkedBreakdown: pricing.checkedBreakdown,
        outcome,
        notBuyableReason: outcome === 'NOT_BUYABLE' ? notBuyableReason : undefined,
        imei: imei || undefined,
        photoUrls: cleanPhotoUrls(body.photoUrls),
        notes,
      });

      // Latest check on the request, for the admin's list. Only this field is written: the
      // request's status and everything else stay as they are.
      await BuybackRequestModel.updateOne(
        { _id: request._id },
        {
          $set: {
            doorstepCheck: {
              checkId: check._id,
              partnerName: check.partnerName,
              quotedAmount: check.quotedAmount,
              finalAmount: check.finalAmount,
              difference: check.difference,
              outcome: check.outcome,
              checkedAt: check.createdAt,
            },
          },
        }
      );

      // The team hears about every price change and every pickup that didn't happen
      if (check.difference !== 0 || outcome !== 'AGREED') {
        void NotificationService.emailAdmins(doorstepCheckAlert(check.toObject(), request.toObject()));
      }

      res.status(201).json({ success: true, message: 'Check saved.', data: check });
    } catch (err) {
      next(err);
    }
  }

  /** GET /partner/checks: the partner's own recent checks. */
  public static async myChecks(req: AuthenticatedPartnerRequest, res: Response, next: NextFunction) {
    try {
      const checks = await DoorstepCheckModel.find({ partnerId: req.partner!.id })
        .sort({ createdAt: -1 })
        .limit(30)
        .select('requestNumber device.modelName device.brandName device.checkedStorage quotedAmount finalAmount difference outcome createdAt')
        .lean();
      res.status(200).json({ success: true, data: checks });
    } catch (err) {
      next(err);
    }
  }

  // --- Admin ---

  /** GET /partner/admin/checks: every doorstep check, newest first (filter: reduced, increased, outcome, partner). */
  public static async adminListChecks(req: AuthenticatedAdminRequest, res: Response, next: NextFunction) {
    try {
      const { change, outcome, partnerId, search } = req.query as Record<string, string | undefined>;
      const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '20'), 10) || 20));
      const filter: any = {};
      if (change === 'reduced') filter.difference = { $lt: 0 };
      else if (change === 'increased') filter.difference = { $gt: 0 };
      else if (change === 'same') filter.difference = 0;
      if (outcome && ['AGREED', 'DECLINED', 'NOT_BUYABLE'].includes(outcome)) filter.outcome = outcome;
      if (partnerId && mongoose.Types.ObjectId.isValid(partnerId)) filter.partnerId = new mongoose.Types.ObjectId(partnerId);
      if (search) {
        const s = String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        filter.$or = [
          { requestNumber: { $regex: s, $options: 'i' } },
          { partnerName: { $regex: s, $options: 'i' } },
          { 'device.modelName': { $regex: s, $options: 'i' } },
        ];
      }
      const [checks, total, reducedStats] = await Promise.all([
        DoorstepCheckModel.find(filter)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .select('-customerCondition -checkedCondition -checkedBreakdown')
          .lean(),
        DoorstepCheckModel.countDocuments(filter),
        DoorstepCheckModel.aggregate([
          { $match: { ...filter, difference: { $lt: 0 } } },
          { $group: { _id: null, count: { $sum: 1 }, amount: { $sum: '$difference' } } },
        ]),
      ]);
      res.status(200).json({
        success: true,
        data: checks,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          reducedCount: reducedStats[0]?.count ?? 0,
          reducedAmount: Math.abs(reducedStats[0]?.amount ?? 0),
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /** GET /partner/admin/requests/:id/checks: every check of one request, newest first. */
  public static async adminRequestChecks(req: AuthenticatedAdminRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) return next(new AppError('Request not found', 404));
      const checks = await DoorstepCheckModel.find({ requestId: id }).sort({ createdAt: -1 }).lean();
      res.status(200).json({ success: true, data: checks });
    } catch (err) {
      next(err);
    }
  }

  /** PUT /partner/admin/employees/:id/access: switch partner app access on/off and set a new PIN. */
  public static async adminSetAccess(req: AuthenticatedAdminRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) return next(new AppError('Employee not found.', 404));
      const enabled = req.body?.enabled !== false;
      const pin = req.body?.pin === undefined || req.body?.pin === null ? '' : String(req.body.pin).trim();
      if (pin && !PIN_PATTERN.test(pin)) return next(new AppError('The PIN must be 6 digits.', 400));

      const employee = await EmployeeModel.findById(id).select('+partnerPinHash');
      if (!employee) return next(new AppError('Employee not found.', 404));
      if (enabled && !pin && !employee.partnerPinHash) {
        return next(new AppError('Set a 6-digit PIN to give this employee access to the partner app.', 400));
      }
      if (enabled && !normalizeIndianMobile(employee.phone)) {
        return next(new AppError('Add a valid 10-digit mobile number for this employee first: partners sign in with it.', 400));
      }

      const set: any = { partnerAccessEnabled: enabled, partnerFailedAttempts: 0 };
      if (pin) set.partnerPinHash = await TokenService.hashPassword(pin);
      await EmployeeModel.updateOne({ _id: employee._id }, { $set: set, $unset: { partnerLockedUntil: 1 } });

      await logAuditEvent({
        req,
        actorType: 'ADMIN',
        actorId: req.admin?.id,
        actorEmail: req.admin?.email,
        action: enabled ? (pin ? 'PARTNER_ACCESS_PIN_SET' : 'PARTNER_ACCESS_ON') : 'PARTNER_ACCESS_OFF',
        resourceType: 'Employee',
        resourceId: String(employee._id),
      });

      const updated = await EmployeeModel.findById(employee._id);
      res.status(200).json({
        success: true,
        message: enabled ? (pin ? 'PIN saved. The partner can sign in now.' : 'Partner access is on.') : 'Partner access is off.',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }
}
