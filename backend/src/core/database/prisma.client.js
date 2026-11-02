const { PrismaClient } = require('@prisma/client');
const { checkPostgresReachable } = require('./persistentStore');

let cachedPgOnline = null;
let lastPgCheckAt = 0;

const isPostgresOnline = async () => {
  const now = Date.now();
  if (cachedPgOnline !== null && now - lastPgCheckAt < 2500) {
    return cachedPgOnline;
  }
  cachedPgOnline = await checkPostgresReachable(250);
  lastPgCheckAt = Date.now();
  return cachedPgOnline;
};

const createResilientPrismaClient = () => {
  const client = new PrismaClient({ log: [] });

  if (typeof client.$use === 'function') {
    client.$use(async (params, next) => {
      const online = await isPostgresOnline();
      if (!online) {
        const err = new Error('PostgreSQL offline — persistent JSON store active');
        err.code = 'P1001_RESILIENT';
        throw err;
      }
      return next(params);
    });
  }

  const origExecuteRawUnsafe = client.$executeRawUnsafe.bind(client);
  client.$executeRawUnsafe = async (...args) => {
    const online = await isPostgresOnline();
    if (!online) return 0;
    return origExecuteRawUnsafe(...args);
  };

  return client;
};

let prisma;

if (process.env.NODE_ENV === 'production') {
  prisma = createResilientPrismaClient();
} else {
  if (!global.__prisma) {
    global.__prisma = createResilientPrismaClient();
  }
  prisma = global.__prisma;
}

module.exports = prisma;
