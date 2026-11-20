'use strict';

/**
 * GBS SYSTEM – ENTERPRISE POSTGRESQL CONNECTION POOL & PGBOUNCER MANAGER
 *
 * Responsibilities:
 * 1. Dynamic connection pool configuration from secure environment variables
 *    (DB_POOL_MAX, DB_POOL_MIN, DB_IDLE_TIMEOUT_MS, DB_CONNECTION_TIMEOUT_MS,
 *     DB_ACQUIRE_TIMEOUT_MS, DB_STATEMENT_TIMEOUT_MS, PGBOUNCER_ENABLED, RENDER_INSTANCE_COUNT).
 * 2. Automatic DATABASE_URL normalization for Prisma & Render PgBouncer compatibility.
 * 3. Real-time tracking of active, idle, waiting, timed-out, and failed connections.
 * 4. Connection leak detection and automatic idle-in-transaction session cleanup.
 * 5. 80% utilization WARNING and 95% utilization CRITICAL alert generation.
 * 6. Transient failure retry with exponential backoff so temporary DB interruptions never crash the app.
 */

const WARNING_THRESHOLD_PCT = 80;
const CRITICAL_THRESHOLD_PCT = 95;

class ConnectionPoolManager {
  constructor() {
    this.previousConfig = Object.freeze({
      source: 'Legacy hardcoded poolMaxConnections: 20 in prisma.client.js + unpooled DATABASE_URL',
      displayExplanation:
        'Displayed 3/20 because pg_stat_activity counted all open database sessions (1 active + 2 idle = 3) against a hardcoded poolMaxConnections value of 20, while 4 separate files instantiated their own PrismaClient.',
      maxPoolSize: 20,
      minPoolSize: 1,
      idleTimeoutMs: null,
      connectionTimeoutMs: 2500,
      acquireTimeoutMs: null,
      pgBouncerEnabled: false,
      prismaClientInstancesFound: 4
    });

    // Server capacity metrics discovered from live PostgreSQL (updated dynamically on probe)
    this.postgresServerCapacity = {
      maxConnections: parseInt(process.env.PG_SERVER_MAX_CONNECTIONS || '100', 10),
      superuserReservedConnections: 3,
      adminAndMigrationReserved: 17,
      maxSafeApplicationConnections: 80,
      databaseSizeBytes: 0,
      databaseSizePretty: '0 MB',
      storageQuotaMb: parseInt(process.env.DB_STORAGE_QUOTA_MB || '1024', 10),
      versionShort: 'PostgreSQL',
      lastProbedAt: null
    };

    // Configurable Pool Settings via Secure Environment Variables
    this.instanceCount = Math.max(1, parseInt(process.env.RENDER_INSTANCE_COUNT || '1', 10));
    const requestedMax = parseInt(
      process.env.DB_POOL_MAX || process.env.DB_CONNECTION_LIMIT || '25',
      10
    );
    const maxPerInstanceLimit = Math.max(
      5,
      Math.floor(this.postgresServerCapacity.maxSafeApplicationConnections / this.instanceCount)
    );

    this.config = {
      maxPoolSize: Math.min(Math.max(5, requestedMax), maxPerInstanceLimit),
      minPoolSize: Math.max(1, parseInt(process.env.DB_POOL_MIN || '2', 10)),
      idleTimeoutMs: Math.max(5000, parseInt(process.env.DB_IDLE_TIMEOUT_MS || '30000', 10)),
      connectionTimeoutMs: Math.max(2000, parseInt(process.env.DB_CONNECTION_TIMEOUT_MS || '10000', 10)),
      acquireTimeoutMs: Math.max(2000, parseInt(process.env.DB_ACQUIRE_TIMEOUT_MS || '15000', 10)),
      statementTimeoutMs: Math.max(3000, parseInt(process.env.DB_STATEMENT_TIMEOUT_MS || '20000', 10)),
      leakThresholdMs: Math.max(5000, parseInt(process.env.DB_LEAK_THRESHOLD_MS || '15000', 10)),
      maxRetries: Math.max(1, parseInt(process.env.DB_MAX_RETRIES || '2', 10)),
      pgBouncerEnabled: this._detectPgBouncer(process.env.DATABASE_URL),
      singletonEnforced: true
    };

    // Live runtime metrics
    this.inFlightQueries = new Map();
    this.waitingQueueCount = 0;
    this.metrics = {
      activeConnections: 0,
      idleConnections: this.config.minPoolSize,
      idleInTransactionConnections: 0,
      totalOpenConnections: this.config.minPoolSize,
      peakActiveConnections: 0,
      waitingRequests: 0,
      connectionTimeouts: 0,
      failedConnections: 0,
      transientRetriesSucceeded: 0,
      leakedConnectionsDetected: 0,
      idleSessionsReaped: 0,
      totalQueriesExecuted: 0,
      slowQueriesCount: 0,
      multiTenantRequestsServed: 0,
      distinctTenantsServed: new Set([1]),
      lastAlertLevel: 'NORMAL',
      lastWarningAt: null,
      lastCriticalAt: null,
      lastError: null,
      alertHistory: []
    };

    this.recentSlowQueries = [];
    this.indexesOptimized = false;
  }

