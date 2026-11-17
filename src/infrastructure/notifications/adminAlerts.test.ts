/**
 * Team emails for new submissions: what each email says, that customer text can't inject HTML, and
 * that sending goes to genietnsupport@gmail.com, never throws, and never runs in tests by accident.
 */
import { NotificationService, adminAlertHtml, adminAlertText } from './NotificationService.js';
import { newBuyOrderAlert, newEnquiryAlert, newPickupRequestAlert } from './adminAlerts.js';

const booking = {
  _id: '6650c0ffee0000000000abcd',
  requestNumber: 'GENIE-2026-1042',
  customerDetails: { fullName: 'Selva Ganesh', phone: '9845012345', alternatePhone: '9962011122', email: 'selva@example.com' },
  deviceDetails: { brandName: 'Apple', modelName: 'iPhone 15 Pro', storageCapacity: '256GB' },
  indicativeEstimate: { estimatedAmount: 61250 },
  declaredCondition: { summary: [{ title: 'Screen', items: ['No spot', 'Minor scratches'] }, { title: 'Accessories', items: ['Charger'] }] },
  pickupAddress: { street: 'No. 42, North Mada Street', area: 'Anna Nagar', city: 'Chennai', state: 'Tamil Nadu', pincode: '600040' },
  scheduledPickupDate: '2026-11-19',
  preferredTimeWindow: 'Morning (10:00 AM - 01:00 PM)',
  payoutDetails: { method: 'BANK_TRANSFER', accountNumber: '123456789012', ifscCode: 'HDFC0001234', bankName: 'HDFC Bank' },
  photoUrls: ['a.jpg', 'b.jpg'],
  createdAt: new Date('2026-11-16T08:20:00Z'),
};

const field = (alert: any, label: string) => alert.fields.find((f: any) => f.label === label);

