"use strict";

const fs =
    require("fs");

const path =
    require("path");

/*
====================================
REQUIRED MODULE FILES
====================================
*/

const REQUIRED_FILES = [

    "index.js",

    "controller",

    "service",

    "repository",

    "routes",

    "validator",

    "module"
];

/*
====================================
SAFE EXISTS
====================================
*/

function existsSafe(
    filePath
) {

    try {

        return fs.existsSync(
            filePath
        );

    } catch {

        return false;
    }
}

/*
====================================
FIND FILE
====================================
*/

function findModuleFile(
    modulePath,
    moduleName,
    keyword
) {

    try {

        const expected = path.join(

            modulePath,

            `${moduleName}.${keyword}.js`
        );

        if (
            existsSafe(
                expected
            )
        ) {

            return true;
        }

        const files =
            fs.readdirSync(
                modulePath
            );

        return files.some(
            function (
                file
            ) {

                return (
                    file.endsWith(
                        `.${keyword}.js`
                    )
                );
            }
        );

    } catch {

        return false;
    }
}

/*
====================================
AUDIT SINGLE MODULE
====================================
*/

function auditSingleModule(
    modulesPath,
    moduleName
) {

    const modulePath =
        path.join(
            modulesPath,
            moduleName
        );

    const result = {

        module:
            moduleName,

        status:
            "OK",

        errors: [],

        files: {}
    };

    try {

        const stats =
            fs.statSync(
                modulePath
            );

        if (
            !stats.isDirectory()
        ) {

            result.status =
                "INVALID";

            result.errors.push(
                "Not a directory"
            );

            return result;
        }

        /*
        ============================
        CHECK INDEX
        ============================
        */

        result.files.index =
            existsSafe(
                path.join(
                    modulePath,
                    "index.js"
                )
            );

        if (
            !result.files.index
        ) {

            result.errors.push(
                "Missing index.js"
            );
        }

        /*
        ============================
        CHECK STANDARD FILES
        ============================
        */

        REQUIRED_FILES
            .filter(
                function (
                    item
                ) {

                    return (
                        item !==
                        "index.js"
                    );
                }
            )
            .forEach(
                function (
                    item
                ) {

                    result.files[
                        item
                    ] =
                        findModuleFile(

                            modulePath,

                            moduleName,

                            item
                        );

                    if (
                        !result.files[
                            item
                        ]
                    ) {

                        result.errors.push(

                            `Missing ${item}`
                        );
                    }
                }
            );

        /*
        ============================
        LOAD MODULE
        ============================
        */

        const moduleFile =
            path.join(

                modulePath,

                `${moduleName}.module.js`
            );

        if (
            existsSafe(
                moduleFile
            )
        ) {

            try {

                delete require.cache[
                    require.resolve(
                        moduleFile
                    )
                ];

                const loaded =
                    require(
                        moduleFile
                    );

                if (
                    !loaded ||
                    typeof loaded !==
                        "object"
                ) {

                    result.errors.push(
                        "Invalid module export"
                    );
                }

                if (
                    !loaded.name
                ) {

                    result.errors.push(
                        "Missing module name"
                    );
                }

            } catch (
                error
            ) {

                result.errors.push(

                    `Module load failed: ${error.message}`
                );
            }
        }

        if (
            result.errors.length
        ) {

            result.status =
                "FAILED";
        }

        return result;

    } catch (
        error
    ) {

        result.status =
            "FAILED";

        result.errors.push(
            error.message
        );

        return result;
    }
}

/*
====================================
AUDIT ALL MODULES
====================================
*/

function auditModules() {

    const modulesPath =
        path.join(

            process.cwd(),

            "src",

            "modules"
        );

    const report = [];

    try {

        if (
            !existsSafe(
                modulesPath
            )
        ) {

            return report;
        }

        const modules =
            fs.readdirSync(
                modulesPath
            );

        for (
            const moduleName
            of modules
        ) {

            report.push(

                auditSingleModule(

                    modulesPath,

                    moduleName
                )
            );
        }

        return report;

    } catch (
        error
    ) {

        console.error(
            error.message
        );

        return report;
    }
}

/*
====================================
SUMMARY
====================================
*/

function getAuditSummary() {

    const report =
        auditModules();

    const summary = {

        total:
            report.length,

        passed: 0,

        failed: 0
    };

    report.forEach(
        function (
            item
        ) {

            if (
                item.status ===
                "OK"
            ) {

                summary.passed++;

            } else {

                summary.failed++;
            }
        }
    );

    return Object.freeze(
        summary
    );
}

/*
====================================
EXPORTS
====================================
*/

module.exports =
    Object.freeze({

        auditModules,

        getAuditSummary
    });