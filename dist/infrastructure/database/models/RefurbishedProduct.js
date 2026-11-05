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
exports.RefurbishedProductModel = exports.DeviceGrade = void 0;
const mongoose_1 = __importStar(require("mongoose"));
var DeviceGrade;
(function (DeviceGrade) {
    DeviceGrade["PRISTINE"] = "PRISTINE";
    DeviceGrade["EXCELLENT"] = "EXCELLENT";
    DeviceGrade["VERY_GOOD"] = "VERY_GOOD";
})(DeviceGrade || (exports.DeviceGrade = DeviceGrade = {}));
const RefurbishedProductSchema = new mongoose_1.Schema({
    name: { type: String, required: true, trim: true, index: true },
    brand: { type: String, required: true, trim: true, index: true },
    category: { type: String, default: 'mobile', index: true },
    storage: { type: String, required: true },
    color: { type: String, default: 'Space Gray' },
    grade: { type: String, enum: Object.values(DeviceGrade), default: DeviceGrade.EXCELLENT },
    batteryHealth: { type: Number, default: 95 },
    originalPrice: { type: Number, required: true },
    salePrice: { type: Number, required: true },
    discountPercentage: { type: Number, default: 0 },
    offerTag: { type: String, default: '' },
    warrantyMonths: { type: Number, default: 12 },
    imageUrl: { type: String, required: true },
    inspectionScore: { type: Number, default: 98 },
    inStock: { type: Boolean, default: true, index: true },
    isFeatured: { type: Boolean, default: true },
    highlights: [{ type: String }],
}, { timestamps: true });
exports.RefurbishedProductModel = mongoose_1.default.model('RefurbishedProduct', RefurbishedProductSchema);
//# sourceMappingURL=RefurbishedProduct.js.map