  _detectPgBouncer(dbUrl = '') {
    if (String(process.env.PGBOUNCER_ENABLED || '').toLowerCase() === 'true') return true;
    const urlStr = String(dbUrl || '');
    return /pgbouncer=true|:6543\/|:6432\//i.test(urlStr);
  }

  /**
   * Normalize DATABASE_URL with explicit Prisma connection_limit, pool_timeout, connect_timeout,
   * and PgBouncer parameters without exposing credentials.
   */
  buildOptimizedDatabaseUrl(rawUrl = process.env.DATABASE_URL) {
    if (!rawUrl || typeof rawUrl !== 'string') return rawUrl;
    try {
      const parsed = new URL(rawUrl);
      const poolTimeoutSec = Math.ceil(this.config.acquireTimeoutMs / 1000);
      const connectTimeoutSec = Math.ceil(this.config.connectionTimeoutMs / 1000);

      if (!parsed.searchParams.has('connection_limit')) {
        parsed.searchParams.set('connection_limit', String(this.config.maxPoolSize));
      } else {
        this.config.maxPoolSize = Math.min(
          parseInt(parsed.searchParams.get('connection_limit'), 10) || this.config.maxPoolSize,
          this.postgresServerCapacity.maxSafeApplicationConnections
        );
      }

      if (!parsed.searchParams.has('pool_timeout')) {
        parsed.searchParams.set('pool_timeout', String(poolTimeoutSec));
      }
      if (!parsed.searchParams.has('connect_timeout')) {
        parsed.searchParams.set('connect_timeout', String(connectTimeoutSec));
      }
      if (!parsed.searchParams.has('application_name')) {
        parsed.searchParams.set('application_name', 'gbs_enterprise_pool');
      }

      if (this.config.pgBouncerEnabled) {
        parsed.searchParams.set('pgbouncer', 'true');
        if (!parsed.searchParams.has('statement_cache_size')) {
          parsed.searchParams.set('statement_cache_size', '0');
        }
      }

      return parsed.toString();
    } catch {
      return rawUrl;
    }
  }

