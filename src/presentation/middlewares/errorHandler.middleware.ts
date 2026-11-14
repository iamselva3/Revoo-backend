import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../shared/types.js';

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

  // Handle Mongoose validation errors (missing or invalid fields): the request is wrong, not the server
  if (err.name === 'ValidationError' && err.errors && typeof err.errors === 'object') {
    statusCode = 400;
    const fields = Object.keys(err.errors);
    message = `Please check these fields: ${fields.join(', ')}.`;
    errors = Object.fromEntries(fields.map((f) => [f, err.errors[f]?.message || 'Invalid value']));
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

  // Handle Pricing Engine validation errors
  if (err.message && (
    err.message.includes('Unknown condition key') ||
    err.message.includes('Invalid basePrice') ||
    err.message.includes('phone_working_condition')
  )) {
    statusCode = 400;
    message = err.message;
  }

  // Log only real server errors (bad ids or missing fields are the caller's mistake, already a 4xx)
  if (statusCode >= 500 && !err.isOperational) {
    console.error('[UNHANDLED SERVER ERROR]', err);
  }

  // A response may already be on its way (a handler replied, then failed): never answer twice
  if (res.headersSent) return;

  res.status(statusCode).json({
    success: false,
    message,
    errors,
    // Code locations only when explicitly developing locally; never in a deployed API (Render does
    // not run with NODE_ENV=production, so "not production" would leak them to every visitor)
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
};

