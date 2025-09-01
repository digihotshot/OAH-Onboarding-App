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

          console.log(`🔗 Fetching from URL: ${url}`);
          console.log(`🔑 Using API key: ${import.meta.env.VITE_ZENOTI_API_KEY ? 'Present' : 'Missing'}`);

          let response;
          try {
            response = await fetch(url, options);
          } catch (fetchError) {
            console.error(`🌐 Network error for center ${centerId}:`, fetchError);
            throw new Error(`Network error: ${fetchError instanceof Error ? fetchError.message : 'Unknown network error'}`);
          }
          
          if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unable to read error response');
            console.error(`❌ API error for center ${centerId}: ${response.status} ${response.statusText}`, errorText);
            throw new Error(`API error ${response.status}: ${response.statusText} - ${errorText}`);
          }

          let data: CategoriesResponse;
          try {
            data = await response.json();
          } catch (parseError) {
            console.error(`📄 JSON parse error for center ${centerId}:`, parseError);
            throw new Error(`Failed to parse response: ${parseError instanceof Error ? parseError.message : 'Invalid JSON'}`);
          }
          
          console.log(`📋 Categories response for center ${centerId}:`, data);
          
          return data.categories || [];
        });

        const allCategoriesArrays = await Promise.allSettled(fetchPromises);
        
        // Process results and collect any errors
        const successfulResults: ZenotiCategory[][] = [];
        const errors: string[] = [];
        
        allCategoriesArrays.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            successfulResults.push(result.value);
          } else {
            const centerId = centerIds[index];
            console.error(`❌ Failed to fetch categories for center ${centerId}:`, result.reason);
            errors.push(`Center ${centerId}: ${result.reason.message}`);
          }
        });
        
        // If all requests failed, throw an error with details
        if (successfulResults.length === 0) {
          throw new Error(`All category requests failed:\n${errors.join('\n')}`);
        }
        
        // If some requests failed, log warnings but continue
        if (errors.length > 0) {
          console.warn(`⚠️ Some category requests failed:`, errors);
        }
        
        // Flatten all categories into a single array
        const allCategories = successfulResults.flat();
        
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