import { resolveApiUrl } from "../api/client/apiConfig";

/**
 * GBS Enterprise Offline Engine & Bidirectional Database Synchronization
 * Enables uninterrupted offline usage for all users & developer
 * Saves data mutations locally when disconnected, and automatically flushes and syncs to PostgreSQL database when back online.
 */

class OfflineSyncEngine {
  constructor() {
    this.isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
    this.queueKey = "gbs_offline_mutation_queue";
    this.rejectedKey = "gbs_offline_sync_rejected";
    this.maxQueueSize = 200;
    this.maxRetryAttempts = 5;
    this.syncing = false;
    this.listeners = new Set();

    if (typeof window !== "undefined") {
      window.addEventListener("online", () => this.handleConnectivityChange(true));
      window.addEventListener("offline", () => this.handleConnectivityChange(false));
    }
  }

  handleConnectivityChange(isOnline) {
    this.isOnline = isOnline;
    console.log(`[GBS Offline Sync Engine] Connectivity status changed: ${isOnline ? "ONLINE" : "OFFLINE"}`);

    if (isOnline) {
      this.syncPendingMutations();
    }

    this.notifyListeners();
  }

  notifyListeners() {
    const queue = this.getQueue();
    this.listeners.forEach((callback) => {
      try {
        callback({ isOnline: this.isOnline, pendingCount: queue.length, syncing: this.syncing });
      } catch (e) {
        console.warn("Offline listener error:", e);
      }
    });

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("gbs_network_status_change", {
        detail: { isOnline: this.isOnline, pendingCount: queue.length, syncing: this.syncing }
      }));
    }
  }

  subscribe(callback) {
    this.listeners.add(callback);
    callback({ isOnline: this.isOnline, pendingCount: this.getQueue().length, syncing: this.syncing });
    return () => this.listeners.delete(callback);
  }

  getQueue() {
    try {
      const parsed = JSON.parse(localStorage.getItem(this.queueKey) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  _getAuthToken() {
    try {
      return (
        localStorage.getItem("gbs_access_token") ||
        localStorage.getItem("gbs_token") ||
        localStorage.getItem("gbs_dev_token") ||
        ""
      );
    } catch {
      return "";
    }
  }

  _recordRejected(item, status, reason) {
    try {
      const prev = JSON.parse(localStorage.getItem(this.rejectedKey) || "[]");
      const list = Array.isArray(prev) ? prev : [];
      list.unshift({
        id: item.id,
        endpoint: item.endpoint,
        method: item.method,
        description: item.description,
        status,
        reason: String(reason || "Validation rejected").slice(0, 240),
        failedAt: new Date().toISOString()
      });
      localStorage.setItem(this.rejectedKey, JSON.stringify(list.slice(0, 25)));
    } catch { }
  }

  /**
   * Enqueue a data mutation when offline
   */
  enqueueMutation(endpoint, method, payload, description) {
    const queue = this.getQueue();
    const mutation = {
      id: `MUT-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      endpoint,
      method: String(method || "POST").toUpperCase(),
      payload,
      description: description || `${String(method || "POST").toUpperCase()} ${endpoint}`,
      attempts: 0,
      timestamp: new Date().toISOString()
    };
    queue.push(mutation);
    const bounded = queue.slice(-this.maxQueueSize);
    localStorage.setItem(this.queueKey, JSON.stringify(bounded));
    this.notifyListeners();
    return mutation;
  }

  /**
   * Flush and sync all stored offline mutations to the server safely (single-flight + idempotent)
   */
  async syncPendingMutations() {
    if (this.syncing) {
      return { syncedCount: 0, failedCount: this.getQueue().length, skipped: true };
    }
    const queue = this.getQueue();
    if (queue.length === 0) return { syncedCount: 0, failedCount: 0, droppedCount: 0 };

    this.syncing = true;
    this.notifyListeners();

    let syncedCount = 0;
    let droppedCount = 0;
    const remainingQueue = [];
    const authToken = this._getAuthToken();

    try {
      for (const item of queue) {
        const nextAttempts = Number(item.attempts || 0) + 1;
        try {
          const headers = {
            "Content-Type": "application/json",
            "X-Idempotency-Key": item.id
          };
          if (authToken) {
            headers.Authorization = `Bearer ${authToken}`;
          }

          const response = await fetch(resolveApiUrl(item.endpoint), {
            method: item.method,
            headers,
            body: item.payload !== undefined && item.payload !== null ? JSON.stringify(item.payload) : undefined
          });

          if (response.ok || response.status === 409) {
            syncedCount++;
          } else if (response.status === 400 || response.status === 404 || response.status === 422) {
            droppedCount++;
            this._recordRejected(item, response.status, response.statusText || "Request rejected by server");
          } else if (nextAttempts < this.maxRetryAttempts) {
            remainingQueue.push({ ...item, attempts: nextAttempts });
          } else {
            droppedCount++;
            this._recordRejected(item, response.status, "Maximum retry attempts reached");
          }
        } catch (err) {
          if (nextAttempts < this.maxRetryAttempts) {
            remainingQueue.push({ ...item, attempts: nextAttempts });
          } else {
            droppedCount++;
            this._recordRejected(item, 0, err?.message || "Network error after maximum retries");
          }
        }
      }

      localStorage.setItem(this.queueKey, JSON.stringify(remainingQueue));
    } finally {
      this.syncing = false;
      this.notifyListeners();
    }

    if (typeof window !== "undefined" && (syncedCount > 0 || droppedCount > 0)) {
      window.dispatchEvent(new CustomEvent("gbs_offline_synced", {
        detail: { syncedCount, remaining: remainingQueue.length, droppedCount }
      }));
    }

    return { syncedCount, failedCount: remainingQueue.length, droppedCount };
  }
}

export const offlineSyncEngine = new OfflineSyncEngine();
export const queueOfflineMutation = (endpoint, method, payload, description) => offlineSyncEngine.enqueueMutation(endpoint, method, payload, description);
export const flushOfflineQueue = () => offlineSyncEngine.syncPendingMutations();
