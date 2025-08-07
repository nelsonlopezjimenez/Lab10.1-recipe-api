// src/utils/AppError.js
export class AppError extends Error {
  constructor(message, statusCode, validationErrors = null) {
    super(message);
    this.statusCode = statusCode;
    this.validationErrors = validationErrors;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}