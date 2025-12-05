// Global state to store the last run data
let lastRunData = null;

// Store last run data
export function storeLastRun(runData) {
  lastRunData = {
    ...runData,
    timestamp: new Date().toISOString(),
    runId: runData.runId || `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  };
}

// Get last run data
export function getLastRunData() {
  return lastRunData;
}
