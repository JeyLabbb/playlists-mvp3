// KV client stub for local development
// In production, this would connect to Upstash KV

export const kv = {
  isEnabled: false, // Set to true when KV is configured
  
  async get(key) {
    if (!this.isEnabled) {
      console.log('[KV] get called but KV disabled:', key);
      return null;
    }
    // Implementation would go here
    return null;
  },
  
  async set(key, value) {
    if (!this.isEnabled) {
      console.log('[KV] set called but KV disabled:', key, value);
      return;
    }
    // Implementation would go here
  },
  
  async del(key) {
    if (!this.isEnabled) {
      console.log('[KV] del called but KV disabled:', key);
      return;
    }
    // Implementation would go here
  }
};

