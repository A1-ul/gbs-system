'use strict';

const logger = require('../../utils/logger') || console;
const service = require('./clinic.service');

async function getStatus(req, res, next) {
  try {
    const data = await service.getStatus();
    return res.status(200).json({ status: 'success', data, timestamp: new Date().toISOString() });
  } catch (err) {
    if (logger.error) logger.error('CLINIC_CONTROLLER_ERROR', { message: err.message });
    return next(err);
  }
}

const CLINIC_OPERATOR_ROLES = new Set(['CLINIC_DOCTOR', 'CLINIC_NURSE', 'DOCTOR', 'NURSE', 'CLINIC']);

function isClinicOperatorRole(role) {
  return CLINIC_OPERATOR_ROLES.has(String(role || '').trim().toUpperCase());
}

function rejectNonClinicOperator(res) {
  return res.status(403).json({
    status: 'fail',
    message: 'Access Denied: Only authorized School Clinic Doctors and Nurses can operate the School Clinic Dashboard.'
  });
}

async function listProfiles(req, res, next) {
  try {
    const profiles = await service.listClinicProfiles(req);
    const isClinicOperator = isClinicOperatorRole(req.user?.role);
    return res.status(200).json({
      status: 'success',
      results: profiles.length,
      data: {
        profiles,
        ownHealthOnly: !isClinicOperator,
        readOnly: !isClinicOperator,
        canOperateClinic: isClinicOperator,
        summary: isClinicOperator ? { totalProfiles: profiles.length } : null
      }
    });
  } catch (err) {
    return next(err);
  }
}

async function upsertProfile(req, res, next) {
  try {
    const tid = req.tenantId || req.user?.tenantId || 1;
    if (!isClinicOperatorRole(req.user?.role)) {
      return rejectNonClinicOperator(res);
    }
    const rawBody = { ...(req.body || {}) };
    const profile = service.syncAdmissionMedicalProfile(tid, rawBody);
    if (!profile) {
      return res.status(400).json({ status: 'error', message: 'Full Name or Email is required to save a medical registration profile.' });
    }
    return res.status(201).json({
      status: 'success',
      message: `School Clinic medical record saved for ${profile.fullName}.`,
      data: { profile }
    });
  } catch (err) {
    return next(err);
  }
}

async function listVisits(req, res, next) {
  try {
    const data = await service.listClinicVisits(req);
    return res.status(200).json({ status: 'success', results: data.visits.length, data });
  } catch (err) {
    return next(err);
  }
}

async function admitOrTreatPatient(req, res, next) {
  try {
    if (!isClinicOperatorRole(req.user?.role)) {
      return rejectNonClinicOperator(res);
    }
    const visit = await service.admitOrTreatPatient(req);
    return res.status(201).json({
      status: 'success',
      message: `${visit.patientRole} '${visit.patientName}' recorded in School Clinic (${visit.disposition}).`,
      data: { visit }
    });
  } catch (err) {
    return next(err);
  }
}

async function updateVisit(req, res, next) {
  try {
    if (!isClinicOperatorRole(req.user?.role)) {
      return rejectNonClinicOperator(res);
    }
    const visit = await service.updateClinicVisit(req, req.params.id);
    return res.status(200).json({
      status: 'success',
      message: `Clinic record updated (${visit.disposition}).`,
      data: { visit }
    });
  } catch (err) {
    return next(err);
  }
}

async function pullMedicalDossier(req, res, next) {
  try {
    if (!isClinicOperatorRole(req.user?.role)) {
      return rejectNonClinicOperator(res);
    }
    const dossier = await service.pullPatientMedicalDossier(req, req.query.query || req.query.q || '');
    return res.status(200).json({ status: 'success', data: dossier });
  } catch (err) {
    return next(err);
  }
}

async function listInventory(req, res, next) {
  try {
    if (!isClinicOperatorRole(req.user?.role)) {
      return rejectNonClinicOperator(res);
    }
    const inventory = await service.listInventory(req);
    return res.status(200).json({ status: 'success', results: inventory.length, data: { inventory } });
  } catch (err) {
    return next(err);
  }
}

async function upsertInventory(req, res, next) {
  try {
    if (!isClinicOperatorRole(req.user?.role)) {
      return rejectNonClinicOperator(res);
    }
    const item = await service.upsertInventoryItem(req);
    return res.status(201).json({
      status: 'success',
      message: `Clinic pharmacy item '${item.itemName}' saved (${item.quantity} ${item.unit}).`,
      data: { item }
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getStatus,
  listProfiles,
  upsertProfile,
  listVisits,
  admitOrTreatPatient,
  updateVisit,
  pullMedicalDossier,
  listInventory,
  upsertInventory
};
