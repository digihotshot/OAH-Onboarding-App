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
   * Get data from cache if not expired
   */
  get<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
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