describe('admin alert emails', () => {
  it('pickup request: everything the team needs to call the customer and plan the pickup', () => {
    const a = newPickupRequestAlert(booking);
    expect(a.subject).toBe('New pickup request GENIE-2026-1042: Apple iPhone 15 Pro (256GB) · ₹61,250');
    expect(a.replyTo).toBe('selva@example.com');
    expect(field(a, 'Phone')).toEqual({ label: 'Phone', value: '+91 98450 12345', href: 'tel:+919845012345' });
    expect(field(a, 'Alternative phone')).toEqual({ label: 'Alternative phone', value: '+91 99620 11122', href: 'tel:+919962011122' });
    expect(field(a, 'Email').href).toBe('mailto:selva@example.com');
    expect(field(a, 'Condition').value).toBe('Screen: No spot, Minor scratches\nAccessories: Charger');
    expect(field(a, 'Pickup address').value).toBe('No. 42, North Mada Street\nAnna Nagar\nChennai, Tamil Nadu - 600040');
    expect(field(a, 'Pickup date').value).toBe('Thu, 19 Nov 2026 · Morning (10:00 AM - 01:00 PM)');
    // Full bank account numbers never go into an inbox
    expect(field(a, 'Payout').value).toBe('Bank transfer · HDFC Bank, account ending 9012 · IFSC HDFC0001234');
    expect(JSON.stringify(a)).not.toContain('123456789012');
    expect(field(a, 'Photos').value).toBe('2 uploaded');
    expect(field(a, 'Submitted on').value).toBe('16 Nov 2026, 1:50 pm');
    expect(a.link).toEqual({ label: 'Open request in admin', url: 'https://admin.genietn.in/requests/6650c0ffee0000000000abcd' });
  });

  it('pickup request from the app: no summary, UPI, model name that already has the brand', () => {
    const a = newPickupRequestAlert({
      ...booking,
      deviceDetails: { brandName: 'Realme', modelName: 'Realme 12 Pro Plus', storageCapacity: '8GB / 256GB' },
      declaredCondition: {},
      payoutDetails: { method: 'UPI', upiId: 'selva@okhdfcbank' },
      photoUrls: [],
    });
    expect(a.subject).toContain('Realme 12 Pro Plus (8GB / 256GB)');
    expect(field(a, 'Condition').value).toBeUndefined();
    expect(adminAlertText(newPickupRequestAlert({ ...booking, customerDetails: { fullName: 'A', phone: '9845012345' } }))).not.toContain('Alternative phone');
    expect(field(a, 'Payout').value).toBe('UPI · selva@okhdfcbank');
    expect(adminAlertText(a)).not.toContain('Condition:');
    expect(adminAlertText(a)).not.toContain('Photos:');
  });

  it('Buy order and enquiry emails', () => {
    const o = newBuyOrderAlert({
      orderNumber: 'GENIE-982142', invoiceNumber: 'GENIE-INV-849201', customerName: 'Priya', customerPhone: '+91 99620 67890',
      customerEmail: 'priya@example.com', shippingAddress: '15, 2nd Avenue, Chennai - 600040', addressTag: 'Work',
      productName: 'Galaxy S24 Ultra', brand: 'Samsung', storage: '256GB', color: 'Gray', grade: 'EXCELLENT', quantity: 1,
      totalAmount: 84999, paymentMethod: 'Cash on Delivery (COD)',
    });
    expect(o.subject).toBe('New Buy order GENIE-982142: Galaxy S24 Ultra · ₹84,999');
    expect(field(o, 'Phone').value).toBe('+91 99620 67890');
    expect(o.link?.url).toBe('https://admin.genietn.in/invoices');

    const e = newEnquiryAlert({ ticketNumber: 'TKT-2026-105', name: 'Selva', email: 'selva@example.com', subject: 'Pickup time', message: 'Can you come\nafter 5 pm?' });
    expect(e.subject).toBe('New enquiry TKT-2026-105: Pickup time');
    expect(e.replyTo).toBe('selva@example.com');
    expect(field(e, 'Message').value).toBe('Can you come\nafter 5 pm?');
  });

  it('customer text is shown as text, never as HTML', () => {
    const html = adminAlertHtml(newEnquiryAlert({ ticketNumber: 'T-1', name: '<script>alert(1)</script>', email: 'a@b.co', subject: 'x"><img src=x>', message: 'line 1\nline 2' }));
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('line 1<br>line 2');
    expect(html).not.toContain('Phone'); // empty rows are left out
  });

  describe('emailAdmins', () => {
    const env = process.env.NODE_ENV;
    let sendMail: jest.Mock;

    beforeEach(() => {
      sendMail = jest.fn().mockResolvedValue({});
      jest.spyOn(NotificationService, 'isEmailConfigured').mockReturnValue(true);
      jest.spyOn(NotificationService as any, 'getMailTransporter').mockReturnValue({ sendMail });
    });
    afterEach(() => {
      process.env.NODE_ENV = env;
      jest.restoreAllMocks();
    });

    it('never mails the real inbox from the test suite', async () => {
      expect(await NotificationService.emailAdmins(newPickupRequestAlert(booking))).toBe(false);
      expect(sendMail).not.toHaveBeenCalled();
    });

    it('sends to genietnsupport@gmail.com with Reply going to the customer', async () => {
      process.env.NODE_ENV = 'production';
      expect(await NotificationService.emailAdmins(newPickupRequestAlert(booking))).toBe(true);
      const mail = sendMail.mock.calls[0][0];
      expect(mail.to).toBe('genietnsupport@gmail.com');
      expect(mail.replyTo).toBe('selva@example.com');
      expect(mail.subject).toContain('GENIE-2026-1042');
      expect(mail.html).toContain('Open request in admin');
      expect(mail.text).toContain('Phone: +91 98450 12345');
    });

    it('a mail-server failure is logged, never thrown', async () => {
      process.env.NODE_ENV = 'production';
      sendMail.mockRejectedValue(new Error('SMTP down'));
      const log = jest.spyOn(console, 'error').mockImplementation(() => undefined);
      await expect(NotificationService.emailAdmins(newEnquiryAlert({ ticketNumber: 'T', name: 'n', email: 'e@x.co', subject: 's', message: 'm' }))).resolves.toBe(false);
      expect(log).toHaveBeenCalled();
    });
  });
});
