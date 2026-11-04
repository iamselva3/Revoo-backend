"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const index_js_1 = require("../../config/index.js");
const Notification_js_1 = require("../database/models/Notification.js");
class NotificationService {
    static transporter = null;
    static getMailTransporter() {
        if (!this.transporter) {
            this.transporter = nodemailer_1.default.createTransport({
                host: index_js_1.config.email.smtpHost,
                port: index_js_1.config.email.smtpPort,
                secure: index_js_1.config.email.smtpPort === 465,
                auth: index_js_1.config.email.smtpUser
                    ? {
                        user: index_js_1.config.email.smtpUser,
                        pass: index_js_1.config.email.smtpPass,
                    }
                    : undefined,
            });
        }
        return this.transporter;
    }
    static async sendOtp(destination, channel, otp) {
        const messageBody = `Your REVOO verification code is: ${otp}. It will expire in 5 minutes. Do not share this code with anyone.`;
        if (channel === 'WHATSAPP') {
            if (index_js_1.config.whatsapp.enabled && index_js_1.config.whatsapp.accessToken && index_js_1.config.whatsapp.phoneNumberId) {
                try {
                    // Meta WhatsApp Cloud API call
                    const response = await fetch(`${index_js_1.config.whatsapp.apiUrl}/${index_js_1.config.whatsapp.phoneNumberId}/messages`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${index_js_1.config.whatsapp.accessToken}`,
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
                }
                catch (err) {
                    console.error('[WhatsApp Service Exception]', err);
                    return { success: false, message: err.message };
                }
            }
            else {
                // WhatsApp dev adapter - log securely to console for testing
                console.log(`[WHATSAPP ADAPTER (DEV)] Sending OTP to ${destination}: [OTP: ${otp}]`);
                return { success: true, message: 'WhatsApp OTP sent (Development sandbox)' };
            }
        }
        else {
            // Email OTP
            if (index_js_1.config.isProduction && index_js_1.config.email.smtpUser) {
                try {
                    const mailer = this.getMailTransporter();
                    await mailer.sendMail({
                        from: `"REVOO Security" <${index_js_1.config.email.from}>`,
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
                }
                catch (err) {
                    console.error('[Email Service Error]', err);
                    return { success: false, message: err.message };
                }
            }
            else {
                console.log(`[EMAIL ADAPTER (DEV)] Sending OTP to ${destination}: [OTP: ${otp}]`);
                return { success: true, message: 'Email OTP sent (Development sandbox)' };
            }
        }
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
            if (options.channel === 'EMAIL' && index_js_1.config.isProduction && index_js_1.config.email.smtpUser) {
                const mailer = this.getMailTransporter();
                await mailer.sendMail({
                    from: `"REVOO" <${index_js_1.config.email.from}>`,
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