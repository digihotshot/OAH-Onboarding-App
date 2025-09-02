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
        console.log(`🔄 Fetching categories for ${centerIds.length} providers:`, centerIds);
        
        // Fetch categories from each provider sequentially (one at a time)
        const allProviderCategories: { [providerId: string]: ZenotiCategory[] } = {};
        
        for (const centerId of centerIds) {
          try {
            console.log(`🔗 Fetching categories for provider: ${centerId} (${Object.keys(allProviderCategories).length + 1}/${centerIds.length})`);
            
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
              console.error(`❌ API error for provider ${centerId}: ${response.status}`, errorText);
              
              // If quota exceeded, stop all further requests
              if (response.status === 429) {
                console.warn(`⚠️ Quota exceeded at provider ${centerId}, stopping all requests`);
                setError('API quota exceeded. Please try again later or contact support.');
                return;
              }
              
              console.warn(`⚠️ Skipping provider ${centerId} due to API error`);
              continue;
            }

            const data: CategoriesResponse = await response.json();
            
            console.log(`📋 Categories response for provider ${centerId}:`, data);
            
            allProviderCategories[centerId] = data.categories || [];
            
            // Add delay between requests to be respectful to the API
            if (Object.keys(allProviderCategories).length < centerIds.length) {
              console.log('⏳ Waiting 1 second before next provider request...');
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
          } catch (error) {
            console.error(`❌ Unexpected error for provider ${centerId}:`, error);
            console.warn(`⚠️ Skipping provider ${centerId} due to unexpected error`);
          }
        }
        
        // Process results and find common categories
        const successfulProviders = Object.keys(allProviderCategories);
        console.log(`✅ Successfully fetched categories from ${successfulProviders.length} providers`);
        
        if (successfulProviders.length === 0) {
          setError('No categories could be fetched from any provider');
          return;
        }
        
        // Collect all categories from all providers and get unique ones by category_id
        const allCategories: ZenotiCategory[] = [];
        const seenCategoryIds = new Set<string>();
        
        // Go through all providers and collect unique categories by category_id
        for (const providerId of successfulProviders) {
          const providerCategories = allProviderCategories[providerId];
          for (const category of providerCategories) {
            if (!seenCategoryIds.has(category.id)) {
              seenCategoryIds.add(category.id);
              allCategories.push(category);
            }
          }
        }
        
        // Sort unique categories by display_order
        const sortedCategories = allCategories.sort((a, b) => a.display_order - b.display_order);
        
        console.log(`📋 Found ${sortedCategories.length} unique categories (by category_id) across ${successfulProviders.length} providers:`, sortedCategories);
        console.log(`🔍 Unique category IDs:`, sortedCategories.map(c => c.id));
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