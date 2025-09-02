import { useState, useEffect } from 'react';

export interface ZenotiService {
  id: string;
  name: string;
  description?: string;
  duration: number; // in minutes
  price_info?: {
    final_price: number;
    currency_id: number;
    price_without_tax: number;
    sale_price: number;
    include_tax: boolean;
    tax: number;
    ssg: number;
    tax_id: string;
    demand_group_id: string;
  };
  category_id: string;
}

interface ServicesResponse {
  services: ZenotiService[];
  total_count: number;
  page: number;
  size: number;
}

export const useZenotiServices = (centerId: string | null, categoryId: string | null) => {
  const [services, setServices] = useState<ZenotiService[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!centerId || !categoryId) {
      setServices([]);
      return;
    }

    const fetchServices = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const url = `https://api.zenoti.com/v1/centers/${centerId}/services?category_id=${categoryId}`;
        const options = {
          method: 'GET',
          headers: {
            accept: 'application/json',
            Authorization: `apikey ${import.meta.env.VITE_ZENOTI_API_KEY}`
          }
        };

        console.log('🔄 Fetching services for category:', categoryId);
        const response = await fetch(url, options);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: ServicesResponse = await response.json();
        console.log('💉 Services response for category', categoryId, ':', data);
        
        // Debug: Log each service with detailed price info
        if (data.services) {
          data.services.forEach((service, index) => {
            console.log(`💰 Service ${index + 1}: ${service.name}`);
            console.log('  📊 Full service object:', service);
            console.log('  💵 Price info:', service.price_info);
            if (service.price_info) {
              console.log('  💲 Final price:', service.price_info.final_price);
            }
          });
        }

        setServices(data.services || []);

      } catch (err) {
        console.error('❌ Error fetching services:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch services');
      } finally {
        setIsLoading(false);
      }
    };

    fetchServices();
  }, [centerId, categoryId]);

  return {
    services,
    isLoading,
    error
  };
};