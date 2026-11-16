"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmartphoneModel = exports.deviceCategoryFilter = exports.normalizeDeviceCategory = exports.DEVICE_CATEGORIES = void 0;
const mongoose_1 = __importStar(require("mongoose"));
/** What kind of device a model is. Phones, laptops, tablets and TVs are listed separately. */
exports.DEVICE_CATEGORIES = ['phone', 'laptop', 'tablet', 'tv'];
/**
 * "phones", "mobile", "laptops", "macbook", "tablets", "ipad", "smart_tv", ... (the website and the app
 * use different words) -> the stored category; anything else -> undefined.
 */
const normalizeDeviceCategory = (value) => {
    const v = String(value ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');
    if (['phone', 'phones', 'mobile', 'mobiles', 'mobile_phones', 'smartphone', 'smartphones'].includes(v))
        return 'phone';
    if (['laptop', 'laptops', 'macbook', 'macbooks', 'notebook', 'notebooks'].includes(v))
        return 'laptop';
    if (['tablet', 'tablets', 'ipad', 'ipads', 'tab', 'tabs'].includes(v))
        return 'tablet';
    if (['tv', 'tvs', 'smart_tv', 'smart_tvs', 'smarttv', 'television'].includes(v))
        return 'tv';
    return undefined;
};
exports.normalizeDeviceCategory = normalizeDeviceCategory;
/** Mongo filter for one category (models saved before categories existed count as phones). */
const deviceCategoryFilter = (category) => category === 'phone' ? { category: { $in: ['phone', null] } } : { category };
exports.deviceCategoryFilter = deviceCategoryFilter;
const SmartphoneModelSchema = new mongoose_1.Schema({
    brandId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Brand', required: true, index: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    releaseYear: { type: Number, default: 2024 },
    imageUrl: { type: String },
    basePrice: { type: Number, required: true, min: 0 },
    displayOrder: { type: Number, default: 9999, index: true },
    category: { type: String, enum: exports.DEVICE_CATEGORIES, default: 'phone', index: true },
    // "How old is your phone?" (asked when the warranty is valid): % of the price taken off per age band.
    // Set in the admin model editor or the Pricing Engine page; read by the valuation engine.
    deviceAgeDeductions: {
        BELOW_3_MONTHS: { type: Number, min: 0, max: 90 },
        '3_TO_6_MONTHS': { type: Number, min: 0, max: 90 },
        '6_TO_11_MONTHS': { type: Number, min: 0, max: 90 },
        ABOVE_11_MONTHS: { type: Number, min: 0, max: 90 },
    },
    isPublished: { type: Boolean, default: true, index: true },
    isArchived: { type: Boolean, default: false, index: true },
}, { timestamps: true });
SmartphoneModelSchema.index({ brandId: 1, displayOrder: 1, releaseYear: -1 });
SmartphoneModelSchema.index({ brandId: 1, isPublished: 1, isArchived: 1 });
exports.SmartphoneModel = mongoose_1.default.model('SmartphoneModel', SmartphoneModelSchema);
//# sourceMappingURL=SmartphoneModel.js.map