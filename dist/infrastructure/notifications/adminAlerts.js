"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.doorstepCheckAlert = exports.newEnquiryAlert = exports.newBuyOrderAlert = exports.newPickupRequestAlert = void 0;
/**
 * The emails the Genie team gets when a customer sends us something: a pickup booking (website or
 * app), a Buy-store order (app) or a support enquiry. Sent to ADMIN_NOTIFY_EMAILS.
 */
const index_js_1 = require("../../config/index.js");
// Written out by hand: Node's own date formatting differs between versions
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const IST_OFFSET_MS = 330 * 60 * 1000;
const rupees = (n) => {
    const v = Number(n);
    return Number.isFinite(v) ? `₹${Math.round(v).toLocaleString('en-IN')}` : undefined;
};
/** "16 Nov 2026, 1:50 pm" in India time */
const submittedAt = (when = new Date()) => {
    const d = new Date(when.getTime() + IST_OFFSET_MS);
    const h = d.getUTCHours();
    const minutes = String(d.getUTCMinutes()).padStart(2, '0');
    return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${h % 12 || 12}:${minutes} ${h < 12 ? 'am' : 'pm'}`;
};
/** "9845012345" -> "+91 98450 12345" with a tap-to-call link; anything else as given. */
const phoneField = (label, raw) => {
    const digits = String(raw ?? '').replace(/\D/g, '');
    const ten = digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
    if (/^[6-9]\d{9}$/.test(ten))
        return { label, value: `+91 ${ten.slice(0, 5)} ${ten.slice(5)}`, href: `tel:+91${ten}` };
    return { label, value: raw && raw !== 'N/A' ? raw : undefined };
};
const emailField = (label, email) => email ? { label, value: email, href: `mailto:${email}` } : { label, value: undefined };
const deviceName = (brand, model) => {
    const b = (brand || '').trim();
    const m = (model || '').trim();
    return b && !m.toLowerCase().startsWith(b.toLowerCase()) ? `${b} ${m}` : m || b;
};
/** "2026-11-12" -> "Thu, 12 Nov 2026"; free text (e.g. a slot) as given. */
const pickupDay = (raw) => {
    if (!raw)
        return undefined;
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
    if (!m)
        return raw;
    const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
    return Number.isNaN(d.getTime()) ? raw : `${DAYS[d.getUTCDay()]}, ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};
