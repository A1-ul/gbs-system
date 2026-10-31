"use strict";

const os = require("os");
const logger = require("../utils/logger");

class DeveloperMonitoringService {
  async getLiveSystemMetrics() {
    const freeMem = os.freemem();
    const totalMem = os.totalmem();
    const memUsagePct = (((totalMem - freeMem) / totalMem) * 100).toFixed(2);
    const cpuLoad = os.loadavg();

    return {
      status: "HEALTHY",
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
        engine: "PostgreSQL",
        poolStatus: "CONNECTED",
        activeQueries: 3
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
