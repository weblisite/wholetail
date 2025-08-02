/**
 * Standardized error response utility for consistent API error handling
 */

const errorResponse = (res, status, error, message = null, data = null) => {
  const response = {
    success: false,
    error,
    message: message || error,
    timestamp: new Date().toISOString()
  };

  if (data) {
    response.data = data;
  }

  return res.status(status).json(response);
};

const successResponse = (res, data = null, message = 'Success') => {
  const response = {
    success: true,
    message,
    timestamp: new Date().toISOString()
  };

  if (data) {
    response.data = data;
  }

  return res.json(response);
};

// Common error responses
const errors = {
  unauthorized: (res, message = 'Unauthorized') => 
    errorResponse(res, 401, 'UNAUTHORIZED', message),
  
  forbidden: (res, message = 'Access forbidden') => 
    errorResponse(res, 403, 'FORBIDDEN', message),
  
  notFound: (res, message = 'Resource not found') => 
    errorResponse(res, 404, 'NOT_FOUND', message),
  
  badRequest: (res, message = 'Bad request') => 
    errorResponse(res, 400, 'BAD_REQUEST', message),
  
  validationError: (res, message = 'Validation failed', data = null) => 
    errorResponse(res, 422, 'VALIDATION_ERROR', message, data),
  
  serverError: (res, message = 'Internal server error') => 
    errorResponse(res, 500, 'SERVER_ERROR', message),
  
  tooManyRequests: (res, message = 'Too many requests') => 
    errorResponse(res, 429, 'TOO_MANY_REQUESTS', message)
};

module.exports = {
  errorResponse,
  successResponse,
  errors
};