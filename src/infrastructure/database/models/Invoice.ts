import mongoose, { Schema, Document } from 'mongoose';

export interface IInvoiceDocument extends Document {
  invoiceNumber: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  shippingAddress: string;
  addressTag: string;
  productName: string;
  brand: string;
  storage: string;
  color: string;
  grade: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  paymentMethod: string;
  status: string;
  orderDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceSchema = new Schema<IInvoiceDocument>(
  {
    invoiceNumber: { type: String, required: true, unique: true, index: true },
    orderNumber: { type: String, required: true, unique: true, index: true },
    customerName: { type: String, required: true, trim: true },
    customerPhone: { type: String, required: true, trim: true },
    customerEmail: { type: String, required: true, trim: true },
    shippingAddress: { type: String, required: true, trim: true },
    addressTag: { type: String, default: 'Home' },
    productName: { type: String, required: true, trim: true },
    brand: { type: String, required: true, trim: true },
    storage: { type: String, default: '128GB' },
    color: { type: String, default: 'Standard' },
    grade: { type: String, default: 'EXCELLENT' },
    quantity: { type: Number, default: 1 },
    unitPrice: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
    paymentMethod: { type: String, default: 'Cash on Delivery (COD)' },
    status: { type: String, default: 'CONFIRMED' },
    orderDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const InvoiceModel = mongoose.model<IInvoiceDocument>('Invoice', InvoiceSchema);

