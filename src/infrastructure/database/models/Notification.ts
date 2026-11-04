import mongoose, { Schema, Document, Types } from 'mongoose';

export interface INotificationDocument extends Document {
  recipientType: 'USER' | 'ADMIN';
  recipientId?: Types.ObjectId;
  channel: 'IN_APP' | 'EMAIL' | 'WHATSAPP';
  title: string;
  body: string;
  metadata?: Record<string, any>;
  isRead: boolean;
  status: 'PENDING' | 'SENT' | 'FAILED';
  createdAt: Date;
}

const NotificationSchema = new Schema<INotificationDocument>(
  {
    recipientType: { type: String, enum: ['USER', 'ADMIN'], required: true },
    recipientId: { type: Schema.Types.ObjectId, index: true },
    channel: { type: String, enum: ['IN_APP', 'EMAIL', 'WHATSAPP'], default: 'IN_APP' },
    title: { type: String, required: true },
    body: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed },
    isRead: { type: Boolean, default: false },
    status: { type: String, enum: ['PENDING', 'SENT', 'FAILED'], default: 'SENT' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const NotificationModel = mongoose.model<INotificationDocument>('Notification', NotificationSchema);

