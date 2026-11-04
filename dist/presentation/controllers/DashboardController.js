"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardController = void 0;
const BuybackRequest_js_1 = require("../../infrastructure/database/models/BuybackRequest.js");
const AuditLog_js_1 = require("../../infrastructure/database/models/AuditLog.js");
const CustomerEnquiry_js_1 = require("../../infrastructure/database/models/CustomerEnquiry.js");
const types_js_1 = require("../../shared/types.js");
class DashboardController {
    static async getOperationalStats(req, res, next) {
        try {
            const [totalRequests, newRequests, underReview, collectionPending, devicesCollected, inspectionsPending, awaitingCustomerDecision, acceptedOffers, rejectedOffers, paymentsPending, completedTransactions, returnsPending, openEnquiries, recentRequests,] = await Promise.all([
                BuybackRequest_js_1.BuybackRequestModel.countDocuments(),
                BuybackRequest_js_1.BuybackRequestModel.countDocuments({ status: types_js_1.RequestStatus.SUBMITTED }),
                BuybackRequest_js_1.BuybackRequestModel.countDocuments({ status: types_js_1.RequestStatus.UNDER_REVIEW }),
                BuybackRequest_js_1.BuybackRequestModel.countDocuments({
                    status: { $in: [types_js_1.RequestStatus.COLLECTION_SCHEDULED, types_js_1.RequestStatus.ASSIGNED_FOR_COLLECTION] },
                }),
                BuybackRequest_js_1.BuybackRequestModel.countDocuments({
                    status: { $in: [types_js_1.RequestStatus.COLLECTED, types_js_1.RequestStatus.RECEIVED_AT_INSPECTION_CENTRE] },
                }),
                BuybackRequest_js_1.BuybackRequestModel.countDocuments({ status: types_js_1.RequestStatus.UNDER_INSPECTION }),
                BuybackRequest_js_1.BuybackRequestModel.countDocuments({ status: types_js_1.RequestStatus.AWAITING_CUSTOMER_DECISION }),
                BuybackRequest_js_1.BuybackRequestModel.countDocuments({ status: types_js_1.RequestStatus.OFFER_ACCEPTED }),
                BuybackRequest_js_1.BuybackRequestModel.countDocuments({ status: types_js_1.RequestStatus.OFFER_REJECTED }),
                BuybackRequest_js_1.BuybackRequestModel.countDocuments({ status: types_js_1.RequestStatus.PAYMENT_PROCESSING }),
                BuybackRequest_js_1.BuybackRequestModel.countDocuments({ status: types_js_1.RequestStatus.PAYMENT_COMPLETED }),
                BuybackRequest_js_1.BuybackRequestModel.countDocuments({ status: types_js_1.RequestStatus.RETURN_INITIATED }),
                CustomerEnquiry_js_1.CustomerEnquiryModel.countDocuments({ status: types_js_1.EnquiryStatus.OPEN }),
                BuybackRequest_js_1.BuybackRequestModel.find().sort({ createdAt: -1 }).limit(10),
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
        }
        catch (err) {
            next(err);
        }
    }
    static async getAuditLogs(req, res, next) {
        try {
            const { resourceType, limit = '50' } = req.query;
            const filter = {};
            if (resourceType)
                filter.resourceType = resourceType;
            const logs = await AuditLog_js_1.AuditLogModel.find(filter)
                .sort({ createdAt: -1 })
                .limit(parseInt(limit, 10));
            res.status(200).json({ success: true, data: logs });
        }
        catch (err) {
            next(err);
        }
    }
}
exports.DashboardController = DashboardController;
//# sourceMappingURL=DashboardController.js.map