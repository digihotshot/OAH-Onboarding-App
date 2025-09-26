import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { slotsService } from '../services/slotsService';

export interface AvailableSlots {
  date: string;
  hasSlots: boolean;
  slotsCount: number;
  slots: any[];
  centers?: any[];
}

interface UseOptimizedSlotsProps {
  selectedServices: Array<{
    id: string;
    centerIds: string[];
  }>;
  dateRange?: number;
}

interface UseOptimizedSlotsReturn {
  availableSlots: AvailableSlots[];
  loading: boolean;
  error: string | null;
  loadingWeeks: Set<number>;
  cacheStats: any;
  refetch: () => void;
  clearCache: () => void;
}

export const useOptimizedSlots = ({ 
  selectedServices, 
  dateRange = 28 
}: UseOptimizedSlotsProps): UseOptimizedSlotsReturn => {
  const [availableSlots, setAvailableSlots] = useState<AvailableSlots[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingWeeks, setLoadingWeeks] = useState<Set<number>>(new Set());
  const isFetchingRef = useRef(false); // Prevent multiple simultaneous calls

  // Memoize center IDs and service IDs to prevent unnecessary re-renders
  const centerIds = useMemo(() => 
    selectedServices.flatMap(service => service.centerIds || []), 
    [selectedServices]
  );
  
  const serviceIds = useMemo(() => 
    selectedServices.map(service => service.id), 
    [selectedServices]
  );

  // Generate all 28 days (backend will filter to next 28 days automatically)
  const allDates = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dates: string[] = [];
    
    // Generate 28 days from today
    for (let i = 0; i < dateRange; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }
    
    return dates;
  }, [dateRange]);

  // Optimized single request (backend handles 28-day limit)
  const fetchSlots = useCallback(async () => {
    if (centerIds.length === 0 || serviceIds.length === 0) {
      setAvailableSlots([]);
      return;
    }

    // Prevent multiple simultaneous calls
    if (isFetchingRef.current) {
      console.log('⏳ Already fetching slots, skipping duplicate call');
      return;
    }

    isFetchingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      console.log(`🚀 Fetching slots for ${allDates.length} dates (backend will filter to next 28 days):`, allDates);
      
      const results = await slotsService.fetchSlotsForDateRange(
        [...new Set(centerIds)], // Remove duplicates
        [...new Set(serviceIds)], // Remove duplicates
        allDates
      );
      
      console.log(`📊 API results:`, results);

      // Process results - backend already filtered to next 28 days
      const processedSlots: AvailableSlots[] = allDates.map(date => {
        const result = results[date];
        
        if (!result || !result.success || !result.data) {
          return {
            date,
            hasSlots: false,
            slotsCount: 0,
            slots: []
          };
        }

        const dateAvailability = result.data.date_availability?.[date];
        const slotsByDate = result.data.slots_by_date?.[date];
        
        if (dateAvailability) {
          return {
            date,
            hasSlots: dateAvailability.hasSlots,
            slotsCount: dateAvailability.slotsCount,
            slots: slotsByDate?.slots || [],
            centers: slotsByDate?.centers || []
          };
        } else if (slotsByDate) {
          return {
            date,
            hasSlots: slotsByDate.hasSlots,
            slotsCount: slotsByDate.slotsCount,
            slots: slotsByDate.slots || [],
            centers: slotsByDate.centers || []
          };
        } else {
          return {
            date,
            hasSlots: false,
            slotsCount: 0,
            slots: [],
            centers: []
          };
        }
      });

      console.log(`✅ Processed ${processedSlots.length} slots`);
      setAvailableSlots(processedSlots);
      
    } catch (err) {
      console.error('❌ Error fetching slots:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch slots');
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [centerIds, serviceIds, allDates]);

  // Refetch function
  const refetch = useCallback(() => {
    fetchSlots();
  }, [fetchSlots]);

  // Clear cache function
  const clearCache = useCallback(() => {
    slotsService.clearCache();
    setAvailableSlots([]);
  }, []);

  // Get cache stats
  const cacheStats = useMemo(() => {
    return slotsService.getCacheStats();
  }, [availableSlots]);

  // Auto-fetch when dependencies change
  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  return {
    availableSlots,
    loading,
    error,
    loadingWeeks,
    cacheStats,
    refetch,
    clearCache
  };
};