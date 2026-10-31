"use strict";

/*
====================================
GBS AUTOMATIC CODE BOILERPLATE FILLER
====================================
*/

const fs = require("fs");
const path = require("path");

const rootDir = path.join(__dirname, "..", "src");

function getModuleName(filePath, fileType) {
    const base = path.basename(filePath);
    if (base === "index.js") {
        return path.basename(path.dirname(filePath));
    }
    return base.replace(fileType, "");
}

function processDirectory(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            processDirectory(fullPath);
        } else if (file.endsWith(".js") && stat.size === 0) {
            fillFile(fullPath);
        }
    }
}

function fillFile(filePath) {
    const fileName = path.basename(filePath);
    const dir = path.dirname(filePath);
    let content = "";

    if (fileName === "index.js") {
        // Find first JS file in this directory that isn't index.js
        const files = fs.readdirSync(dir).filter(f => f !== "index.js" && f.endsWith(".js"));
        if (files.length > 0) {
            const firstFile = files[0];
            const exportName = firstFile.replace(".js", "");
            content = `"use strict";

module.exports = require("./${exportName}");
`;
        } else {
            content = `"use strict";

module.exports = {};
`;
        }
    } else if (fileName.endsWith(".module.js")) {
        const baseName = getModuleName(filePath, ".module.js");
        const routesFile = path.join(dir, `${baseName}.routes.js`);
        const hasRoutes = fs.existsSync(routesFile);
        content = `"use strict";

${hasRoutes ? `const routes = require("./${baseName}.routes");` : ""}

module.exports = {
    name: "${baseName}",
    ${hasRoutes ? "routes," : ""}
    initialize() {
        console.log("[${baseName.toUpperCase()} MODULE] Initialized");
    }
};
`;
    } else if (fileName.endsWith(".routes.js")) {
        const baseName = getModuleName(filePath, ".routes.js");
        const controllerFile = path.join(dir, `${baseName}.controller.js`);
        const hasController = fs.existsSync(controllerFile);

        if (hasController) {
            content = `"use strict";

const express = require("express");
const router = express.Router();
const controller = require("./${baseName}.controller");

router.get("/", (req, res, next) => {
    if (controller && typeof controller.getStatus === "function") {
        return controller.getStatus(req, res, next);
    }
    return res.status(200).json({ success: true, message: "${baseName} status normal" });
});

module.exports = router;
`;
        } else {
            content = `"use strict";

const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
    return res.status(200).json({ success: true, message: "${baseName} status normal" });
});

module.exports = router;
`;
        }
    } else if (fileName.endsWith(".controller.js")) {
        const baseName = getModuleName(filePath, ".controller.js");
        const serviceFile = path.join(dir, `${baseName}.service.js`);
        const hasService = fs.existsSync(serviceFile);

        content = `"use strict";

const logger = require("../../utils/logger") || console;
${hasService ? `const service = require("./${baseName}.service");` : ""}

async function getStatus(req, res, next) {
    try {
        ${hasService ? `const data = await service.getStatus();` : `const data = { status: "healthy" };`}
        return res.status(200).json({
            success: true,
            data,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        if (logger.error) {
            logger.error("${baseName.toUpperCase()}_CONTROLLER_ERROR", { message: error.message, stack: error.stack });
        }
        return next(error);
    }
}

module.exports = {
    getStatus
};
`;
    } else if (fileName.endsWith(".service.js")) {
        const baseName = getModuleName(filePath, ".service.js");
        const repositoryFile = path.join(dir, `${baseName}.repository.js`);
        const hasRepository = fs.existsSync(repositoryFile);

        content = `"use strict";

const logger = require("../../utils/logger") || console;
${hasRepository ? `const repository = require("./${baseName}.repository");` : ""}

async function getStatus() {
    try {
        ${hasRepository ? `const records = await repository.findAll();` : `const records = [];`}
        return { status: "healthy", count: records.length };
    } catch (error) {
        if (logger.error) {
            logger.error("${baseName.toUpperCase()}_SERVICE_ERROR", { message: error.message });
        }
        throw error;
    }
}

module.exports = {
    getStatus
};
`;
    } else if (fileName.endsWith(".repository.js")) {
        const baseName = getModuleName(filePath, ".repository.js");

        content = `"use strict";

const logger = require("../../utils/logger") || console;
const { prisma } = require("../../config/db");

async function findAll() {
    try {
        const modelName = "${baseName}";
        if (prisma && prisma[modelName] && typeof prisma[modelName].findMany === "function") {
            return await prisma[modelName].findMany();
        }
        return [];
    } catch (error) {
        if (logger.error) {
            logger.error("${baseName.toUpperCase()}_REPOSITORY_FIND_ALL_ERROR", { message: error.message });
        }
        return [];
    }
}

module.exports = {
    findAll
};
`;
    } else if (fileName.endsWith(".validator.js")) {
        content = `"use strict";

module.exports = [];
`;
    } else if (fileName.endsWith(".events.js")) {
        content = `"use strict";

const EventEmitter = require("events");
class ModuleEmitter extends EventEmitter {}
module.exports = new ModuleEmitter();
`;
    } else if (fileName.endsWith(".guard.js") || fileName.endsWith(".middleware.js")) {
        content = `"use strict";

module.exports = (req, res, next) => {
    next();
};
`;
    } else {
        content = `"use strict";

module.exports = {};
`;
    }

    if (content) {
        fs.writeFileSync(filePath, content, "utf8");
        console.log(`Filled empty file: ${filePath}`);
    }
}

console.log("Starting to fill empty files recursively...");
processDirectory(rootDir);
console.log("Boilerplate filling process complete.");
