/**
 * Optimized slots service with caching and request deduplication
 */

import { cacheManager, generateSlotCacheKey } from '../utils/cacheManager';

interface SlotRequest {
  centers: string[];
  services: string[];
  date: string;
}

interface SlotResponse {
  success: boolean;
  data?: {
    slots_by_center?: Record<string, {
      slots: Array<{
        Time: string;
        Available: boolean;
        Duration: number;
        ServiceId: string;
        CenterId: string;
      }>;
    }>;
    date_availability?: Record<string, {
      hasSlots: boolean;
      slotsCount: number;
      centersCount: number;
    }>;
    slots_by_date?: Record<string, {
      hasSlots: boolean;
      slotsCount: number;
      slots: any[];
      centers: any[];
    }>;
  };
  message?: string;
}

interface OptimizedSlotsResult {
  [date: string]: SlotResponse;
}

class SlotsService {
  private readonly API_BASE_URL = 'http://localhost:3000/api';
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAYS = [1000, 2000, 4000]; // Exponential backoff
  
  // Request deduplication
  private pendingBatchedRequests = new Map<string, Promise<SlotResponse>>();

  /**
   * Fetch slots for a single date with caching and deduplication
   */
  async fetchSlotsForDate(request: SlotRequest): Promise<SlotResponse> {
    const cacheKey = generateSlotCacheKey(request.centers, request.services, request.date);
    
    // Check cache first
    const cached = cacheManager.get<SlotResponse>(cacheKey);
    if (cached) {
      console.log(`🎯 Cache hit for date ${request.date}`);
      return cached;
    }

    // Check if request is already pending
    const pendingRequest = cacheManager.getPendingRequest<SlotResponse>(cacheKey);
    if (pendingRequest) {
      console.log(`⏳ Waiting for pending request for date ${request.date}`);
      return pendingRequest;
    }

    // Create new request
    const requestPromise = this.makeSlotRequest(request);
    
    // Store pending request
    cacheManager.setPendingRequest(cacheKey, requestPromise);

    try {
      const result = await requestPromise;
      
      // Cache successful response
      if (result.success) {
        cacheManager.set(cacheKey, result);
        console.log(`✅ Cached slots for date ${request.date}`);
      }
      
      return result;
    } catch (error) {
      console.error(`❌ Failed to fetch slots for date ${request.date}:`, error);
      throw error;
    } finally {
      // Clear pending request
      cacheManager.clearPendingRequest(cacheKey);
    }
  }

