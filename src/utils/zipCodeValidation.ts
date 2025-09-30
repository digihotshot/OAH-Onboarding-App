import { Provider } from '../types/middleware';
import { API_CONFIG } from '../config/api';

export interface ValidationResult {
  isValid: boolean;
  availableProviders: Provider[];
  message: string;
}

/**
 * Extract zipcode from a Google Places formatted address
 */
export const extractZipCode = (address: string): string | null => {
  // Match 5-digit zipcode patterns in the address
  const zipCodeMatch = address.match(/\b(\d{5})\b/);
  return zipCodeMatch ? zipCodeMatch[1] : null;
};

/**
 * Validate if a zipcode is served by any active provider using middleware API
 */
export const validateZipCode = async (zipCode: string): Promise<ValidationResult> => {
  if (!zipCode) {
    return {
      isValid: false,
      availableProviders: [],
      message: 'Unable to determine zipcode from address'
    };
  }

  try {
    const response = await fetch(`${API_CONFIG.BASE_URL}/providers/zipcode/${zipCode}`);
    const data = await response.json();

    if (data.success && data.data && data.data.length > 0) {
      const availableProviders = data.data;
      const providerCount = availableProviders.length;
      const message = providerCount === 1 
        ? `Great! ${availableProviders[0].name} serves your area.`
        : `Great! ${providerCount} providers serve your area.`;
      
      // Log the success message to console instead of showing it in UI
      console.log('✅', message);
      console.log('📍 Available providers:', availableProviders.map(p => ({ name: p.name, id: p.provider_id })));

      return {
        isValid: true,
        availableProviders,
        message: '' // Empty message for successful validation
      };
    }

    return {
      isValid: false,
      availableProviders: [],
      message: 'Sorry, we don\'t currently serve your area. Please check back soon as we\'re expanding!'
    };
  } catch (error) {
    console.error('Error validating zipcode:', error);
    return {
      isValid: false,
      availableProviders: [],
      message: 'Unable to verify service area. Please try again.'
    };
  }
};
