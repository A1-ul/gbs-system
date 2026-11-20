"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const CDN_VAULT_DIR = path.join(process.cwd(), "data", "cdn_vault");

// Ensure local edge storage vault directory exists
if (!fs.existsSync(CDN_VAULT_DIR)) {
  fs.mkdirSync(CDN_VAULT_DIR, { recursive: true });
}

// Global Cloud CDN Edge Nodes Simulation
const EDGE_REGIONS = [
  { id: "af-south-1", location: "Accra / Cape Town Gateway", status: "HEALTHY", latencyMs: 7, bandwidthGbps: 100 },
  { id: "eu-west-1", location: "Dublin / Frankfurt Node", status: "HEALTHY", latencyMs: 24, bandwidthGbps: 250 },
  { id: "us-east-1", location: "N. Virginia Multi-Region Core", status: "HEALTHY", latencyMs: 68, bandwidthGbps: 500 }
];

// Persistent metadata storage file
const CDN_META_FILE = path.join(CDN_VAULT_DIR, "cdn_assets_meta.json");

function loadAssetsMeta() {
  try {
    if (fs.existsSync(CDN_META_FILE)) {
      return JSON.parse(fs.readFileSync(CDN_META_FILE, "utf-8"));
    }
  } catch {}
  return [
    {
      id: "CDN-RPT-001",
      fileName: "Term3_Terminal_Report_Kwesi_Mensah.pdf",
      category: "report-cards",
      tenantCode: "GBS-MAIN",
      mimeType: "application/pdf",
      fileSizeBytes: 2450890,
      formattedSize: "2.34 MB",
      s3Bucket: "gbs-report-cards-vault",
      cdnUrl: "https://cdn.gbs-system.org/vault/GBS-MAIN/report-cards/Term3_Terminal_Report_Kwesi_Mensah.pdf",
      sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      cacheControl: "public, max-age=31536000, immutable",
      uploadedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
      viewsCount: 142
    },
    {
      id: "CDN-VID-002",
      fileName: "Physics_Quantum_Electrodynamics_Lecture_4K.mp4",
      category: "videos",
      tenantCode: "GBS-MAIN",
      mimeType: "video/mp4",
      fileSizeBytes: 184549200,
      formattedSize: "176.00 MB",
      s3Bucket: "gbs-classroom-videos-vault",
      cdnUrl: "https://cdn.gbs-system.org/vault/GBS-MAIN/videos/Physics_Quantum_Electrodynamics_Lecture_4K.mp4",
      sha256: "ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb",
      cacheControl: "public, max-age=31536000, immutable",
      uploadedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
      viewsCount: 890
    },
    {
      id: "CDN-SEC-003",
      fileName: "Perimeter_Camera_Gate_North_Snapshot.jpg",
      category: "cctv-snapshots",
      tenantCode: "GBS-MAIN",
      mimeType: "image/jpeg",
      fileSizeBytes: 1250440,
      formattedSize: "1.19 MB",
      s3Bucket: "gbs-security-cctv-vault",
      cdnUrl: "https://cdn.gbs-system.org/vault/GBS-MAIN/cctv-snapshots/Perimeter_Camera_Gate_North_Snapshot.jpg",
      sha256: "3e23e8160039594a33894f6564e1b1348bbd7a0088d42c4acb73eeaed59c009d",
      cacheControl: "public, max-age=31536000, immutable",
      uploadedAt: new Date().toISOString(),
      viewsCount: 45
    }
  ];
}

function saveAssetsMeta(assets) {
  try {
    fs.writeFileSync(CDN_META_FILE, JSON.stringify(assets, null, 2));
  } catch {}
}

async function getCDNStatus() {
  const assets = loadAssetsMeta();
  const totalBytes = assets.reduce((sum, a) => sum + (a.fileSizeBytes || 0), 0);
  const totalViews = assets.reduce((sum, a) => sum + (a.viewsCount || 1), 0);

  return {
    status: "OPERATIONAL",
    provider: "GBS S3-Compatible Global Cloud CDN Engine",
    architecture: "Edge Cached Object Storage with Local Fast NVMe Cache",
    edgeNodes: EDGE_REGIONS,
    metrics: {
      cacheHitRatio: "99.4%",
      bandwidthSavedGb: "2480.5 GB",
      avgEdgeLatencyMs: 9.2,
      activeBuckets: [
        "gbs-report-cards-vault",
        "gbs-classroom-videos-vault",
        "gbs-security-cctv-vault",
        "gbs-identity-badges-vault"
      ],
      totalObjectsStored: assets.length,
      totalStorageBytes: totalBytes,
      totalFormattedStorage: `${(totalBytes / (1024 * 1024)).toFixed(2)} MB`,
      totalGlobalRequests: totalViews * 12 + 1420
    },
    timestamp: new Date().toISOString()
  };
}

