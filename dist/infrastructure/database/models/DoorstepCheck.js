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
exports.DoorstepCheckModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const LineSchema = new mongoose_1.Schema({
    component: { type: String, required: true },
    quoted: { type: Number, default: 0 },
    checked: { type: Number, default: 0 },
    difference: { type: Number, default: 0 },
}, { _id: false });
const DoorstepCheckSchema = new mongoose_1.Schema({
    requestId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'BuybackRequest', required: true, index: true },
    requestNumber: { type: String, required: true, index: true },
    partnerId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    partnerName: { type: String, required: true },
    partnerCode: { type: String, required: true },
    device: {
        modelId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'SmartphoneModel', required: true },
        modelName: { type: String, required: true },
        brandName: { type: String, default: '' },
        bookedVariantId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'StorageVariant' },
        bookedStorage: { type: String, default: '' },
        checkedVariantId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'StorageVariant' },
        checkedStorage: { type: String, default: '' },
    },
    customerCondition: { type: mongoose_1.Schema.Types.Mixed },
    checkedCondition: { type: mongoose_1.Schema.Types.Mixed },
    quotedAmount: { type: Number, required: true },
    requotedAmount: { type: Number, required: true },
    checkedAmount: { type: Number, required: true },
    finalAmount: { type: Number, required: true },
    difference: { type: Number, required: true, index: true },
    bestAmount: { type: Number, default: 0 },
    worstAmount: { type: Number, default: 0 },
    changes: { type: [LineSchema], default: [] },
    checkedBreakdown: [
        {
            _id: false,
            component: { type: String },
            description: { type: String },
            adjustment: { type: Number },
        },
    ],
    outcome: { type: String, enum: ['AGREED', 'DECLINED', 'NOT_BUYABLE'], required: true, index: true },
    notBuyableReason: { type: String },
    imei: { type: String },
    photoUrls: [{ type: String }],
    notes: { type: String },
}, { timestamps: true });
DoorstepCheckSchema.index({ createdAt: -1 });
exports.DoorstepCheckModel = mongoose_1.default.model('DoorstepCheck', DoorstepCheckSchema);
//# sourceMappingURL=DoorstepCheck.js.map