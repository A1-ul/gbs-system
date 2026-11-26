"use strict";

const express = require("express");
const router = express.Router();
const controller = require("./analytics.controller");

const { protect } = require("../../middleware/auth.middleware");
const prisma = require("../../core/database/prisma.client");
const { readPersistentStore } = require("../../core/database/persistentStore");

router.get("/status", (req, res, next) => controller.getStatus(req, res, next));
router.get("/", (req, res, next) => controller.getStatus(req, res, next));

router.get("/dashboard", protect, async (req, res, next) => {
  try {
    const tid = parseInt(req.tenantId || req.user?.tenantId || 1, 10) || 1;
    const store = readPersistentStore();
    const [studentCount, teacherCount, invoiceCount] = await Promise.all([
      prisma.user.count({ where: { tenantId: tid, role: "STUDENT", isDeleted: false } }),
      prisma.user.count({ where: { tenantId: tid, role: "TEACHER", isDeleted: false } }),
      prisma.invoice.count({ where: { tenantId: tid } })
    ]);
    return res.status(200).json({
      status: "success",
      data: {
        tenantId: tid,
        totalStudents: studentCount,
        totalTeachers: teacherCount,
        totalInvoices: invoiceCount,
        registeredInstitutions: (store.institutions || []).length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (err) {
    return next(err);
  }
});

router.get("/stats", protect, async (req, res, next) => {
  try {
    const tid = parseInt(req.tenantId || req.user?.tenantId || 1, 10) || 1;
    const users = await prisma.user.count({ where: { tenantId: tid, isDeleted: false } });
    return res.status(200).json({
      status: "success",
      data: { tenantId: tid, activeUsers: users, uptimeSeconds: Math.round(process.uptime()) }
    });
  } catch (err) {
    return next(err);
  }
});

router.get("/charts", protect, async (req, res, next) => {
  try {
    const tid = parseInt(req.tenantId || req.user?.tenantId || 1, 10) || 1;
    const roleGroups = await prisma.user.groupBy({
      by: ["role"],
      where: { tenantId: tid, isDeleted: false },
      _count: { _all: true }
    });
    return res.status(200).json({
      status: "success",
      data: {
        roleDistribution: roleGroups.map((g) => ({ role: g.role, count: g._count._all }))
      }
    });
  } catch (err) {
    return next(err);
  }
});

router.get("/activity", protect, async (req, res, next) => {
  try {
    const tid = parseInt(req.tenantId || req.user?.tenantId || 1, 10) || 1;
    const logs = await prisma.auditLog.findMany({
      where: { tenantId: tid },
      orderBy: { createdAt: "desc" },
      take: 25
    });
    return res.status(200).json({ status: "success", results: logs.length, data: { activities: logs } });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
