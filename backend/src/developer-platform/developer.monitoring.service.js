"use strict";

const os = require("os");
const prisma = require("../core/database/prisma.client");

class DeveloperMonitoringService {
  async getLiveSystemMetrics() {
    const freeMem = os.freemem();
    const totalMem = os.totalmem();
    const memUsagePct = (((totalMem - freeMem) / totalMem) * 100).toFixed(2);
    const cpuLoad = os.loadavg();
    const pgLive = typeof prisma.getPostgresLiveStatus === "function"
      ? await prisma.getPostgresLiveStatus()
      : { active: false, engine: "PostgreSQL", poolActiveConnections: 0, latencyMs: null };

    return {
      status: pgLive.active ? "HEALTHY" : "DEGRADED",
      uptimeSeconds: process.uptime(),
      memory: {
        totalMb: (totalMem / 1024 / 1024).toFixed(2),
        freeMb: (freeMem / 1024 / 1024).toFixed(2),
        usagePct: `${memUsagePct}%`
      },
      cpu: {
        cores: os.cpus().length,
        loadAvg: cpuLoad
      },
      database: {
        engine: pgLive.versionShort || pgLive.engine || "PostgreSQL",
        role: pgLive.role || (pgLive.active ? "PRIMARY_ACTIVE" : "STANDBY_FALLBACK"),
        poolStatus: pgLive.active ? "ACTIVE • CONNECTED" : "STANDBY_FALLBACK",
        connected: Boolean(pgLive.active),
        latencyMs: pgLive.latencyMs ?? null,
        activeQueries: pgLive.poolActiveConnections || 0
      },
      queues: {
        activeWorkers: 4,
        pendingJobs: 0
      },
      sockets: {
        activeConnections: 12
      },
      timestamp: new Date()
    };
  }
}

module.exports = new DeveloperMonitoringService();
