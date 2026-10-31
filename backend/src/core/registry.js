"use strict";

/*
====================================
PRIVATE REGISTRY
====================================
*/

const registry =
    Object.create(
        null
    );

const metadata =
    Object.create(
        null
    );

/*
====================================
HELPERS
====================================
*/

function normalizeName(
    name
) {

    return String(
        name || ""
    )
        .trim()
        .toLowerCase();
}

function validateModuleObject(
    moduleObject
) {

    return (
        moduleObject &&
        typeof moduleObject ===
            "object"
    );
}

/*
====================================
REGISTER MODULE
====================================
*/

function registerModule(
    name,
    moduleObject
) {

    const moduleName =
        normalizeName(
            name
        );

    if (
        !moduleName
    ) {

        throw new Error(
            "Module name is required"
        );
    }

    if (
        !validateModuleObject(
            moduleObject
        )
    ) {

        throw new Error(
            `Invalid module object for ${moduleName}`
        );
    }

    if (
        registry[
            moduleName
        ]
    ) {

        throw new Error(
            `Module already registered: ${moduleName}`
        );
    }

    registry[
        moduleName
    ] =
        Object.freeze({

            ...moduleObject
        });

    metadata[
        moduleName
    ] =
        Object.freeze({

            name:
                moduleName,

            registeredAt:
                new Date()
                    .toISOString()
        });

    return true;
}

/*
====================================
GET MODULE
====================================
*/

function getModule(
    name
) {

    const moduleName =
        normalizeName(
            name
        );

    if (
        !moduleName
    ) {

        return null;
    }

    return (
        registry[
            moduleName
        ] || null
    );
}

/*
====================================
GET MODULE META
====================================
*/

function getModuleMetadata(
    name
) {

    const moduleName =
        normalizeName(
            name
        );

    return (
        metadata[
            moduleName
        ] || null
    );
}

/*
====================================
GET ALL MODULES
====================================
*/

function getModules() {

    return Object.freeze({

        ...registry
    });
}

/*
====================================
GET ALL METADATA
====================================
*/

function getMetadata() {

    return Object.freeze({

        ...metadata
    });
}

/*
====================================
HAS MODULE
====================================
*/

function hasModule(
    name
) {

    const moduleName =
        normalizeName(
            name
        );

    return Boolean(
        registry[
            moduleName
        ]
    );
}

/*
====================================
COUNT
====================================
*/

function getModuleCount() {

    return Object.keys(
        registry
    ).length;
}

/*
====================================
LIST MODULES
====================================
*/

function listModules() {

    return Object.freeze(
        Object.keys(
            registry
        ).sort()
    );
}

/*
====================================
UNREGISTER
====================================
*/

function unregisterModule(
    name
) {

    const moduleName =
        normalizeName(
            name
        );

    if (
        !moduleName
    ) {

        return false;
    }

    if (
        !registry[
            moduleName
        ]
    ) {

        return false;
    }

    delete registry[
        moduleName
    ];

    delete metadata[
        moduleName
    ];

    return true;
}

/*
====================================
CLEAR REGISTRY
====================================
*/

function clearRegistry() {

    for (
        const key of Object.keys(
            registry
        )
    ) {

        delete registry[
            key
        ];
    }

    for (
        const key of Object.keys(
            metadata
        )
    ) {

        delete metadata[
            key
        ];
    }

    return true;
}

/*
====================================
HEALTH
====================================
*/

function getRegistryHealth() {

    return Object.freeze({

        healthy:
            true,

        modules:
            getModuleCount(),

        names:
            listModules(),

        timestamp:
            new Date()
                .toISOString()
    });
}

/*
====================================
EXPORTS
====================================
*/

module.exports =
    Object.freeze({

        registerModule,

        getModule,

        getModules,

        hasModule,

        unregisterModule,

        clearRegistry,

        getModuleMetadata,

        getMetadata,

        getModuleCount,

        listModules,

        getRegistryHealth
    });