async function getAssets(category, tenantCode = null) {
  let assets = loadAssetsMeta();
  if (tenantCode && String(tenantCode).toUpperCase() !== "ALL") {
    const cleanTenant = String(tenantCode).trim().toUpperCase();
    assets = assets.filter((a) => String(a.tenantCode || "GBS-MAIN").toUpperCase() === cleanTenant);
  }
  if (category) {
    assets = assets.filter((a) => a.category === category);
  }
  return assets;
}

async function uploadAsset({ fileName, category, tenantCode, tenantId, mimeType, fileData }) {
  const assets = loadAssetsMeta();
  const cleanName = (fileName || `asset_${Date.now()}`).replace(/[^a-zA-Z0-9._-]/g, "_");
  const cleanCategory = (category || "report-cards").toLowerCase();
  const cleanTenant = String(tenantCode || (tenantId ? `TENANT-${tenantId}` : "GBS-MAIN")).trim().toUpperCase();

  // Compute deterministic SHA-256 over actual file content to prevent duplicate storage
  const rawContentBuffer = fileData
    ? Buffer.from(String(fileData).replace(/^data:[^;]+;base64,/, ""), "base64")
    : Buffer.from(`${cleanTenant}:${cleanCategory}:${cleanName}`, "utf8");
  const sha256 = crypto.createHash("sha256").update(rawContentBuffer).digest("hex");

  // Deduplication check: if this tenant already uploaded identical content (matching SHA-256), reuse existing storage object
  const existingDuplicate = assets.find(
    (a) =>
      a.sha256 === sha256 &&
      String(a.tenantCode || "GBS-MAIN").toUpperCase() === cleanTenant
  );
  if (existingDuplicate) {
    return {
      ...existingDuplicate,
      deduplicated: true,
      duplicatePrevented: true
    };
  }

  const id = `CDN-${Date.now().toString().slice(-6)}`;
  let byteSize = fileData ? rawContentBuffer.length : 1048576;
  if (fileData) {
    try {
      const tenantDir = path.join(CDN_VAULT_DIR, cleanTenant);
      if (!fs.existsSync(tenantDir)) {
        fs.mkdirSync(tenantDir, { recursive: true });
      }
      const targetPath = path.join(tenantDir, `${sha256.slice(0, 16)}_${cleanName}`);
      if (!fs.existsSync(targetPath)) {
        fs.writeFileSync(targetPath, rawContentBuffer);
      }
    } catch {}
  }

  const formattedSize = byteSize > 1048576 
    ? `${(byteSize / (1024 * 1024)).toFixed(2)} MB` 
    : `${(byteSize / 1024).toFixed(1)} KB`;

  const newAsset = {
    id,
    fileName: cleanName,
    category: cleanCategory,
    tenantCode: cleanTenant,
    tenantId: Number(tenantId) || 1,
    mimeType: mimeType || "application/octet-stream",
    fileSizeBytes: byteSize,
    formattedSize,
    s3Bucket: `gbs-${cleanCategory}-vault`,
    cdnUrl: `https://cdn.gbs-system.org/vault/${cleanTenant}/${cleanCategory}/${cleanName}`,
    sha256,
    deduplicated: false,
    cacheControl: "private, max-age=31536000, immutable",
    uploadedAt: new Date().toISOString(),
    viewsCount: 1
  };

  const updated = [newAsset, ...assets];
  saveAssetsMeta(updated);
  return newAsset;
}

async function generatePresignedUrl({ assetId, expiresInSeconds = 3600, tenantCode = null }) {
  const assets = loadAssetsMeta();
  const asset = assets.find((a) => a.id === assetId || a.fileName === assetId);
  const signature = crypto.randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();

  if (!asset) {
    return {
      presignedUrl: `https://cdn.gbs-system.org/vault/presigned?token=${signature}&expires=${expiresAt}`,
      expiresAt,
      expiresInSeconds
    };
  }

  // Enforce strict tenant file isolation: another school cannot sign URLs for this institution's document
  if (
    tenantCode &&
    String(tenantCode).toUpperCase() !== "ALL" &&
    String(asset.tenantCode || "GBS-MAIN").toUpperCase() !== String(tenantCode).trim().toUpperCase()
  ) {
    const err = new Error("Access denied: You do not have permission to access files belonging to another institution.");
    err.statusCode = 403;
    throw err;
  }

  return {
    assetId: asset.id,
    fileName: asset.fileName,
    tenantCode: asset.tenantCode,
    presignedUrl: `${asset.cdnUrl}?X-Amz-Signature=${signature}&X-Amz-Expires=${expiresInSeconds}`,
    cdnEdgeUrl: asset.cdnUrl,
    expiresAt,
    expiresInSeconds,
    cacheControl: asset.cacheControl
  };
}

module.exports = {
  getCDNStatus,
  getAssets,
  uploadAsset,
  generatePresignedUrl
};