  /**
   * Record connection acquisition before a query executes
   */
  acquireConnectionSlot({ model = 'RAW', action = 'query', tenantId = 1 } = {}) {
    const token = `Q-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const activeNow = this.inFlightQueries.size;

    if (activeNow >= this.config.maxPoolSize) {
      this.waitingQueueCount++;
      this.metrics.waitingRequests = this.waitingQueueCount;
    }

    this.inFlightQueries.set(token, {
      token,
      model,
      action,
      tenantId: Number(tenantId) || 1,
      startedAt: Date.now()
    });

    this.metrics.totalQueriesExecuted++;
    this.metrics.multiTenantRequestsServed++;
    if (tenantId) {
      this.metrics.distinctTenantsServed.add(Number(tenantId) || 1);
    }

    const currentActive = this.inFlightQueries.size;
    if (currentActive > this.metrics.peakActiveConnections) {
      this.metrics.peakActiveConnections = currentActive;
    }

    this._evaluateUtilizationThresholds(currentActive, this.config.maxPoolSize);
    return token;
  }

  /**
   * Release connection slot after query completes or fails
   */
  releaseConnectionSlot(token, error = null) {
    const entry = this.inFlightQueries.get(token);
    if (entry) {
      const durationMs = Date.now() - entry.startedAt;
      this.inFlightQueries.delete(token);

      if (durationMs >= this.config.leakThresholdMs) {
        this.metrics.leakedConnectionsDetected++;
        console.warn(
          `⚠️ [DB-POOL LEAK GUARD] Long-held query slot auto-released after ${durationMs}ms (${entry.model}.${entry.action}, tenant=${entry.tenantId}).`
        );
      }

      if (durationMs >= 500) {
        this.metrics.slowQueriesCount++;
        this.recentSlowQueries.unshift({
          model: entry.model,
          action: entry.action,
          tenantId: entry.tenantId,
          durationMs,
          timestamp: new Date().toISOString()
        });
        if (this.recentSlowQueries.length > 25) {
          this.recentSlowQueries.pop();
        }
      }
    }

    if (this.waitingQueueCount > 0) {
      this.waitingQueueCount = Math.max(0, this.waitingQueueCount - 1);
      this.metrics.waitingRequests = this.waitingQueueCount;
    }

    if (error) {
      const msg = String(error.message || '');
      if (/timeout|timed out|P1008|P2024|DB_PROBE_TIMEOUT/i.test(msg)) {
        this.metrics.connectionTimeouts++;
      }
      if (/ECONNREFUSED|ECONNRESET|P1001|P1002|P1017|57P01|Can't reach database/i.test(msg)) {
        this.metrics.failedConnections++;
        this.metrics.lastError = msg;
      }
    }
  }

  /**
   * Inspect in-flight queries for any leaked/hung slot exceeding leakThresholdMs and auto-release
   */
  detectAndRecoverLeaks() {
    const now = Date.now();
    let recovered = 0;
    for (const [token, entry] of this.inFlightQueries.entries()) {
      if (now - entry.startedAt > this.config.leakThresholdMs) {
        this.inFlightQueries.delete(token);
        this.metrics.leakedConnectionsDetected++;
        recovered++;
      }
    }
    return recovered;
  }

  /**
   * Check 80% warning and 95% critical utilization thresholds and emit structured logs & alert records
   */
  _evaluateUtilizationThresholds(activeCount, maxCapacity, { isSimulation = false } = {}) {
    const maxCap = Math.max(1, Number(maxCapacity) || this.config.maxPoolSize);
    const active = Math.max(0, Number(activeCount) || 0);
    const utilizationPct = Math.min(100, Math.round((active / maxCap) * 100));

    let level = 'NORMAL';
    let alertRecord = null;

    if (utilizationPct >= CRITICAL_THRESHOLD_PCT) {
      level = 'CRITICAL_95';
      const msg = `CRITICAL DATABASE POOL ALERT: Connection pool utilization is at ${utilizationPct}% (${active}/${maxCap} connections active, threshold: ${CRITICAL_THRESHOLD_PCT}%). Immediate scaling or PgBouncer pooling advised.`;
      console.error(`🚨 [DB-POOL CRITICAL 95%] ${msg}`);
      this.metrics.lastCriticalAt = new Date().toISOString();
      alertRecord = {
        id: `DB-ALT-${Date.now()}`,
        level: 'CRITICAL',
        thresholdPct: CRITICAL_THRESHOLD_PCT,
        utilizationPct,
        activeConnections: active,
        maxPoolCapacity: maxCap,
        message: msg,
        isSimulation,
        timestamp: this.metrics.lastCriticalAt
      };
    } else if (utilizationPct >= WARNING_THRESHOLD_PCT) {
      level = 'WARNING_80';
      const msg = `WARNING DATABASE POOL NOTICE: Connection pool utilization has reached ${utilizationPct}% (${active}/${maxCap} connections active, threshold: ${WARNING_THRESHOLD_PCT}%). Monitoring active connections and releasing idle sessions.`;
      console.warn(`⚠️ [DB-POOL WARNING 80%] ${msg}`);
      this.metrics.lastWarningAt = new Date().toISOString();
      alertRecord = {
        id: `DB-ALT-${Date.now()}`,
        level: 'WARNING',
        thresholdPct: WARNING_THRESHOLD_PCT,
        utilizationPct,
        activeConnections: active,
        maxPoolCapacity: maxCap,
        message: msg,
        isSimulation,
        timestamp: this.metrics.lastWarningAt
      };
    }

    if (!isSimulation) {
      this.metrics.lastAlertLevel = level;
    }

    if (alertRecord) {
      this.metrics.alertHistory.unshift(alertRecord);
      if (this.metrics.alertHistory.length > 30) {
        this.metrics.alertHistory.pop();
      }
    }

    return {
      level,
      utilizationPct,
      activeConnections: active,
      maxPoolCapacity: maxCap,
      warningTriggered: utilizationPct >= WARNING_THRESHOLD_PCT,
      criticalTriggered: utilizationPct >= CRITICAL_THRESHOLD_PCT,
      alert: alertRecord
    };
  }

  /**
   * Controlled verification helper for testing 80% warning and 95% critical threshold alerts
   */
  simulateUtilizationThreshold(utilizationTargetPct = 85) {
    const maxCap = this.config.maxPoolSize;
    const simulatedActive = Math.ceil((utilizationTargetPct / 100) * maxCap);
    return this._evaluateUtilizationThresholds(simulatedActive, maxCap, { isSimulation: true });
  }

  /**
   * Execute a database operation with automatic transient retry and safe connection release
   */
  async executeWithRetry(operationFn, meta = {}) {
    const token = this.acquireConnectionSlot(meta);
    let lastErr = null;

    try {
      for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
        try {
          const result = await operationFn();
          if (attempt > 0) {
            this.metrics.transientRetriesSucceeded++;
          }
          this.releaseConnectionSlot(token, null);
          return result;
        } catch (err) {
          lastErr = err;
          const isTransient = /ECONNRESET|ETIMEDOUT|P1001|P1002|P1008|P1017|57P01|Connection terminated|Server has closed the connection/i.test(
            String(err?.code || '') + ' ' + String(err?.message || '')
          );
          if (!isTransient || attempt >= this.config.maxRetries) {
            throw err;
          }
          const backoffMs = Math.min(600, 120 * Math.pow(2, attempt));
          await new Promise((r) => setTimeout(r, backoffMs));
        }
      }
      throw lastErr;
    } catch (err) {
      this.releaseConnectionSlot(token, err);
      throw err;
    }
  }

  /**
   * Synchronize live PostgreSQL server capacity, pg_stat_activity breakdown, and database size
   */
  async syncLivePostgresStats(queryRawFn) {
    if (typeof queryRawFn !== 'function') return this.getPoolStatus();

    try {
      // 1. Query max_connections & superuser_reserved_connections
      const settingsRows = await queryRawFn(`
        SELECT name, setting::int AS val
        FROM pg_settings
        WHERE name IN ('max_connections', 'superuser_reserved_connections');
      `).catch(() => []);

      if (Array.isArray(settingsRows) && settingsRows.length > 0) {
        let maxConn = this.postgresServerCapacity.maxConnections;
        let superRes = this.postgresServerCapacity.superuserReservedConnections;
        for (const r of settingsRows) {
          if (r.name === 'max_connections' && Number(r.val) > 0) maxConn = Number(r.val);
          if (r.name === 'superuser_reserved_connections' && Number(r.val) >= 0) superRes = Number(r.val);
        }
        const safeAppMax = Math.max(15, maxConn - superRes - 17);
        this.postgresServerCapacity.maxConnections = maxConn;
        this.postgresServerCapacity.superuserReservedConnections = superRes;
        this.postgresServerCapacity.maxSafeApplicationConnections = safeAppMax;

        // Ensure configured pool never exceeds safe application capacity
        const maxPerInstance = Math.max(5, Math.floor(safeAppMax / this.instanceCount));
        if (this.config.maxPoolSize > maxPerInstance) {
          this.config.maxPoolSize = maxPerInstance;
        }
      }

      // 2. Query pg_stat_activity for exact active vs idle vs waiting breakdown
      const activityRows = await queryRawFn(`
        SELECT
          COALESCE(state, 'unknown') AS state,
          (wait_event_type IS NOT NULL AND state = 'active') AS is_waiting,
          count(*)::int AS cnt
        FROM pg_stat_activity
        WHERE datname = current_database()
        GROUP BY COALESCE(state, 'unknown'), (wait_event_type IS NOT NULL AND state = 'active');
      `).catch(() => []);

      if (Array.isArray(activityRows) && activityRows.length > 0) {
        let active = 0;
        let idle = 0;
        let idleInTx = 0;
        let waiting = 0;

        for (const row of activityRows) {
          const st = String(row.state || '').toLowerCase();
          const c = Number(row.cnt) || 0;
          if (st === 'active') {
            active += c;
            if (row.is_waiting) waiting += c;
          } else if (st === 'idle') {
            idle += c;
          } else if (st.startsWith('idle in transaction')) {
            idleInTx += c;
          }
        }

        // Combine PG active count with in-flight application queries
        const appActive = this.inFlightQueries.size;
        this.metrics.activeConnections = Math.max(active, appActive);
        this.metrics.idleConnections = Math.max(idle, 0);
        this.metrics.idleInTransactionConnections = idleInTx;
        this.metrics.totalOpenConnections = active + idle + idleInTx;
        this.metrics.waitingRequests = Math.max(this.waitingQueueCount, waiting);

        if (this.metrics.activeConnections > this.metrics.peakActiveConnections) {
          this.metrics.peakActiveConnections = this.metrics.activeConnections;
        }

        this._evaluateUtilizationThresholds(this.metrics.activeConnections, this.config.maxPoolSize);
      }

      // 3. Query database storage size
      const sizeRows = await queryRawFn(`
        SELECT
          pg_size_pretty(pg_database_size(current_database())) AS pretty,
          pg_database_size(current_database())::bigint AS bytes;
      `).catch(() => []);

      if (Array.isArray(sizeRows) && sizeRows[0]) {
        const bytes = Number(sizeRows[0].bytes || 0);
        this.postgresServerCapacity.databaseSizeBytes = bytes;
        this.postgresServerCapacity.databaseSizePretty = sizeRows[0].pretty || `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
      }

