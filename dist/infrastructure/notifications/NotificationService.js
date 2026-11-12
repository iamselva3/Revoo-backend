"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const index_js_1 = require("../../config/index.js");
const Notification_js_1 = require("../database/models/Notification.js");
const PLACEHOLDER_VALUES = new Set(['', 'dummy', 'changeme', 'your-smtp-user', 'your-smtp-password']);
const escapeHtml = (value) => value.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
class NotificationService {
    static transporter = null;
    /** SMTP is usable when a host or well-known service plus real credentials are configured. */
    static isEmailConfigured() {
        const { smtpService, smtpHost, smtpUser, smtpPass } = index_js_1.config.email;
        const hasServer = Boolean(smtpService || smtpHost);
        return (hasServer &&
            !PLACEHOLDER_VALUES.has(smtpUser.trim().toLowerCase()) &&
            !PLACEHOLDER_VALUES.has(smtpPass.trim().toLowerCase()));
    }
    static getMailTransporter() {
        if (!this.transporter) {
            const { smtpService, smtpHost, smtpPort, smtpSecure, smtpUser, smtpPass } = index_js_1.config.email;
            this.transporter = nodemailer_1.default.createTransport(smtpService
                ? { service: smtpService, auth: { user: smtpUser, pass: smtpPass } }
                : {
                    host: smtpHost,
                    port: smtpPort,
                    secure: smtpSecure,
                    auth: { user: smtpUser, pass: smtpPass },
                });
        }
        return this.transporter;
    }
    static fromAddress() {
        return `"${index_js_1.config.email.fromName}" <${index_js_1.config.email.from}>`;
    }
    static otpEmailHtml(otp, expiresInMinutes) {
        const digits = escapeHtml(otp)
            .split('')
            .map((d) => `<td style="width:44px;height:52px;border-radius:12px;background:#fff7e6;border:1px solid #fcd9a0;font-size:26px;font-weight:800;color:#1f1147;text-align:center;font-family:'Segoe UI',Arial,sans-serif;">${d}</td>`)
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
    static async sendOtp(destination, channel, otp, expiresInMinutes = 5) {
        const messageBody = `Your Genie verification code is ${otp}. It expires in ${expiresInMinutes} minutes. Do not share this code with anyone.`;
        if (channel === 'WHATSAPP') {
            if (index_js_1.config.whatsapp.enabled && index_js_1.config.whatsapp.accessToken && index_js_1.config.whatsapp.phoneNumberId) {
                try {
                    // Meta WhatsApp Cloud API call
                    const response = await fetch(`${index_js_1.config.whatsapp.apiUrl}/${index_js_1.config.whatsapp.phoneNumberId}/messages`, {
                        method: 'POST',
                        headers: {
                            Authorization: `Bearer ${index_js_1.config.whatsapp.accessToken}`,
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
                }
                catch (err) {
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
            }
            catch (err) {
                console.error('[Email Service Error]', err?.message || err);
                if (index_js_1.config.isProduction) {
                    return { success: false, delivered: false, message: 'We could not send the email right now. Please try again in a minute.' };
                }
                // Development: keep the flow usable even with a broken SMTP setup
                console.log(`[EMAIL ADAPTER (DEV)] SMTP failed, OTP for ${destination}: ${otp}`);
                return { success: true, delivered: false, message: 'Email OTP generated (SMTP failed — development fallback)' };
            }
        }
        if (index_js_1.config.isProduction) {
            console.error('[Email Service] SMTP is not configured (set SMTP_SERVICE or SMTP_HOST, SMTP_USER, SMTP_PASS).');
            return { success: false, delivered: false, message: 'Email sign-in is temporarily unavailable. Please continue with Google.' };
        }
        console.log(`[EMAIL ADAPTER (DEV)] OTP for ${destination}: ${otp}`);
        return { success: true, delivered: false, message: 'Email OTP sent (Development sandbox)' };
    }
    static async notify(options) {
        try {
            // Persist in-app notification
            await Notification_js_1.NotificationModel.create({
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
        }
        catch (err) {
            console.error('[NotificationService] Error recording notification:', err);
        }
    }
}
exports.NotificationService = NotificationService;
//# sourceMappingURL=NotificationService.js.map