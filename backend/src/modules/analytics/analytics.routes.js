"use strict";

const express = require("express");
const router = express.Router();
const controller = require("./analytics.controller");

const { protect } = require("../../middleware/auth.middleware");
const prisma = require("../../core/database/prisma.client");
const { readPersistentStore } = require("../../core/database/persistentStore");

router.get("/status", (req, res, next) => controller.getStatus(req, res, next));
router.get("/", (req, res, next) => controller.getStatus(req, res, next));

router.get("/dashboard", protect, async (req, res) => {
  const tid = parseInt(req.tenantId || req.user?.tenantId || 1, 10) || 1;
  const store = readPersistentStore();
  let studentCount = 0;
  let teacherCount = 0;
  let invoiceCount = 0;
  try {
    [studentCount, teacherCount, invoiceCount] = await Promise.all([
      prisma.user.count({ where: { tenantId: tid, role: "STUDENT", isDeleted: false } }),
      prisma.user.count({ where: { tenantId: tid, role: "TEACHER", isDeleted: false } }),
      prisma.invoice.count({ where: { tenantId: tid } }).catch(() => 0)
    ]);
  } catch { }
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
});

router.get("/stats", protect, async (req, res) => {
  const tid = parseInt(req.tenantId || req.user?.tenantId || 1, 10) || 1;
  let users = 0;
  try {
    users = await prisma.user.count({ where: { tenantId: tid, isDeleted: false } });
  } catch { }
  return res.status(200).json({
    status: "success",
    data: { tenantId: tid, activeUsers: users, uptimeSeconds: Math.round(process.uptime()) }
  });
});

router.get("/charts", protect, async (req, res) => {
  const tid = parseInt(req.tenantId || req.user?.tenantId || 1, 10) || 1;
  let roleGroups = [];
  try {
    roleGroups = await prisma.user.groupBy({
      by: ["role"],
      where: { tenantId: tid, isDeleted: false },
      _count: { _all: true }
    });
  } catch { }
  return res.status(200).json({
    status: "success",
    data: {
      roleDistribution: roleGroups.map((g) => ({ role: g.role, count: g._count._all }))
    }
  });
});

router.get("/activity", protect, async (req, res) => {
  const tid = parseInt(req.tenantId || req.user?.tenantId || 1, 10) || 1;
  let logs = [];
  try {
    logs = await prisma.auditLog.findMany({
      where: { tenantId: tid },
      orderBy: { createdAt: "desc" },
      take: 25
    });
  } catch { }
  return res.status(200).json({ status: "success", results: logs.length, data: { activities: logs } });
});

module.exports = router;
