// Configuration from environment
export const FREE_USES = parseInt(process.env.FREE_USES || '5');
export const USAGE_WINDOW_DAYS = parseInt(process.env.USAGE_WINDOW_DAYS || '30');
export const USAGE_STORAGE = process.env.USAGE_STORAGE || 'memory';

// Helper to get current window key
function getWindowKey() {
  const now = new Date();
  if (USAGE_WINDOW_DAYS <= 7) {
    // Weekly window (YYYYWW format)
    const year = now.getFullYear();
    const week = getWeekNumber(now);
    return `${year}${week.toString().padStart(2, '0')}`;
  } else {
    // Monthly window (YYYYMM format)
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    return `${year}${month}`;
  }
}

function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

// In-memory storage (simple fallback)
const memoryStore = new Map();

// Main usage functions
export async function getUsage(userId) {
  const currentWindowKey = getWindowKey();
  
  let usage = memoryStore.get(userId);
  
  // If no usage data or window changed, reset to 0
  if (!usage || usage.windowKey !== currentWindowKey) {
    const newUsage = {
      count: 0,
      windowKey: currentWindowKey,
      updatedAt: new Date().toISOString(),
    };
    
    memoryStore.set(userId, newUsage);
    usage = newUsage;
  }
  
  const remaining = Math.max(0, FREE_USES - usage.count);
  
  console.log(`[USAGE] get - userId: ${userId}, count: ${usage.count}, windowKey: ${currentWindowKey}`);
  
  return {
    count: usage.count,
    limit: FREE_USES,
    remaining,
    windowKey: currentWindowKey,
  };
}

export async function incrUsage(userId) {
  const currentUsage = await getUsage(userId);
  const newCount = currentUsage.count + 1;
  
  const newUsage = {
    count: newCount,
    windowKey: currentUsage.windowKey,
    updatedAt: new Date().toISOString(),
  };
  
  memoryStore.set(userId, newUsage);
  
  const remaining = Math.max(0, FREE_USES - newCount);
  
  console.log(`[USAGE] incr - userId: ${userId}, count: ${newCount}, windowKey: ${currentUsage.windowKey}`);
  
  return {
    count: newCount,
    limit: FREE_USES,
    remaining,
    windowKey: currentUsage.windowKey,
  };
}

export async function resetUsage(userId) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Reset usage not allowed in production');
  }
  
  const currentWindowKey = getWindowKey();
  const resetUsage = {
    count: 0,
    windowKey: currentWindowKey,
    updatedAt: new Date().toISOString(),
  };
  
  memoryStore.set(userId, resetUsage);
  
  console.log(`[USAGE] reset - userId: ${userId}, windowKey: ${currentWindowKey}`);
}