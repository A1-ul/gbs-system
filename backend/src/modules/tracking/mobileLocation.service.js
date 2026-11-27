'use strict';

const crypto = require('crypto');
const { readPersistentStore, writePersistentStore } = require('../../core/database/persistentStore');
const socketServer = require('../../core/socket/socketServer');
const { AppError } = require('../../middleware/error.middleware');

const UNAUTHORIZED_LOCATION_MESSAGE =
  'Location unavailable. The device owner must enable and authorize location sharing.';

const LIVE_THRESHOLD_MS = 2 * 60 * 1000;      // <= 2 min = LIVE
const STALE_THRESHOLD_MS = 15 * 60 * 1000;    // 2..15 min = LAST_KNOWN, > 15 min = STALE
const HISTORY_RETENTION_MS = 24 * 60 * 60 * 1000; // 24-hour retention policy
const MAX_HISTORY_PER_DEVICE = 100;
const MAX_AUDIT_LOGS = 1000;

/**
 * Validates and normalizes international E.164 and Ghanaian mobile numbers (+233 and 0-prefixed).
 * Examples:
 *  - "024 555 0199" -> "+233245550199"
 *  - "+233-54-329-4615" -> "+233543294615"
 *  - "233201234567" -> "+233201234567"
 *  - "+44 7700 900077" -> "+447700900077"
 */
function normalizeMobileNumber(rawInput) {
  const raw = String(rawInput || '').trim();
  if (!raw) {
    return { valid: false, normalized: null, error: 'Please enter a valid mobile number.' };
  }

  // Strip spaces, dashes, parentheses, dots
  let cleaned = raw.replace(/[\s\-().]/g, '');

  // Convert 00 international prefix to +
  if (cleaned.startsWith('00')) {
    cleaned = `+${cleaned.slice(2)}`;
  }

  // Validate only optional leading + followed by digits
  if (!/^\+?\d+$/.test(cleaned)) {
    return {
      valid: false,
      normalized: null,
      error: 'Invalid mobile number format. Use Ghanaian (024XXXXXXX / +233XXXXXXXXX) or international (+CountryCode...) format.'
    };
  }

  // Ghanaian 0-prefixed 10-digit format (e.g. 024..., 054..., 055..., 020..., 026..., 027..., 050..., 059..., 030...)
  if (/^0\d{9}$/.test(cleaned)) {
    return {
      valid: true,
      normalized: `+233${cleaned.slice(1)}`,
      countryCode: 'GH',
      error: null
    };
  }

  // Ghanaian 233 without leading +
  if (/^233\d{9}$/.test(cleaned)) {
    return {
      valid: true,
      normalized: `+${cleaned}`,
      countryCode: 'GH',
      error: null
    };
  }

  // Ghanaian +233 with 9 subscriber digits
  if (/^\+233\d{9}$/.test(cleaned)) {
    return {
      valid: true,
      normalized: cleaned,
      countryCode: 'GH',
      error: null
    };
  }

  // International E.164 format (+ followed by 8 to 15 digits)
  if (/^\+[1-9]\d{7,14}$/.test(cleaned)) {
    return {
      valid: true,
      normalized: cleaned,
      countryCode: 'INTL',
      error: null
    };
  }

  // International digits without leading + (10 to 15 digits)
  if (/^[1-9]\d{9,14}$/.test(cleaned)) {
    return {
      valid: true,
      normalized: `+${cleaned}`,
      countryCode: 'INTL',
      error: null
    };
  }

  return {
    valid: false,
    normalized: null,
    error: 'Invalid mobile number length or format. Enter a valid Ghanaian (e.g. 0241234567 or +233241234567) or international number.'
  };
}

function hashPhoneForAudit(normalized) {
  if (!normalized) return 'unknown';
  const digest = crypto.createHash('sha256').update(String(normalized)).digest('hex').slice(0, 12);
  const tail = String(normalized).slice(-4);
  return `***${tail} (${digest})`;
}

