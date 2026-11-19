'use strict';

const { readPersistentStore, writePersistentStore } = require('../../core/database/persistentStore');
const {
  COUNTRY_NORMS,
  LANGUAGE_DEFINITIONS,
  resolveCountryNorm,
  resolveLanguageSpec
} = require('../../utils/countryLanguageNorms');
const socketServer = require('../../core/socket/socketServer');

const HEADMASTER_ROLES = new Set(['ADMIN', 'SUPER_ADMIN', 'HEADMASTER']);

function normalizeTenantKey(tenantId) {
  const num = parseInt(tenantId, 10);
  return String(Number.isInteger(num) && num > 0 ? num : 1);
}

function normalizeUserKey(user = {}, tenantId = 1) {
  const tKey = normalizeTenantKey(tenantId);
  const raw = user?.email || user?.id || `tenant_${tKey}`;
  return String(raw).trim().toLowerCase();
}

function buildResolvedLocalePayload(rawPref = {}, extra = {}) {
  const country = resolveCountryNorm(rawPref.countryCode || 'GH');
  const language = resolveLanguageSpec(rawPref.languageCode || 'en');
  return {
    tenantId: parseInt(rawPref.tenantId || extra.tenantId || 1, 10) || 1,
    countryCode: country.code,
    languageCode: language.code,
    currencyCode: country.currencyCode,
    currencySymbol: country.currencySymbol,
    country,
    language,
    rtl: Boolean(language.rtl),
    updatedBy: rawPref.updatedBy || null,
    updatedByRole: rawPref.updatedByRole || null,
    updatedAt: rawPref.updatedAt || null,
    ...extra
  };
}

function getDeveloperLockedLocale() {
  const country = resolveCountryNorm('GH');
  const language = resolveLanguageSpec('en');
  return {
    tenantId: 1,
    countryCode: 'GH',
    languageCode: 'en',
    currencyCode: country.currencyCode,
    currencySymbol: country.currencySymbol,
    country,
    language,
    rtl: false,
    source: 'DEVELOPER_IMMUTABLE',
    lockedDeveloperEnglish: true,
    inheritedFromInstitution: false,
    updatedBy: 'SYSTEM_ARCHITECT',
    updatedByRole: 'DEVELOPER',
    updatedAt: null
  };
}

function resolveTenantLocalePreference(tenantId = 1) {
  const tKey = normalizeTenantKey(tenantId);
  const store = readPersistentStore();
  const map = store.tenantLocalePreferences && typeof store.tenantLocalePreferences === 'object'
    ? store.tenantLocalePreferences
    : {};
  const saved = map[tKey];
  if (!saved) {
    return buildResolvedLocalePayload(
      { tenantId: Number(tKey), countryCode: 'GH', languageCode: 'en' },
      { source: 'DEFAULT_ENGLISH', isDefault: true, inheritedFromInstitution: true }
    );
  }
  return buildResolvedLocalePayload(
    { tenantId: Number(tKey), ...saved },
    { source: 'HEADMASTER_INSTITUTION', isDefault: false, inheritedFromInstitution: true }
  );
}

function resolveEffectiveLocaleForUser({ tenantId = 1, userKey = '', role = '' } = {}) {
  const upperRole = String(role || '').trim().toUpperCase();
  // Developer Dashboard & Control Center MUST ALWAYS remain locked to English
  if (upperRole === 'DEVELOPER') {
    return getDeveloperLockedLocale();
  }

  const tKey = normalizeTenantKey(tenantId);
  const store = readPersistentStore();
  const tenantMap = store.tenantLocalePreferences && typeof store.tenantLocalePreferences === 'object'
    ? store.tenantLocalePreferences
    : {};
  const userMap = store.userLocalePreferences && typeof store.userLocalePreferences === 'object'
    ? store.userLocalePreferences
    : {};

  const tenantPref = tenantMap[tKey] || null;
  const cleanUserKey = String(userKey || '').trim().toLowerCase();
  const userPref = cleanUserKey && userMap[cleanUserKey] ? userMap[cleanUserKey] : null;
  // Ensure a user preference saved while in a different tenant never leaks across tenants
  const userPrefMatchesTenant = userPref && (!userPref.tenantId || normalizeTenantKey(userPref.tenantId) === tKey);
  const scopedUserPref = userPrefMatchesTenant ? userPref : null;

  const tenantTs = tenantPref?.updatedAt ? new Date(tenantPref.updatedAt).getTime() : 0;
  const userTs = scopedUserPref?.updatedAt ? new Date(scopedUserPref.updatedAt).getTime() : 0;

  if (tenantPref && (!scopedUserPref || tenantTs >= userTs)) {
    return buildResolvedLocalePayload(
      { tenantId: Number(tKey), ...tenantPref },
      {
        source: 'HEADMASTER_INSTITUTION',
        inheritedFromInstitution: true,
        isDefault: false,
        institutionLanguageCode: tenantPref.languageCode || 'en'
      }
    );
  }

  if (scopedUserPref) {
    return buildResolvedLocalePayload(
      { tenantId: Number(tKey), ...scopedUserPref },
      {
        source: 'USER_PREFERENCE',
        inheritedFromInstitution: false,
        isDefault: false,
        institutionLanguageCode: tenantPref?.languageCode || 'en'
      }
    );
  }

  return buildResolvedLocalePayload(
    { tenantId: Number(tKey), countryCode: 'GH', languageCode: 'en' },
    {
      source: 'DEFAULT_ENGLISH',
      inheritedFromInstitution: true,
      isDefault: true,
      institutionLanguageCode: 'en'
    }
  );
}

