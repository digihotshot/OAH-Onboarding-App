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

  switch (code) {
    case 502:
      return 'Please enter a valid first name and last name';
    
    case 417:
      return 'This contact no. already exist.';
    
    case 400:
      return 'Invalid information provided. Please check your details.';
    
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
      return parsed;
    } catch {
      return { message: error };
    }
  }

  // Fallback
  return { message: 'An unknown error occurred' };
}