function ensurePlatformStore(curr) {
  const existing = curr.mobileLocationPlatform && typeof curr.mobileLocationPlatform === 'object'
    ? curr.mobileLocationPlatform
    : {};
  return {
    registeredDevices: Array.isArray(existing.registeredDevices) ? existing.registeredDevices : [],
    locationPermissions: Array.isArray(existing.locationPermissions) ? existing.locationPermissions : [],
    currentLocations: existing.currentLocations && typeof existing.currentLocations === 'object' ? existing.currentLocations : {},
    locationHistory: existing.locationHistory && typeof existing.locationHistory === 'object' ? existing.locationHistory : {},
    locationAccessLogs: Array.isArray(existing.locationAccessLogs) ? existing.locationAccessLogs : []
  };
}

function resolveUserIdentity(user = {}) {
  return {
    userId: String(user.id || user.userId || user.devId || user.email || 'unknown').trim(),
    email: String(user.email || '').trim().toLowerCase(),
    name: String(
      user.fullName ||
      `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
      user.name ||
      user.email ||
      'Authorized User'
    ).trim(),
    role: String(user.role || 'STAFF').trim().toUpperCase(),
    tenantId: parseInt(user.tenantId || 1, 10) || 1
  };
}

function classifyLocationFreshness(device, locationRecord) {
  const now = Date.now();
  if (!device) {
    return { status: 'UNAVAILABLE', label: 'Location Unavailable', isLive: false, isStale: false, isOnline: false };
  }
  const sessionExpired = device.sessionExpiresAt && new Date(device.sessionExpiresAt).getTime() <= now;
  if (!device.sharingEnabled || sessionExpired) {
    return {
      status: 'PERMISSION_DISABLED',
      label: sessionExpired ? 'Sharing Session Expired' : 'Location Permission Disabled',
      isLive: false,
      isStale: false,
      isOnline: false
    };
  }
  if (!locationRecord || !Number.isFinite(Number(locationRecord.latitude)) || !Number.isFinite(Number(locationRecord.longitude))) {
    return {
      status: 'GPS_UNAVAILABLE',
      label: 'GPS Signal Unavailable',
      isLive: false,
      isStale: false,
      isOnline: Boolean(device.isOnline)
    };
  }
  const updatedMs = new Date(locationRecord.updatedAt || device.lastSeenAt || 0).getTime();
  const ageMs = Math.max(0, now - updatedMs);

  if (!device.isOnline) {
    return {
      status: 'OFFLINE',
      label: 'Offline Device (Last Known)',
      isLive: false,
      isStale: ageMs > STALE_THRESHOLD_MS,
      isOnline: false,
      ageSeconds: Math.round(ageMs / 1000)
    };
  }
  if (ageMs <= LIVE_THRESHOLD_MS) {
    return {
      status: 'LIVE',
      label: 'Live Location',
      isLive: true,
      isStale: false,
      isOnline: true,
      ageSeconds: Math.round(ageMs / 1000)
    };
  }
  if (ageMs <= STALE_THRESHOLD_MS) {
    return {
      status: 'LAST_KNOWN',
      label: 'Last Known Location',
      isLive: false,
      isStale: false,
      isOnline: true,
      ageSeconds: Math.round(ageMs / 1000)
    };
  }
  return {
    status: 'STALE',
    label: 'Stale Location (Update Delayed)',
    isLive: false,
    isStale: true,
    isOnline: false,
    ageSeconds: Math.round(ageMs / 1000)
  };
}

function appendAccessLog(platform, entry) {
  const logEntry = {
    id: `LOC-AUD-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    timestamp: new Date().toISOString(),
    ...entry
  };
  return [logEntry, ...platform.locationAccessLogs].slice(0, MAX_AUDIT_LOGS);
}

/**
 * Registers or updates the authenticated user's mobile device & phone number association.
 */
function registerUserDevice(tenantId, user, payload = {}) {
  const actor = resolveUserIdentity({ ...user, tenantId });
  const tid = parseInt(tenantId || actor.tenantId || 1, 10) || 1;
  const phoneCheck = normalizeMobileNumber(payload.mobileNumber || payload.phone);
  if (!phoneCheck.valid) {
    throw new AppError(phoneCheck.error, 400);
  }

  const deviceLabel = String(payload.deviceLabel || payload.deviceName || 'Primary Mobile / Browser Device').trim().slice(0, 80);
  const platformName = String(payload.platform || 'WEB_BROWSER').trim().toUpperCase().slice(0, 40);
  const updateIntervalSec = Math.min(300, Math.max(5, parseInt(payload.updateIntervalSec || 15, 10) || 15));
  const nowIso = new Date().toISOString();

  let savedDevice = null;
  writePersistentStore((curr) => {
    const plat = ensurePlatformStore(curr);
    const existingIdx = plat.registeredDevices.findIndex(
      (d) =>
        Number(d.tenantId) === tid &&
        (String(d.userId) === actor.userId || (actor.email && String(d.userEmail || '').toLowerCase() === actor.email))
    );

    const existing = existingIdx >= 0 ? plat.registeredDevices[existingIdx] : null;
    savedDevice = {
      deviceId: existing?.deviceId || `DEVLOC-${tid}-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      tenantId: tid,
      userId: actor.userId,
      userName: actor.name,
      userRole: actor.role,
      userEmail: actor.email,
      mobileNumber: String(payload.mobileNumber || payload.phone).trim(),
      normalizedNumber: phoneCheck.normalized,
      deviceLabel,
      platform: platformName,
      isOnline: existing ? Boolean(existing.isOnline) : false,
      lastSeenAt: nowIso,
      sharingEnabled: existing ? Boolean(existing.sharingEnabled) : false,
      updateIntervalSec,
      sessionExpiresAt: existing?.sessionExpiresAt || null,
      registeredAt: existing?.registeredAt || nowIso,
      updatedAt: nowIso
    };

    const nextDevices = [...plat.registeredDevices];
    if (existingIdx >= 0) {
      nextDevices[existingIdx] = savedDevice;
    } else {
      nextDevices.unshift(savedDevice);
    }

    return {
      ...curr,
      mobileLocationPlatform: {
        ...plat,
        registeredDevices: nextDevices
      }
    };
  });

  return savedDevice;
}

/**
 * Enables or disables explicit real-time location sharing for the owner's device.
 */
function toggleDeviceLocationSharing(tenantId, user, payload = {}) {
  const actor = resolveUserIdentity({ ...user, tenantId });
  const tid = parseInt(tenantId || actor.tenantId || 1, 10) || 1;
  const enable = Boolean(payload.enabled ?? payload.sharingEnabled);
  const durationHours = Math.min(168, Math.max(1, Number(payload.durationHours || 8) || 8));
  const updateIntervalSec = Math.min(300, Math.max(5, parseInt(payload.updateIntervalSec || 15, 10) || 15));
  const nowIso = new Date().toISOString();
  const expiresAt = enable ? new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString() : null;

  let updatedDevice = null;
  writePersistentStore((curr) => {
    const plat = ensurePlatformStore(curr);
    const idx = plat.registeredDevices.findIndex(
      (d) =>
        Number(d.tenantId) === tid &&
        (String(d.userId) === actor.userId || (actor.email && String(d.userEmail || '').toLowerCase() === actor.email))
    );
    if (idx < 0) {
      throw new AppError('Register your mobile number first before enabling location sharing.', 400);
    }
    updatedDevice = {
      ...plat.registeredDevices[idx],
      sharingEnabled: enable,
      isOnline: enable ? true : false,
      updateIntervalSec,
      sessionExpiresAt: expiresAt,
      lastSeenAt: nowIso,
      updatedAt: nowIso
    };
    const nextDevices = [...plat.registeredDevices];
    nextDevices[idx] = updatedDevice;

    return {
      ...curr,
      mobileLocationPlatform: {
        ...plat,
        registeredDevices: nextDevices,
        locationAccessLogs: appendAccessLog(plat, {
          tenantId: tid,
          requesterId: actor.userId,
          requesterName: actor.name,
          requesterRole: actor.role,
          targetUserId: actor.userId,
          queriedNumberHash: hashPhoneForAudit(updatedDevice.normalizedNumber),
          outcome: enable ? 'SHARING_ENABLED' : 'SHARING_DISABLED',
          reason: enable ? `Owner enabled sharing for ${durationHours}h` : 'Owner disabled location sharing'
        })
      }
    };
  });

  // Notify live watchers immediately on status change
  try {
    const io = typeof socketServer.getIO === 'function' ? socketServer.getIO() : null;
    if (io && updatedDevice) {
      io.to(`loc_tenant_${tid}_device_${updatedDevice.deviceId}`).emit('mobile_location_status', {
        deviceId: updatedDevice.deviceId,
        sharingEnabled: updatedDevice.sharingEnabled,
        isOnline: updatedDevice.isOnline,
        status: updatedDevice.sharingEnabled ? 'ONLINE' : 'PERMISSION_DISABLED',
        updatedAt: nowIso
      });
    }
  } catch { }

  return updatedDevice;
}

/**
 * Grants location-viewing permission to a specific authorized user email or institutional role.
 */
function grantLocationPermission(tenantId, user, payload = {}) {
  const actor = resolveUserIdentity({ ...user, tenantId });
  const tid = parseInt(tenantId || actor.tenantId || 1, 10) || 1;
  const granteeRole = payload.granteeRole ? String(payload.granteeRole).trim().toUpperCase() : null;
  const granteeEmail = payload.granteeEmail ? String(payload.granteeEmail).trim().toLowerCase() : null;
  const granteeLabel = String(payload.granteeLabel || granteeEmail || granteeRole || '').trim();
  const durationHours = Math.min(720, Math.max(1, Number(payload.durationHours || 24) || 24));

  if (!granteeRole && !granteeEmail) {
    throw new AppError('Specify an authorized role or user email to grant location permission.', 400);
  }

  const nowIso = new Date().toISOString();
  const expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString();
  let savedPerm = null;

  writePersistentStore((curr) => {
    const plat = ensurePlatformStore(curr);
    const device = plat.registeredDevices.find(
      (d) =>
        Number(d.tenantId) === tid &&
        (String(d.userId) === actor.userId || (actor.email && String(d.userEmail || '').toLowerCase() === actor.email))
    );
    if (!device) {
      throw new AppError('Register your mobile number first before granting location permissions.', 400);
    }

    savedPerm = {
      id: `LOC-PERM-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      tenantId: tid,
      ownerUserId: actor.userId,
      ownerEmail: actor.email,
      ownerDeviceId: device.deviceId,
      ownerNormalizedNumber: device.normalizedNumber,
      granteeRole,
      granteeEmail,
      granteeLabel,
      grantedByName: actor.name,
      grantedAt: nowIso,
      expiresAt,
      revokedAt: null,
      isActive: true
    };

    // Deduplicate identical active grant
    const filtered = plat.locationPermissions.filter(
      (p) =>
        !(
          p.isActive &&
          Number(p.tenantId) === tid &&
          String(p.ownerDeviceId) === String(device.deviceId) &&
          String(p.granteeRole || '') === String(granteeRole || '') &&
          String(p.granteeEmail || '') === String(granteeEmail || '')
        )
    );

    return {
      ...curr,
      mobileLocationPlatform: {
        ...plat,
        locationPermissions: [savedPerm, ...filtered],
        locationAccessLogs: appendAccessLog(plat, {
          tenantId: tid,
          requesterId: actor.userId,
          requesterName: actor.name,
          requesterRole: actor.role,
          targetUserId: actor.userId,
          queriedNumberHash: hashPhoneForAudit(device.normalizedNumber),
          outcome: 'PERMISSION_GRANTED',
          reason: `Granted to ${granteeLabel}`
        })
      }
    };
  });

  return savedPerm;
}

/**
 * Revokes a previously granted location permission immediately.
 */
function revokeLocationPermission(tenantId, user, permissionId) {
  const actor = resolveUserIdentity({ ...user, tenantId });
  const tid = parseInt(tenantId || actor.tenantId || 1, 10) || 1;
  const nowIso = new Date().toISOString();
  let revokedPerm = null;

  writePersistentStore((curr) => {
    const plat = ensurePlatformStore(curr);
    const nextPerms = plat.locationPermissions.map((p) => {
      if (
        String(p.id) === String(permissionId) &&
        Number(p.tenantId) === tid &&
        (String(p.ownerUserId) === actor.userId || (actor.email && String(p.ownerEmail || '').toLowerCase() === actor.email) || actor.role === 'DEVELOPER')
      ) {
        revokedPerm = { ...p, isActive: false, revokedAt: nowIso };
        return revokedPerm;
      }
      return p;
    });

    if (!revokedPerm) {
      throw new AppError('Location permission record not found or not owned by you.', 404);
    }

    return {
      ...curr,
      mobileLocationPlatform: {
        ...plat,
        locationPermissions: nextPerms,
        locationAccessLogs: appendAccessLog(plat, {
          tenantId: tid,
          requesterId: actor.userId,
          requesterName: actor.name,
          requesterRole: actor.role,
          targetUserId: revokedPerm.ownerUserId,
          queriedNumberHash: hashPhoneForAudit(revokedPerm.ownerNormalizedNumber),
          outcome: 'PERMISSION_REVOKED',
          reason: `Revoked access for ${revokedPerm.granteeLabel || revokedPerm.granteeEmail || revokedPerm.granteeRole}`
        })
      }
    };
  });

  try {
    const io = typeof socketServer.getIO === 'function' ? socketServer.getIO() : null;
    if (io && revokedPerm) {
      io.to(`loc_tenant_${tid}_device_${revokedPerm.ownerDeviceId}`).emit('mobile_location_status', {
        deviceId: revokedPerm.ownerDeviceId,
        status: 'PERMISSION_REVOKED',
        revokedPermissionId: revokedPerm.id,
        updatedAt: nowIso
      });
    }
  } catch { }

  return revokedPerm;
}

/**
 * Receives a real GPS coordinate update from an authenticated device owner whose sharing is enabled.
 */
function pushAuthorizedLocationUpdate(tenantId, user, payload = {}) {
  const actor = resolveUserIdentity({ ...user, tenantId });
  const tid = parseInt(tenantId || actor.tenantId || 1, 10) || 1;

  const lat = Number(payload.latitude);
  const lng = Number(payload.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    throw new AppError('Valid real GPS latitude and longitude coordinates are required.', 400);
  }

  const accuracyMeters = Number.isFinite(Number(payload.accuracyMeters ?? payload.accuracy))
    ? Math.max(0, Math.round(Number(payload.accuracyMeters ?? payload.accuracy)))
    : null;
  const speed = Number.isFinite(Number(payload.speed)) ? Number(payload.speed) : null;
  const heading = Number.isFinite(Number(payload.heading)) ? Number(payload.heading) : null;
  const batteryPct = Number.isFinite(Number(payload.batteryPct))
    ? Math.min(100, Math.max(0, Math.round(Number(payload.batteryPct))))
    : null;
  const nowIso = new Date().toISOString();
  const nowMs = Date.now();

  let updatedLocation = null;
  let deviceObj = null;

  writePersistentStore((curr) => {
    const plat = ensurePlatformStore(curr);
    const idx = plat.registeredDevices.findIndex(
      (d) =>
        Number(d.tenantId) === tid &&
        (String(d.userId) === actor.userId || (actor.email && String(d.userEmail || '').toLowerCase() === actor.email))
    );
    if (idx < 0) {
      throw new AppError('Device is not registered for mobile location sharing.', 404);
    }
    const dev = plat.registeredDevices[idx];
    const expired = dev.sessionExpiresAt && new Date(dev.sessionExpiresAt).getTime() <= nowMs;
    if (!dev.sharingEnabled || expired) {
      throw new AppError('Location sharing is currently disabled or expired on this device.', 403);
    }

    deviceObj = {
      ...dev,
      isOnline: payload.offline === true ? false : true,
      lastSeenAt: nowIso,
      updatedAt: nowIso
    };
    const nextDevices = [...plat.registeredDevices];
    nextDevices[idx] = deviceObj;

    updatedLocation = {
      deviceId: dev.deviceId,
      tenantId: tid,
      userId: actor.userId,
      latitude: Number(lat.toFixed(6)),
      longitude: Number(lng.toFixed(6)),
      accuracyMeters,
      speed,
      heading,
      batteryPct,
      gpsStatus: 'LOCKED',
      source: String(payload.source || 'DEVICE_GPS').trim().toUpperCase(),
      updatedAt: nowIso
    };

    const existingHist = Array.isArray(plat.locationHistory[dev.deviceId]) ? plat.locationHistory[dev.deviceId] : [];
    const prunedHist = [updatedLocation, ...existingHist]
      .filter((pt) => nowMs - new Date(pt.updatedAt || 0).getTime() <= HISTORY_RETENTION_MS)
      .slice(0, MAX_HISTORY_PER_DEVICE);

    return {
      ...curr,
      mobileLocationPlatform: {
        ...plat,
        registeredDevices: nextDevices,
        currentLocations: {
          ...plat.currentLocations,
          [dev.deviceId]: updatedLocation
        },
        locationHistory: {
          ...plat.locationHistory,
          [dev.deviceId]: prunedHist
        }
      }
    };
  });

  // Push real-time update to authorized subscribers via Socket.IO
  try {
    const io = typeof socketServer.getIO === 'function' ? socketServer.getIO() : null;
    if (io && deviceObj && updatedLocation) {
      io.to(`loc_tenant_${tid}_device_${deviceObj.deviceId}`).emit('mobile_location_update', {
        deviceId: deviceObj.deviceId,
        tenantId: tid,
        userName: deviceObj.userName,
        userRole: deviceObj.userRole,
        normalizedNumber: deviceObj.normalizedNumber,
        location: updatedLocation,
        freshness: classifyLocationFreshness(deviceObj, updatedLocation)
      });
    }
  } catch { }

  return {
    device: deviceObj,
    location: updatedLocation,
    freshness: classifyLocationFreshness(deviceObj, updatedLocation)
  };
}

/**
 * Marks the authenticated owner's device offline cleanly (e.g. tab closed or sharing paused).
 */
function markDeviceOffline(tenantId, user) {
  const actor = resolveUserIdentity({ ...user, tenantId });
  const tid = parseInt(tenantId || actor.tenantId || 1, 10) || 1;
  const nowIso = new Date().toISOString();
  let updatedDevice = null;

  writePersistentStore((curr) => {
    const plat = ensurePlatformStore(curr);
    const idx = plat.registeredDevices.findIndex(
      (d) =>
        Number(d.tenantId) === tid &&
        (String(d.userId) === actor.userId || (actor.email && String(d.userEmail || '').toLowerCase() === actor.email))
    );
    if (idx < 0) return curr;
    updatedDevice = { ...plat.registeredDevices[idx], isOnline: false, updatedAt: nowIso };
    const nextDevices = [...plat.registeredDevices];
    nextDevices[idx] = updatedDevice;
    return {
      ...curr,
      mobileLocationPlatform: {
        ...plat,
        registeredDevices: nextDevices
      }
    };
  });

  try {
    const io = typeof socketServer.getIO === 'function' ? socketServer.getIO() : null;
    if (io && updatedDevice) {
      io.to(`loc_tenant_${tid}_device_${updatedDevice.deviceId}`).emit('mobile_location_status', {
        deviceId: updatedDevice.deviceId,
        isOnline: false,
        status: 'OFFLINE',
        updatedAt: nowIso
      });
    }
  } catch { }

  return updatedDevice;
}

/**
 * Checks whether requester has explicit active permission from the device owner.
 */
function hasExplicitLocationPermission(platform, device, requester) {
  // Owner can always view their own device
  if (
    String(device.userId) === String(requester.userId) ||
    (requester.email && String(device.userEmail || '').toLowerCase() === requester.email)
  ) {
    return { allowed: true, grantType: 'OWNER_SELF' };
  }

  const now = Date.now();
  const matchingPerm = platform.locationPermissions.find((p) => {
    if (!p.isActive || p.revokedAt) return false;
    if (Number(p.tenantId) !== Number(device.tenantId)) return false;
    if (String(p.ownerDeviceId) !== String(device.deviceId)) return false;
    if (p.expiresAt && new Date(p.expiresAt).getTime() <= now) return false;

    const emailMatch = p.granteeEmail && requester.email && String(p.granteeEmail).toLowerCase() === requester.email;
    const roleMatch = p.granteeRole && (
      String(p.granteeRole).toUpperCase() === requester.role ||
      (String(p.granteeRole).toUpperCase() === 'ADMIN' && ['SUPER_ADMIN', 'ADMIN', 'HEADMASTER', 'PRINCIPAL'].includes(requester.role)) ||
      String(p.granteeRole).toUpperCase() === 'ALL_AUTHORIZED_STAFF'
    );
    return Boolean(emailMatch || roleMatch);
  });

  if (matchingPerm) {
    return { allowed: true, grantType: matchingPerm.granteeEmail ? 'DIRECT_USER_GRANT' : 'ROLE_GRANT', permission: matchingPerm };
  }

  return { allowed: false, grantType: null };
}

/**
 * Authorized mobile number search for GBS Live Map.
 * Validates & normalizes number, enforces multi-tenant isolation & explicit owner consent,
 * logs every search attempt, and NEVER fabricates GPS coordinates.
 */
function searchAuthorizedMobileLocation(tenantId, user, rawPhone, clientIp = '') {
  const actor = resolveUserIdentity({ ...user, tenantId });
  const tid = parseInt(tenantId || actor.tenantId || 1, 10) || 1;
  const phoneCheck = normalizeMobileNumber(rawPhone);
  if (!phoneCheck.valid) {
    throw new AppError(phoneCheck.error, 400);
  }

  const store = readPersistentStore();
  const plat = ensurePlatformStore(store);

  // Strict tenant isolation: non-Developer users can ONLY search within their own tenant
  const device = plat.registeredDevices.find((d) => {
    const numMatch = String(d.normalizedNumber) === String(phoneCheck.normalized);
    if (!numMatch) return false;
    if (actor.role === 'DEVELOPER') return true;
    return Number(d.tenantId) === tid;
  });

  const logSearch = (outcome, reason, targetUserId = null) => {
    writePersistentStore((curr) => {
      const p = ensurePlatformStore(curr);
      return {
        ...curr,
        mobileLocationPlatform: {
          ...p,
          locationAccessLogs: appendAccessLog(p, {
            tenantId: device ? Number(device.tenantId) : tid,
            requesterId: actor.userId,
            requesterName: actor.name,
            requesterRole: actor.role,
            targetUserId,
            queriedNumberHash: hashPhoneForAudit(phoneCheck.normalized),
            outcome,
            reason,
            ipAddress: String(clientIp || '').slice(0, 64)
          })
        }
      };
    });
  };

  // Anti-enumeration & privacy: if unregistered, disabled, or unauthorized, never leak coordinates
  if (!device) {
    logSearch('NOT_REGISTERED', 'Mobile number not registered in tenant location directory');
    return {
      found: false,
      authorized: false,
      status: 'UNAVAILABLE',
      statusLabel: 'Number Not Registered / Unavailable',
      normalizedNumber: phoneCheck.normalized,
      message: UNAUTHORIZED_LOCATION_MESSAGE,
      detail: 'No registered device with active location sharing was found for this mobile number in your institution.',
      location: null
    };
  }

  const permCheck = hasExplicitLocationPermission(plat, device, actor);
  const now = Date.now();
  const sessionExpired = device.sessionExpiresAt && new Date(device.sessionExpiresAt).getTime() <= now;

  if (!device.sharingEnabled || sessionExpired) {
    logSearch('SHARING_DISABLED', sessionExpired ? 'Owner sharing session expired' : 'Owner has location sharing disabled', device.userId);
    return {
      found: true,
      authorized: false,
      status: 'PERMISSION_DISABLED',
      statusLabel: 'Location Permission Disabled',
      normalizedNumber: phoneCheck.normalized,
      message: UNAUTHORIZED_LOCATION_MESSAGE,
      detail: sessionExpired
        ? 'The device owner’s location-sharing session has expired.'
        : 'The device owner has not enabled location sharing.',
      location: null
    };
  }

  if (!permCheck.allowed) {
    logSearch('PERMISSION_DENIED', 'Requester not authorized by device owner', device.userId);
    return {
      found: true,
      authorized: false,
      status: 'PERMISSION_DENIED',
      statusLabel: 'Permission Denied',
      normalizedNumber: phoneCheck.normalized,
      message: UNAUTHORIZED_LOCATION_MESSAGE,
      detail: 'You do not have permission from the device owner to view this device location.',
      location: null
    };
  }

  const currentLoc = plat.currentLocations[device.deviceId] || null;
  const freshness = classifyLocationFreshness(device, currentLoc);

  logSearch(
    currentLoc ? 'AUTHORIZED_LOCATION_RETRIEVED' : 'AUTHORIZED_GPS_UNAVAILABLE',
    `Authorized via ${permCheck.grantType} (${freshness.status})`,
    device.userId
  );

  return {
    found: true,
    authorized: true,
    status: freshness.status,
    statusLabel: freshness.label,
    normalizedNumber: device.normalizedNumber,
    deviceId: device.deviceId,
    deviceLabel: device.deviceLabel,
    platform: device.platform,
    owner: {
      userId: device.userId,
      name: device.userName,
      role: device.userRole,
      mobileNumber: device.normalizedNumber
    },
    sharingStatus: {
      enabled: Boolean(device.sharingEnabled),
      grantType: permCheck.grantType,
      updateIntervalSec: device.updateIntervalSec,
      sessionExpiresAt: device.sessionExpiresAt,
      isOnline: freshness.isOnline,
      isLive: freshness.isLive,
      isStale: freshness.isStale,
      ageSeconds: freshness.ageSeconds ?? null
    },
    location: currentLoc
      ? {
          latitude: currentLoc.latitude,
          longitude: currentLoc.longitude,
          accuracyMeters: currentLoc.accuracyMeters,
          speed: currentLoc.speed,
          heading: currentLoc.heading,
          batteryPct: currentLoc.batteryPct,
          updatedAt: currentLoc.updatedAt,
          source: currentLoc.source
        }
      : null,
    message: currentLoc
      ? `Authorized ${freshness.label} retrieved for ${device.userName} (${device.normalizedNumber}).`
      : 'Location sharing is authorized, but the device has not transmitted a GPS fix yet (GPS unavailable).'
  };
}

/**
 * Returns the authenticated user's own device registration, sharing status, active permissions, and recent access logs.
 */
function getMyLocationSharingStatus(tenantId, user) {
  const actor = resolveUserIdentity({ ...user, tenantId });
  const tid = parseInt(tenantId || actor.tenantId || 1, 10) || 1;
  const store = readPersistentStore();
  const plat = ensurePlatformStore(store);

  const device = plat.registeredDevices.find(
    (d) =>
      Number(d.tenantId) === tid &&
      (String(d.userId) === actor.userId || (actor.email && String(d.userEmail || '').toLowerCase() === actor.email))
  ) || null;

  const currentLoc = device ? (plat.currentLocations[device.deviceId] || null) : null;
  const freshness = classifyLocationFreshness(device, currentLoc);
  const now = Date.now();

  const permissions = device
    ? plat.locationPermissions.filter(
        (p) => Number(p.tenantId) === tid && String(p.ownerDeviceId) === String(device.deviceId) && p.isActive && (!p.expiresAt || new Date(p.expiresAt).getTime() > now)
      )
    : [];

  const recentLogs = plat.locationAccessLogs
    .filter((l) => Number(l.tenantId) === tid && (String(l.targetUserId) === actor.userId || String(l.requesterId) === actor.userId))
    .slice(0, 25);

  return {
    device,
    currentLocation: currentLoc,
    freshness,
    activePermissions: permissions,
    recentAccessLogs: recentLogs
  };
}

function getTenantLocationAuditLogs(tenantId, user) {
  const actor = resolveUserIdentity({ ...user, tenantId });
  const tid = parseInt(tenantId || actor.tenantId || 1, 10) || 1;
  const store = readPersistentStore();
  const plat = ensurePlatformStore(store);

  const logs = plat.locationAccessLogs.filter((l) => {
    if (actor.role === 'DEVELOPER') return true;
    if (['ADMIN', 'SUPER_ADMIN', 'HEADMASTER', 'PRINCIPAL'].includes(actor.role)) {
      return Number(l.tenantId) === tid;
    }
    return Number(l.tenantId) === tid && (String(l.targetUserId) === actor.userId || String(l.requesterId) === actor.userId);
  });

  return logs.slice(0, 100);
}

module.exports = {
  UNAUTHORIZED_LOCATION_MESSAGE,
  normalizeMobileNumber,
  registerUserDevice,
  toggleDeviceLocationSharing,
  grantLocationPermission,
  revokeLocationPermission,
  pushAuthorizedLocationUpdate,
  markDeviceOffline,
  searchAuthorizedMobileLocation,
  getMyLocationSharingStatus,
  getTenantLocationAuditLogs
};
