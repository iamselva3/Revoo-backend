import nodemailer from 'nodemailer';
import { config } from '../../config/index.js';
import { NotificationModel } from '../database/models/Notification.js';

export interface SendNotificationOptions {
  recipientType: 'USER' | 'ADMIN';
  recipientId?: string;
  destination: string; // phone or email
  channel: 'IN_APP' | 'EMAIL' | 'WHATSAPP';
  title: string;
  body: string;
  metadata?: Record<string, any>;
}

export class NotificationService {
  private static transporter: nodemailer.Transporter | null = null;

  private static getMailTransporter(): nodemailer.Transporter {
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: config.email.smtpHost,
        port: config.email.smtpPort,
        secure: config.email.smtpPort === 465,
        auth: config.email.smtpUser
          ? {
              user: config.email.smtpUser,
              pass: config.email.smtpPass,
            }
          : undefined,
      });
    }
    return this.transporter;
  }

  public static async sendOtp(
    destination: string,
    channel: 'WHATSAPP' | 'EMAIL',
    otp: string
  ): Promise<{ success: boolean; message: string }> {
    const messageBody = `Your REVOO verification code is: ${otp}. It will expire in 5 minutes. Do not share this code with anyone.`;

    if (channel === 'WHATSAPP') {
      if (config.whatsapp.enabled && config.whatsapp.accessToken && config.whatsapp.phoneNumberId) {
        try {
          // Meta WhatsApp Cloud API call
          const response = await fetch(`${config.whatsapp.apiUrl}/${config.whatsapp.phoneNumberId}/messages`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${config.whatsapp.accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              to: destination.replace(/\D/g, ''),
              type: 'text',
              text: { body: messageBody },
            }),
          });
          const resData = await response.json();
          if (!response.ok) {
            console.error('[WhatsApp API Error]', resData);
            return { success: false, message: 'Failed to deliver WhatsApp message' };
          }
          return { success: true, message: 'WhatsApp OTP sent successfully' };
        } catch (err: any) {
          console.error('[WhatsApp Service Exception]', err);
          return { success: false, message: err.message };
        }
      } else {
        // WhatsApp dev adapter - log securely to console for testing
        console.log(`[WHATSAPP ADAPTER (DEV)] Sending OTP to ${destination}: [OTP: ${otp}]`);
        return { success: true, message: 'WhatsApp OTP sent (Development sandbox)' };
      }
    } else {
      // Email OTP
      if (config.isProduction && config.email.smtpUser) {
        try {
          const mailer = this.getMailTransporter();
          await mailer.sendMail({
            from: `"REVOO Security" <${config.email.from}>`,
            to: destination,
            subject: 'Your REVOO Verification Code',
            text: messageBody,
            html: `<div style="font-family:sans-serif;padding:20px;border:1px solid #e2e8f0;border-radius:8px;max-width:500px;">
              <h2 style="color:#0B6623;margin-top:0;">REVOO Verification Code</h2>
              <p>Your one-time password (OTP) is:</p>
              <div style="font-size:32px;font-weight:bold;letter-spacing:6px;color:#0B6623;padding:12px;background:#f0fdf4;border-radius:6px;text-align:center;">
                ${otp}
              </div>
              <p style="color:#64748b;font-size:13px;margin-top:20px;">Valid for 5 minutes. If you did not request this, please ignore this email.</p>
            </div>`,
          });
          return { success: true, message: 'Email OTP dispatched' };
        } catch (err: any) {
          console.error('[Email Service Error]', err);
          return { success: false, message: err.message };
        }
      } else {
        console.log(`[EMAIL ADAPTER (DEV)] Sending OTP to ${destination}: [OTP: ${otp}]`);
        return { success: true, message: 'Email OTP sent (Development sandbox)' };
      }
    }
  }

  public static async notify(options: SendNotificationOptions): Promise<void> {
    try {
      // Persist in-app notification
      await NotificationModel.create({
        recipientType: options.recipientType,
        recipientId: options.recipientId,
        channel: options.channel,
        title: options.title,
        body: options.body,
        metadata: options.metadata,
        status: 'SENT',
      });

      // Dispatch external channel if configured
      if (options.channel === 'EMAIL' && config.isProduction && config.email.smtpUser) {
        const mailer = this.getMailTransporter();
        await mailer.sendMail({
          from: `"REVOO" <${config.email.from}>`,
          to: options.destination,
          subject: options.title,
          text: options.body,
        });
      }
    } catch (err) {
      console.error('[NotificationService] Error recording notification:', err);
    }
  }
}