const payout = (p) => {
    if (!p?.method)
        return undefined;
    if (p.method === 'UPI')
        return p.upiId ? `UPI · ${p.upiId}` : 'UPI';
    if (p.method === 'BANK_TRANSFER') {
        const acct = p.accountNumber ? `account ending ${String(p.accountNumber).slice(-4)}` : '';
        return ['Bank transfer', [p.bankName, acct].filter(Boolean).join(', '), p.ifscCode ? `IFSC ${p.ifscCode}` : '']
            .filter(Boolean)
            .join(' · ');
    }
    if (p.method === 'INSTANT_CASH')
        return 'Cash at pickup';
    return String(p.method);
};
/** Customer's own answers, as the website sends them: "Screen: No spot, Minor scratches". */
const conditionSummary = (declared) => {
    const summary = Array.isArray(declared?.summary) ? declared.summary : [];
    const lines = summary
        .map((s) => {
        const items = Array.isArray(s?.items) ? s.items.filter(Boolean).join(', ') : '';
        return s?.title && items ? `${s.title}: ${items}` : null;
    })
        .filter(Boolean);
    return lines.length ? lines.join('\n') : undefined;
};
const newPickupRequestAlert = (r) => {
    const device = deviceName(r.deviceDetails?.brandName, r.deviceDetails?.modelName);
    const storage = r.deviceDetails?.storageCapacity;
    const amount = rupees(r.indicativeEstimate?.estimatedAmount);
    const a = r.pickupAddress || {};
    const address = [a.street, a.area, a.landmark ? `Landmark: ${a.landmark}` : null, [a.city, a.state].filter(Boolean).join(', ') + (a.pincode ? ` - ${a.pincode}` : '')]
        .filter((v) => v && String(v).trim())
        .join('\n');
    const when = [pickupDay(r.scheduledPickupDate), r.preferredTimeWindow].filter(Boolean);
    const uniqueWhen = when.filter((v, i) => when.indexOf(v) === i).join(' · ');
    return {
        subject: `New pickup request ${r.requestNumber}: ${device}${storage ? ` (${storage})` : ''}${amount ? ` · ${amount}` : ''}`,
        intro: 'A new pickup request has been submitted. Details below.',
        replyTo: r.customerDetails?.email,
        fields: [
            { label: 'Request number', value: r.requestNumber },
            { label: 'Full name', value: r.customerDetails?.fullName },
            phoneField('Phone', r.customerDetails?.phone),
            phoneField('Alternative phone', r.customerDetails?.alternatePhone),
            emailField('Email', r.customerDetails?.email),
            { label: 'Device', value: [device, storage].filter(Boolean).join(' · ') },
            { label: 'Quoted price', value: amount },
            { label: 'Condition', value: conditionSummary(r.declaredCondition) },
            { label: 'Pickup address', value: address },
            { label: 'Pickup date', value: uniqueWhen },
            { label: 'Payout', value: payout(r.payoutDetails) },
            { label: 'Photos', value: Array.isArray(r.photoUrls) && r.photoUrls.length ? `${r.photoUrls.length} uploaded` : undefined },
            { label: 'Submitted on', value: submittedAt(r.createdAt ? new Date(r.createdAt) : undefined) },
        ],
        link: r._id ? { label: 'Open request in admin', url: `${index_js_1.config.adminAlerts.adminUrl}/requests/${r._id}` } : undefined,
    };
};
exports.newPickupRequestAlert = newPickupRequestAlert;
const newBuyOrderAlert = (o) => {
    const product = o.productName || deviceName(o.brand, '');
    const total = rupees(o.totalAmount);
    return {
        subject: `New Buy order ${o.orderNumber}: ${product}${total ? ` · ${total}` : ''}`,
        intro: 'A customer has placed an order in the Buy store. Details below.',
        replyTo: o.customerEmail,
        fields: [
            { label: 'Order number', value: o.orderNumber },
            { label: 'Invoice number', value: o.invoiceNumber },
            { label: 'Full name', value: o.customerName },
            phoneField('Phone', o.customerPhone),
            emailField('Email', o.customerEmail),
            { label: 'Product', value: product },
            { label: 'Details', value: [o.storage, o.color, o.grade].filter(Boolean).join(' · ') },
            { label: 'Quantity', value: o.quantity },
            { label: 'Total', value: total },
            { label: 'Payment', value: o.paymentMethod },
            { label: 'Delivery address', value: [o.shippingAddress, o.addressTag ? `(${o.addressTag})` : ''].filter(Boolean).join(' ') },
            { label: 'Submitted on', value: submittedAt(o.createdAt ? new Date(o.createdAt) : undefined) },
        ],
        link: { label: 'Open orders in admin', url: `${index_js_1.config.adminAlerts.adminUrl}/invoices` },
    };
};
exports.newBuyOrderAlert = newBuyOrderAlert;
const newEnquiryAlert = (e) => ({
    subject: `New enquiry ${e.ticketNumber}: ${e.subject}`,
    intro: 'A new enquiry has been submitted on the website. Details below.',
    replyTo: e.email,
    fields: [
        { label: 'Ticket number', value: e.ticketNumber },
        { label: 'Full name', value: e.name },
        emailField('Email', e.email),
        phoneField('Phone', e.phone),
        { label: 'Subject', value: e.subject },
        { label: 'Message', value: e.message },
        { label: 'Submitted on', value: submittedAt(e.createdAt ? new Date(e.createdAt) : undefined) },
    ],
    link: { label: 'Open enquiries in admin', url: `${index_js_1.config.adminAlerts.adminUrl}/enquiries` },
});
exports.newEnquiryAlert = newEnquiryAlert;
const OUTCOME_LABELS = {
    AGREED: 'Customer agreed to the price',
    DECLINED: 'Customer declined the price',
    NOT_BUYABLE: 'Device could not be bought',
};
/** A pickup partner's check at the door changed the price, or the pickup didn't go ahead. */
const doorstepCheckAlert = (check, r) => {
    const device = deviceName(check.device?.brandName, check.device?.modelName);
    const diff = Number(check.difference) || 0;
    const change = diff < 0 ? `reduced by ${rupees(-diff)}` : diff > 0 ? `raised by ${rupees(diff)}` : 'unchanged';
    const changes = Array.isArray(check.changes)
        ? check.changes
            .map((c) => `${c.component}: ${c.difference < 0 ? '−' : '+'}${rupees(Math.abs(c.difference))}`)
            .join('\n')
        : '';
    return {
        subject: `Doorstep check ${check.requestNumber}: price ${change} by ${check.partnerName}`,
        intro: diff < 0
            ? 'A pickup partner lowered the price at the door. Details below.'
            : check.outcome !== 'AGREED'
                ? 'A pickup partner checked a device but the pickup did not go ahead. Details below.'
                : 'A pickup partner changed the price at the door. Details below.',
        fields: [
            { label: 'Request number', value: check.requestNumber },
            { label: 'Partner', value: [check.partnerName, check.partnerCode].filter(Boolean).join(' · ') },
            { label: 'Customer', value: r?.customerDetails?.fullName },
            { label: 'Device', value: [device, check.device?.checkedStorage].filter(Boolean).join(' · ') },
            { label: 'Quoted price', value: rupees(check.quotedAmount) },
            { label: 'Final price', value: rupees(check.finalAmount) },
            { label: 'What changed', value: changes || undefined },
            { label: 'Result', value: [OUTCOME_LABELS[check.outcome] || check.outcome, check.notBuyableReason].filter(Boolean).join(': ') },
            { label: 'IMEI / serial', value: check.imei },
            { label: 'Partner notes', value: check.notes },
            { label: 'Photos', value: Array.isArray(check.photoUrls) && check.photoUrls.length ? `${check.photoUrls.length} taken` : undefined },
            { label: 'Checked on', value: submittedAt(check.createdAt ? new Date(check.createdAt) : undefined) },
        ],
        link: r?._id ? { label: 'Open request in admin', url: `${index_js_1.config.adminAlerts.adminUrl}/requests/${r._id}` } : undefined,
    };
};
exports.doorstepCheckAlert = doorstepCheckAlert;
//# sourceMappingURL=adminAlerts.js.map