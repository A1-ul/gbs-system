import { isDemoSandboxMode } from "./tokenStorage";

export const MAX_DEMO_ENTRIES = 10;
const DEMO_COUNTER_STORAGE_KEY = "gbs_demo_entry_counters";

export function getClientDemoCounters() {
  try {
    const raw = JSON.parse(localStorage.getItem(DEMO_COUNTER_STORAGE_KEY) || "{}");
    return raw && typeof raw === "object" ? raw : {};
  } catch {
    return {};
  }
}

export function resetClientDemoCounters() {
  try {
    localStorage.removeItem(DEMO_COUNTER_STORAGE_KEY);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("gbs_demo_usage_updated"));
    }
  } catch {
    // ignore storage quota errors
  }
}

/**
 * Demo Sandbox allows unlimited learning practice across all modules before registering,
 * while strictly isolating sandbox data from real production tenants (zero real/production
 * data can ever be stored in Demo mode).
 */
export function checkDemoEntryLimit(moduleKey, moduleLabel = "records", currentCount = 0) {
  if (!isDemoSandboxMode()) {
    return { allowed: true, isDemo: false, used: 0, limit: Infinity, remaining: Infinity };
  }

  const counters = getClientDemoCounters();
  const recorded = Number(counters[moduleKey] || 0);
  const used = Math.max(recorded, Number(currentCount) || 0);

  return {
    allowed: true,
    isDemo: true,
    unlimitedLearning: true,
    isolatedSandbox: true,
    used,
    limit: Infinity,
    remaining: Infinity
  };
}

export function trackDemoEntryCreated(moduleKey) {
  if (!isDemoSandboxMode()) return;
  try {
    const counters = getClientDemoCounters();
    counters[moduleKey] = Math.max(0, Number(counters[moduleKey] || 0)) + 1;
    localStorage.setItem(DEMO_COUNTER_STORAGE_KEY, JSON.stringify(counters));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("gbs_demo_usage_updated", { detail: counters }));
    }
  } catch {
    // ignore storage errors
  }
}
