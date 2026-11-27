import { getApiBaseUrl, getServerBaseUrl } from "../api/client/apiConfig";

/**
 * GBS Intelligent Connection & Health Monitor
 *
 * Independently monitors:
 *  - Frontend browser connectivity (navigator.onLine)
 *  - GBS Central Engine availability (ONLINE / DEGRADED / RECONNECTING / MAINTENANCE / OFFLINE)
 *  - Primary Database connectivity (ONLINE / DEGRADED / OFFLINE)
 *
 * Prevents false offline alerts via consecutive-failure hysteresis, controlled exponential retry
 * backoff with jitter, immediate recovery on network restore / tab focus, and truthful telemetry.
 */

const HEALTHY_INTERVAL_MS = 30000;
const DEGRADED_INTERVAL_MS = 20000;
const RETRY_SCHEDULE_MS = [2500, 5000, 10000, 15000, 30000];
const PROBE_TIMEOUT_MS = 10000;
const MAX_RECENT_ERRORS = 20;
const MAX_LATENCY_SAMPLES = 15;

const listeners = new Set();
let started = false;
let probeTimer = null;
let probeInFlight = null;

const state = {
  frontendStatus: typeof navigator !== "undefined" && navigator.onLine === false ? "OFFLINE" : "ONLINE",
  centralEngineStatus: "CHECKING", // CHECKING | ONLINE | DEGRADED | RECONNECTING | MAINTENANCE | OFFLINE
  databaseStatus: "CHECKING", // CHECKING | ONLINE | DEGRADED | OFFLINE
  databaseMode: "PROBING",
  databaseSummary: "Checking live database status...",
  overallStatus: "CHECKING",
  apiResponseTimeMs: null,
  avgApiResponseTimeMs: null,
  databaseLatencyMs: null,
  lastSuccessfulConnectionAt: null,
  lastProbeAt: null,
  lastFailureReason: null,
  serverUptimeSeconds: null,
  consecutiveFailures: 0,
  nextRetryDelayMs: HEALTHY_INTERVAL_MS,
  recentConnectionErrors: [],
  latencySamples: []
};

function emitChange() {
  const snapshot = getConnectionSnapshot();
  listeners.forEach((cb) => {
    try {
      cb(snapshot);
    } catch { }
  });
  if (typeof window !== "undefined") {
    try {
      window.__gbsConnectionState = snapshot;
      window.dispatchEvent(new CustomEvent("gbs_connection_status_changed", { detail: snapshot }));
    } catch { }
  }
}

function recordLatency(ms) {
  if (typeof ms !== "number" || !Number.isFinite(ms) || ms < 0) return;
  const rounded = Math.round(ms);
  state.apiResponseTimeMs = rounded;
  state.latencySamples = [rounded, ...state.latencySamples].slice(0, MAX_LATENCY_SAMPLES);
  const sum = state.latencySamples.reduce((acc, v) => acc + v, 0);
  state.avgApiResponseTimeMs = Math.round(sum / state.latencySamples.length);
}

