"use strict";

const express = require("express");
const router = express.Router();
const dataMigrationService = require("./data-migration.service");

router.post("/import", async (req, res) => {
  try {
    const { tenantId, entityType, fileBase64 } = req.body;
    const fileBuffer = Buffer.from(fileBase64 || "", "base64");
    const result = await dataMigrationService.processMigrationJob(tenantId, entityType, fileBuffer);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/validate-mapping", async (req, res) => {
  try {
    const { mapping } = req.body;
    const result = await dataMigrationService.validateFieldMapping(mapping);
    return res.status(200).json({ success: true, result });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
