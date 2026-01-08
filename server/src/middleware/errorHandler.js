const environment = require('../config/environment');

/**
 * Custom API Error class
 */
class ApiError extends Error {
  constructor(statusCode, message, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  // Log error in development
  if (environment.isDevelopment) {
    console.error('Error:', err);
  }

  // Handle API errors
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message
      }
    });
  }

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: messages.join(', ')
      }
    });
  }

  // Handle Mongoose duplicate key errors
  if (err.code === 11000) {
    return res.status(409).json({
      error: {
        code: 'DUPLICATE_ERROR',
        message: 'Resource already exists'
      }
    });
  }

  // Handle axios errors (external API calls)
  if (err.isAxiosError) {
    const status = err.response?.status || 503;
    const message = err.response?.data?.message || 'External service error';
    return res.status(status).json({
      error: {
        code: 'EXTERNAL_API_ERROR',
        message: message
      }
    });
  }

  // Default error response
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: environment.isDevelopment ? err.message : 'An unexpected error occurred'
    }
  });
};

module.exports = { errorHandler, ApiError };
