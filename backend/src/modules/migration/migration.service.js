const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class MigrationService {
  async getJobs(tenantId = 1) {
    const jobs = await prisma.migrationJob.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' }
    });
    return jobs;
  }

  async getJobById(id, tenantId = 1) {
    const job = await prisma.migrationJob.findFirst({
      where: { id: parseInt(id), tenantId }
    });
    if (!job) {
      throw new Error(`Migration job ID ${id} not found.`);
    }
    return job;
  }

  async importDataset(tenantId = 1, { entityType = 'STUDENTS', filename = 'dataset_import.csv', records = [], classLevel = '', department = '' }) {
    const normEntity = entityType.toUpperCase();
    const totalRecords = Array.isArray(records) && records.length > 0 ? records.length : 12;
    const targetTag = classLevel || department || '';
    const storedEntity = targetTag ? `${normEntity} [${targetTag}]` : normEntity;

    // Create job record
    const job = await prisma.migrationJob.create({
      data: {
        tenantId,
        filename,
        entityType: storedEntity,
        totalRecords,
        processedCount: 0,
        failedCount: 0,
        status: 'PROCESSING'
      }
    });

    let processed = 0;
    let failed = 0;
    const errors = [];

    // Simulate batch execution into database tables based on entityType
    if (normEntity === 'STUDENTS' || normEntity === 'TEACHERS' || normEntity === 'PARENTS') {
      const roleMap = { STUDENTS: 'STUDENT', TEACHERS: 'TEACHER', PARENTS: 'PARENT' };
      const role = roleMap[normEntity];

      for (let i = 1; i <= totalRecords; i++) {
        try {
          const email = `import.${role.toLowerCase()}.${job.id}.${i}@gbs.edu`;
          const exists = await prisma.user.findUnique({ where: { email } });
          if (!exists) {
            await prisma.user.create({
              data: {
                tenantId,
                email,
                firstName: `Imported_${role}`,
                lastName: `Batch_${job.id}_#${i}`,
                password: '$2a$10$YourHashedPasswordPlaceholderHereXYZ',
                role,
                isActive: true
              }
            });
          }
          processed++;
        } catch (err) {
          failed++;
          errors.push({ record: i, error: err.message });
        }
      }
    } else {
      // General financial or academic records
      processed = totalRecords;
    }

    const updatedJob = await prisma.migrationJob.update({
      where: { id: job.id },
      data: {
        processedCount: processed,
        failedCount: failed,
        status: failed === 0 ? 'COMPLETED' : 'COMPLETED_WITH_WARNINGS',
        errorsJson: errors.length > 0 ? JSON.stringify(errors) : null
      }
    });

    // Audit log
    try {
      await prisma.auditLog.create({
        data: {
          tenantId,
          action: 'DATA_MIGRATION_BATCH_IMPORTED',
          module: 'MIGRATION',
          details: `Job #${job.id}: Imported ${processed}/${totalRecords} ${normEntity} records from ${filename}`
        }
      });
    } catch (_) {}

    return updatedJob;
  }

  async rollbackJob(id, tenantId = 1) {
    const job = await this.getJobById(id, tenantId);
    if (job.status === 'ROLLED_BACK') {
      throw new Error(`Migration job #${id} has already been rolled back.`);
    }

    // Rollback imported user records created by this batch
    const deleted = await prisma.user.deleteMany({
      where: {
        tenantId,
        email: {
          contains: `.${job.id}.`
        }
      }
    });

    const updated = await prisma.migrationJob.update({
      where: { id: job.id },
      data: {
        status: 'ROLLED_BACK',
        errorsJson: JSON.stringify({ rollbackTime: new Date().toISOString(), recordsRemoved: deleted.count })
      }
    });

    // Audit log
    try {
      await prisma.auditLog.create({
        data: {
          tenantId,
          action: 'DATA_MIGRATION_ROLLED_BACK',
          module: 'MIGRATION',
          details: `Job #${job.id}: Rolled back ${deleted.count} imported records.`
        }
      });
    } catch (_) {}

    return {
      success: true,
      job: updated,
      recordsRemoved: deleted.count
    };
  }

  getTemplates() {
    return {
      STUDENTS: {
        filename: 'template_students.csv',
        headers: ['First Name', 'Last Name', 'Email', 'Grade/Class', 'Gender', 'Date of Birth', 'Emergency Phone']
      },
      TEACHERS: {
        filename: 'template_teachers.csv',
        headers: ['First Name', 'Last Name', 'Email', 'Department', 'Specialization', 'Highest Qualification', 'Experience Years']
      },
      PARENTS: {
        filename: 'template_parents.csv',
        headers: ['Parent Full Name', 'Email', 'Phone', 'Relationship', 'Linked Student ID/Email', 'Residential Address']
      },
      FEE_RECORDS: {
        filename: 'template_fee_schedules.csv',
        headers: ['Fee Title', 'Category', 'Academic Term', 'Amount Due', 'Currency', 'Due Date']
      }
    };
  }
}

module.exports = new MigrationService();
