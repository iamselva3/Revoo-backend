export enum UserStatus {
  ACTIVE = 'ACTIVE',
  BLOCKED = 'BLOCKED',
  PENDING = 'PENDING'
}

export enum AdminRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  OPERATIONS = 'OPERATIONS',
  INSPECTOR = 'INSPECTOR'
}

export enum RequestStatus {
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  COLLECTION_SCHEDULED = 'COLLECTION_SCHEDULED',
  ASSIGNED_FOR_COLLECTION = 'ASSIGNED_FOR_COLLECTION',
  COLLECTED = 'COLLECTED',
  RECEIVED_AT_INSPECTION_CENTRE = 'RECEIVED_AT_INSPECTION_CENTRE',
  UNDER_INSPECTION = 'UNDER_INSPECTION',
  FINAL_OFFER_GENERATED = 'FINAL_OFFER_GENERATED',
  AWAITING_CUSTOMER_DECISION = 'AWAITING_CUSTOMER_DECISION',
  OFFER_ACCEPTED = 'OFFER_ACCEPTED',
  OFFER_REJECTED = 'OFFER_REJECTED',
  PAYMENT_PROCESSING = 'PAYMENT_PROCESSING',
  PAYMENT_COMPLETED = 'PAYMENT_COMPLETED',
  RETURN_INITIATED = 'RETURN_INITIATED',
  RETURNED = 'RETURNED',
  CANCELLED = 'CANCELLED'
}

export enum FinalOfferStatus {
  ISSUED = 'ISSUED',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  SUPERSEDED = 'SUPERSEDED',
  EXPIRED = 'EXPIRED'
}

export enum CustomerDecision {
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED'
}

export enum PaymentMethod {
  BANK_TRANSFER = 'BANK_TRANSFER',
  UPI = 'UPI',
  CASH = 'CASH',
  CHEQUE = 'CHEQUE'
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

export enum ReturnStatus {
  INITIATED = 'INITIATED',
  IN_TRANSIT = 'IN_TRANSIT',
  RETURNED = 'RETURNED',
  CANCELLED = 'CANCELLED'
}

export enum EnquiryStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED'
}

export enum DeviceImageType {
  CUSTOMER_FRONT = 'CUSTOMER_FRONT',
  CUSTOMER_BACK = 'CUSTOMER_BACK',
  CUSTOMER_SCREEN_ON = 'CUSTOMER_SCREEN_ON',
  CUSTOMER_DAMAGE_EVIDENCE = 'CUSTOMER_DAMAGE_EVIDENCE',
  INSPECTION_EVIDENCE = 'INSPECTION_EVIDENCE'
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly errors?: any;

  constructor(message: string, statusCode = 500, errors?: any) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.errors = errors;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
  };
  errors?: any;
}