function pushConnectionError(entry) {
  state.recentConnectionErrors = [
    {
      id: `ERR-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      timestamp: new Date().toISOString(),
      endpoint: entry.endpoint || "/api/v1/health",
      status: entry.status ?? 0,
      reason: String(entry.reason || "Connection error"),
      durationMs: typeof entry.durationMs === "number" ? Math.round(entry.durationMs) : null
    },
    ...state.recentConnectionErrors
  ].slice(0, MAX_RECENT_ERRORS);
}

function clearTimer() {
  if (probeTimer) {
    clearTimeout(probeTimer);
    probeTimer = null;
  }
}

function scheduleNextProbe(baseDelayMs) {
  clearTimer();
  if (typeof window === "undefined") return;
  const jitter = Math.round(baseDelayMs * (Math.random() * 0.16 - 0.08));
  const finalDelay = Math.max(1500, baseDelayMs + jitter);
  state.nextRetryDelayMs = finalDelay;
  probeTimer = setTimeout(() => {
    probeCentralEngineHealth({ reason: "scheduled" });
  }, finalDelay);
}

async function fetchWithTimeout(url, timeoutMs = PROBE_TIMEOUT_MS) {
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  try {
    const res = await fetch(url, {
      method: "GET",
      cache: "no-store",
      credentials: "same-origin",
      headers: { Accept: "application/json" },
      ...(controller ? { signal: controller.signal } : {})
    });
    return res;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function probeCentralEngineHealth({ reason = "manual" } = {}) {
  if (typeof window === "undefined") return getConnectionSnapshot();
  if (probeInFlight) return probeInFlight;

  state.frontendStatus = typeof navigator !== "undefined" && navigator.onLine === false ? "OFFLINE" : "ONLINE";
  state.lastProbeAt = new Date().toISOString();

  if (state.frontendStatus === "OFFLINE") {
    state.centralEngineStatus = "OFFLINE";
    state.overallStatus = "OFFLINE";
    state.lastFailureReason = "Browser network interface reports offline (no internet connection).";
    state.consecutiveFailures += 1;
    pushConnectionError({ endpoint: "/api/v1/health", status: 0, reason: state.lastFailureReason });
    emitChange();
    scheduleNextProbe(RETRY_SCHEDULE_MS[Math.min(state.consecutiveFailures - 1, RETRY_SCHEDULE_MS.length - 1)]);
    return getConnectionSnapshot();
  }

  probeInFlight = (async () => {
    const startedAt = Date.now();
    const apiHealthUrl = `${getApiBaseUrl()}/health`;
    const rootHealthUrl = `${getServerBaseUrl()}/health`;
    let res = null;
    let usedEndpoint = apiHealthUrl;
    let lastErr = null;

    try {
      res = await fetchWithTimeout(apiHealthUrl, PROBE_TIMEOUT_MS);
      if (!res.ok && res.status === 404) {
        usedEndpoint = rootHealthUrl;
        res = await fetchWithTimeout(rootHealthUrl, PROBE_TIMEOUT_MS);
      }
    } catch (err) {
      lastErr = err;
    }

    const elapsedMs = Date.now() - startedAt;

    if (res && res.ok) {
      let json = null;
      try {
        json = await res.json();
      } catch {
        json = null;
      }

      if (json && (json.status === "success" || json.centralEngine || json.database)) {
        recordLatency(elapsedMs);
        state.consecutiveFailures = 0;
        state.lastSuccessfulConnectionAt = new Date().toISOString();
        state.lastFailureReason = null;

        const engineStatus = String(json?.centralEngine?.status || "ONLINE").toUpperCase();
        const dbConnected = Boolean(json?.database?.connected ?? json?.database?.active ?? json?.databaseActive);
        const dbStatus = String(
          json?.database?.status || (dbConnected ? "ONLINE" : "DEGRADED")
        ).toUpperCase();

        state.centralEngineStatus = engineStatus;
        state.databaseStatus = dbStatus;
        state.databaseMode = json?.database?.mode || (dbConnected ? "POSTGRESQL_LIVE" : "STANDBY_FALLBACK");
        state.databaseSummary = json?.database?.summary || (dbConnected ? "Primary PostgreSQL connected." : "Standby persistent store active.");
        state.databaseLatencyMs = typeof json?.database?.latencyMs === "number" ? json.database.latencyMs : null;
        state.serverUptimeSeconds = typeof json?.uptimeSeconds === "number"
          ? json.uptimeSeconds
          : (typeof json?.centralEngine?.uptimeSeconds === "number" ? json.centralEngine.uptimeSeconds : state.serverUptimeSeconds);
        state.overallStatus = String(
          json?.overallStatus || (engineStatus === "MAINTENANCE" ? "MAINTENANCE" : (dbConnected ? "ONLINE" : "DEGRADED"))
        ).toUpperCase();

        emitChange();
        scheduleNextProbe(state.overallStatus === "ONLINE" ? HEALTHY_INTERVAL_MS : DEGRADED_INTERVAL_MS);
        return getConnectionSnapshot();
      }
    }

    // Probe failed: classify truthfully and avoid false-offline flicker on single transient failure
    state.consecutiveFailures += 1;
    const isAbort = lastErr?.name === "AbortError" || /abort|timeout/i.test(String(lastErr?.message || ""));
    const httpStatus = res?.status || 0;
    const failureMsg = isAbort
      ? `Health probe timed out after ${PROBE_TIMEOUT_MS / 1000}s (server may be waking up or restarting).`
      : httpStatus >= 500
        ? `Central Engine returned HTTP ${httpStatus} (${res?.statusText || "Server Error"}).`
        : httpStatus > 0
          ? `Unexpected health response HTTP ${httpStatus}.`
          : `Unable to reach Central Engine (${lastErr?.message || "Network unreachable"}).`;

    state.lastFailureReason = failureMsg;
    // Hysteresis: 1st transient failure while browser is online -> RECONNECTING; >=2 consecutive failures -> OFFLINE
    state.centralEngineStatus = state.consecutiveFailures >= 2 ? "OFFLINE" : "RECONNECTING";
    state.overallStatus = state.centralEngineStatus;
    pushConnectionError({
      endpoint: usedEndpoint,
      status: httpStatus,
      reason: `${failureMsg} [${reason}]`,
      durationMs: elapsedMs
    });
    emitChange();

    const retryDelay = RETRY_SCHEDULE_MS[Math.min(state.consecutiveFailures - 1, RETRY_SCHEDULE_MS.length - 1)];
    scheduleNextProbe(retryDelay);
    return getConnectionSnapshot();
  })().finally(() => {
    probeInFlight = null;
  });

  return probeInFlight;
}

export function recordApiResult({ ok, endpoint = "", status = 0, durationMs = null, reason = "" } = {}) {
  if (typeof window === "undefined") return;
  if (typeof durationMs === "number" && Number.isFinite(durationMs) && ok) {
    recordLatency(durationMs);
  }
  if (ok) {
    state.frontendStatus = typeof navigator !== "undefined" && navigator.onLine === false ? "OFFLINE" : "ONLINE";
    state.lastSuccessfulConnectionAt = new Date().toISOString();
    if (state.centralEngineStatus === "OFFLINE" || state.centralEngineStatus === "RECONNECTING" || state.centralEngineStatus === "CHECKING") {
      state.consecutiveFailures = 0;
      state.centralEngineStatus = "ONLINE";
      state.overallStatus = state.databaseStatus === "ONLINE" ? "ONLINE" : "DEGRADED";
      state.lastFailureReason = null;
      emitChange();
    } else {
      emitChange();
    }
    return;
  }

  // Only treat transport/gateway failures (0, 502, 503, 504) as connection errors (never 400/401/403/404 business responses)
  if (!status || status === 502 || status === 503 || status === 504) {
    const cleanReason = reason || (status ? `Gateway/Service HTTP ${status}` : "Network connection interrupted");
    state.lastFailureReason = cleanReason;
    pushConnectionError({ endpoint, status, reason: cleanReason, durationMs });
    if (status !== 503) {
      // Trigger a controlled verification probe rather than blindly flipping offline
      if (state.centralEngineStatus === "ONLINE") {
        state.centralEngineStatus = "RECONNECTING";
        state.overallStatus = "RECONNECTING";
      }
      emitChange();
      if (!probeInFlight) {
        setTimeout(() => probeCentralEngineHealth({ reason: "api_disconnect_verify" }), 600);
      }
    } else {
      emitChange();
    }
  }
}

export function getConnectionSnapshot() {
  return {
    frontendStatus: state.frontendStatus,
    centralEngineStatus: state.centralEngineStatus,
    databaseStatus: state.databaseStatus,
    databaseMode: state.databaseMode,
    databaseSummary: state.databaseSummary,
    overallStatus: state.overallStatus,
    apiResponseTimeMs: state.apiResponseTimeMs,
    avgApiResponseTimeMs: state.avgApiResponseTimeMs,
    databaseLatencyMs: state.databaseLatencyMs,
    lastSuccessfulConnectionAt: state.lastSuccessfulConnectionAt,
    lastProbeAt: state.lastProbeAt,
    lastFailureReason: state.lastFailureReason,
    serverUptimeSeconds: state.serverUptimeSeconds,
    consecutiveFailures: state.consecutiveFailures,
    nextRetryDelayMs: state.nextRetryDelayMs,
    recentConnectionErrors: [...state.recentConnectionErrors],
    isConfirmedOffline: state.frontendStatus === "OFFLINE" || state.centralEngineStatus === "OFFLINE"
  };
}

export function startConnectionMonitor() {
  if (started || typeof window === "undefined") return;
  started = true;

  window.addEventListener("online", () => {
    state.frontendStatus = "ONLINE";
    if (state.centralEngineStatus === "OFFLINE") {
      state.centralEngineStatus = "RECONNECTING";
      state.overallStatus = "RECONNECTING";
    }
    emitChange();
    probeCentralEngineHealth({ reason: "browser_online" });
  });

  window.addEventListener("offline", () => {
    state.frontendStatus = "OFFLINE";
    state.centralEngineStatus = "OFFLINE";
    state.overallStatus = "OFFLINE";
    state.lastFailureReason = "Browser went offline.";
    pushConnectionError({ endpoint: "navigator", status: 0, reason: "Browser went offline" });
    emitChange();
  });

  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        const lastOkMs = state.lastSuccessfulConnectionAt ? new Date(state.lastSuccessfulConnectionAt).getTime() : 0;
        if (!lastOkMs || Date.now() - lastOkMs > 20000 || state.centralEngineStatus !== "ONLINE") {
          probeCentralEngineHealth({ reason: "tab_focus" });
        }
      }
    });
  }

  probeCentralEngineHealth({ reason: "startup" });
}

export function subscribeConnectionMonitor(callback) {
  if (typeof callback !== "function") return () => { };
  startConnectionMonitor();
  listeners.add(callback);
  callback(getConnectionSnapshot());
  return () => {
    listeners.delete(callback);
  };
}

export default {
  startConnectionMonitor,
  subscribeConnectionMonitor,
  probeCentralEngineHealth,
  recordApiResult,
  getConnectionSnapshot
};
