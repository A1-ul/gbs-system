"use strict";

/*
==================================================
GBS ENTERPRISE MODULE LOADER
PRODUCTION HARDENED
BASE PATH SUPPORT
COMMONJS ONLY
==================================================
*/

const fs = require("fs");
const path = require("path");

let logger;

try {
    logger = require("../utils/logger");
} catch {
    logger = {
        info: console.log,
        warn: console.warn,
        error: console.error
    };
}

const MODULES_DIRECTORY = path.join(
    process.cwd(),
    "src",
    "modules"
);

const API_PREFIX = "/api/v1";

function normalize(value) {
    return String(value || "")
        .trim()
        .toLowerCase();
}

function isRouter(router) {
    return Boolean(
        router &&
        typeof router === "function" &&
        typeof router.use === "function"
    );
}

function buildRoute(moduleName) {
    return `${API_PREFIX}/${normalize(moduleName)}`;
}

function resolveRoute(mod, moduleName) {

    /*
    ==========================================
    MODULE OVERRIDE
    ==========================================
    */

    if (
        typeof mod.basePath === "string" &&
        mod.basePath.trim()
    ) {
        return mod.basePath.trim();
    }

    /*
    ==========================================
    DEFAULT
    ==========================================
    */

    return buildRoute(moduleName);
}

function loadModules(app) {

    if (!app || typeof app.use !== "function") {
        throw new Error(
            "Invalid Express app supplied"
        );
    }

    const loadedModules = [];
    const failedModules = [];
    const skippedModules = [];

    const routeRegistry = new Set();
    const moduleRegistry = new Set();

    let totalFolders = 0;

    const folders =
        fs.readdirSync(MODULES_DIRECTORY);

    for (const folder of folders) {

        const folderPath =
            path.join(
                MODULES_DIRECTORY,
                folder
            );

        if (
            !fs.existsSync(folderPath) ||
            !fs.statSync(folderPath).isDirectory()
        ) {
            continue;
        }

        totalFolders++;

        try {

            const moduleFile =
                path.join(
                    folderPath,
                    `${folder}.module.js`
                );

            if (!fs.existsSync(moduleFile)) {

                skippedModules.push({
                    module: folder,
                    reason: "MODULE_FILE_NOT_FOUND"
                });

                continue;
            }

            delete require.cache[
                require.resolve(moduleFile)
            ];

            const mod =
                require(moduleFile);

            if (
                !mod ||
                typeof mod !== "object"
            ) {
                throw new Error(
                    "INVALID_MODULE_EXPORT"
                );
            }

            const moduleName =
                normalize(
                    mod.name || folder
                );

            if (!moduleName) {
                throw new Error(
                    "INVALID_MODULE_NAME"
                );
            }

            if (
                moduleRegistry.has(moduleName)
            ) {
                throw new Error(
                    `DUPLICATE_MODULE:${moduleName}`
                );
            }

            if (
                !isRouter(mod.routes)
            ) {
                throw new Error(
                    "INVALID_ROUTER_EXPORT"
                );
            }

            const routePath =
                resolveRoute(
                    mod,
                    moduleName
                );

            if (
                routeRegistry.has(routePath)
            ) {
                throw new Error(
                    `DUPLICATE_ROUTE:${routePath}`
                );
            }

            app.use(
                routePath,
                mod.routes
            );

            routeRegistry.add(
                routePath
            );

            moduleRegistry.add(
                moduleName
            );

            if (
                typeof mod.initialize ===
                "function"
            ) {
                try {
                    mod.initialize();
                } catch (err) {
                    logger.warn(
                        `[MODULE INIT FAILED] ${moduleName}`,
                        {
                            error: err.message
                        }
                    );
                }
            }

            loadedModules.push({
                module: moduleName,
                route: routePath
            });

            logger.info(
                `[MODULE LOADED] ${moduleName} -> ${routePath}`
            );

        } catch (err) {

            failedModules.push({
                module: folder,
                error: err.message
            });

            logger.error(
                `[MODULE FAILED] ${folder} -> ${err.message}`
            );
        }
    }

    logger.info(`
==================================================
MODULE LOADER SUMMARY
==================================================
TOTAL FOLDERS : ${totalFolders}
LOADED        : ${loadedModules.length}
FAILED        : ${failedModules.length}
SKIPPED       : ${skippedModules.length}
==================================================
`);

    return Object.freeze({
        success:
            failedModules.length === 0,
        loadedModules,
        failedModules,
        skippedModules,
        metrics: {
            totalModules:
                totalFolders,
            loadedCount:
                loadedModules.length,
            failedCount:
                failedModules.length,
            skippedCount:
                skippedModules.length
        }
    });
}

module.exports =
    loadModules;