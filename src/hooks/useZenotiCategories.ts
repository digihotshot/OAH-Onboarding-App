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
        
        // Fetch categories from all centers sequentially with longer delays
        const providerCategories: { [providerId: string]: ZenotiCategory[] } = {};
        
        for (const centerId of centerIds) {
          try {
            console.log(`🔗 Fetching categories for center: ${centerId}`);
            
            const url = `https://api.zenoti.com/v1/centers/${centerId}/categories?page=1&size=10&type=1`;
            const options = {
              method: 'GET',
              headers: {
                accept: 'application/json',
                Authorization: `apikey ${import.meta.env.VITE_ZENOTI_API_KEY}`
              }
            };

            console.log(`🌐 Making request to: ${url}`);
            console.log(`🔑 Using API key: ${import.meta.env.VITE_ZENOTI_API_KEY ? 'Present' : 'Missing'}`);

            let response;
            try {
              response = await fetch(url, options);
            } catch (fetchError) {
              console.error(`🌐 Network error for center ${centerId}:`, fetchError);
              console.warn(`⚠️ Skipping center ${centerId} due to network error`);
              continue;
            }
            
            if (!response.ok) {
              const errorText = await response.text().catch(() => 'Unable to read error response');
              console.error(`❌ API error for center ${centerId}: ${response.status} ${response.statusText}`, errorText);
              
              // If quota exceeded, stop fetching more to avoid further quota issues
              if (response.status === 429) {
                console.warn(`⚠️ Quota exceeded, stopping further requests`);
                break;
              }
              continue;
            }

            let data: CategoriesResponse;
            try {
              data = await response.json();
            } catch (parseError) {
              console.error(`📄 JSON parse error for center ${centerId}:`, parseError);
              console.warn(`⚠️ Skipping center ${centerId} due to JSON parse error`);
              continue;
            }
            
            console.log(`📋 Categories response for center ${centerId}:`, data);
            
            providerCategories[centerId] = data.categories || [];
            
            // Add a longer delay between requests to avoid quota issues
            await new Promise(resolve => setTimeout(resolve, 500));
            
          } catch (error) {
            console.error(`❌ Unexpected error for center ${centerId}:`, error);
            console.warn(`⚠️ Skipping center ${centerId} due to unexpected error`);
          }
        }
        
        // Find common categories across all successful providers
        const successfulProviders = Object.keys(providerCategories);
        console.log(`✅ Successfully fetched categories from ${successfulProviders.length} providers`);
        
        if (successfulProviders.length === 0) {
          throw new Error('No categories could be fetched from any provider');
        }
        
        // If only one provider succeeded, use its categories
        if (successfulProviders.length === 1) {
          const singleProviderCategories = providerCategories[successfulProviders[0]];
          const sortedCategories = singleProviderCategories.sort((a, b) => a.display_order - b.display_order);
          console.log('📋 Using categories from single successful provider:', sortedCategories);
          setCategories(sortedCategories);
          return;
        }
        
        // Find categories that exist in ALL successful providers
        const firstProviderCategories = providerCategories[successfulProviders[0]];
        const commonCategories: ZenotiCategory[] = [];
        
        for (const category of firstProviderCategories) {
          // Check if this category exists in ALL other providers
          const existsInAllProviders = successfulProviders.slice(1).every(providerId => {
            return providerCategories[providerId].some(c => c.id === category.id);
          });
          
          if (existsInAllProviders) {
            commonCategories.push(category);
          }
        }
        
        // Sort common categories by display_order
        const sortedCategories = commonCategories.sort((a, b) => a.display_order - b.display_order);
        
        console.log(`📋 Found ${commonCategories.length} common categories across ${successfulProviders.length} providers:`, sortedCategories);
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