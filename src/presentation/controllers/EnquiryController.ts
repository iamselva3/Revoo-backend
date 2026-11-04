import { Request, Response, NextFunction } from 'express';
import { CustomerEnquiryModel } from '../../infrastructure/database/models/CustomerEnquiry.js';
import { AppError, EnquiryStatus } from '../../shared/types.js';
import { AuthenticatedAdminRequest } from '../middlewares/auth.middleware.js';
import { NotificationService } from '../../infrastructure/notifications/NotificationService.js';

export class EnquiryController {
  public static async submitEnquiry(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, email, phone, subject, message } = req.body;
      const count = await CustomerEnquiryModel.countDocuments();
      const ticketNumber = `TKT-${new Date().getFullYear()}-${(100 + count + 1).toString()}`;

      const enquiry = await CustomerEnquiryModel.create({
        ticketNumber,
        name,
        email: email.toLowerCase().trim(),
        phone,
        subject,
        message,
        status: EnquiryStatus.OPEN,
      });

      // Notify admin team by email/in-app alert
      await NotificationService.notify({
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
    } catch (err) {
      next(err);
    }
  }

  public static async adminListEnquiries(req: AuthenticatedAdminRequest, res: Response, next: NextFunction) {
    try {
      const { status } = req.query;
      const filter: any = {};
      if (status) filter.status = status;

      const enquiries = await CustomerEnquiryModel.find(filter)
        .populate('respondedByAdminId', 'fullName email')
        .sort({ createdAt: -1 });

      res.status(200).json({ success: true, data: enquiries });
    } catch (err) {
      next(err);
    }
  }

  public static async adminRespondEnquiry(req: AuthenticatedAdminRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { adminResponse, status = EnquiryStatus.RESOLVED } = req.body;

      const enquiry = await CustomerEnquiryModel.findByIdAndUpdate(
        id,
        {
          adminResponse,
          status,
          respondedByAdminId: req.admin?.id,
          respondedAt: new Date(),
        },
        { new: true }
      );

      if (!enquiry) return next(new AppError('Enquiry not found', 404));

      res.status(200).json({ success: true, message: 'Response recorded.', data: enquiry });
    } catch (err) {
      next(err);
    }
  }
}

