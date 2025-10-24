/**
 * Maps API error codes to user-friendly error messages
 */

export interface ApiError {
  code?: number;
  message?: string;
  details?: any;
}

/**
 * Get a user-friendly error message based on the API error code
 */
export function getUserFriendlyErrorMessage(error: ApiError): string {
  const code = error.code || error.details?.code;
  const errorMessage = error.message || '';

  // Check for DNS/network errors from backend
  if (errorMessage.includes('ENOTFOUND') || errorMessage.includes('getaddrinfo')) {
    return 'Unable to connect to booking service. Please try again in a few moments.';
  }

  // Check for other network-related errors
  if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('ETIMEDOUT')) {
    return 'Booking service is temporarily unavailable. Please try again later.';
  }

  switch (code) {
    case 502:
      return 'Please enter a valid first name and last name';
    
    case 417:
      return 'This contact no. already exist.';
    
    case 400:
      return 'Invalid information provided. Please check your details.';
    
    case 503:
    case 504:
      return 'Booking service is temporarily unavailable. Please try again later.';
    
    default:
      // If there's a message from the API, use it as fallback
      if (error.message) {
        return error.message;
      }
      return 'Failed to create guest profile. Please try again.';
  }
}

/**
 * Parse error response and extract error information
 */
export function parseApiError(error: any): ApiError {
  // If error is already an ApiError object
  if (error && typeof error === 'object' && ('code' in error || 'details' in error)) {
    return error;
  }

  // If error is an Error instance with a message that might be JSON
  if (error instanceof Error) {
    try {
      const parsed = JSON.parse(error.message);
      // Handle backend error format: {"success":false,"error":"...","details":null}
      if (parsed && parsed.error) {
        return {
          message: parsed.error,
          details: parsed.details,
          code: parsed.code
        };
      }
      return parsed;
    } catch {
      // Not JSON, return as-is
      return { message: error.message };
    }
  }

  // If error is a string
  if (typeof error === 'string') {
    try {
      const parsed = JSON.parse(error);
      // Handle backend error format: {"success":false,"error":"...","details":null}
      if (parsed && parsed.error) {
        return {
          message: parsed.error,
          details: parsed.details,
          code: parsed.code
        };
      }
      return parsed;
    } catch {
      return { message: error };
    }
  }

  // If error is an object with backend error format
  if (error && typeof error === 'object') {
    if ('error' in error && error.error) {
      return {
        message: error.error,
        details: error.details,
        code: error.code
      };
    }
    if ('message' in error) {
      return {
        message: error.message,
        details: error.details,
        code: error.code
      };
    }
  }

  // Fallback
  return { message: 'An unknown error occurred' };
}



