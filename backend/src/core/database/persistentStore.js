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
  } catch (_) { }
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
        deletedTenantLockouts: [],
        permanentlyDeletedIds: [],
        enterpriseLicenses: [],
        headmasterMessages: [],
        intrusionViolations: [],
        staffBreachTrials: [],
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
    if (!Array.isArray(parsed.deletedTenantLockouts)) parsed.deletedTenantLockouts = [];
    if (!Array.isArray(parsed.permanentlyDeletedIds)) parsed.permanentlyDeletedIds = [];
    if (!Array.isArray(parsed.enterpriseLicenses)) parsed.enterpriseLicenses = [];
    if (!Array.isArray(parsed.headmasterMessages)) parsed.headmasterMessages = [];
    if (!Array.isArray(parsed.intrusionViolations)) parsed.intrusionViolations = [];
    if (!Array.isArray(parsed.staffBreachTrials)) parsed.staffBreachTrials = [];
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
      deletedTenantArchives: [],
      deletedTenantLockouts: [],
      permanentlyDeletedIds: [],
      enterpriseLicenses: [],
      headmasterMessages: [],
      intrusionViolations: [],
      staffBreachTrials: [],
      usedTrialInstitutions: [],
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

function addPermanentlyDeletedIds(ids) {
  const list = Array.isArray(ids) ? ids : [ids];
  const normalized = list
    .filter((id) => id !== undefined && id !== null && String(id).trim() !== '')
    .map((id) => String(id).trim());
  if (normalized.length === 0) return;
  writePersistentStore((current) => {
    const set = new Set(Array.isArray(current.permanentlyDeletedIds) ? current.permanentlyDeletedIds.map(String) : []);
    normalized.forEach((id) => set.add(id));
    return {
      ...current,
      permanentlyDeletedIds: Array.from(set)
    };
  });
}

function isPermanentlyDeleted(id) {
  if (id === undefined || id === null) return false;
  const target = String(id).trim();
  if (!target) return false;
  const store = readPersistentStore();
  const list = Array.isArray(store.permanentlyDeletedIds) ? store.permanentlyDeletedIds : [];
  return list.some((item) => String(item).trim() === target);
}

function addDeletedTenantLockout(lockoutEntry) {
  if (!lockoutEntry || typeof lockoutEntry !== 'object') return;
  writePersistentStore((current) => {
    const lockouts = Array.isArray(current.deletedTenantLockouts) ? [...current.deletedTenantLockouts] : [];
    const targetId = String(lockoutEntry.id || lockoutEntry.tenantId || '').trim().toLowerCase();
    const targetCode = String(lockoutEntry.code || lockoutEntry.tenantCode || '').trim().toLowerCase();
    const targetEmail = String(lockoutEntry.email || lockoutEntry.adminEmail || '').trim().toLowerCase();
    const exists = lockouts.some((l) => {
      const lId = String(l.id || l.tenantId || '').trim().toLowerCase();
      const lCode = String(l.code || l.tenantCode || '').trim().toLowerCase();
      const lEmail = String(l.email || l.adminEmail || '').trim().toLowerCase();
      return (targetId && lId === targetId) || (targetCode && lCode === targetCode) || (targetEmail && lEmail === targetEmail);
    });
    if (!exists) {
      lockouts.unshift({
        ...lockoutEntry,
        lockedAt: lockoutEntry.lockedAt || new Date().toISOString(),
        permanentAccessDenied: true
      });
    }
    const deletedIds = new Set(Array.isArray(current.permanentlyDeletedIds) ? current.permanentlyDeletedIds.map(String) : []);
    if (lockoutEntry.id) deletedIds.add(`Tenant:${lockoutEntry.id}`);
    if (lockoutEntry.tenantId) deletedIds.add(`Tenant:${lockoutEntry.tenantId}`);
    if (lockoutEntry.code) deletedIds.add(String(lockoutEntry.code));
    if (lockoutEntry.email) deletedIds.add(String(lockoutEntry.email).toLowerCase());
    if (lockoutEntry.adminEmail) deletedIds.add(String(lockoutEntry.adminEmail).toLowerCase());
    return {
      ...current,
      deletedTenantLockouts: lockouts,
      permanentlyDeletedIds: Array.from(deletedIds)
    };
  });
}

