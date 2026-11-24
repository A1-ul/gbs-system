'use strict';

const prisma = require('./prisma.client');

let ensuredOnce = false;
let ensurePromise = null;

/**
 * Ensures additive PostgreSQL tables for Ghana NaCCA Teacher Lesson Planning,
 * Structured Lesson Notes Vetting, Review History, and Faculty Directives exist
 * without dropping or modifying any existing institutional tables.
 */
async function ensureLessonPlanTables() {
  if (ensuredOnce) return true;
  if (ensurePromise) return ensurePromise;

  ensurePromise = (async () => {
    try {
      if (typeof prisma.isPostgresOnline === 'function') {
        const online = await prisma.isPostgresOnline();
        if (!online) {
          ensuredOnce = true;
          return true;
        }
      }

      const ddlStatements = [
        `CREATE TABLE IF NOT EXISTS teacher_lesson_plans (
          "id" TEXT PRIMARY KEY,
          "tenantId" INTEGER NOT NULL,
          "planType" TEXT NOT NULL DEFAULT 'LESSON_NOTES',
          "title" TEXT NOT NULL,
          "subjectName" TEXT NOT NULL,
          "className" TEXT NOT NULL,
          "term" TEXT,
          "weekNumber" TEXT,
          "lessonDate" TEXT,
          "durationMinutes" INTEGER DEFAULT 60,
          "topic" TEXT,
          "strand" TEXT,
          "subStrand" TEXT,
          "curriculumReference" TEXT,
          "educationalLevel" TEXT,
          "status" TEXT NOT NULL DEFAULT 'DRAFT',
          "revisionNumber" INTEGER NOT NULL DEFAULT 1,
          "teacherId" TEXT,
          "teacherName" TEXT,
          "teacherEmail" TEXT,
          "teacherPosition" TEXT,
          "resourcesAttached" TEXT,
          "structuredJson" TEXT,
          "reviewHistoryJson" TEXT,
          "headmasterRemarks" TEXT,
          "vettedBy" TEXT,
          "vettedById" TEXT,
          "vettedAt" TIMESTAMP(3),
          "submittedAt" TIMESTAMP(3),
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE INDEX IF NOT EXISTS idx_teacher_lesson_plans_tenant_status ON teacher_lesson_plans ("tenantId", "status")`,
        `CREATE INDEX IF NOT EXISTS idx_teacher_lesson_plans_tenant_teacher ON teacher_lesson_plans ("tenantId", "teacherId")`,
        `CREATE INDEX IF NOT EXISTS idx_teacher_lesson_plans_tenant_updated ON teacher_lesson_plans ("tenantId", "updatedAt" DESC)`,
        `CREATE TABLE IF NOT EXISTS teacher_faculty_directives (
          "id" TEXT PRIMARY KEY,
          "tenantId" INTEGER NOT NULL,
          "target" TEXT NOT NULL DEFAULT 'ALL',
          "targetTeacherName" TEXT,
          "subject" TEXT NOT NULL,
          "message" TEXT NOT NULL,
          "issuedBy" TEXT,
          "issuedById" TEXT,
          "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE INDEX IF NOT EXISTS idx_teacher_faculty_directives_tenant ON teacher_faculty_directives ("tenantId", "issuedAt" DESC)`
      ];

      for (const sql of ddlStatements) {
        try {
          await prisma.$executeRawUnsafe(sql);
        } catch (err) {
          console.warn('[LessonPlanTables] Non-fatal DDL notice:', err?.message || err);
        }
      }

      ensuredOnce = true;
      return true;
    } catch (err) {
      console.warn('[LessonPlanTables] Bootstrap warning (non-fatal):', err?.message || err);
      return false;
    } finally {
      ensurePromise = null;
    }
  })();

  return ensurePromise;
}

module.exports = { ensureLessonPlanTables };
