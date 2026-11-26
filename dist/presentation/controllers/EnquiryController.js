"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnquiryController = void 0;
const CustomerEnquiry_js_1 = require("../../infrastructure/database/models/CustomerEnquiry.js");
const sequence_js_1 = require("../../infrastructure/database/sequence.js");
const types_js_1 = require("../../shared/types.js");
const NotificationService_js_1 = require("../../infrastructure/notifications/NotificationService.js");
const adminAlerts_js_1 = require("../../infrastructure/notifications/adminAlerts.js");
class EnquiryController {
    static async submitEnquiry(req, res, next) {
        try {
            const { name, email, phone, subject, message } = req.body;
            const year = new Date().getFullYear();
            const { doc: enquiry, sequenceNumber: ticketNumber } = await (0, sequence_js_1.createWithUniqueSequence)({
                model: CustomerEnquiry_js_1.CustomerEnquiryModel,
                field: 'ticketNumber',
                counterKey: `enquiry-ticket-${year}`,
                formatNumber: (seq) => `TKT-${year}-${seq}`,
                extractPattern: new RegExp(`^TKT-${year}-(\\d+)$`, 'i'),
                defaultFloor: 100,
                buildDoc: (generatedNumber) => ({
                    ticketNumber: generatedNumber,
                    name,
                    email: email.toLowerCase().trim(),
                    phone,
                    subject,
                    message,
                    status: types_js_1.EnquiryStatus.OPEN,
                }),
            });
            // Notify admin team by email/in-app alert
            await NotificationService_js_1.NotificationService.notify({
                recipientType: 'ADMIN',
                destination: 'admin@revoo.com',
                channel: 'IN_APP',
                title: `Support Ticket: ${ticketNumber}`,
                body: `New enquiry from ${name}: "${subject}"`,
                metadata: { ticketNumber, enquiryId: enquiry._id },
            });
            void NotificationService_js_1.NotificationService.emailAdmins((0, adminAlerts_js_1.newEnquiryAlert)(enquiry.toObject()));
            res.status(201).json({
                success: true,
                message: 'Your enquiry has been received. Our team will contact you shortly.',
                data: { ticketNumber, id: enquiry._id },
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async adminListEnquiries(req, res, next) {
        try {
            const { status } = req.query;
            const filter = {};
            if (status)
                filter.status = status;
            const enquiries = await CustomerEnquiry_js_1.CustomerEnquiryModel.find(filter)
                .populate('respondedByAdminId', 'fullName email')
                .sort({ createdAt: -1 });
            res.status(200).json({ success: true, data: enquiries });
        }
        catch (err) {
            next(err);
        }
    }
    static async adminRespondEnquiry(req, res, next) {
        try {
            const { id } = req.params;
            const { adminResponse, status = types_js_1.EnquiryStatus.RESOLVED } = req.body;
            const enquiry = await CustomerEnquiry_js_1.CustomerEnquiryModel.findByIdAndUpdate(id, {
                adminResponse,
                status,
                respondedByAdminId: req.admin?.id,
                respondedAt: new Date(),
            }, { new: true });
            if (!enquiry)
                return next(new types_js_1.AppError('Enquiry not found', 404));
            res.status(200).json({ success: true, message: 'Response recorded.', data: enquiry });
        }
        catch (err) {
            next(err);
        }
    }
}
exports.EnquiryController = EnquiryController;
//# sourceMappingURL=EnquiryController.js.map