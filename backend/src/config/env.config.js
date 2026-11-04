"use strict";

const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

// Check persistent store for developer-selected environment override if exists
const STORE_FILE = path.resolve(__dirname, "../../data/gbs_persistent_store.json");
let persistentEnv = null;
try {
  if (fs.existsSync(STORE_FILE)) {
    const raw = fs.readFileSync(STORE_FILE, "utf8");
    const parsed = JSON.parse(raw);
    persistentEnv = parsed.systemEnvironment || null;
  }
} catch (_) {}

// Preferred environment resolution: persistent override -> process.env.GBS_ENVIRONMENT -> process.env.NODE_ENV -> "production"
let ENV = persistentEnv || process.env.GBS_ENVIRONMENT || process.env.NODE_ENV || "production";
ENV = String(ENV).toUpperCase() === "PRODUCTION" ? "production" : "development";

// Load appropriate env file if exists
const envFile = ENV === "production" ? ".env.production" : ".env.development";
const envPath = path.resolve(__dirname, "../../", envFile);
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

const config = Object.freeze({
  env: ENV,
  environmentLabel: ENV === "production" ? "PRODUCTION" : "DEVELOPMENT",
  isProduction: ENV === "production",
  isDevelopment: ENV === "development",
  port: parseInt(process.env.PORT || "5001", 10),
  jwtSecret: process.env.JWT_SECRET || "GBS_ENTERPRISE_ACCESS_SECRET_2026_ULTRA_SECURE_KEY_123456789",
  jwtExpiresIn: process.env.JWT_ACCESS_EXPIRES || "1h",
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || "GBS_ENTERPRISE_REFRESH_SECRET_2026_ULTRA_SECURE_KEY_987654321",
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES || "7d",
  databaseUrl: process.env.DATABASE_URL,
  appName: process.env.APP_NAME || "GBS Enterprise Management System",
  isProd: ENV === "production",
  isDev: ENV === "development"
});

module.exports = config;
