import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../shared/types.js';
import { config } from '../../config/index.js';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errors = err.errors || undefined;

  // Handle Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid identifier format: ${err.value}`;
  }

  // Handle Mongoose duplicate key error
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `Duplicate resource value. A record with this ${field} already exists.`;
  }

  // Handle Zod validation error
  if (err.name === 'ZodError') {
    statusCode = 400;
    message = 'Validation failed for request data.';
    errors = err.errors;
  }

  // Only log unexpected server errors in development or non-operational errors
  if (!err.isOperational) {
    console.error('[UNHANDLED SERVER ERROR]', err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    errors,
    stack: config.isProduction ? undefined : err.stack,
  });
};