function isTenantLockedOut(criteria = {}) {
  if (!criteria || typeof criteria !== 'object') return false;
  const store = readPersistentStore();
  const lockouts = [
    ...(Array.isArray(store.deletedTenantLockouts) ? store.deletedTenantLockouts : []),
    ...(Array.isArray(store.deletedTenantArchives) ? store.deletedTenantArchives : [])
  ];
  const deletedIds = new Set(Array.isArray(store.permanentlyDeletedIds) ? store.permanentlyDeletedIds.map((x) => String(x).toLowerCase()) : []);

  const cId = String(criteria.id || criteria.tenantId || '').trim().toLowerCase();
  const cCode = String(criteria.code || criteria.tenantCode || '').trim().toLowerCase();
  const cName = String(criteria.name || criteria.schoolName || '').trim().toLowerCase();
  const cEmail = String(criteria.email || criteria.adminEmail || '').trim().toLowerCase();

  // Never lock out the primary demo sovereign tenant ID 1 unless explicitly deleted by exact email
  if ((cId === '1' || cCode === 'gbs-accra-01') && lockouts.length === 0) {
    return false;
  }

  if (cId && cId !== '1' && deletedIds.has(`tenant:${cId}`)) return true;
  if (cCode && deletedIds.has(cCode)) return true;
  if (cEmail && deletedIds.has(cEmail)) return true;

  return lockouts.some((l) => {
    const lId = String(l.id || l.tenantId || '').trim().toLowerCase();
    const lCode = String(l.code || l.tenantCode || '').trim().toLowerCase();
    const lName = String(l.name || l.schoolName || '').trim().toLowerCase();
    const lEmail = String(l.email || l.adminEmail || '').trim().toLowerCase();

    if (cCode && lCode) {
      if (cCode === lCode) return true;
      // If both have distinct tenant codes, do not match on a recycled numeric ID
      if (cEmail && lEmail && cEmail === lEmail) return true;
      return false;
    }

    if (cId && lId && cId === lId) return true;
    if (cName && lName && cName.length > 3 && cName === lName) return true;
    if (cEmail && lEmail && cEmail === lEmail) return true;
    return false;
  });
}

function removeDeletedTenantLockout(criteria = {}) {
  if (!criteria || typeof criteria !== 'object') return;
  const cId = String(criteria.id || criteria.tenantId || '').trim().toLowerCase();
  const cCode = String(criteria.code || criteria.tenantCode || '').trim().toLowerCase();
  const cName = String(criteria.name || criteria.schoolName || criteria.institutionName || '').trim().toLowerCase();
  const cEmail = String(criteria.email || criteria.adminEmail || criteria.officialEmail || '').trim().toLowerCase();

  writePersistentStore((current) => {
    const matches = (l) => {
      const lId = String(l.id || l.tenantId || '').trim().toLowerCase();
      const lCode = String(l.code || l.tenantCode || '').trim().toLowerCase();
      const lName = String(l.name || l.schoolName || l.tenantName || '').trim().toLowerCase();
      const lEmail = String(l.email || l.adminEmail || l.headmasterEmail || '').trim().toLowerCase();
      return (
        (cId && lId && cId === lId) ||
        (cCode && lCode && cCode === lCode) ||
        (cName && lName && cName.length > 3 && cName === lName) ||
        (cEmail && lEmail && cEmail === lEmail)
      );
    };

    const lockouts = Array.isArray(current.deletedTenantLockouts)
      ? current.deletedTenantLockouts.filter((l) => !matches(l))
      : [];
    const archives = Array.isArray(current.deletedTenantArchives)
      ? current.deletedTenantArchives.filter((a) => !matches(a))
      : [];
    const deletedIds = Array.isArray(current.permanentlyDeletedIds)
      ? current.permanentlyDeletedIds.filter((x) => {
          const val = String(x).trim().toLowerCase();
          if (cId && (val === cId || val === `tenant:${cId}`)) return false;
          if (cCode && val === cCode) return false;
          if (cName && val === cName) return false;
          if (cEmail && val === cEmail) return false;
          return true;
        })
      : [];

    return {
      ...current,
      deletedTenantLockouts: lockouts,
      deletedTenantArchives: archives,
      permanentlyDeletedIds: deletedIds
    };
  });
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
        } catch { }
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
  addPermanentlyDeletedIds,
  isPermanentlyDeleted,
  addDeletedTenantLockout,
  removeDeletedTenantLockout,
  isTenantLockedOut,
  checkPostgresReachable,
  tagRecordMetadata,
  getActiveEnvironment,
  createDatabaseBackup,
  listDatabaseBackups,
  restoreDatabaseBackup,
  STORE_FILE,
  BACKUPS_DIR
};
