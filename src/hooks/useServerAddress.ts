import { useState, useCallback } from 'react';
import { API_CONFIG } from '../config/api';

export interface AddressSuggestion {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

export interface AddressValidation {
  placeId: string;
  formattedAddress: string;
  zipcode: string;
  city: string;
  state: string;
  country: string;
  coordinates: {
    lat: number;
    lng: number;
  };
}

export interface AddressCenters {
  success: boolean;
  data: any[];
  message: string;
}

/**
 * Hook for server-based address functionality
 */
export const useServerAddress = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Get address suggestions from server
   */
  const getAddressSuggestions = useCallback(async (input: string): Promise<AddressSuggestion[]> => {
    if (!input || input.length < 3) {
      return [];
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log(`🔍 Fetching address suggestions for: "${input}"`);
      
      const response = await fetch(`${API_CONFIG.BASE_URL}/address/suggestions?input=${encodeURIComponent(input)}`);
      const data = await response.json();

      if (data.success) {
        console.log(`✅ Found ${data.data.length} address suggestions:`, data.data);
        return data.data;
      } else {
        console.error('❌ Failed to fetch address suggestions:', data.message);
        setError(data.message);
        return [];
      }
    } catch (err) {
      console.error('❌ Error fetching address suggestions:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch address suggestions');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Validate an address with the server
   */
  const validateAddress = useCallback(async (address: string, placeId: string): Promise<AddressValidation | null> => {
    setIsLoading(true);
    setError(null);

    try {
      console.log(`🔍 Validating address: "${address}" with placeId: "${placeId}"`);
      
      const requestBody = { address, placeId };
      console.log('📤 Request body being sent:', JSON.stringify(requestBody, null, 2));
      
      const response = await fetch(`${API_CONFIG.BASE_URL}/address/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('📥 Response status:', response.status, response.statusText);
      const data = await response.json();
      console.log('📥 Response data:', JSON.stringify(data, null, 2));

      if (data.success) {
        console.log(`✅ Address validated successfully:`, data.data);
        console.log(`📮 Zipcode extracted:`, data.data.zipcode);
        return data.data;
      } else {
        console.error('❌ Address validation failed:', data.message);
        setError(data.message);
        return null;
      }
    } catch (err) {
      console.error('❌ Error validating address:', err);
      setError(err instanceof Error ? err.message : 'Failed to validate address');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Get centers for a validated address
   */
  const getAddressCenters = useCallback(async (address: string, placeId: string, zipcode: string): Promise<any[]> => {
    setIsLoading(true);
    setError(null);

    try {
      console.log(`🔍 Getting centers for address: "${address}" with zipcode: "${zipcode}"`);
      
      const response = await fetch(`${API_CONFIG.BASE_URL}/address/centers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address, placeId, zipcode }),
      });

      const data = await response.json();

      if (data.success) {
        console.log(`✅ Found ${data.data.length} centers for address:`, data.data);
        return data.data;
      } else {
        console.error('❌ Failed to get centers:', data.message);
        setError(data.message);
        return [];
      }
    } catch (err) {
      console.error('❌ Error getting centers:', err);
      setError(err instanceof Error ? err.message : 'Failed to get centers');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    getAddressSuggestions,
    validateAddress,
    getAddressCenters,
    isLoading,
    error
  };
};


