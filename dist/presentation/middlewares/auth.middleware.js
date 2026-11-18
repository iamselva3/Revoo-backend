"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticatePartner = exports.requireAdminRoles = exports.authenticateAdmin = exports.authenticateCustomer = void 0;
const types_js_1 = require("../../shared/types.js");
const tokenService_js_1 = require("../../infrastructure/security/tokenService.js");
const Employee_js_1 = require("../../infrastructure/database/models/Employee.js");
const User_js_1 = require("../../infrastructure/database/models/User.js");
const AdminUser_js_1 = require("../../infrastructure/database/models/AdminUser.js");
const authenticateCustomer = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next(new types_js_1.AppError('Authentication required. Missing Bearer token.', 401));
        }
        const token = authHeader.split(' ')[1];
        const decoded = tokenService_js_1.TokenService.verifyAccessToken(token);
        if (decoded.type !== 'CUSTOMER') {
            return next(new types_js_1.AppError('Invalid token type for customer access.', 403));
        }
        const user = await User_js_1.UserModel.findById(decoded.userId);
        if (!user) {
            return next(new types_js_1.AppError('User account not found.', 401));
        }
        if (user.status === 'BLOCKED') {
            return next(new types_js_1.AppError('This user account has been suspended.', 403));
        }
        req.user = {
            ...decoded,
            id: user._id.toString(),
        };
        next();
    }
    catch (err) {
        if (err.name === 'TokenExpiredError') {
            return next(new types_js_1.AppError('Access token expired. Please refresh your session.', 401));
        }
        return next(new types_js_1.AppError('Invalid or corrupted authentication token.', 401));
    }
};
exports.authenticateCustomer = authenticateCustomer;
const authenticateAdmin = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next(new types_js_1.AppError('Admin authentication required. Missing Bearer token.', 401));
        }
        const token = authHeader.split(' ')[1];
        const decoded = tokenService_js_1.TokenService.verifyAccessToken(token);
        if (decoded.type !== 'ADMIN') {
            return next(new types_js_1.AppError('Access forbidden. Admin token required.', 403));
        }
        const admin = await AdminUser_js_1.AdminUserModel.findById(decoded.adminId);
        if (!admin || !admin.isActive) {
            return next(new types_js_1.AppError('Admin account inactive or not found.', 401));
        }
        req.admin = {
            ...decoded,
            id: admin._id.toString(),
        };
        next();
    }
    catch (err) {
        if (err.name === 'TokenExpiredError') {
            return next(new types_js_1.AppError('Admin session expired. Please log in again.', 401));
        }
        return next(new types_js_1.AppError('Invalid or corrupted admin credentials.', 401));
    }
};
exports.authenticateAdmin = authenticateAdmin;
const requireAdminRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.admin) {
            return next(new types_js_1.AppError('Authentication required.', 401));
        }
        if (!roles.includes(req.admin.role) && req.admin.role !== types_js_1.AdminRole.SUPER_ADMIN) {
            return next(new types_js_1.AppError(`Permission denied. Required role: ${roles.join(' or ')}.`, 403));
        }
        next();
    };
};
exports.requireAdminRoles = requireAdminRoles;
/** Pickup partner app: a PARTNER token of an employee whose partner access is still switched on. */
const authenticatePartner = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next(new types_js_1.AppError('Please sign in to the partner app.', 401));
        }
        const decoded = tokenService_js_1.TokenService.verifyAccessToken(authHeader.split(' ')[1]);
        if (decoded.type !== 'PARTNER') {
            return next(new types_js_1.AppError('Please sign in to the partner app.', 403));
        }
        const employee = await Employee_js_1.EmployeeModel.findById(decoded.employeeId);
        if (!employee || !employee.partnerAccessEnabled || employee.status === 'INACTIVE') {
            return next(new types_js_1.AppError('Your partner access is switched off. Please contact the Genie team.', 401));
        }
        req.partner = { ...decoded, id: employee._id.toString(), fullName: employee.fullName, phone: employee.phone };
        next();
    }
    catch (err) {
        if (err.name === 'TokenExpiredError') {
            return next(new types_js_1.AppError('Your session ended. Please sign in again.', 401));
        }
        return next(new types_js_1.AppError('Please sign in to the partner app.', 401));
    }
};
exports.authenticatePartner = authenticatePartner;
//# sourceMappingURL=auth.middleware.js.map