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
exports.FinalOfferModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const types_js_1 = require("../../../shared/types.js");
const FinalOfferSchema = new mongoose_1.Schema({
    requestId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'BuybackRequest', required: true, index: true },
    inspectionId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Inspection', required: true },
    offerVersion: { type: Number, default: 1 },
    originalEstimatedAmount: { type: Number, required: true },
    finalOfferedAmount: { type: Number, required: true },
    valuationExplanation: { type: String, required: true },
    internalNotes: { type: String },
    issuedByAdminId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'AdminUser', required: true },
    issuedByAdminName: { type: String },
    status: {
        type: String,
        enum: Object.values(types_js_1.FinalOfferStatus),
        default: types_js_1.FinalOfferStatus.ISSUED,
        index: true,
    },
    validUntil: { type: Date, required: true },
    customerDecision: { type: String, enum: ['ACCEPTED', 'REJECTED'] },
    decidedAt: { type: Date },
    rejectionReason: { type: String },
}, { timestamps: true });
FinalOfferSchema.index({ requestId: 1, offerVersion: -1 });
exports.FinalOfferModel = mongoose_1.default.model('FinalOffer', FinalOfferSchema);
//# sourceMappingURL=FinalOffer.js.map