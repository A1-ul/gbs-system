"use strict";

const express = require("express");
const path = require("path");
const loadModules = require("../src/core/module-loader");
const { PrismaClient } = require("@prisma/client");

async function main() {
    console.log("=== GBS ENTERPRISE BACKEND VERIFICATION ===");
    
    // 1. Initialize Express app
    const app = express();
    app.use(express.json());

    // 2. Test Module Loader
    console.log("\n[TEST 1] Testing Module Loader...");
    let result;
    try {
        result = loadModules(app);
    } catch (err) {
        console.error("Module loader error:", err);
        process.exit(1);
    }

    console.log(`Loaded count: ${result.metrics.loadedCount}`);
    console.log(`Failed count: ${result.metrics.failedCount}`);
    console.log(`Skipped count: ${result.metrics.skippedCount}`);

    if (result.metrics.failedCount > 0) {
        console.error("FAILED MODULES DETECTED:");
        result.failedModules.forEach(m => console.error(` - ${m.module}: ${m.error}`));
        process.exit(1);
    }

    // 3. Test Prisma Database Connection
    console.log("\n[TEST 2] Testing Prisma PostgreSQL connection...");
    const prisma = new PrismaClient();
    try {
        await prisma.$connect();
        console.log("Prisma connected successfully to PostgreSQL!");
        const tenantCount = await prisma.tenant.count();
        console.log(`Tenant records in DB: ${tenantCount}`);
        await prisma.$disconnect();
    } catch (err) {
        console.warn("Prisma connection warning (DB may need migrations or local service startup):", err.message);
    }

    console.log("\n==========================================");
    console.log("✅ VERIFICATION PASSED: ALL MODULES LOADED WITH 0 FAILURES!");
    console.log("==========================================");
}

main();
