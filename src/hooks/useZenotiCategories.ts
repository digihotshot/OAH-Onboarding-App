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
        
        // Fetch categories from each center sequentially (one at a time)
        const allProviderCategories: { [providerId: string]: ZenotiCategory[] } = {};
        
        for (const centerId of centerIds) {
          try {
            console.log(`🔗 Fetching categories for center: ${centerId} (${Object.keys(allProviderCategories).length + 1}/${centerIds.length})`);
            
            const url = `https://api.zenoti.com/v1/centers/${centerId}/categories?page=1&size=10&type=1`;
            const options = {
              method: 'GET',
              headers: {
                accept: 'application/json',
                Authorization: `apikey ${import.meta.env.VITE_ZENOTI_API_KEY}`
              }
            };

            console.log(`🌐 Making request to: ${url}`);

            const response = await fetch(url, options);
            
            if (!response.ok) {
              const errorText = await response.text();
              console.error(`❌ API error for center ${centerId}: ${response.status}`, errorText);
              
              // If quota exceeded, stop all further requests
              if (response.status === 429) {
                console.warn(`⚠️ Quota exceeded at center ${centerId}, stopping all requests`);
                setError('API quota exceeded. Please try again later or contact support.');
                return;
              }
              
              console.warn(`⚠️ Skipping center ${centerId} due to API error`);
              continue;
            }

            const data: CategoriesResponse = await response.json();
            
            console.log(`📋 Categories response for center ${centerId}:`, data);
            
            allProviderCategories[centerId] = data.categories || [];
            
            // Add delay between requests to be respectful to the API
            if (Object.keys(allProviderCategories).length < centerIds.length) {
              console.log('⏳ Waiting 1 second before next request...');
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
          } catch (error) {
            console.error(`❌ Unexpected error for center ${centerId}:`, error);
            console.warn(`⚠️ Skipping center ${centerId} due to unexpected error`);
          }
        }
        
        // Process results and find common categories
        const successfulProviders = Object.keys(allProviderCategories);
        console.log(`✅ Successfully fetched categories from ${successfulProviders.length} providers`);
        
        if (successfulProviders.length === 0) {
          setError('No categories could be fetched from any provider');
          return;
        }
        
        // If only one provider succeeded, use its categories
        if (successfulProviders.length === 1) {
          const singleProviderCategories = allProviderCategories[successfulProviders[0]];
          const sortedCategories = singleProviderCategories.sort((a, b) => a.display_order - b.display_order);
          console.log(`📋 Using categories from single provider (${successfulProviders[0]}):`, sortedCategories);
          setCategories(sortedCategories);
          return;
        }
        
        // Find common categories that exist in ALL successful providers
        const firstProviderCategories = allProviderCategories[successfulProviders[0]];
        const commonCategories: ZenotiCategory[] = [];
        
        for (const category of firstProviderCategories) {
          // Check if this category (by ID) exists in ALL other providers
          const existsInAllProviders = successfulProviders.slice(1).every(providerId => {
            return allProviderCategories[providerId].some(c => c.id === category.id);
          });
          
          if (existsInAllProviders) {
            commonCategories.push(category);
          }
        }
        
        // Sort common categories by display_order
        const sortedCategories = commonCategories.sort((a, b) => a.display_order - b.display_order);
        
        console.log(`📋 Found ${sortedCategories.length} common categories across ${successfulProviders.length} providers:`, sortedCategories);
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