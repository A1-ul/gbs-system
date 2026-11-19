'use strict';

/**
 * GBS CENTRAL SYSTEM RESPONSE, CONTROL AND COMMUNICATION ENGINE (GBS-RCCE)
 * Master Reusable Architecture Package
 *
 * Designed as a pluggable enterprise engine across every GBS product:
 * - GBS School Management System
 * - GBS Examination System
 * - GBS Real Estate Management System
 * - GBS Company Management System
 * - Future GBS software products
 */

const { RESPONSE_CATALOGUE, getOperationResponse, inferOperationResponse } = require('./responseCatalogue');
const { ResponseEngine, rcceResponseMiddleware, normalizeApiPayload } = require('./responseEngine');
const { BusinessRulesEngine, businessRulesEngine } = require('./businessRulesEngine');
const { RCCE_EVENTS, EventNotificationEngine, eventNotificationEngine } = require('./eventNotificationEngine');
const { UserDeveloperControlEngine, userDeveloperControlEngine, ROLE_PERMISSION_MATRIX } = require('./userDeveloperControlEngine');
const { AuditTracker, auditTracker } = require('./auditTracker');
const { IdempotencyProtection, idempotencyProtection } = require('./idempotencyProtection');
const { rcceCentralErrorHandler } = require('./systemErrorHandler');
const rcceRoutes = require('./rcceRoutes');

const SUPPORTED_GBS_PRODUCTS = Object.freeze([
  { id: 'GBS_SCHOOL', name: 'GBS School Management System', defaultMount: '/api/v1/rcce' },
  { id: 'GBS_EXAM', name: 'GBS Examination System', defaultMount: '/api/v1/rcce' },
  { id: 'GBS_REAL_ESTATE', name: 'GBS Real Estate Management System', defaultMount: '/api/v1/rcce' },
  { id: 'GBS_COMPANY', name: 'GBS Company Management System', defaultMount: '/api/v1/rcce' }
]);

/**
 * Attach and initialize GBS-RCCE into any GBS Express application
 * @param {import('express').Application} app - Express application instance
 * @param {object} [options] - Optional reusable product configuration
 */
function setupRcce(app, options = {}) {
  if (!app) throw new Error('Express application instance is required to setup GBS-RCCE.');

  const mountPath = options.mountPath || '/api/v1/rcce';
  app.locals.gbsRcceConfig = {
    productId: options.productId || 'GBS_SCHOOL',
    productName: options.productName || 'GBS School Management System',
    version: '2.0.0-ENTERPRISE',
    supportedProducts: SUPPORTED_GBS_PRODUCTS
  };

  // 1. Canonical Response Formatter, requestId tracer, automatic Audit & Event hook
  app.use(rcceResponseMiddleware);

  // 2. Central Business Rules Guard (Maintenance & Multi-Tenant boundary guard)
  app.use(businessRulesEngine.middleware());

  // 3. Central RCCE Control, Catalogue, Audit, Event & Privacy APIs
  app.use(mountPath, rcceRoutes);

  return {
    config: app.locals.gbsRcceConfig,
    RESPONSE_CATALOGUE,
    getOperationResponse,
    inferOperationResponse,
    businessRulesEngine,
    eventNotificationEngine,
    userDeveloperControlEngine,
    auditTracker,
    idempotencyProtection,
    rcceCentralErrorHandler
  };
}

module.exports = {
  setupRcce,
  SUPPORTED_GBS_PRODUCTS,
  RESPONSE_CATALOGUE,
  getOperationResponse,
  inferOperationResponse,
  ResponseEngine,
  rcceResponseMiddleware,
  normalizeApiPayload,
  BusinessRulesEngine,
  businessRulesEngine,
  RCCE_EVENTS,
  EventNotificationEngine,
  eventNotificationEngine,
  UserDeveloperControlEngine,
  userDeveloperControlEngine,
  ROLE_PERMISSION_MATRIX,
  AuditTracker,
  auditTracker,
  IdempotencyProtection,
  idempotencyProtection,
  rcceCentralErrorHandler,
  rcceRoutes
};
