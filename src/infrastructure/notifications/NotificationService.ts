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

export interface OtpDispatchResult {
  success: boolean;
  /** True only when the code actually left our servers (SMTP / WhatsApp accepted it). */
  delivered: boolean;
  message: string;
}

const PLACEHOLDER_VALUES = new Set(['', 'dummy', 'changeme', 'your-smtp-user', 'your-smtp-password']);

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);

export class NotificationService {
  private static transporter: nodemailer.Transporter | null = null;

  /** SMTP is usable when a host or well-known service plus real credentials are configured. */
  public static isEmailConfigured(): boolean {
    const { smtpService, smtpHost, smtpUser, smtpPass } = config.email;
    const hasServer = Boolean(smtpService || smtpHost);
    return (
      hasServer &&
      !PLACEHOLDER_VALUES.has(smtpUser.trim().toLowerCase()) &&
      !PLACEHOLDER_VALUES.has(smtpPass.trim().toLowerCase())
    );
  }

  private static getMailTransporter(): nodemailer.Transporter {
    if (!this.transporter) {
      const { smtpService, smtpHost, smtpPort, smtpSecure, smtpUser, smtpPass } = config.email;
      this.transporter = nodemailer.createTransport(
        smtpService
          ? { service: smtpService, auth: { user: smtpUser, pass: smtpPass } }
          : {
              host: smtpHost,
              port: smtpPort,
              secure: smtpSecure,
              auth: { user: smtpUser, pass: smtpPass },
            }
      );
    }
    return this.transporter;
  }

  private static fromAddress(): string {
    return `"${config.email.fromName}" <${config.email.from}>`;
  }

  private static otpEmailHtml(otp: string, expiresInMinutes: number): string {
    const digits = escapeHtml(otp)
      .split('')
      .map(
        (d) =>
          `<td style="width:44px;height:52px;border-radius:12px;background:#fff7e6;border:1px solid #fcd9a0;font-size:26px;font-weight:800;color:#1f1147;text-align:center;font-family:'Segoe UI',Arial,sans-serif;">${d}</td>`
      )
      .join('<td style="width:8px"></td>');

    return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f6f5fb;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f5fb;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:20px;border:1px solid #ece9f5;overflow:hidden;font-family:'Segoe UI',Arial,sans-serif;">
        <tr><td style="height:6px;background:linear-gradient(90deg,#f59e0b,#ec4899,#8b5cf6);"></td></tr>
        <tr><td style="padding:28px 28px 8px;">
          <div style="font-size:22px;font-weight:800;color:#1f1147;letter-spacing:-0.3px;">Genie</div>
          <div style="font-size:13px;color:#6b6585;margin-top:2px;">Sell your old phone, get paid at your door</div>
        </td></tr>
        <tr><td style="padding:16px 28px 0;">
          <p style="margin:0 0 6px;font-size:16px;font-weight:700;color:#1f1147;">Your sign-in code</p>
          <p style="margin:0 0 18px;font-size:14px;line-height:1.5;color:#4b4666;">Enter this code on Genie to continue. It expires in ${expiresInMinutes} minutes.</p>
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>${digits}</tr></table>
        </td></tr>
        <tr><td style="padding:22px 28px 28px;">
          <p style="margin:0;font-size:12px;line-height:1.6;color:#8a85a3;">Never share this code with anyone, including Genie staff. If you didn't try to sign in, you can safely ignore this email.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
  }

  public static async sendOtp(
    destination: string,
    channel: 'WHATSAPP' | 'EMAIL',
    otp: string,
    expiresInMinutes = 5
  ): Promise<OtpDispatchResult> {
    const messageBody = `Your Genie verification code is ${otp}. It expires in ${expiresInMinutes} minutes. Do not share this code with anyone.`;

    if (channel === 'WHATSAPP') {
      if (config.whatsapp.enabled && config.whatsapp.accessToken && config.whatsapp.phoneNumberId) {
        try {
          // Meta WhatsApp Cloud API call
          const response = await fetch(`${config.whatsapp.apiUrl}/${config.whatsapp.phoneNumberId}/messages`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${config.whatsapp.accessToken}`,
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
            return { success: false, delivered: false, message: 'Failed to deliver WhatsApp message' };
          }
          return { success: true, delivered: true, message: 'WhatsApp OTP sent successfully' };
        } catch (err: any) {
          console.error('[WhatsApp Service Exception]', err);
          return { success: false, delivered: false, message: err.message };
        }
      }
      // WhatsApp dev adapter - log to console for testing
      console.log(`[WHATSAPP ADAPTER (DEV)] OTP for ${destination}: ${otp}`);
      return { success: true, delivered: false, message: 'WhatsApp OTP sent (Development sandbox)' };
    }

    // Email OTP via nodemailer
    if (NotificationService.isEmailConfigured()) {
      try {
        await NotificationService.getMailTransporter().sendMail({
          from: NotificationService.fromAddress(),
          to: destination,
          subject: `${otp} is your Genie sign-in code`,
          text: messageBody,
          html: NotificationService.otpEmailHtml(otp, expiresInMinutes),
        });
        return { success: true, delivered: true, message: `We've sent a 6-digit code to ${destination}.` };
      } catch (err: any) {
        console.error('[Email Service Error]', err?.message || err);
        if (config.isProduction) {
          return { success: false, delivered: false, message: 'We could not send the email right now. Please try again in a minute.' };
        }
        // Development: keep the flow usable even with a broken SMTP setup
        console.log(`[EMAIL ADAPTER (DEV)] SMTP failed, OTP for ${destination}: ${otp}`);
        return { success: true, delivered: false, message: 'Email OTP generated (SMTP failed — development fallback)' };
      }
    }

    if (config.isProduction) {
      console.error('[Email Service] SMTP is not configured (set SMTP_SERVICE or SMTP_HOST, SMTP_USER, SMTP_PASS).');
      return { success: false, delivered: false, message: 'Email sign-in is temporarily unavailable. Please continue with Google.' };
    }
    console.log(`[EMAIL ADAPTER (DEV)] OTP for ${destination}: ${otp}`);
    return { success: true, delivered: false, message: 'Email OTP sent (Development sandbox)' };
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
      if (options.channel === 'EMAIL' && NotificationService.isEmailConfigured()) {
        await NotificationService.getMailTransporter().sendMail({
          from: NotificationService.fromAddress(),
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
