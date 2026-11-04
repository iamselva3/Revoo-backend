"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnquiryController = void 0;
const CustomerEnquiry_js_1 = require("../../infrastructure/database/models/CustomerEnquiry.js");
const types_js_1 = require("../../shared/types.js");
const NotificationService_js_1 = require("../../infrastructure/notifications/NotificationService.js");
class EnquiryController {
    static async submitEnquiry(req, res, next) {
        try {
            const { name, email, phone, subject, message } = req.body;
            const count = await CustomerEnquiry_js_1.CustomerEnquiryModel.countDocuments();
            const ticketNumber = `TKT-${new Date().getFullYear()}-${(100 + count + 1).toString()}`;
            const enquiry = await CustomerEnquiry_js_1.CustomerEnquiryModel.create({
                ticketNumber,
                name,
                email: email.toLowerCase().trim(),
                phone,
                subject,
                message,
                status: types_js_1.EnquiryStatus.OPEN,
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