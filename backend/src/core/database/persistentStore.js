'use strict';

const fs = require('fs');
const path = require('path');
const net = require('net');

const DATA_DIR = path.resolve(__dirname, '../../../data');
const BACKUPS_DIR = path.join(DATA_DIR, 'backups');
const STORE_FILE = path.join(DATA_DIR, 'gbs_persistent_store.json');

function ensureDirectories() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(BACKUPS_DIR)) {
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  }
}

function getActiveEnvironment() {
  try {
    if (fs.existsSync(STORE_FILE)) {
      const raw = fs.readFileSync(STORE_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed.systemEnvironment) return parsed.systemEnvironment;
    }
  } catch (_) {}
  return (process.env.GBS_ENVIRONMENT || process.env.NODE_ENV || 'PRODUCTION').toUpperCase();
}

function tagRecordMetadata(record, defaultOrigin = 'GENUINE_PRODUCTION', source = 'LIVE_API') {
  if (!record || typeof record !== 'object') return record;
  const now = new Date().toISOString();
  return {
    ...record,
    environment: record.environment || getActiveEnvironment(),
    origin: record.origin || defaultOrigin,
    source: record.source || source,
    createdAt: record.createdAt || now,
    updatedAt: now
  };
}

function ensureStoreFile() {
  try {
    ensureDirectories();
    if (!fs.existsSync(STORE_FILE)) {
      const initial = {
        systemEnvironment: getActiveEnvironment(),
        institutions: [],
        users: [],
        topicVideos: [],
        subscriptions: [],
        registeredUsers: [],
        deletedTenantArchives: [],
        usedTrialInstitutions: [],
        prismaModels: {},
        rawSqlTables: {},
        updatedAt: new Date().toISOString()
      };
      fs.writeFileSync(STORE_FILE, JSON.stringify(initial, null, 2), 'utf8');
      return initial;
    }
    const raw = fs.readFileSync(STORE_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.topicVideos)) parsed.topicVideos = [];
    if (!Array.isArray(parsed.institutions)) parsed.institutions = [];
    if (!Array.isArray(parsed.users)) parsed.users = [];
    if (!Array.isArray(parsed.subscriptions)) parsed.subscriptions = [];
    if (!Array.isArray(parsed.registeredUsers)) parsed.registeredUsers = [];
    if (!Array.isArray(parsed.deletedTenantArchives)) parsed.deletedTenantArchives = [];
    if (!Array.isArray(parsed.usedTrialInstitutions)) parsed.usedTrialInstitutions = [];
    if (!parsed.prismaModels || typeof parsed.prismaModels !== 'object') parsed.prismaModels = {};
    if (!parsed.rawSqlTables || typeof parsed.rawSqlTables !== 'object') parsed.rawSqlTables = {};
    if (!parsed.systemEnvironment) parsed.systemEnvironment = getActiveEnvironment();
    return parsed;
  } catch (err) {
    return {
      systemEnvironment: getActiveEnvironment(),
      institutions: [],
      users: [],
      topicVideos: [],
      subscriptions: [],
      registeredUsers: [],
      prismaModels: {},
      rawSqlTables: {}
    };
  }
}

function readPersistentStore() {
  return ensureStoreFile();
}

function writePersistentStore(updater) {
  try {
    const current = ensureStoreFile();
    const updated = typeof updater === 'function' ? updater(current) : { ...current, ...updater };
    updated.updatedAt = new Date().toISOString();
    fs.writeFileSync(STORE_FILE, JSON.stringify(updated, null, 2), 'utf8');
    return updated;
  } catch (err) {
    return ensureStoreFile();
  }
}

/**
 * Fast non-throwing TCP socket check to see if PostgreSQL is listening on the configured host & port.
 */
function checkPostgresReachable(timeoutMs = 350) {
  return new Promise((resolve) => {
    const dbUrl = process.env.DATABASE_URL || '';
    if (!dbUrl) {
      return resolve(false);
    }
    let host = 'localhost';
    let port = 5432;
    try {
      const parsed = new URL(dbUrl);
      host = parsed.hostname || 'localhost';
      port = parseInt(parsed.port || '5432', 10);
    } catch {
      // keep defaults
    }

    const socket = new net.Socket();
    let settled = false;
    const finish = (ok) => {
      if (!settled) {
        settled = true;
        try {
          socket.destroy();
        } catch {}
        resolve(ok);
      }
    };

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
    try {
      socket.connect(port, host);
    } catch {
      finish(false);
    }
  });
}

/**
 * Safe Database Backup & Restore Protection Mechanism
 */
function createDatabaseBackup(label = 'manual') {
  ensureDirectories();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const safeLabel = String(label || 'manual').replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `gbs_backup_${timestamp}_${safeLabel}.json`;
  const targetPath = path.join(BACKUPS_DIR, fileName);

  const currentData = readPersistentStore();
  fs.writeFileSync(targetPath, JSON.stringify(currentData, null, 2), 'utf8');

  const stats = fs.statSync(targetPath);
  return {
    fileName,
    filePath: targetPath,
    fileSizeBytes: stats.size,
    fileSizeKb: (stats.size / 1024).toFixed(1),
    environment: currentData.systemEnvironment || 'PRODUCTION',
    totalInstitutions: (currentData.institutions || []).length,
    totalSubscriptions: (currentData.subscriptions || []).length,
    totalUsers: (currentData.users || []).length + (currentData.registeredUsers || []).length,
    timestamp: new Date().toISOString()
  };
}

function listDatabaseBackups() {
  ensureDirectories();
  const files = fs.readdirSync(BACKUPS_DIR);
  return files
    .filter((f) => f.endsWith('.json'))
    .map((fileName) => {
      const fullPath = path.join(BACKUPS_DIR, fileName);
      try {
        const stats = fs.statSync(fullPath);
        return {
          fileName,
          sizeBytes: stats.size,
          sizeKb: (stats.size / 1024).toFixed(1),
          createdAt: stats.birthtime ? stats.birthtime.toISOString() : stats.mtime.toISOString(),
          isAutomatic: fileName.includes('auto') || fileName.includes('snapshot')
        };
      } catch (_) {
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function restoreDatabaseBackup(fileName) {
  ensureDirectories();
  const safeName = path.basename(fileName);
  const backupPath = path.join(BACKUPS_DIR, safeName);
  if (!fs.existsSync(backupPath)) {
    throw new Error(`Backup file '${safeName}' does not exist.`);
  }

  // Pre-restore safety snapshot
  createDatabaseBackup('pre_restore_safety_snapshot');

  const raw = fs.readFileSync(backupPath, 'utf8');
  const parsed = JSON.parse(raw);
  parsed.updatedAt = new Date().toISOString();
  fs.writeFileSync(STORE_FILE, JSON.stringify(parsed, null, 2), 'utf8');

  return {
    restoredFrom: safeName,
    restoredAt: new Date().toISOString(),
    recordsCount: {
      institutions: (parsed.institutions || []).length,
      subscriptions: (parsed.subscriptions || []).length,
      users: (parsed.users || []).length + (parsed.registeredUsers || []).length
    }
  };
}

module.exports = {
  readPersistentStore,
  writePersistentStore,
  checkPostgresReachable,
  tagRecordMetadata,
  getActiveEnvironment,
  createDatabaseBackup,
  listDatabaseBackups,
  restoreDatabaseBackup,
  STORE_FILE,
  BACKUPS_DIR
};
