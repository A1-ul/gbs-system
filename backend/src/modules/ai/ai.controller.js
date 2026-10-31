"use strict";

const service = require("./ai.service");
const logger = require("../../utils/logger") || console;

/**
 * AI Controller (Blueprint Box 9 & 10)
 */

async function getStatus(req, res, next) {
    try {
        const data = await service.getStatus();
        return res.status(200).json({
            success: true,
            data,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        if (logger.error) logger.error("AI_CONTROLLER_ERROR", { message: error.message });
        return next(error);
    }
}

async function diagnoseStudent(req, res, next) {
    try {
        const tenantId = req.user?.tenantId || req.headers["x-tenant-id"] || 1;
        const studentId = req.params.studentId || req.body.studentId;
        const evaluatedById = req.user?.id || null;

        if (!studentId) {
            return res.status(400).json({
                success: false,
                message: "studentId is required for diagnostic evaluation."
            });
        }

        const report = await service.diagnoseStudent(tenantId, studentId, evaluatedById);
        return res.status(201).json({
            success: true,
            message: "Student academic diagnostic evaluation completed successfully.",
            data: report
        });
    } catch (error) {
        if (logger.error) logger.error("AI_DIAGNOSE_STUDENT_ERROR", { message: error.message });
        return next(error);
    }
}

async function diagnoseCohort(req, res, next) {
    try {
        const tenantId = req.user?.tenantId || req.headers["x-tenant-id"] || 1;
        const classId = req.query.classId || req.params.classId || null;

        const cohortData = await service.diagnoseCohort(tenantId, classId);
        return res.status(200).json({
            success: true,
            data: cohortData
        });
    } catch (error) {
        if (logger.error) logger.error("AI_DIAGNOSE_COHORT_ERROR", { message: error.message });
        return next(error);
    }
}

async function generateStudyPlan(req, res, next) {
    try {
        const tenantId = req.user?.tenantId || req.headers["x-tenant-id"] || 1;
        const studentId = req.body.studentId || req.params.studentId;
        const generatedById = req.user?.id || null;

        if (!studentId) {
            return res.status(400).json({
                success: false,
                message: "studentId is required to generate an adaptive study plan."
            });
        }

        const studyPlan = await service.generateStudyPlan(tenantId, studentId, req.body, generatedById);
        return res.status(201).json({
            success: true,
            message: "Adaptive study plan generated successfully.",
            data: studyPlan
        });
    } catch (error) {
        if (logger.error) logger.error("AI_GENERATE_STUDY_PLAN_ERROR", { message: error.message });
        return next(error);
    }
}

async function getStudyPlans(req, res, next) {
    try {
        const tenantId = req.user?.tenantId || req.headers["x-tenant-id"] || 1;
        const studentId = req.params.studentId || req.query.studentId || null;

        const plans = await service.getStudyPlans(tenantId, studentId);
        return res.status(200).json({
            success: true,
            count: plans.length,
            data: plans
        });
    } catch (error) {
        if (logger.error) logger.error("AI_GET_STUDY_PLANS_ERROR", { message: error.message });
        return next(error);
    }
}

async function createIntervention(req, res, next) {
    try {
        const tenantId = req.user?.tenantId || req.headers["x-tenant-id"] || 1;
        const createdById = req.user?.id || null;

        if (!req.body.studentId) {
            return res.status(400).json({
                success: false,
                message: "studentId is required to create an intervention alert."
            });
        }

        const intervention = await service.createIntervention(tenantId, req.body, createdById);
        return res.status(201).json({
            success: true,
            message: "Learning intervention alert created successfully.",
            data: intervention
        });
    } catch (error) {
        if (logger.error) logger.error("AI_CREATE_INTERVENTION_ERROR", { message: error.message });
        return next(error);
    }
}

async function getInterventions(req, res, next) {
    try {
        const tenantId = req.user?.tenantId || req.headers["x-tenant-id"] || 1;
        const filters = {
            status: req.query.status,
            severity: req.query.severity,
            studentId: req.query.studentId
        };

        const list = await service.getInterventions(tenantId, filters);
        return res.status(200).json({
            success: true,
            count: list.length,
            data: list
        });
    } catch (error) {
        if (logger.error) logger.error("AI_GET_INTERVENTIONS_ERROR", { message: error.message });
        return next(error);
    }
}

async function updateInterventionStatus(req, res, next) {
    try {
        const tenantId = req.user?.tenantId || req.headers["x-tenant-id"] || 1;
        const { id } = req.params;
        const { status, actionNotes } = req.body;
        const updatedById = req.user?.id || null;

        if (!status) {
            return res.status(400).json({
                success: false,
                message: "status is required (OPEN, IN_PROGRESS, RESOLVED, DISMISSED)."
            });
        }

        const updated = await service.updateInterventionStatus(tenantId, id, status, actionNotes, updatedById);
        return res.status(200).json({
            success: true,
            message: `Intervention ${id} updated to ${status}.`,
            data: updated
        });
    } catch (error) {
        if (logger.error) logger.error("AI_UPDATE_INTERVENTION_ERROR", { message: error.message });
        return next(error);
    }
}

async function runSystemDiagnostics(req, res, next) {
    try {
        const tenantId = req.user?.tenantId || req.headers["x-tenant-id"] || null;
        const scanType = req.body.scanType || "FULL_ARCHITECTURE";
        const executedById = req.user?.id || null;

        const scan = await service.runSystemDiagnostics(tenantId, scanType, executedById);
        return res.status(201).json({
            success: true,
            message: "AI Developer Architecture & System Diagnostics completed successfully.",
            data: scan
        });
    } catch (error) {
        if (logger.error) logger.error("AI_RUN_SYSTEM_DIAGNOSTICS_ERROR", { message: error.message });
        return next(error);
    }
}

async function getSystemDiagnosticsHistory(req, res, next) {
    try {
        const limit = req.query.limit || 10;
        const history = await service.getSystemDiagnosticsHistory(limit);
        return res.status(200).json({
            success: true,
            count: history.length,
            data: history
        });
    } catch (error) {
        if (logger.error) logger.error("AI_GET_DIAGNOSTICS_HISTORY_ERROR", { message: error.message });
        return next(error);
    }
}

async function getTelemetry(req, res, next) {
    try {
        const tenantId = req.user?.tenantId || req.headers["x-tenant-id"] || 1;
        const telemetry = await service.getTelemetry(tenantId);
        return res.status(200).json({
            success: true,
            data: telemetry
        });
    } catch (error) {
        if (logger.error) logger.error("AI_GET_TELEMETRY_ERROR", { message: error.message });
        return next(error);
    }
}

module.exports = {
    getStatus,
    diagnoseStudent,
    diagnoseCohort,
    generateStudyPlan,
    getStudyPlans,
    createIntervention,
    getInterventions,
    updateInterventionStatus,
    runSystemDiagnostics,
    getSystemDiagnosticsHistory,
    getTelemetry
};