function updateTenantLocalePreference({ tenantId = 1, countryCode = null, languageCode = null, actor = {} } = {}) {
  const upperRole = String(actor?.role || '').trim().toUpperCase();
  if (upperRole === 'DEVELOPER') {
    return getDeveloperLockedLocale();
  }

  const tKey = normalizeTenantKey(tenantId);
  const existing = resolveTenantLocalePreference(tKey);
  const nextCountry = resolveCountryNorm(countryCode || existing.countryCode || 'GH');
  const nextLanguage = resolveLanguageSpec(languageCode || existing.languageCode || nextCountry.defaultLanguage || 'en');

  const record = {
    tenantId: Number(tKey),
    countryCode: nextCountry.code,
    languageCode: nextLanguage.code,
    currencyCode: nextCountry.currencyCode,
    currencySymbol: nextCountry.currencySymbol,
    updatedBy: String(actor?.email || actor?.firstName || 'Headmaster').trim(),
    updatedByRole: upperRole || 'ADMIN',
    updatedAt: new Date().toISOString()
  };

  writePersistentStore((curr) => ({
    ...curr,
    tenantLocalePreferences: {
      ...(curr.tenantLocalePreferences && typeof curr.tenantLocalePreferences === 'object' ? curr.tenantLocalePreferences : {}),
      [tKey]: record
    }
  }));

  const payload = buildResolvedLocalePayload(record, {
    source: 'HEADMASTER_INSTITUTION',
    inheritedFromInstitution: true,
    isDefault: false,
    institutionLanguageCode: record.languageCode
  });

  try {
    if (typeof socketServer.getIO === 'function') {
      const io = socketServer.getIO();
      if (io) io.emit('gbs_tenant_locale_changed', payload);
    }
  } catch { }

  return payload;
}

function updateUserLocalePreference({ tenantId = 1, userKey = '', countryCode = null, languageCode = null, actor = {} } = {}) {
  const upperRole = String(actor?.role || '').trim().toUpperCase();
  if (upperRole === 'DEVELOPER') {
    return getDeveloperLockedLocale();
  }

  const tKey = normalizeTenantKey(tenantId);
  // Headmaster / Admin selections automatically set the institution-wide language for that tenant
  if (HEADMASTER_ROLES.has(upperRole)) {
    return updateTenantLocalePreference({ tenantId: tKey, countryCode, languageCode, actor });
  }

  const effective = resolveEffectiveLocaleForUser({ tenantId: tKey, userKey, role: upperRole });
  const nextCountry = resolveCountryNorm(countryCode || effective.countryCode || 'GH');
  const nextLanguage = resolveLanguageSpec(languageCode || effective.languageCode || 'en');
  const cleanUserKey = String(userKey || `tenant_${tKey}`).trim().toLowerCase();

  const record = {
    tenantId: Number(tKey),
    countryCode: nextCountry.code,
    languageCode: nextLanguage.code,
    currencyCode: nextCountry.currencyCode,
    currencySymbol: nextCountry.currencySymbol,
    updatedBy: cleanUserKey,
    updatedByRole: upperRole || 'USER',
    updatedAt: new Date().toISOString()
  };

  writePersistentStore((curr) => ({
    ...curr,
    userLocalePreferences: {
      ...(curr.userLocalePreferences && typeof curr.userLocalePreferences === 'object' ? curr.userLocalePreferences : {}),
      [cleanUserKey]: record
    }
  }));

  return buildResolvedLocalePayload(record, {
    source: 'USER_PREFERENCE',
    inheritedFromInstitution: false,
    isDefault: false,
    institutionLanguageCode: resolveTenantLocalePreference(tKey).languageCode
  });
}

module.exports = {
  HEADMASTER_ROLES,
  COUNTRY_NORMS,
  LANGUAGE_DEFINITIONS,
  normalizeTenantKey,
  normalizeUserKey,
  getDeveloperLockedLocale,
  resolveTenantLocalePreference,
  resolveEffectiveLocaleForUser,
  updateTenantLocalePreference,
  updateUserLocalePreference
};