  /**
   * Fetch slots for multiple dates with optimized batching
   * Uses a single API call for all dates to minimize requests
   */
  async fetchSlotsForDateRange(
    centers: string[], 
    services: string[], 
    dates: string[]
  ): Promise<OptimizedSlotsResult> {
    console.log(`🚀 Fetching slots for ${dates.length} dates with ${centers.length} centers and ${services.length} services`);
    
    const results: OptimizedSlotsResult = {};
    
    // Check cache for each date first
    const uncachedDates: string[] = [];
    const cacheKeyPrefix = generateSlotCacheKey(centers, services, '');
    
    for (const date of dates) {
      const cacheKey = `${cacheKeyPrefix}${date}`;
      const cached = cacheManager.get<SlotResponse>(cacheKey);
      
      if (cached) {
        console.log(`🎯 Cache hit for date ${date}:`, {
          success: cached.success,
          hasData: !!cached.data,
          hasDateAvailability: !!cached.data?.date_availability,
          hasSlotsByDate: !!cached.data?.slots_by_date,
          dateAvailabilityKeys: cached.data?.date_availability ? Object.keys(cached.data.date_availability) : 'none'
        });
        results[date] = cached;
      } else {
        uncachedDates.push(date);
      }
    }
    
    // If all dates are cached, return immediately
    if (uncachedDates.length === 0) {
      console.log(`✅ All ${dates.length} dates served from cache`);
      
      // Debug: Check if cached data has the new structure
      const hasNewStructure = Object.values(results).some(result => 
        result.success && result.data?.date_availability
      );
      
      if (!hasNewStructure) {
        console.log(`⚠️ Cached data is in old format, clearing cache and refetching`);
        // Clear cache and refetch
        cacheManager.clear();
        return this.fetchSlotsForDateRange(centers, services, dates);
      }
      
      return results;
    }
    
    console.log(`📡 Making single API call for ${uncachedDates.length} uncached dates`);
    
    // Create request key for deduplication
    const requestKey = `${centers.sort().join(',')}-${services.sort().join(',')}-${uncachedDates.sort().join(',')}`;
    
    // Check if identical request is already pending
    if (this.pendingBatchedRequests.has(requestKey)) {
      console.log(`⏳ Waiting for identical pending request`);
      const batchedResult = await this.pendingBatchedRequests.get(requestKey)!;
      
      // Process the batched response and create individual date responses
      const filteredResults: OptimizedSlotsResult = {};
      if (batchedResult.success && batchedResult.data) {
        for (const date of uncachedDates) {
          const dateAvailability = batchedResult.data.date_availability?.[date];
          const slotsByDate = batchedResult.data.slots_by_date?.[date];
          
          if (dateAvailability || slotsByDate) {
            filteredResults[date] = {
              success: true,
              data: {
                date_availability: dateAvailability ? { [date]: dateAvailability } : undefined,
                slots_by_date: slotsByDate ? { [date]: slotsByDate } : undefined
              },
              message: `Slots retrieved for ${date}`
            };
          }
        }
      }
      
      // Merge with cached results
      return { ...results, ...filteredResults };
    }
    
    try {
      // Create and store the promise for deduplication
      const batchedPromise = this.makeBatchedSlotRequest(centers, services, uncachedDates);
      this.pendingBatchedRequests.set(requestKey, batchedPromise);
      
      // Make single batched API call for all uncached dates
      const batchedResult = await batchedPromise;
      
            // Process the batched response using the new simplified structure
            if (batchedResult.success && batchedResult.data) {
              // Create individual responses for each requested date using the new structure
              for (const date of uncachedDates) {
                const dateAvailability = batchedResult.data?.date_availability?.[date];
                const slotsByDate = batchedResult.data?.slots_by_date?.[date];
                
                if (dateAvailability || slotsByDate) {
                  // Create a response structure for this specific date
                  results[date] = {
                    success: true,
                    data: {
                      date_availability: {
                        [date]: dateAvailability || { hasSlots: false, slotsCount: 0, centersCount: 0 }
                      },
                      slots_by_date: {
                        [date]: slotsByDate || { hasSlots: false, slotsCount: 0, slots: [], centers: [] }
                      }
                    },
                    message: `Slots retrieved for ${date}`
                  };
                  
                  // Cache the result
                  const cacheKey = `${cacheKeyPrefix}${date}`;
                  cacheManager.set(cacheKey, results[date]);
                  console.log(`✅ Cached slots for date ${date}`);
                } else {
                  // No slots for this date
                  results[date] = {
                    success: true,
                    data: {
                      date_availability: {
                        [date]: { hasSlots: false, slotsCount: 0, centersCount: 0 }
                      },
                      slots_by_date: {
                        [date]: { hasSlots: false, slotsCount: 0, slots: [], centers: [] }
                      }
                    },
                    message: `No slots available for ${date}`
                  };
                }
              }
            } else {
              // Fallback for failed response
              for (const date of uncachedDates) {
                results[date] = {
                  success: false,
                  message: 'Failed to fetch slots from batched response'
                };
              }
            }
      
      console.log(`✅ Successfully processed ${uncachedDates.length} dates in single API call`);
      
    } catch (error) {
      console.error(`❌ Error in batched request:`, error);
      
      // Fallback: mark all uncached dates as failed
      for (const date of uncachedDates) {
        results[date] = {
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    } finally {
      // Clean up pending request
      this.pendingBatchedRequests.delete(requestKey);
    }

    return results;
  }

  /**
   * Make batched API request for multiple dates
   */
  private async makeBatchedSlotRequest(
    centers: string[], 
    services: string[], 
    dates: string[]
  ): Promise<SlotResponse> {
    const url = `${this.API_BASE_URL}/slots/unified`;
    
    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        console.log(`🔄 Batched attempt ${attempt + 1}/${this.MAX_RETRIES} for ${dates.length} dates`);
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            centers: [...new Set(centers)], // Remove duplicates
            services: [...new Set(services)], // Remove duplicates
            dates: dates // Send all dates in single request
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        console.log(`✅ Successfully fetched batched slots for ${dates.length} dates`);
        console.log(`📊 Raw batched response:`, data);
        
        // Debug: Check the new structure
        if (data.success && data.data) {
          console.log(`🔍 New response structure:`, {
            hasDateAvailability: !!data.data.date_availability,
            hasSlotsByDate: !!data.data.slots_by_date,
            dateAvailabilityKeys: data.data.date_availability ? Object.keys(data.data.date_availability) : 'none',
            slotsByDateKeys: data.data.slots_by_date ? Object.keys(data.data.slots_by_date) : 'none',
            sampleDateAvailability: data.data.date_availability ? Object.values(data.data.date_availability)[0] : 'none',
            sampleSlotsByDate: data.data.slots_by_date ? Object.values(data.data.slots_by_date)[0] : 'none'
          });
        }
        
        // Return the raw response - it will be processed in fetchSlotsForDateRange
        return data;
        
      } catch (error) {
        console.error(`❌ Batched attempt ${attempt + 1} failed:`, error);
        
        if (attempt === this.MAX_RETRIES - 1) {
          throw error; // Last attempt failed
        }
        
        // Wait before retry
        const delay = this.RETRY_DELAYS[attempt] || 4000;
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await this.delay(delay);
      }
    }

    throw new Error('Max retries exceeded for batched request');
  }

  /**
   * Make actual API request with retry logic
   */
  private async makeSlotRequest(request: SlotRequest): Promise<SlotResponse> {
    const url = `${this.API_BASE_URL}/slots/unified`;
    
    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        console.log(`🔄 Attempt ${attempt + 1}/${this.MAX_RETRIES} for date ${request.date}`);
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            centers: [...new Set(request.centers)], // Remove duplicates
            services: [...new Set(request.services)], // Remove duplicates
            date: request.date
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data: SlotResponse = await response.json();
        
        if (data.success) {
          console.log(`✅ Successfully fetched slots for ${request.date}`);
        } else {
          console.warn(`⚠️ API returned error for ${request.date}: ${data.message}`);
        }
        
        return data;
        
      } catch (error) {
        console.error(`❌ Attempt ${attempt + 1} failed for ${request.date}:`, error);
        
        if (attempt === this.MAX_RETRIES - 1) {
          throw error; // Last attempt failed
        }
        
        // Wait before retry
        const delay = this.RETRY_DELAYS[attempt] || 4000;
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await this.delay(delay);
      }
    }

    throw new Error('Max retries exceeded');
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
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
