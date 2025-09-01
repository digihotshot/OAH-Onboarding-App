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

export const useZenotiCategories = (centerIds: string[] | null) => {
  const [categories, setCategories] = useState<ZenotiCategory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!centerIds || centerIds.length === 0) {
      setCategories([]);
      return;
    }

    const fetchCategories = async () => {
      setIsLoading(true);
      setError(null);

      try {
        console.log('🔄 Fetching categories for centers:', centerIds);
        
        // Fetch categories from all centers in parallel
        const fetchPromises = centerIds.map(async (centerId) => {
          const url = `https://api.zenoti.com/v1/centers/${centerId}/categories?page=1&size=10&type=1`;
          const options = {
            method: 'GET',
            headers: {
              accept: 'application/json',
              Authorization: `apikey ${import.meta.env.VITE_ZENOTI_API_KEY}`
            }
          };

          const response = await fetch(url, options);
          
          if (!response.ok) {
            console.warn(`Failed to fetch categories for center ${centerId}: ${response.status}`);
            return [];
          }

          const data: CategoriesResponse = await response.json();
          console.log(`📋 Categories response for center ${centerId}:`, data);
          
          return data.categories || [];
        });

        const allCategoriesArrays = await Promise.all(fetchPromises);
        
        // Flatten all categories into a single array
        const allCategories = allCategoriesArrays.flat();
        
        // Remove duplicates based on category ID
        const uniqueCategories = allCategories.reduce((acc, category) => {
          const existingCategory = acc.find(c => c.id === category.id);
          if (!existingCategory) {
            acc.push(category);
          }
          return acc;
        }, [] as ZenotiCategory[]);
        
        // Sort categories by display_order
        const sortedCategories = uniqueCategories.sort((a, b) => a.display_order - b.display_order);
        
        console.log('📋 Merged unique categories:', sortedCategories);
        setCategories(sortedCategories);

      } catch (err) {
        console.error('❌ Error fetching categories:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch categories');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategories();
  }, [centerIds]);

  return {
    categories,
    isLoading,
    error
  };
};