'use strict';

const express = require('express');
const { protect } = require('../../middleware/auth.middleware');
const { resolveTenantId, optionalProtect } = require('../../utils/resolveTenantId');
const { resolveCountryNorm, resolveLanguageSpec } = require('../../utils/countryLanguageNorms');
const localeService = require('./locale.service');

const router = express.Router();

// Public norms catalogue (/api/v1/locale/norms)
router.get('/norms', (req, res) => {
  const country = req.query.country ? resolveCountryNorm(req.query.country) : null;
  const language = req.query.language ? resolveLanguageSpec(req.query.language) : null;
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({
    status: 'success',
    data: {
      countries: Object.values(localeService.COUNTRY_NORMS),
      languages: Object.values(localeService.LANGUAGE_DEFINITIONS),
      activeCountry: country,
      activeLanguage: language
    }
  });
});

// Fetch effective tenant/institution language & norms (Developer role always locked English)
router.get('/tenant-preference', optionalProtect, (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const headerRole = String(req.user?.role || req.headers?.['x-user-role'] || '').trim().toUpperCase();
  if (headerRole === 'DEVELOPER') {
    const devPref = localeService.getDeveloperLockedLocale();
    return res.status(200).json({
      status: 'success',
      data: { ...devPref, preferences: devPref }
    });
  }

  const tenantId = resolveTenantId(req, 1);
  const userKey = req.user
    ? localeService.normalizeUserKey(req.user, tenantId)
    : '';
  const effective = req.user
    ? localeService.resolveEffectiveLocaleForUser({ tenantId, userKey, role: headerRole })
    : localeService.resolveTenantLocalePreference(tenantId);

  return res.status(200).json({
    status: 'success',
    data: {
      ...effective,
      preferences: effective
    }
  });
});

function handleUpdateTenantLocale(req, res) {
  const role = String(req.user?.role || '').trim().toUpperCase();
  if (role === 'DEVELOPER') {
    return res.status(403).json({
      status: 'fail',
      message: 'Developer Dashboard remains locked to Standard English. Institution language changes only apply to tenant schools.'
    });
  }
  if (!localeService.HEADMASTER_ROLES.has(role)) {
    return res.status(403).json({
      status: 'fail',
      message: 'Only the institution Headmaster / Admin can set the institution-wide system language.'
    });
  }

  const tenantId = resolveTenantId(req, 1);
  const payload = localeService.updateTenantLocalePreference({
    tenantId,
    countryCode: req.body?.countryCode || req.body?.country || null,
    languageCode: req.body?.languageCode || req.body?.language || null,
    actor: req.user || {}
  });

  return res.status(200).json({
    status: 'success',
    message: `Institution-wide language updated to ${payload.language.nativeName} (${payload.country.flag} ${payload.country.name}) across all staff, student, parent & bursar portals for Tenant #${payload.tenantId}. Developer Dashboard remains English.`,
    data: {
      ...payload,
      preferences: payload
    }
  });
}

router.patch('/tenant-preference', protect, handleUpdateTenantLocale);
router.put('/tenant-preference', protect, handleUpdateTenantLocale);

module.exports = router;
