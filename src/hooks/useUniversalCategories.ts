import { useState, useEffect, useRef } from 'react';

export interface UniversalCategory {
  id: string;
  code: string;
  name: string;
  show_in_catalog: boolean;
  display_order: number;
  description?: string;
}

export interface UniversalService {
  id: string;
  name: string;
  description: string;
  duration: number;
  price: number;
  category: string;
  centerIds: string[];
}

interface Service {
  id: string;
  name: string;
  description: string;
  duration: number;
  price: number;
  code: string;
  available_centers: string[];
}

interface CategoryWithServices {
  category_id: string;
  category_name: string;
  display_order: number;
  code: string;
  description: string;
  html_description: string;
  show_in_catalog: boolean;
  available_centers: string[];
  services: Service[];
}

interface CategoriesResponse {
  success: boolean;
  data: {
    categories: CategoryWithServices[];
    total_categories: number;
    total_services: number;
    centers: string[];
  };
  message: string;
}

/**
 * Hook to fetch categories and services from unified middleware API
 */
export const useUniversalCategories = (centerIds: string[]) => {
  const [categories, setCategories] = useState<UniversalCategory[]>([]);
  const [categoryServices, setCategoryServices] = useState<Record<string, UniversalService[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    
    const fetchCategories = async () => {
      console.log('🔍 useUniversalCategories useEffect triggered with centerIds:', centerIds);
      if (centerIds.length === 0) {
        console.log('⚠️ No center IDs provided, skipping category fetch');
        if (isMountedRef.current) {
          setCategories([]);
        }
        return;
      }

      if (isMountedRef.current) {
        setIsLoading(true);
        setError(null);
      }

      try {
        const centerIdsParam = centerIds.join(',');
        console.log('🔍 Fetching categories for centers:', centerIdsParam);
        
        const response = await fetch(`http://localhost:3000/api/categories?centerIds=${centerIdsParam}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: CategoriesResponse = await response.json();

        if (data.success) {
          // Map the response structure to our expected format
          const mappedCategories: UniversalCategory[] = data.data.categories.map(cat => ({
            id: cat.category_id,
            code: cat.code,
            name: cat.category_name,
            show_in_catalog: cat.show_in_catalog,
            display_order: cat.display_order,
            description: cat.description || undefined
          }));

          // Map services for each category
          const mappedCategoryServices: Record<string, UniversalService[]> = {};
          data.data.categories.forEach(cat => {
            mappedCategoryServices[cat.category_id] = cat.services.map(service => ({
              id: service.id,
              name: service.name,
              description: service.description,
              duration: service.duration,
              price: service.price,
              category: cat.category_name,
              centerIds: service.available_centers
            }));
          });
          
          console.log(`✅ Found ${mappedCategories.length} categories with services:`, 
            Object.keys(mappedCategoryServices).map(catId => {
              const cat = mappedCategories.find(c => c.id === catId);
              return `${cat?.name}: ${mappedCategoryServices[catId].length} services`;
            })
          );
          
          if (isMountedRef.current) {
            setCategories(mappedCategories);
            setCategoryServices(mappedCategoryServices);
            console.log('✅ Categories and services state set successfully');
          } else {
            console.log('⚠️ Component unmounted, skipping state update');
          }
        } else {
          console.error('❌ Failed to fetch categories:', data.message);
          if (isMountedRef.current) {
            setError(data.message);
            setCategories([]);
            setCategoryServices({});
          }
        }
      } catch (err) {
        console.error('❌ Error fetching categories:', err);
        if (isMountedRef.current) {
          setError(err instanceof Error ? err.message : 'Failed to fetch categories');
          setCategories([]);
          setCategoryServices({});
        }
      } finally {
        console.log('🔄 Setting isLoading to false...');
        if (isMountedRef.current) {
          setIsLoading(false);
          console.log('✅ isLoading set to false');
        } else {
          console.log('⚠️ Component unmounted, skipping loading state update');
        }
      }
    };

    fetchCategories();
    
    return () => {
      isMountedRef.current = false;
    };
  }, [centerIds]);

  return {
    categories,
    categoryServices,
    isLoading,
    error
  };
};
