import { useState, useEffect } from 'react';

export interface ServiceByCategory {
  id: string;
  name: string;
  description: string;
  duration: number;
  price: number;
  category: string;
  centerIds: string[];
}

interface ServicesByCategoryResponse {
  success: boolean;
  data: {
    category_id: string;
    services: Array<{
      id: string;
      code: string;
      name: string;
      description: string;
      duration: number;
      recovery_time: number;
      is_couple_service: boolean;
      price_info: {
        currency_id: number;
        sale_price: number;
        tax_id: string;
        ssg: number;
        include_tax: boolean;
        demand_group_id: string;
        tax: number;
        price_without_tax: number;
        final_price: number;
      };
      additional_info: any;
      catalog_info: any;
      variants_info: any;
      add_ons_info: any;
      image_paths: any;
      parallel_groups: any;
      parallel_service_groups: any;
      prerequisites_info: any;
      finishing_services_info: any;
      available_centers: string[];
    }>;
    total_services: number;
    centers: string[];
  };
  message: string;
}

export const fetchServicesForCategory = async (
  categoryId: string,
  centerIds: string[],
  options: { signal?: AbortSignal } = {}
): Promise<ServiceByCategory[]> => {
  if (!categoryId || centerIds.length === 0) {
    return [];
  }

  const centerIdsParam = centerIds.join(',');
  console.log(`🔍 Fetching services for category ID: ${categoryId} with centers: ${centerIdsParam}`);

  const response = await fetch(
    `http://localhost:3000/api/services/category/${categoryId}?centerIds=${centerIdsParam}`,
    {
      signal: options.signal
    }
  );

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data: ServicesByCategoryResponse = await response.json();

  if (!data.success) {
    console.error('❌ Failed to fetch services by category:', data);
    throw new Error('Failed to fetch services');
  }

  // Map the response structure to our expected format
  const mappedServices: ServiceByCategory[] = data.data.services.map(service => ({
    id: service.id,
    name: service.name,
    description: service.description,
    duration: service.duration,
    price: service.price_info.final_price,
    category: '', // The caller can assign the category name if needed
    centerIds: service.available_centers
  }));

  console.log(`✅ Found ${mappedServices.length} services for category ID ${categoryId}:`, mappedServices.map(s => s.name));
  return mappedServices;
};

/**
 * Hook to fetch services by category ID across all centers
 * (retained for potential reuse but now backed by fetchServicesForCategory)
 */
export const useServicesByCategory = (categoryId: string | null, centerIds: string[] = []) => {
  const [services, setServices] = useState<ServiceByCategory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!categoryId || centerIds.length === 0) {
      setServices([]);
      return;
    }

    let isSubscribed = true;
    const controller = new AbortController();

    const loadServices = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await fetchServicesForCategory(categoryId, centerIds, { signal: controller.signal });

        if (!isSubscribed) {
          return;
        }

        setServices(result);
      } catch (err) {
        if (!isSubscribed) {
          return;
        }

        if ((err as Error)?.name === 'AbortError') {
          console.log(`⚠️ Fetch aborted for category ID ${categoryId}`);
          return;
        }

        console.error('❌ Error fetching services by category:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch services');
        setServices([]);
      } finally {
        if (isSubscribed) {
          setIsLoading(false);
        }
      }
    };

    loadServices();

    return () => {
      isSubscribed = false;
      controller.abort();
    };
  }, [categoryId, centerIds]);

  return {
    services,
    isLoading,
    error
  };
};
