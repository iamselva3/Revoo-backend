import { Response, NextFunction } from 'express';
import { BuybackRequestModel } from '../../infrastructure/database/models/BuybackRequest.js';
import { AuditLogModel } from '../../infrastructure/database/models/AuditLog.js';
import { CustomerEnquiryModel } from '../../infrastructure/database/models/CustomerEnquiry.js';
import { RequestStatus, EnquiryStatus } from '../../shared/types.js';
import { AuthenticatedAdminRequest } from '../middlewares/auth.middleware.js';

export class DashboardController {
  public static async getOperationalStats(req: AuthenticatedAdminRequest, res: Response, next: NextFunction) {
    try {
      const [
        totalRequests,
        newRequests,
        underReview,
        collectionPending,
        devicesCollected,
        inspectionsPending,
        awaitingCustomerDecision,
        acceptedOffers,
        rejectedOffers,
        paymentsPending,
        completedTransactions,
        returnsPending,
        openEnquiries,
        recentRequests,
      ] = await Promise.all([
        BuybackRequestModel.countDocuments(),
        BuybackRequestModel.countDocuments({ status: RequestStatus.SUBMITTED }),
        BuybackRequestModel.countDocuments({ status: RequestStatus.UNDER_REVIEW }),
        BuybackRequestModel.countDocuments({
          status: { $in: [RequestStatus.COLLECTION_SCHEDULED, RequestStatus.ASSIGNED_FOR_COLLECTION] },
        }),
        BuybackRequestModel.countDocuments({
          status: { $in: [RequestStatus.COLLECTED, RequestStatus.RECEIVED_AT_INSPECTION_CENTRE] },
        }),
        BuybackRequestModel.countDocuments({ status: RequestStatus.UNDER_INSPECTION }),
        BuybackRequestModel.countDocuments({ status: RequestStatus.AWAITING_CUSTOMER_DECISION }),
        BuybackRequestModel.countDocuments({ status: RequestStatus.OFFER_ACCEPTED }),
        BuybackRequestModel.countDocuments({ status: RequestStatus.OFFER_REJECTED }),
        BuybackRequestModel.countDocuments({ status: RequestStatus.PAYMENT_PROCESSING }),
        BuybackRequestModel.countDocuments({ status: RequestStatus.PAYMENT_COMPLETED }),
        BuybackRequestModel.countDocuments({ status: RequestStatus.RETURN_INITIATED }),
        CustomerEnquiryModel.countDocuments({ status: EnquiryStatus.OPEN }),
        BuybackRequestModel.find().sort({ createdAt: -1 }).limit(10),
      ]);

      res.status(200).json({
        success: true,
        data: {
          metrics: {
            totalRequests,
            newRequests,
            underReview,
            collectionPending,
            devicesCollected,
            inspectionsPending,
            awaitingCustomerDecision,
            acceptedOffers,
            rejectedOffers,
            paymentsPending,
            completedTransactions,
            returnsPending,
            openEnquiries,
          },
          recentRequests,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getAuditLogs(req: AuthenticatedAdminRequest, res: Response, next: NextFunction) {
    try {
      const { resourceType, limit = '50' } = req.query;
      const filter: any = {};
      if (resourceType) filter.resourceType = resourceType;

      const logs = await AuditLogModel.find(filter)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit as string, 10));

      res.status(200).json({ success: true, data: logs });
    } catch (err) {
      next(err);
    }
  }
}

