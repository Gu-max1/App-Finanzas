import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

interface ErrorResponse {
  status: 'error';
  message: string;
  errors?: Record<string, string>[];
  stack?: string;
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const isDev = process.env.NODE_ENV === 'development';

  // Zod validation errors
  if (err instanceof ZodError) {
    const errors = err.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors,
    } satisfies ErrorResponse);
    return;
  }

  // JWT errors
  if (err instanceof TokenExpiredError) {
    res.status(401).json({ status: 'error', message: 'Token expired' } satisfies ErrorResponse);
    return;
  }
  if (err instanceof JsonWebTokenError) {
    res.status(401).json({ status: 'error', message: 'Invalid token' } satisfies ErrorResponse);
    return;
  }

  // Operational errors (AppError instances)
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
      ...(isDev && { stack: err.stack }),
    } satisfies ErrorResponse);
    return;
  }

  // Unhandled errors — don't leak details in production
  console.error('Unhandled error:', err);
  res.status(500).json({
    status: 'error',
    message: isDev ? err.message : 'Internal server error',
    ...(isDev && { stack: err.stack }),
  } satisfies ErrorResponse);
}
