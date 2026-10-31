'use strict';

const service = require('./reporting.service');

async function getStatus(req, res, next) {
  try {
    const data = await service.getStatus();
    res.status(200).json({ status: 'success', data });
  } catch (error) {
    next(error);
  }
}

async function getReportDefinitions(req, res, next) {
  try {
    const definitions = await service.getReportDefinitions(req.tenantId, req.query);
    res.status(200).json({ status: 'success', results: definitions.length, data: { definitions } });
  } catch (error) {
    next(error);
  }
}

async function generateReportCard(req, res, next) {
  try {
    const result = await service.generateStudentReportCard(req.tenantId, req.body, req.user);
    res.status(201).json({ status: 'success', message: 'Report card generated successfully.', data: result });
  } catch (error) {
    next(error);
  }
}

async function generateTranscript(req, res, next) {
  try {
    const result = await service.generateOfficialTranscript(req.tenantId, req.body, req.user);
    res.status(201).json({ status: 'success', message: 'Official transcript generated.', data: result });
  } catch (error) {
    next(error);
  }
}

async function generateFeeReceipt(req, res, next) {
  try {
    const result = await service.generateFeeReceipt(req.tenantId, req.body, req.user);
    res.status(201).json({ status: 'success', message: 'Fee receipt generated.', data: result });
  } catch (error) {
    next(error);
  }
}

async function generateEnrollmentCertificate(req, res, next) {
  try {
    const result = await service.generateEnrollmentCertificate(req.tenantId, req.body, req.user);
    res.status(201).json({ status: 'success', message: 'Enrollment certificate generated.', data: result });
  } catch (error) {
    next(error);
  }
}

async function buildReport(req, res, next) {
  try {
    const report = await service.buildReport(req.tenantId, req.params.code, req.query);
    res.status(200).json({ status: 'success', data: { report } });
  } catch (error) {
    next(error);
  }
}

async function getDocuments(req, res, next) {
  try {
    const documents = await service.getDocuments(req.tenantId, req.query);
    res.status(200).json({ status: 'success', results: documents.length, data: { documents } });
  } catch (error) {
    next(error);
  }
}

async function getDocumentById(req, res, next) {
  try {
    const document = await service.getDocumentById(req.tenantId, req.params.id);
    res.status(200).json({ status: 'success', data: { document } });
  } catch (error) {
    next(error);
  }
}

async function verifyDocument(req, res, next) {
  try {
    const result = await service.verifyDocumentByHash(req.tenantId, req.params.identifier);
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
}

async function getTelemetry(req, res, next) {
  try {
    const telemetry = await service.getTelemetry(req.tenantId);
    res.status(200).json({ status: 'success', data: { telemetry } });
  } catch (error) {
    next(error);
  }
}

async function getSchoolBranding(req, res, next) {
  try {
    const data = await service.getSchoolBranding(req.tenantId);
    res.status(200).json({ status: 'success', data });
  } catch (error) {
    next(error);
  }
}

async function updateSchoolBranding(req, res, next) {
  try {
    const data = await service.updateSchoolBranding(req.tenantId, req.body);
    res.status(200).json({ status: 'success', message: 'Preferred school name for report cards and transcripts updated successfully.', data });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getStatus,
  getReportDefinitions,
  generateReportCard,
  generateTranscript,
  generateFeeReceipt,
  generateEnrollmentCertificate,
  buildReport,
  getDocuments,
  getDocumentById,
  verifyDocument,
  getTelemetry,
  getSchoolBranding,
  updateSchoolBranding
};