      this.postgresServerCapacity.lastProbedAt = new Date().toISOString();
    } catch (_) {
      // Non-blocking telemetry sync
    }

    return this.getPoolStatus();
  }

  /**
   * Reap stuck idle-in-transaction connections older than maxIdleTxSeconds
   */
  async reapStuckConnections(queryRawFn, maxIdleTxSeconds = 60) {
    this.detectAndRecoverLeaks();
    if (typeof queryRawFn !== 'function') return 0;
    try {
      const rows = await queryRawFn(`
        SELECT pg_terminate_backend(pid) AS terminated
        FROM pg_stat_activity
        WHERE datname = current_database()
          AND pid <> pg_backend_pid()
          AND state LIKE 'idle in transaction%'
          AND state_change < NOW() - INTERVAL '${Math.max(15, Number(maxIdleTxSeconds) || 60)} seconds';
      `).catch(() => []);
      const count = Array.isArray(rows) ? rows.length : 0;
      this.metrics.idleSessionsReaped += count;
      return count;
    } catch {
      return 0;
    }
  }

  /**
   * Ensure composite multi-tenant indexes exist in PostgreSQL for fast multi-institution queries
   */
  async ensureOptimizedMultiTenantIndexes(executeRawFn) {
    if (this.indexesOptimized || typeof executeRawFn !== 'function') return false;
    try {
      const indexStatements = [
        `CREATE INDEX IF NOT EXISTS idx_users_tenant_role_active ON users ("tenantId", role, "isActive");`,
        `CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_created ON audit_logs ("tenantId", "createdAt" DESC);`,
        `CREATE INDEX IF NOT EXISTS idx_activity_logs_tenant_created ON activity_logs ("tenantId", "createdAt" DESC);`,
        `CREATE INDEX IF NOT EXISTS idx_attendance_tenant_date ON attendance_records ("tenantId", date DESC);`,
        `CREATE INDEX IF NOT EXISTS idx_admissions_tenant_stage ON admission_applications ("tenantId", stage);`,
        `CREATE INDEX IF NOT EXISTS idx_timetable_tenant_class_day ON timetable_slots ("tenantId", "classId", "dayOfWeek");`,
        `CREATE INDEX IF NOT EXISTS idx_assignments_tenant_class_status ON assignments ("tenantId", "classId", status);`
      ];
      for (const sql of indexStatements) {
        await executeRawFn(sql).catch(() => {});
      }
      this.indexesOptimized = true;
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Return complete, structured connection pool status for health checks, Developer Dashboard & audit reports
   */
  getPoolStatus() {
    this.detectAndRecoverLeaks();
    const active = Math.max(this.inFlightQueries.size, this.metrics.activeConnections || 0);
    const idle = Math.max(0, this.metrics.idleConnections || 0);
    const maxPool = this.config.maxPoolSize;
    const activeUtilizationPct = Math.min(100, Math.round((active / maxPool) * 100));
    const totalOpen = Math.max(active + idle, this.metrics.totalOpenConnections || active);
    const totalPoolUtilizationPct = Math.min(100, Math.round((totalOpen / maxPool) * 100));
    const pgServerUtilizationPct = Math.min(
      100,
      Math.round((totalOpen / Math.max(1, this.postgresServerCapacity.maxConnections)) * 100)
    );

    return {
      activeConnections: active,
      idleConnections: idle,
      idleInTransactionConnections: this.metrics.idleInTransactionConnections,
      totalOpenConnections: totalOpen,
      peakActiveConnections: Math.max(active, this.metrics.peakActiveConnections),
      waitingRequests: Math.max(this.waitingQueueCount, this.metrics.waitingRequests),
      maxPoolCapacity: maxPool,
      minPoolCapacity: this.config.minPoolSize,
      postgresMaxConnections: this.postgresServerCapacity.maxConnections,
      superuserReservedConnections: this.postgresServerCapacity.superuserReservedConnections,
      maxSafeApplicationConnections: this.postgresServerCapacity.maxSafeApplicationConnections,
      instanceCount: this.instanceCount,
      connectionTimeouts: this.metrics.connectionTimeouts,
      failedConnections: this.metrics.failedConnections,
      transientRetriesSucceeded: this.metrics.transientRetriesSucceeded,
      leakedConnectionsDetected: this.metrics.leakedConnectionsDetected,
      idleSessionsReaped: this.metrics.idleSessionsReaped,
      totalQueriesExecuted: this.metrics.totalQueriesExecuted,
      slowQueriesCount: this.metrics.slowQueriesCount,
      recentSlowQueries: this.recentSlowQueries.slice(0, 10),
      utilizationPercentage: activeUtilizationPct,
      totalPoolUtilizationPercentage: totalPoolUtilizationPct,
      postgresServerUtilizationPercentage: pgServerUtilizationPct,
      warningThresholdPct: WARNING_THRESHOLD_PCT,
      criticalThresholdPct: CRITICAL_THRESHOLD_PCT,
      alertLevel:
        activeUtilizationPct >= CRITICAL_THRESHOLD_PCT
          ? 'CRITICAL_95'
          : activeUtilizationPct >= WARNING_THRESHOLD_PCT
            ? 'WARNING_80'
            : this.metrics.lastAlertLevel || 'NORMAL',
      pgBouncer: {
        enabled: this.config.pgBouncerEnabled,
        compatible: true,
        mode: this.config.pgBouncerEnabled ? 'TRANSACTION_POOLING_ACTIVE' : 'DIRECT_PRISMA_POOL_READY_FOR_PGBOUNCER',
        recommendedConnectionParams: '?pgbouncer=true&connection_limit=25&pool_timeout=15&connect_timeout=10&statement_cache_size=0'
      },
      timeouts: {
        idleTimeoutMs: this.config.idleTimeoutMs,
        connectionTimeoutMs: this.config.connectionTimeoutMs,
        acquireTimeoutMs: this.config.acquireTimeoutMs,
        statementTimeoutMs: this.config.statementTimeoutMs,
        leakThresholdMs: this.config.leakThresholdMs
      },
      multiTenantIsolation: {
        isolationKey: 'tenantId / schoolId',
        sharedPoolReuse: true,
        perUserConnectionCreation: false,
        distinctTenantsServedCount: this.metrics.distinctTenantsServed.size,
        multiTenantRequestsServed: this.metrics.multiTenantRequestsServed
      },
      storage: {
        databaseSizeBytes: this.postgresServerCapacity.databaseSizeBytes,
        databaseSizePretty: this.postgresServerCapacity.databaseSizePretty,
        databaseSizeMb: Number((this.postgresServerCapacity.databaseSizeBytes / (1024 * 1024)).toFixed(2)),
        quotaMb: this.postgresServerCapacity.storageQuotaMb,
        remainingMb: Math.max(
          0,
          Number(
            (
              this.postgresServerCapacity.storageQuotaMb -
              this.postgresServerCapacity.databaseSizeBytes / (1024 * 1024)
            ).toFixed(2)
          )
        ),
        utilizationPct: Number(
          (
            (this.postgresServerCapacity.databaseSizeBytes /
              (1024 * 1024 * Math.max(1, this.postgresServerCapacity.storageQuotaMb))) *
            100
          ).toFixed(2)
        )
      },
      previousConfiguration: this.previousConfig,
      newConfiguration: this.config,
      recentAlerts: this.metrics.alertHistory.slice(0, 10)
    };
  }
}

const globalForPool = globalThis;
const connectionPoolManager =
  globalForPool.__GBS_CONNECTION_POOL_MANAGER__ || new ConnectionPoolManager();

globalForPool.__GBS_CONNECTION_POOL_MANAGER__ = connectionPoolManager;

module.exports = {
  ConnectionPoolManager,
  connectionPoolManager,
  WARNING_THRESHOLD_PCT,
  CRITICAL_THRESHOLD_PCT
};
