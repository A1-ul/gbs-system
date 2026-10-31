/**
 * GBS Enterprise Offline Engine & Bidirectional Database Synchronization
 * Enables uninterrupted offline usage for all users & developer
 * Saves data mutations locally when disconnected, and automatically flushes and syncs to PostgreSQL database when back online.
 */

class OfflineSyncEngine {
  constructor() {
    this.isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
    this.queueKey = "gbs_offline_mutation_queue";
    this.listeners = new Set();

    if (typeof window !== "undefined") {
      window.addEventListener("online", () => this.handleConnectivityChange(true));
      window.addEventListener("offline", () => this.handleConnectivityChange(false));
    }
  }

  handleConnectivityChange(isOnline) {
    this.isOnline = isOnline;
    console.log(`[GBS Offline Sync Engine] Connectivity status changed: ${isOnline ? "ONLINE 🟢" : "OFFLINE 🔴"}`);
    
    if (isOnline) {
      this.syncPendingMutations();
    }
    
    this.notifyListeners();
  }

  notifyListeners() {
    const queue = this.getQueue();
    this.listeners.forEach((callback) => {
      try {
        callback({ isOnline: this.isOnline, pendingCount: queue.length });
      } catch (e) {
        console.warn("Offline listener error:", e);
      }
    });

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("gbs_network_status_change", {
        detail: { isOnline: this.isOnline, pendingCount: queue.length }
      }));
    }
  }

  subscribe(callback) {
    this.listeners.add(callback);
    callback({ isOnline: this.isOnline, pendingCount: this.getQueue().length });
    return () => this.listeners.delete(callback);
  }

  getQueue() {
    try {
      return JSON.parse(localStorage.getItem(this.queueKey) || "[]");
    } catch {
      return [];
    }
  }

  /**
   * Enqueue a database mutation when offline
   */
  enqueueMutation(endpoint, method, payload, description) {
    const queue = this.getQueue();
    const mutation = {
      id: `MUT-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      endpoint,
      method: method.toUpperCase(),
      payload,
      description: description || `${method.toUpperCase()} ${endpoint}`,
      timestamp: new Date().toISOString()
    };
    queue.push(mutation);
    localStorage.setItem(this.queueKey, JSON.stringify(queue));
    this.notifyListeners();
    return mutation;
  }

  /**
   * Flush and sync all stored offline mutations to the backend server
   */
  async syncPendingMutations() {
    const queue = this.getQueue();
    if (queue.length === 0) return { syncedCount: 0, failedCount: 0 };

    console.log(`[GBS Offline Sync Engine] Back online! Flusing ${queue.length} pending mutations to PostgreSQL database...`);

    let syncedCount = 0;
    const remainingQueue = [];

    for (const item of queue) {
      try {
        const response = await fetch(item.endpoint, {
          method: item.method,
          headers: {
            "Content-Type": "application/json",
            Authorization: localStorage.getItem("gbs_token") ? `Bearer ${localStorage.getItem("gbs_token")}` : ""
          },
          body: item.payload ? JSON.stringify(item.payload) : undefined
        });

        if (response.ok) {
          syncedCount++;
        } else {
          remainingQueue.push(item);
        }
      } catch (err) {
        remainingQueue.push(item);
      }
    }

    localStorage.setItem(this.queueKey, JSON.stringify(remainingQueue));
    this.notifyListeners();

    if (typeof window !== "undefined" && syncedCount > 0) {
      window.dispatchEvent(new CustomEvent("gbs_offline_synced", {
        detail: { syncedCount, remaining: remainingQueue.length }
      }));
    }

    return { syncedCount, failedCount: remainingQueue.length };
  }
}

export const offlineSyncEngine = new OfflineSyncEngine();
export const queueOfflineMutation = (endpoint, method, payload, description) => offlineSyncEngine.enqueueMutation(endpoint, method, payload, description);
export const flushOfflineQueue = () => offlineSyncEngine.syncPendingMutations();
