/**
 * Optimized slots service with caching and request deduplication
 */

import { cacheManager, generateSlotCacheKey } from '../utils/cacheManager';
import { transformUnifiedSlotsResponse } from '../utils/slotsTransformer';
import {
  TransformedUnifiedSlots,
  UnifiedSlotsResponse,
} from '../types/slots';
import { validateWeekConfig, WEEK_CONFIG } from '../utils/weekUtils';

type SlotResponse = UnifiedSlotsResponse;

class SlotsService {
  private readonly API_BASE_URL = 'http://localhost:3000/api';
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAYS = [1000, 2000, 4000]; // Exponential backoff
  private readonly CIRCUIT_BREAKER_THRESHOLD = 5; // Number of consecutive failures before circuit opens
  private readonly CIRCUIT_BREAKER_TIMEOUT = 30000; // 30 seconds
  private circuitBreakerState = {
    failures: 0,
    lastFailureTime: 0,
    isOpen: false
  };
  
  // Request deduplication
  private pendingBatchedRequests = new Map<string, Promise<SlotResponse>>();

  /**
   * Check if circuit breaker is open
   */
  private isCircuitBreakerOpen(): boolean {
    if (!this.circuitBreakerState.isOpen) {
      return false;
    }

    // Check if timeout has passed
    if (Date.now() - this.circuitBreakerState.lastFailureTime > this.CIRCUIT_BREAKER_TIMEOUT) {
      console.log('🔄 Circuit breaker timeout expired, attempting to close');
      this.circuitBreakerState.isOpen = false;
      this.circuitBreakerState.failures = 0;
      return false;
    }

    return true;
  }

  /**
   * Record a successful request
   */
  private recordSuccess(): void {
    this.circuitBreakerState.failures = 0;
    this.circuitBreakerState.isOpen = false;
  }

  /**
   * Record a failed request
   */
  private recordFailure(): void {
    this.circuitBreakerState.failures++;
    this.circuitBreakerState.lastFailureTime = Date.now();

    if (this.circuitBreakerState.failures >= this.CIRCUIT_BREAKER_THRESHOLD) {
      this.circuitBreakerState.isOpen = true;
      console.warn(`⚠️ Circuit breaker opened after ${this.circuitBreakerState.failures} consecutive failures`);
    }
  }

  /**
   * Enhanced error recovery with fallback strategies
   */
  private async handleRequestWithRecovery<T>(
    requestFn: () => Promise<T>,
    fallbackFn?: () => Promise<T>,
    context: string = 'request'
  ): Promise<T> {
    // Check circuit breaker
    if (this.isCircuitBreakerOpen()) {
      throw new Error(`Circuit breaker is open for ${context}. Please try again later.`);
    }

    try {
      const result = await requestFn();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure();
      console.error(`❌ ${context} failed:`, error);

      // Try fallback if available
      if (fallbackFn) {
        try {
          console.log(`🔄 Attempting fallback for ${context}`);
          const fallbackResult = await fallbackFn();
          console.log(`✅ Fallback succeeded for ${context}`);
          return fallbackResult;
        } catch (fallbackError) {
          console.error(`❌ Fallback also failed for ${context}:`, fallbackError);
        }
      }

      throw error;
    }
  }

