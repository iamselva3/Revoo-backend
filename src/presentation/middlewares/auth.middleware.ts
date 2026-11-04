import { Request, Response, NextFunction } from 'express';
import { AppError, AdminRole } from '../../shared/types.js';
import { TokenService, CustomerTokenPayload, AdminTokenPayload } from '../../infrastructure/security/tokenService.js';
import { UserModel } from '../../infrastructure/database/models/User.js';
import { AdminUserModel } from '../../infrastructure/database/models/AdminUser.js';

export interface AuthenticatedCustomerRequest extends Request {
  user?: CustomerTokenPayload & { id: string };
}

export interface AuthenticatedAdminRequest extends Request {
  admin?: AdminTokenPayload & { id: string };
}

export const authenticateCustomer = async (
  req: AuthenticatedCustomerRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new AppError('Authentication required. Missing Bearer token.', 401));
    }

    const token = authHeader.split(' ')[1];
    const decoded = TokenService.verifyAccessToken<CustomerTokenPayload>(token);

    if (decoded.type !== 'CUSTOMER') {
      return next(new AppError('Invalid token type for customer access.', 403));
    }

    const user = await UserModel.findById(decoded.userId);
    if (!user) {
      return next(new AppError('User account not found.', 401));
    }

    if (user.status === 'BLOCKED') {
      return next(new AppError('This user account has been suspended.', 403));
    }

    req.user = {
      ...decoded,
      id: user._id.toString(),
    };

    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return next(new AppError('Access token expired. Please refresh your session.', 401));
    }
    return next(new AppError('Invalid or corrupted authentication token.', 401));
  }
};

export const authenticateAdmin = async (
  req: AuthenticatedAdminRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new AppError('Admin authentication required. Missing Bearer token.', 401));
    }

    const token = authHeader.split(' ')[1];
    const decoded = TokenService.verifyAccessToken<AdminTokenPayload>(token);

    if (decoded.type !== 'ADMIN') {
      return next(new AppError('Access forbidden. Admin token required.', 403));
    }

    const admin = await AdminUserModel.findById(decoded.adminId);
    if (!admin || !admin.isActive) {
      return next(new AppError('Admin account inactive or not found.', 401));
    }

    req.admin = {
      ...decoded,
      id: admin._id.toString(),
    };

    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return next(new AppError('Admin session expired. Please log in again.', 401));
    }
    return next(new AppError('Invalid or corrupted admin credentials.', 401));
  }
};

export const requireAdminRoles = (...roles: AdminRole[]) => {
  return (req: AuthenticatedAdminRequest, res: Response, next: NextFunction) => {
    if (!req.admin) {
      return next(new AppError('Authentication required.', 401));
    }
    if (!roles.includes(req.admin.role) && req.admin.role !== AdminRole.SUPER_ADMIN) {
      return next(new AppError(`Permission denied. Required role: ${roles.join(' or ')}.`, 403));
    }
    next();
  };
};

