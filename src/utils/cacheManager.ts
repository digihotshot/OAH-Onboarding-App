/**
 * Centralized cache management system for booking data
 * Implements TTL-based caching and request deduplication
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface PendingRequest<T> {
  promise: Promise<T>;
  timestamp: number;
}

class CacheManager {
  private cache = new Map<string, CacheEntry<any>>();
  private pendingRequests = new Map<string, PendingRequest<any>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly SLOT_CACHE_TTL = 10 * 60 * 1000; // 10 minutes for slot data
  private readonly BOOKING_CACHE_TTL = 2 * 60 * 1000; // 2 minutes for booking data
  private readonly UNIFIED_CACHE_TTL = 15 * 60 * 1000; // 15 minutes for unified endpoint data

  /**
   * Set data in cache with TTL
   */
  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * Set slot data with appropriate TTL
   */
  setSlotData<T>(key: string, data: T): void {
    this.set(key, data, this.SLOT_CACHE_TTL);
  }

  /**
   * Set booking data with appropriate TTL
   */
  setBookingData<T>(key: string, data: T): void {
    this.set(key, data, this.BOOKING_CACHE_TTL);
  }

  /**
   * Set unified endpoint data with longer TTL
   */
  setUnifiedData<T>(key: string, data: T): void {
    this.set(key, data, this.UNIFIED_CACHE_TTL);
    
    // Log available dates information if present
    if (data && typeof data === 'object' && 'data' in data) {
      const responseData = (data as any).data;
      if (responseData?.available_dates) {
        console.log(`📊 Cached unified data with ${responseData.available_dates.length} available dates`);
        if (responseData.future_days_count) {
          console.log(`📊 Future days count: ${responseData.future_days_count}`);
        }
      }
    }
  }

  /**
   * Get data from cache if not expired
   */
  get<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    // Log available dates information if present in cached data
    if (cached.data && typeof cached.data === 'object' && 'data' in cached.data) {
      const responseData = (cached.data as any).data;
      if (responseData?.available_dates) {
        console.log(`🎯 Cache hit with ${responseData.available_dates.length} available dates`);
      }
    }

    return cached.data;
  }

  /**
   * Check if a request is already pending
   */
  hasPendingRequest(key: string): boolean {
    const pending = this.pendingRequests.get(key);
    if (!pending) return false;

    // Clean up expired pending requests (older than 30 seconds)
    if (Date.now() - pending.timestamp > 30000) {
      this.pendingRequests.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Get pending request promise
   */
  getPendingRequest<T>(key: string): Promise<T> | null {
    const pending = this.pendingRequests.get(key);
    if (!pending) return null;

    // Clean up expired pending requests
    if (Date.now() - pending.timestamp > 30000) {
      this.pendingRequests.delete(key);
      return null;
    }

    return pending.promise;
  }

  /**
   * Set pending request
   */
  setPendingRequest<T>(key: string, promise: Promise<T>): void {
    this.pendingRequests.set(key, {
      promise,
      timestamp: Date.now()
    });
  }

  /**
   * Clear pending request
   */
  clearPendingRequest(key: string): void {
    this.pendingRequests.delete(key);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    this.pendingRequests.clear();
  }

  /**
   * Clear cache entries matching a pattern
   */
  clearByPattern(pattern: string | RegExp): number {
    let clearedCount = 0;
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        clearedCount++;
      }
    }
    
    return clearedCount;
  }

  /**
   * Clear slot cache for specific centers/services
   */
  clearSlotCache(centers?: string[], services?: string[]): number {
    let clearedCount = 0;
    
    for (const key of this.cache.keys()) {
      if (key.startsWith('slots-')) {
        let shouldClear = true;
        
        if (centers && centers.length > 0) {
          const keyCenters = key.split('-')[1]?.split(',') || [];
          shouldClear = shouldClear && centers.some(center => keyCenters.includes(center));
        }
        
        if (services && services.length > 0) {
          const keyServices = key.split('-')[2]?.split(',') || [];
          shouldClear = shouldClear && services.some(service => keyServices.includes(service));
        }
        
        if (shouldClear) {
          this.cache.delete(key);
          clearedCount++;
        }
      }
    }
    
    return clearedCount;
  }

  /**
   * Week-based cache optimization - invalidate cache for past weeks
   */
  clearPastWeekCache(): number {
    let clearedCount = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get Monday of current week
    const dayOfWeek = today.getDay();
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const currentWeekMonday = new Date(today);
    currentWeekMonday.setDate(today.getDate() + daysToMonday);
    
    for (const [key, entry] of this.cache.entries()) {
      if (key.startsWith('slots-')) {
        // Extract date from key (assuming format: slots-centers-services-date)
        const keyParts = key.split('-');
        const keyDate = keyParts[keyParts.length - 1];
        
        if (keyDate && !isNaN(Date.parse(keyDate))) {
          const keyDateObj = new Date(keyDate);
          keyDateObj.setHours(0, 0, 0, 0);
          
          // If the date is from a past week, clear it
          if (keyDateObj < currentWeekMonday) {
            this.cache.delete(key);
            clearedCount++;
            console.log(`🧹 Cleared past week cache for date: ${keyDate}`);
          }
        }
      }
    }
    
    console.log(`🧹 Cleared ${clearedCount} past week cache entries`);
    return clearedCount;
  }

  /**
   * Week-based cache preloading - check if we have cache for upcoming weeks
   */
  hasUpcomingWeeksCache(centers: string[], services: string[], weeks: number = 4): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get Monday of current week
    const dayOfWeek = today.getDay();
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const currentWeekMonday = new Date(today);
    currentWeekMonday.setDate(today.getDate() + daysToMonday);
    
    // Check if we have cache for each of the upcoming weeks
    for (let week = 0; week < weeks; week++) {
      const weekDate = new Date(currentWeekMonday);
      weekDate.setDate(currentWeekMonday.getDate() + (week * 7));
      const weekDateStr = weekDate.toISOString().split('T')[0];
      
      const cacheKey = generateSlotCacheKey(centers, services, weekDateStr);
      if (!this.get(cacheKey)) {
        return false; // Missing cache for this week
      }
    }
    
    return true; // Have cache for all upcoming weeks
  }

  /**
   * Get week-based cache coverage information
   */
  getWeekCacheCoverage(centers: string[], services: string[], weeks: number = 4): {
    totalWeeks: number;
    cachedWeeks: number;
    missingWeeks: string[];
    coverage: number;
  } {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get Monday of current week
    const dayOfWeek = today.getDay();
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const currentWeekMonday = new Date(today);
    currentWeekMonday.setDate(today.getDate() + daysToMonday);
    
    const missingWeeks: string[] = [];
    let cachedWeeks = 0;
    
    for (let week = 0; week < weeks; week++) {
      const weekDate = new Date(currentWeekMonday);
      weekDate.setDate(currentWeekMonday.getDate() + (week * 7));
      const weekDateStr = weekDate.toISOString().split('T')[0];
      
      const cacheKey = generateSlotCacheKey(centers, services, weekDateStr);
      if (this.get(cacheKey)) {
        cachedWeeks++;
      } else {
        missingWeeks.push(weekDateStr);
      }
    }
    
    return {
      totalWeeks: weeks,
      cachedWeeks,
      missingWeeks,
      coverage: Math.round((cachedWeeks / weeks) * 100)
    };
  }

  /**
   * Clear booking cache for specific center/service
   */
  clearBookingCache(centerId?: string, serviceId?: string): number {
    let clearedCount = 0;
    
    for (const key of this.cache.keys()) {
      if (key.startsWith('booking-')) {
        let shouldClear = true;
        
        if (centerId) {
          shouldClear = shouldClear && key.includes(centerId);
        }
        
        if (serviceId) {
          shouldClear = shouldClear && key.includes(serviceId);
        }
        
        if (shouldClear) {
          this.cache.delete(key);
          clearedCount++;
        }
      }
    }
    
    return clearedCount;
  }

  /**
   * Invalidate cache for a specific date range
   */
  invalidateDateRange(startDate: string, endDate: string): number {
    let clearedCount = 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    for (const key of this.cache.keys()) {
      // Extract date from key (assuming format: prefix-date)
      const keyParts = key.split('-');
      const keyDate = keyParts[keyParts.length - 1];
      
      if (keyDate && !isNaN(Date.parse(keyDate))) {
        const keyDateObj = new Date(keyDate);
        if (keyDateObj >= start && keyDateObj <= end) {
          this.cache.delete(key);
          clearedCount++;
        }
      }
    }
    
    return clearedCount;
  }

  /**
   * Clear expired entries
   */
  clearExpired(): void {
    const now = Date.now();
    
    // Clear expired cache entries
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }

    // Clear expired pending requests
    for (const [key, pending] of this.pendingRequests.entries()) {
      if (now - pending.timestamp > 30000) {
        this.pendingRequests.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      cacheSize: this.cache.size,
      pendingRequests: this.pendingRequests.size,
      memoryUsage: this.cache.size + this.pendingRequests.size
    };
  }
}

// Export singleton instance
export const cacheManager = new CacheManager();

// Auto-cleanup expired entries every 2 minutes
setInterval(() => {
  cacheManager.clearExpired();
}, 2 * 60 * 1000);

// Auto-cleanup past week cache every hour
setInterval(() => {
  cacheManager.clearPastWeekCache();
}, 60 * 60 * 1000);

/**
 * Generate cache key for slot requests
 */
export const generateSlotCacheKey = (
  centers: string[], 
  services: string[], 
  date: string
): string => {
  return `slots-${centers.sort().join(',')}-${services.sort().join(',')}-${date}`;
};

/**
 * Generate cache key for booking requests
 */
export const generateBookingCacheKey = (
  centerId: string, 
  serviceId: string, 
  date: string
): string => {
  return `booking-${centerId}-${serviceId}-${date}`;
};
