"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppError = exports.DeviceImageType = exports.EnquiryStatus = exports.ReturnStatus = exports.PaymentStatus = exports.PaymentMethod = exports.CustomerDecision = exports.FinalOfferStatus = exports.RequestStatus = exports.AdminRole = exports.UserStatus = void 0;
var UserStatus;
(function (UserStatus) {
    UserStatus["ACTIVE"] = "ACTIVE";
    UserStatus["BLOCKED"] = "BLOCKED";
    UserStatus["PENDING"] = "PENDING";
})(UserStatus || (exports.UserStatus = UserStatus = {}));
var AdminRole;
(function (AdminRole) {
    AdminRole["SUPER_ADMIN"] = "SUPER_ADMIN";
    AdminRole["ADMIN"] = "ADMIN";
    AdminRole["OPERATIONS"] = "OPERATIONS";
    AdminRole["INSPECTOR"] = "INSPECTOR";
})(AdminRole || (exports.AdminRole = AdminRole = {}));
var RequestStatus;
(function (RequestStatus) {
    RequestStatus["SUBMITTED"] = "SUBMITTED";
    RequestStatus["UNDER_REVIEW"] = "UNDER_REVIEW";
    RequestStatus["COLLECTION_SCHEDULED"] = "COLLECTION_SCHEDULED";
    RequestStatus["ASSIGNED_FOR_COLLECTION"] = "ASSIGNED_FOR_COLLECTION";
    RequestStatus["COLLECTED"] = "COLLECTED";
    RequestStatus["RECEIVED_AT_INSPECTION_CENTRE"] = "RECEIVED_AT_INSPECTION_CENTRE";
    RequestStatus["UNDER_INSPECTION"] = "UNDER_INSPECTION";
    RequestStatus["FINAL_OFFER_GENERATED"] = "FINAL_OFFER_GENERATED";
    RequestStatus["AWAITING_CUSTOMER_DECISION"] = "AWAITING_CUSTOMER_DECISION";
    RequestStatus["OFFER_ACCEPTED"] = "OFFER_ACCEPTED";
    RequestStatus["OFFER_REJECTED"] = "OFFER_REJECTED";
    RequestStatus["PAYMENT_PROCESSING"] = "PAYMENT_PROCESSING";
    RequestStatus["PAYMENT_COMPLETED"] = "PAYMENT_COMPLETED";
    RequestStatus["RETURN_INITIATED"] = "RETURN_INITIATED";
    RequestStatus["RETURNED"] = "RETURNED";
    RequestStatus["CANCELLED"] = "CANCELLED";
})(RequestStatus || (exports.RequestStatus = RequestStatus = {}));
var FinalOfferStatus;
(function (FinalOfferStatus) {
    FinalOfferStatus["ISSUED"] = "ISSUED";
    FinalOfferStatus["ACCEPTED"] = "ACCEPTED";
    FinalOfferStatus["REJECTED"] = "REJECTED";
    FinalOfferStatus["SUPERSEDED"] = "SUPERSEDED";
    FinalOfferStatus["EXPIRED"] = "EXPIRED";
})(FinalOfferStatus || (exports.FinalOfferStatus = FinalOfferStatus = {}));
var CustomerDecision;
(function (CustomerDecision) {
    CustomerDecision["ACCEPTED"] = "ACCEPTED";
    CustomerDecision["REJECTED"] = "REJECTED";
})(CustomerDecision || (exports.CustomerDecision = CustomerDecision = {}));
var PaymentMethod;
(function (PaymentMethod) {
    PaymentMethod["BANK_TRANSFER"] = "BANK_TRANSFER";
    PaymentMethod["UPI"] = "UPI";
    PaymentMethod["CASH"] = "CASH";
    PaymentMethod["CHEQUE"] = "CHEQUE";
})(PaymentMethod || (exports.PaymentMethod = PaymentMethod = {}));
var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["PENDING"] = "PENDING";
    PaymentStatus["PROCESSING"] = "PROCESSING";
    PaymentStatus["COMPLETED"] = "COMPLETED";
    PaymentStatus["FAILED"] = "FAILED";
})(PaymentStatus || (exports.PaymentStatus = PaymentStatus = {}));
var ReturnStatus;
(function (ReturnStatus) {
    ReturnStatus["INITIATED"] = "INITIATED";
    ReturnStatus["IN_TRANSIT"] = "IN_TRANSIT";
    ReturnStatus["RETURNED"] = "RETURNED";
    ReturnStatus["CANCELLED"] = "CANCELLED";
})(ReturnStatus || (exports.ReturnStatus = ReturnStatus = {}));
var EnquiryStatus;
(function (EnquiryStatus) {
    EnquiryStatus["OPEN"] = "OPEN";
    EnquiryStatus["IN_PROGRESS"] = "IN_PROGRESS";
    EnquiryStatus["RESOLVED"] = "RESOLVED";
    EnquiryStatus["CLOSED"] = "CLOSED";
})(EnquiryStatus || (exports.EnquiryStatus = EnquiryStatus = {}));
var DeviceImageType;
(function (DeviceImageType) {
    DeviceImageType["CUSTOMER_FRONT"] = "CUSTOMER_FRONT";
    DeviceImageType["CUSTOMER_BACK"] = "CUSTOMER_BACK";
    DeviceImageType["CUSTOMER_SCREEN_ON"] = "CUSTOMER_SCREEN_ON";
    DeviceImageType["CUSTOMER_DAMAGE_EVIDENCE"] = "CUSTOMER_DAMAGE_EVIDENCE";
    DeviceImageType["INSPECTION_EVIDENCE"] = "INSPECTION_EVIDENCE";
})(DeviceImageType || (exports.DeviceImageType = DeviceImageType = {}));
class AppError extends Error {
    statusCode;
    isOperational;
    errors;
    constructor(message, statusCode = 500, errors) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        this.errors = errors;
        Object.setPrototypeOf(this, new.target.prototype);
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
//# sourceMappingURL=types.js.map