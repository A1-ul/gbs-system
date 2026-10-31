const migrationService = require('./migration.service');

class MigrationController {
  async getJobs(req, res) {
    try {
      const tenantId = req.user?.tenantId || parseInt(req.query.tenantId) || 1;
      const jobs = await migrationService.getJobs(tenantId);
      res.status(200).json({ success: true, count: jobs.length, data: jobs });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async getJobById(req, res) {
    try {
      const tenantId = req.user?.tenantId || parseInt(req.query.tenantId) || 1;
      const job = await migrationService.getJobById(req.params.id, tenantId);
      res.status(200).json({ success: true, data: job });
    } catch (err) {
      res.status(404).json({ success: false, message: err.message });
    }
  }

  async importDataset(req, res) {
    try {
      const tenantId = req.user?.tenantId || parseInt(req.body.tenantId) || 1;
      const job = await migrationService.importDataset(tenantId, req.body);
      res.status(201).json({
        success: true,
        message: 'Dataset imported and committed to PostgreSQL successfully.',
        data: job
      });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async rollbackJob(req, res) {
    try {
      const tenantId = req.user?.tenantId || parseInt(req.body.tenantId) || 1;
      const result = await migrationService.rollbackJob(req.params.id, tenantId);
      res.status(200).json({
        success: true,
        message: 'Batch rollback completed successfully.',
        data: result
      });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  getTemplates(req, res) {
    const templates = migrationService.getTemplates();
    res.status(200).json({ success: true, data: templates });
  }
}

module.exports = new MigrationController();
