import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { slotsService } from '../services/slotsService';
import { validateWeekConfig, WEEK_CONFIG } from '../utils/weekUtils';
import {
  AvailableSlots as TransformedAvailableSlots,
  BookingMapEntry,
} from '../types/slots';

export type AvailableSlots = TransformedAvailableSlots;

interface UseOptimizedSlotsProps {
  selectedServices: Array<{
    id: string;
    centerIds: string[];
  }>;
  dateRange?: number; // Legacy parameter (deprecated)
  weeks?: number; // Number of weeks to fetch (preferred)
  disabled?: boolean; // Add disabled flag to completely disable the hook
  autoFetch?: boolean; // Allow manual trigger of the unified fetch
}

interface UseOptimizedSlotsReturn {
  availableSlots: AvailableSlots[];
  bookingMap: BookingMapEntry[];
  metadata: {
    availableDates: string[];
    futureDaysCount?: number;
    weekInfo?: Array<Record<string, unknown>>;
    mode?: string;
    requestedCenters?: string[];
    requestedServices?: string[];
    processingTimeMs?: number;
  } | null;
  dateAvailability: Record<string, any> | null; // Raw date availability for provider selection
  loading: boolean;
  error: string | null;
  loadingWeeks: Set<number>;
  cacheStats: any;
  refetch: () => Promise<void>;
  clearCache: () => void;
  progress: {
    currentWeek: number;
    totalWeeks: number;
    percentage: number;
    estimatedTimeRemaining: number;
    weekRange?: string; // e.g., "2024-01-08 to 2024-02-05"
    status?: string; // e.g., "Fetching week 2 of 4"
  } | null;
}

export const useOptimizedSlots = ({ 
  selectedServices, 
  dateRange = 28, // Legacy parameter (deprecated)
  weeks = WEEK_CONFIG.DEFAULT_WEEKS, // Preferred parameter
  disabled = false,
  autoFetch = true
}: UseOptimizedSlotsProps): UseOptimizedSlotsReturn => {
  const [availableSlots, setAvailableSlots] = useState<AvailableSlots[]>([]);
  const [bookingMap, setBookingMap] = useState<BookingMapEntry[]>([]);
  const [metadata, setMetadata] = useState<UseOptimizedSlotsReturn['metadata']>(null);
  const [dateAvailability, setDateAvailability] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingWeeks] = useState<Set<number>>(new Set());
  const [progress, setProgress] = useState<{
    currentWeek: number;
    totalWeeks: number;
    percentage: number;
    estimatedTimeRemaining: number;
    weekRange?: string;
    status?: string;
  } | null>(null);
  const isFetchingRef = useRef(false); // Prevent multiple simultaneous calls
  const startTimeRef = useRef<number>(0);

  // Memoize center IDs and service IDs to prevent unnecessary re-renders
  const centerIds = useMemo(() => new Set(selectedServices.flatMap(service => service.centerIds || [])), [selectedServices]);
  const serviceIds = useMemo(() => new Set(selectedServices.map(service => service.id)), [selectedServices]);

  // Validate and use the weeks parameter (preferred over dateRange)
  const validatedWeeks = useMemo(() => {
    // If weeks is explicitly provided, use it; otherwise calculate from dateRange for backward compatibility
    const weeksToUse = weeks || Math.ceil(dateRange / 7);
    return validateWeekConfig(weeksToUse);
  }, [weeks, dateRange]);

  // Optimized single request using unified endpoint to get all available dates
  const fetchSlots = useCallback(async () => {
    console.log('🚀 useOptimizedSlots fetchSlots called', { disabled, centerIds: centerIds.size, serviceIds: serviceIds.size });
    
    // If disabled, don't fetch anything
    if (disabled) {
      console.log('🚫 useOptimizedSlots is disabled, skipping API call');
      setAvailableSlots([]);
      setDateAvailability(null);
      setLoading(false);
      return;
    }

    if (centerIds.size === 0 || serviceIds.size === 0) {
      console.log('⚠️ useOptimizedSlots: No centerIds or serviceIds, skipping fetch');
      setAvailableSlots([]);
      setDateAvailability(null);
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
    startTimeRef.current = performance.now();
    setAvailableSlots([]);
    setBookingMap([]);
    setDateAvailability(null);
    setMetadata(null);
    
    try {
      console.log(`🚀 Fetching slots using unified endpoint for selected services`);

      const centersArray = Array.from(centerIds);
      const servicesArray = Array.from(serviceIds);

      const unifiedResult = await slotsService.fetchSlots(centersArray, servicesArray, validatedWeeks);

      if (!unifiedResult) {
        setError('Failed to fetch available dates');
        setAvailableSlots([]);
        setBookingMap([]);
        setDateAvailability(null);
        setMetadata(null);
        return;
      }

      console.log(`✅ Processed ${unifiedResult.availableSlots.length} slots across ${unifiedResult.requestedCenters?.length || 0} centers`);
      setAvailableSlots(unifiedResult.availableSlots);
      setBookingMap(unifiedResult.bookingMap);
      setDateAvailability(unifiedResult.dateAvailability || null);
      setMetadata({
        availableDates: unifiedResult.availableDates,
        futureDaysCount: unifiedResult.futureDaysCount,
        weekInfo: unifiedResult.weekInfo,
        mode: unifiedResult.mode,
        requestedCenters: unifiedResult.requestedCenters,
        requestedServices: unifiedResult.requestedServices,
        processingTimeMs: unifiedResult.processingTimeMs,
      });
      setProgress(null);

    } catch (err) {
      console.error('❌ Error fetching slots:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch slots';
      setError(errorMessage);
      
      // Set empty slots to prevent UI from showing stale data
      setAvailableSlots([]);
      setBookingMap([]);
      setDateAvailability(null);
      setMetadata(null);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [centerIds, serviceIds, validatedWeeks, disabled]);

  // Refetch function
  const refetch = useCallback(() => {
    return fetchSlots();
  }, [fetchSlots]);

  // Clear cache function
  const clearCache = useCallback(() => {
    slotsService.clearCache();
    setAvailableSlots([]);
    setBookingMap([]);
    setMetadata(null);
  }, []);

  // Get cache stats
  const cacheStats = useMemo(() => {
    return slotsService.getCacheStats();
  }, [availableSlots]);

  // Auto-fetch when dependencies change
  useEffect(() => {
    if (disabled) {
      setAvailableSlots([]);
      setBookingMap([]);
      setMetadata(null);
      setLoading(false);
      return;
    }

    if (autoFetch) {
      fetchSlots();
    }
  }, [fetchSlots, disabled, autoFetch]);

  return {
    availableSlots,
    bookingMap,
    metadata,
    dateAvailability,
    loading,
    error,
    loadingWeeks,
    cacheStats,
    refetch,
    clearCache,
    progress
  };
};