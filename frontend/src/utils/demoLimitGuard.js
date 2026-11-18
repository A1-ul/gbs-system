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
 * Checks whether a Demo Sandbox user can create another record in `moduleKey`
 * (capped at 10 entries per module so users can learn the exact real system).
 * Returns `{ allowed: true }` unconditionally in Live Production mode.
 */
export function checkDemoEntryLimit(moduleKey, moduleLabel = "records", currentCount = 0) {
  if (!isDemoSandboxMode()) {
    return { allowed: true, isDemo: false, used: 0, limit: Infinity, remaining: Infinity };
  }

  const counters = getClientDemoCounters();
  const recorded = Number(counters[moduleKey] || 0);
  const used = Math.max(recorded, Number(currentCount) || 0);

  if (used >= MAX_DEMO_ENTRIES) {
    const message = `Demo Trial Limit Reached (${used}/${MAX_DEMO_ENTRIES} entries used for ${moduleLabel}). Demo Sandbox runs the exact live system for learning up to ${MAX_DEMO_ENTRIES} entries per module. Register or sign into a Live School account for unlimited production records, or click "Reset Demo Data" in the top banner to practice again.`;
    if (typeof window !== "undefined" && typeof window.showGBSOpenNotice === "function") {
      window.showGBSOpenNotice(message, "warning", "DEMO TRIAL LIMIT REACHED (10/10)");
    }
    return {
      allowed: false,
      isDemo: true,
      used,
      limit: MAX_DEMO_ENTRIES,
      remaining: 0,
      message
    };
  }

  return {
    allowed: true,
    isDemo: true,
    used,
    limit: MAX_DEMO_ENTRIES,
    remaining: MAX_DEMO_ENTRIES - used
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
