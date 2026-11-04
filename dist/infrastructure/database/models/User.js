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
exports.UserModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const types_js_1 = require("../../../shared/types.js");
const UserSchema = new mongoose_1.Schema({
    phone: { type: String, trim: true, index: true, sparse: true },
    email: { type: String, trim: true, lowercase: true, index: true, sparse: true },
    fullName: { type: String, trim: true },
    isVerified: { type: Boolean, default: false },
    status: { type: String, enum: Object.values(types_js_1.UserStatus), default: types_js_1.UserStatus.ACTIVE },
    referralCode: { type: String, unique: true, sparse: true, uppercase: true, trim: true },
    referralPoints: { type: Number, default: 500 },
    referredBy: { type: String, trim: true },
    referredCount: { type: Number, default: 0 },
    address: {
        street: { type: String },
        city: { type: String },
        state: { type: String },
        pincode: { type: String },
        landmark: { type: String },
    },
    passwordHash: { type: String, select: false },
    authProvider: { type: String, default: 'local' },
    googleId: { type: String, sparse: true, index: true },
    refreshTokenHash: { type: String, select: false },
}, { timestamps: true });
exports.UserModel = mongoose_1.default.model('User', UserSchema);
//# sourceMappingURL=User.js.map