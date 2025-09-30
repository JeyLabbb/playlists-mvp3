/**
 * Simple in-memory cache for intent parsing results
 * Uses LRU-like eviction and prompt hashing
 */

import crypto from 'crypto';

class IntentCache {
  constructor() {
    this.cache = new Map();
    this.maxSize = 100; // Maximum cached intents
    this.ttl = 60 * 60 * 1000; // 1 hour TTL
  }

  /**
   * Generate hash for prompt + target_tracks
   */
  generateHash(prompt, targetTracks) {
    const content = `${prompt.toLowerCase().trim()}_${targetTracks}`;
    return crypto.createHash('md5').update(content).digest('hex');
  }

  /**
   * Get cached intent
   */
  get(prompt, targetTracks) {
    const key = this.generateHash(prompt, targetTracks);
    const cached = this.cache.get(key);

    if (!cached) {
      return null;
    }

    // Check TTL
    if (Date.now() - cached.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    // Move to end (LRU)
    this.cache.delete(key);
    this.cache.set(key, cached);

    console.log(`[INTENT-CACHE] Cache hit for prompt: "${prompt.substring(0, 50)}..."`);
    return cached.intent;
  }

  /**
   * Set cached intent
   */
  set(prompt, targetTracks, intent) {
    const key = this.generateHash(prompt, targetTracks);
    
    // Evict if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      intent,
      timestamp: Date.now()
    });

    console.log(`[INTENT-CACHE] Cached intent for prompt: "${prompt.substring(0, 50)}..."`);
  }

  /**
   * Clear cache
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Get cache stats
   */
  getStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;

    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.ttl) {
        expiredEntries++;
      } else {
        validEntries++;
      }
    }

    return {
      totalEntries: this.cache.size,
      validEntries,
      expiredEntries,
      hitRate: 'N/A' // Would need hit/miss tracking for this
    };
  }
}

// Global cache instance
const intentCache = new IntentCache();

export { intentCache };
