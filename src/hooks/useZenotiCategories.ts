import { useState, useEffect } from 'react';

export interface ZenotiCategory {
  id: string;
  name: string;
  display_order: number;
  description?: string;
}

interface CategoriesResponse {
  categories: ZenotiCategory[];
  total_count: number;
  page: number;
  size: number;
}

export const useZenotiCategories = (centerId: string | null) => {
  const [categories, setCategories] = useState<ZenotiCategory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!centerId) {
      setCategories([]);
      return;
    }

    const fetchCategories = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const url = `https://api.zenoti.com/v1/centers/${centerId}/categories?page=1&size=10&type=1`;
        const options = {
          method: 'GET',
          headers: {
            accept: 'application/json',
            Authorization: `apikey ${import.meta.env.VITE_ZENOTI_API_KEY}`
          }
        };

        console.log('🔄 Fetching categories for center:', centerId);
        const response = await fetch(url, options);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: CategoriesResponse = await response.json();
        console.log('📋 Categories response:', data);

        // Sort categories by display_order
        const sortedCategories = data.categories?.sort((a, b) => a.display_order - b.display_order) || [];
        setCategories(sortedCategories);

      } catch (err) {
        console.error('❌ Error fetching categories:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch categories');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategories();
  }, [centerId]);

  return {
    categories,
    isLoading,
    error
  };
};