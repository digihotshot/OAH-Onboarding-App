import { useState, useEffect } from 'react';

interface RateLimitStatus {
  limit: number;
  remaining: number;
  reset: number;
  isLimited: boolean;
}

export const useRateLimit = () => {
  const [rateLimitStatus, setRateLimitStatus] = useState<RateLimitStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkRateLimit = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('http://localhost:3000/api/rate-limit/status');
      const data = await response.json();
      
      if (data.success) {
        setRateLimitStatus({
          limit: data.data.limit || 60,
          remaining: data.data.remaining || 0,
          reset: data.data.reset || 0,
          isLimited: data.data.remaining === 0
        });
      } else {
        setError(data.message || 'Failed to fetch rate limit status');
      }
    } catch (err) {
      console.error('Error checking rate limit:', err);
      setError(err instanceof Error ? err.message : 'Failed to check rate limit');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkRateLimit();
  }, []);

  return {
    rateLimitStatus,
    isLoading,
    error,
    checkRateLimit
  };
};