  async fetchSlots(
    centers: string[],
    services: string[],
    weeks: number = WEEK_CONFIG.DEFAULT_WEEKS,
    startDate?: string,
  ): Promise<TransformedUnifiedSlots | null> {
    const startTime = performance.now();
    const validatedWeeks = validateWeekConfig(weeks);
    const payload = {
      centers,
      services,
      weeks: validatedWeeks,
    };

    const cacheKey = generateSlotCacheKey(centers, services, `${startDate ?? 'latest'}:${validatedWeeks}`);
    const cached = cacheManager.get<TransformedUnifiedSlots>(cacheKey);
    if (cached) {
      console.log(`🎯 Cache hit for centers ${centers.join(',')}, services ${services.join(',')}, weeks ${weeks}`);
      return cached;
    }

    const pendingRequest = cacheManager.getPendingRequest<TransformedUnifiedSlots>(cacheKey);
    if (pendingRequest) {
      console.log(`⏳ Waiting for pending request for centers ${centers.join(',')}, services ${services.join(',')}, weeks ${weeks}`);
      return pendingRequest;
    }

    const requestPromise = this.handleRequestWithRecovery(
      async () => {
        for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
          try {
            console.log(`🚀 Unified endpoint attempt ${attempt + 1}/${this.MAX_RETRIES} for centers ${centers.join(',')}, services ${services.join(',')}, weeks ${weeks}`);
            console.log(`📊 Request details:`, {
              centers,
              services,
              weeks: weeks,
              startDate: startDate,
              optimizationMode: 'unified-single-slot',
              note: 'Single API call to get slots for a specific center, service, and date range'
            });

            const response = await fetch(`${this.API_BASE_URL}/slots/unified`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(payload),
            });

            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data: SlotResponse = await response.json();
            const transformedData = transformUnifiedSlotsResponse(data);
            const endTime = performance.now();
            const processingTime = Math.round(endTime - startTime);
            
            console.log(`🔍 Unified Endpoint API Response Check:`, {
              success: data.success,
              hasData: !!data.data,
              dataKeys: data.data ? Object.keys(data.data) : [],
              hasFutureDaysCount: !!data.data?.future_days_count,
              hasAvailableDates: !!data.data?.available_dates,
              hasSlotsByDate: !!data.data?.slots_by_date,
              hasBookingMapping: !!data.data?.booking_mapping,
              futureDaysValue: data.data?.future_days_count,
              availableDatesLength: data.data?.available_dates?.length,
              slotsByDateKeys: data.data?.slots_by_date ? Object.keys(data.data.slots_by_date) : [],
              bookingMappingLength: data.data?.booking_mapping?.length,
              message: data.message,
              processingTime: `${processingTime}ms`
            });
            
            if (data.success && transformedData) {
              console.log(`✅ Unified endpoint processing completed in ${processingTime}ms`);
              cacheManager.setSlotData(cacheKey, transformedData, 10 * 60 * 1000); // 10 minutes
              console.log(`✅ Cached unified slots for centers ${centers.join(',')}, services ${services.join(',')}, weeks ${weeks} with 10min TTL`);
              return transformedData;
            }

            console.warn(`⚠️ Unified endpoint returned no data: ${data.message}`);
            return null;
            
          } catch (error) {
            console.error(`❌ Unified endpoint attempt ${attempt + 1} failed:`, error);
            
            if (attempt === this.MAX_RETRIES - 1) {
              throw error; // Last attempt failed
            }
            
            // Wait before retry
            const delay = this.RETRY_DELAYS[attempt] || 4000;
            console.log(`⏳ Waiting ${delay}ms before retry...`);
            await this.delay(delay);
          }
        }
        throw new Error('Max retries exceeded for unified endpoint processing');
      },
      // Fallback: return null if fallback fails
      async () => {
        console.log(`🔄 Falling back to null for centers ${centers.join(',')}, services ${services.join(',')}, weeks ${weeks}`);
        return null;
      },
      'unified endpoint processing'
    );

    cacheManager.setPendingRequest(cacheKey, requestPromise);
    return requestPromise;
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    const baseStats = cacheManager.getStats();
    return {
      ...baseStats,
      pendingBatchedRequests: this.pendingBatchedRequests.size
    };
  }

  /**
   * Clear cache and pending requests
   */
  clearCache() {
    cacheManager.clear();
    this.pendingBatchedRequests.clear();
    console.log('🧹 Cache and pending requests cleared');
  }

  /**
   * Get pending requests count
   */
  getPendingRequestsCount(): number {
    return this.pendingBatchedRequests.size;
  }
}

// Export singleton instance
export const slotsService = new SlotsService();
