/**
 * Singleflight implementation to prevent duplicate requests
 * When multiple requests come in for the same prompt, only one goes to OpenAI
 */

class SingleFlight {
  constructor() {
    this.inFlight = new Map(); // hash -> Promise
  }

  /**
   * Execute function with singleflight protection
   */
  async execute(key, asyncFn) {
    // If request is already in flight, wait for it
    if (this.inFlight.has(key)) {
      console.log(`[SINGLEFLIGHT] Waiting for in-flight request: ${key}`);
      return await this.inFlight.get(key);
    }

    // Create new request
    const promise = this._executeWithCleanup(key, asyncFn);
    this.inFlight.set(key, promise);
    
    return await promise;
  }

  /**
   * Execute function and clean up when done
   */
  async _executeWithCleanup(key, asyncFn) {
    try {
      const result = await asyncFn();
      return result;
    } finally {
      // Always clean up
      this.inFlight.delete(key);
    }
  }

  /**
   * Get current in-flight requests
   */
  getInFlightRequests() {
    return Array.from(this.inFlight.keys());
  }

  /**
   * Clear all in-flight requests
   */
  clear() {
    this.inFlight.clear();
  }
}

// Global singleflight instance
const singleFlight = new SingleFlight();

export { singleFlight };
