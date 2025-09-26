import { useState, useEffect, useMemo, useRef } from 'react';
import { Provider, MiddlewareResponse, ZipcodeProvidersResponse } from '../types/middleware';

/**
 * Hook to fetch providers from middleware API
 */
export const useMiddlewareProviders = (zipcode: string | null) => {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prevProvidersRef = useRef<Provider[]>([]);

  useEffect(() => {
    if (!zipcode) {
      setProviders([]);
      return;
    }

    const fetchProviders = async () => {
      setIsLoading(true);
      setError(null);

      try {
        console.log(`🔍 Fetching providers for zipcode: ${zipcode}`);
        
        const response = await fetch(`http://localhost:3000/api/providers/zipcode/${zipcode}`);
        const data: ZipcodeProvidersResponse = await response.json();

        if (data.success) {
          console.log(`✅ Found ${data.data.length} providers for zipcode ${zipcode}:`, data.data.map(p => p.name));
          setProviders(data.data);
        } else {
          console.error('❌ Failed to fetch providers:', data.message);
          setError(data.message);
          setProviders([]);
        }
      } catch (err) {
        console.error('❌ Error fetching providers:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch providers');
        setProviders([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProviders();
  }, [zipcode]);

  // Memoize providers to prevent unnecessary re-renders
  const memoizedProviders = useMemo(() => {
    // Only update if providers actually changed
    const currentIds = providers.map(p => p.provider_id).sort().join(',');
    const prevIds = prevProvidersRef.current.map(p => p.provider_id).sort().join(',');
    
    if (currentIds !== prevIds) {
      prevProvidersRef.current = providers;
      return providers;
    }
    
    return prevProvidersRef.current;
  }, [providers]);

  return {
    providers: memoizedProviders,
    isLoading,
    error
  };
};

/**
 * Hook to fetch all providers from middleware API
 */
export const useAllMiddlewareProviders = () => {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAllProviders = async () => {
      setIsLoading(true);
      setError(null);

      try {
        console.log('🔍 Fetching all providers from middleware');
        
        const response = await fetch('http://localhost:3000/api/providers');
        const data: MiddlewareResponse<Provider[]> = await response.json();

        if (data.success) {
          console.log(`✅ Found ${data.data.length} total providers:`, data.data.map(p => p.name));
          setProviders(data.data);
        } else {
          console.error('❌ Failed to fetch all providers:', data.message);
          setError(data.message);
          setProviders([]);
        }
      } catch (err) {
        console.error('❌ Error fetching all providers:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch providers');
        setProviders([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllProviders();
  }, []);

  return {
    providers,
    isLoading,
    error
  };
};
