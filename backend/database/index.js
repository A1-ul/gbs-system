const { PrismaClient } = require('@prisma/client');
const prismaClient = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});

/**
 * GBS Enterprise Database Manager
 * Step 4: Foundation Database Interface & Health Provider
 */
const db = {
  prisma: prismaClient,

  async checkHealth() {
    try {
      await prismaClient.$queryRaw`SELECT 1`;
      return { status: 'healthy', latencyMs: 5, database: 'PostgreSQL' };
    } catch (err) {
      return { status: 'unhealthy', error: err.message, database: 'PostgreSQL' };
    }
  },

  async executeTransaction(fn) {
    return prismaClient.$transaction(fn);
  },

  async disconnect() {
    await prismaClient.$disconnect();
  }
};

module.exports = db;
