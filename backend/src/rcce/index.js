'use strict';

/**
 * GBS CENTRAL SYSTEM RESPONSE, CONTROL AND COMMUNICATION ENGINE (GBS-RCCE)
 * Master Reusable Architecture Package
 *
 * Applicable across all GBS products:
 * - GBS International School Management System
 * - GBS Computer-Based Examination System
 * - GBS Real Estate Management System
 * - GBS Company Management System
 * - All future GBS enterprise products
 */

const { RESPONSE_CATALOGUE, getOperationResponse } = require('./responseCatalogue');
const { ResponseEngine, rcceResponseMiddleware } = require('./responseEngine');
const { BusinessRulesEngine, businessRulesEngine } = require('./businessRulesEngine');
const { RCCE_EVENTS, EventNotificationEngine, eventNotificationEngine } = require('./eventNotificationEngine');
const { UserDeveloperControlEngine, userDeveloperControlEngine } = require('./userDeveloperControlEngine');
const { AuditTracker, auditTracker } = require('./auditTracker');
const { IdempotencyProtection, idempotencyProtection } = require('./idempotencyProtection');
const { rcceCentralErrorHandler } = require('./systemErrorHandler');
const rcceRoutes = require('./rcceRoutes');

/**
 * Attach and initialize GBS-RCCE into an Express application
 * @param {import('express').Application} app - The Express application instance
 */
function setupRcce(app) {
  if (!app) throw new Error('Express application instance is required to setup GBS-RCCE.');

  // 1. Mount response formatter and requestId tracking middleware
  app.use(rcceResponseMiddleware);

  // 2. Mount business rules guard middleware (maintenance and tenant isolation)
  app.use(businessRulesEngine.middleware());

  // 3. Mount central RCCE API routes
  app.use('/api/v1/rcce', rcceRoutes);

  return {
    RESPONSE_CATALOGUE,
    businessRulesEngine,
    eventNotificationEngine,
    userDeveloperControlEngine,
    auditTracker,
    idempotencyProtection,
    rcceCentralErrorHandler
  };
}

module.exports = {
  // Main Setup
  setupRcce,

  // Response Engine & Catalogue
  RESPONSE_CATALOGUE,
  getOperationResponse,
  ResponseEngine,
  rcceResponseMiddleware,

  // Business Rules Engine
  BusinessRulesEngine,
  businessRulesEngine,

  // Event & Notification Engine
  RCCE_EVENTS,
  EventNotificationEngine,
  eventNotificationEngine,

  // User & Developer Control Engine
  UserDeveloperControlEngine,
  userDeveloperControlEngine,

  // Activity Tracking & Audit
  AuditTracker,
  auditTracker,

  // Duplicate Operation & Idempotency Sentinel
  IdempotencyProtection,
  idempotencyProtection,

  // Central Error Handler
  rcceCentralErrorHandler,

  // Router
  rcceRoutes
};
