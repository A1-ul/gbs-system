"use strict";

const cdnService = require("./cdn.service");

async function getStatus(req, res) {
  try {
    const data = await cdnService.getCDNStatus();
    return res.status(200).json({ status: "success", data });
  } catch (error) {
    return res.status(500).json({ status: "error", message: error.message });
  }
}

async function getAssets(req, res) {
  try {
    const { category } = req.query;
    const assets = await cdnService.getAssets(category);
    return res.status(200).json({ status: "success", count: assets.length, data: assets });
  } catch (error) {
    return res.status(500).json({ status: "error", message: error.message });
  }
}

async function uploadAsset(req, res) {
  try {
    const { fileName, category, tenantCode, mimeType, fileData } = req.body;
    if (!fileName) {
      return res.status(400).json({ status: "error", message: "fileName is required for CDN ingestion." });
    }
    const asset = await cdnService.uploadAsset({ fileName, category, tenantCode, mimeType, fileData });
    return res.status(201).json({
      status: "success",
      message: "Asset successfully ingested into S3-compatible cloud object store and broadcast to edge CDN nodes.",
      data: asset
    });
  } catch (error) {
    return res.status(500).json({ status: "error", message: error.message });
  }
}

async function generatePresignedUrl(req, res) {
  try {
    const { assetId, expiresInSeconds } = req.body;
    const result = await cdnService.generatePresignedUrl({ assetId, expiresInSeconds });
    return res.status(200).json({ status: "success", data: result });
  } catch (error) {
    return res.status(500).json({ status: "error", message: error.message });
  }
}

module.exports = {
  getStatus,
  getAssets,
  uploadAsset,
  generatePresignedUrl
};
