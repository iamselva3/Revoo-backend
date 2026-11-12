"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeIndianMobile = void 0;
/**
 * Normalizes an Indian mobile number to its 10-digit form ("9845012345").
 * Accepts "+91 98450 12345", "09845012345", "919845012345", etc.
 * Returns null when the input isn't a valid Indian mobile number (must start with 6–9).
 */
const normalizeIndianMobile = (raw) => {
    if (raw === undefined || raw === null)
        return null;
    let digits = String(raw).replace(/\D/g, '');
    if (digits.length === 12 && digits.startsWith('91'))
        digits = digits.slice(2);
    if (digits.length === 11 && digits.startsWith('0'))
        digits = digits.slice(1);
    return /^[6-9]\d{9}$/.test(digits) ? digits : null;
};
exports.normalizeIndianMobile = normalizeIndianMobile;
//# sourceMappingURL=contact.js.map