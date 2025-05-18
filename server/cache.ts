/**
 * Simple in-memory cache implementation for the stock data application
 * Since financial data doesn't change frequently, we can cache it for extended periods
 */

interface CacheEntry<T> {
  data: T;
  expiry: number;
}

class Cache {
  private store: Map<string, CacheEntry<any>> = new Map();
  
  // Default cache duration is 24 hours (in milliseconds)
  private DEFAULT_CACHE_DURATION = 24 * 60 * 60 * 1000;

  /**
   * Get data from cache if it exists and is not expired
   * @param key The unique key for the cache entry
   * @returns The cached data or null if not found or expired
   */
  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    
    // Return null if the entry doesn't exist
    if (!entry) {
      return null;
    }
    
    // Check if the entry has expired
    if (Date.now() > entry.expiry) {
      // Remove expired entry from cache
      this.store.delete(key);
      return null;
    }
    
    return entry.data as T;
  }

  /**
   * Store data in the cache
   * @param key The unique key for the cache entry
   * @param data The data to cache
   * @param duration Optional custom duration in milliseconds, defaults to 24 hours
   */
  set<T>(key: string, data: T, duration?: number): void {
    const expiry = Date.now() + (duration || this.DEFAULT_CACHE_DURATION);
    this.store.set(key, { data, expiry });
  }

  /**
   * Check if an item exists in the cache and is not expired
   * @param key The unique key for the cache entry
   * @returns Boolean indicating if the entry exists and is valid
   */
  has(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;
    
    // Check expiration
    if (Date.now() > entry.expiry) {
      this.store.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Remove an item from the cache
   * @param key The unique key for the cache entry
   */
  delete(key: string): void {
    this.store.delete(key);
  }

  /**
   * Clear all entries from the cache
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Get cache statistics (number of entries, memory usage estimation)
   */
  getStats(): { entries: number, keys: string[] } {
    return {
      entries: this.store.size,
      keys: Array.from(this.store.keys())
    };
  }
}

// Export a singleton instance of the cache
export const cache = new Cache();