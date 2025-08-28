import { providers, Provider } from '../data/providers';

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
 * Validate if a zipcode is served by any active provider
 */
export const validateZipCode = (zipCode: string): ValidationResult => {
  if (!zipCode) {
    return {
      isValid: false,
      availableProviders: [],
      message: 'Unable to determine zipcode from address'
    };
  }

  // Find all active providers that serve this zipcode
  const availableProviders = providers.filter(provider => 
    provider.status === 'active' && 
    provider.zipCodes.includes(zipCode)
  );

  if (availableProviders.length > 0) {
    const providerCount = availableProviders.length;
    const message = providerCount === 1 
      ? `Great! ${availableProviders[0].name} serves your area.`
      : `Great! ${providerCount} providers serve your area.`;

    return {
      isValid: true,
      availableProviders,
      message
    };
  }

  return {
    isValid: false,
    availableProviders: [],
    message: 'Sorry, we don\'t currently serve your area. Please check back soon as we\'re expanding!'
  };
};

/**
 * Get all unique zipcodes served by active providers
 */
export const getAllServedZipCodes = (): string[] => {
  const allZipCodes = providers
    .filter(provider => provider.status === 'active')
    .flatMap(provider => provider.zipCodes);
  
  return [...new Set(allZipCodes)].sort();
};