"use strict";

/*
=========================================
COMMONJS ONLY PROTECTION
=========================================
*/

if (typeof module === "undefined") {

    throw new Error(
        "CommonJS environment required"
    );
}

/*
=========================================
DATABASE
=========================================
*/

const {
    prisma
} = require(
    "../../config/db"
);

/*
=========================================
PRISMA VALIDATION
=========================================
*/

function validatePrisma() {

    if (!prisma) {

        throw new Error(
            "Prisma client unavailable"
        );
    }

    if (!prisma.tenant) {

        throw new Error(
            "Prisma tenant model unavailable"
        );
    }
}

/*
=========================================
MODEL ACCESS
=========================================
*/

function getModel() {

    validatePrisma();

    return prisma.tenant;
}

/*
=========================================
ID VALIDATION
=========================================
*/

function validateTenantId(id) {

    const tenantId =
        Number(id);

    if (

        !Number.isInteger(
            tenantId
        ) ||

        tenantId <= 0

    ) {

        throw new Error(
            "Invalid tenant id"
        );
    }

    return tenantId;
}

/*
=========================================
PAYLOAD VALIDATION
=========================================
*/

function validatePayload(
    payload
) {

    if (

        !payload ||

        typeof payload !==
            "object" ||

        Array.isArray(
            payload
        )

    ) {

        throw new Error(
            "Invalid tenant payload"
        );
    }

    return payload;
}

/*
=========================================
GET ALL
=========================================
*/

async function findAll() {

    try {

        const records =
            await getModel()
                .findMany({

                    orderBy: {
                        id: "desc"
                    }
                });

        return Array.isArray(
            records
        )
            ? records
            : [];

    } catch (error) {

        console.error(

            "[TENANT REPOSITORY] findAll:",

            error.message
        );

        throw error;
    }
}

/*
=========================================
GET BY ID
=========================================
*/

async function findById(
    id
) {

    try {

        const tenantId =
            validateTenantId(id);

        const tenant =
            await getModel()
                .findUnique({

                    where: {
                        id: tenantId
                    }
                });

        return tenant || null;

    } catch (error) {

        console.error(

            "[TENANT REPOSITORY] findById:",

            error.message
        );

        throw error;
    }
}

/*
=========================================
CREATE
=========================================
*/

async function create(
    payload
) {

    try {

        return await getModel()
            .create({

                data:
                    validatePayload(
                        payload
                    )
            });

    } catch (error) {

        console.error(

            "[TENANT REPOSITORY] create:",

            error.message
        );

        throw error;
    }
}

/*
=========================================
UPDATE
=========================================
*/

async function update(
    id,
    payload
) {

    try {

        return await getModel()
            .update({

                where: {
                    id:
                        validateTenantId(
                            id
                        )
                },

                data:
                    validatePayload(
                        payload
                    )
            });

    } catch (error) {

        console.error(

            "[TENANT REPOSITORY] update:",

            error.message
        );

        throw error;
    }
}

/*
=========================================
DELETE
=========================================
*/

async function remove(
    id
) {

    try {

        return await getModel()
            .delete({

                where: {
                    id:
                        validateTenantId(
                            id
                        )
                }
            });

    } catch (error) {

        console.error(

            "[TENANT REPOSITORY] remove:",

            error.message
        );

        throw error;
    }
}

/*
=========================================
EXISTS
=========================================
*/

async function exists(
    id
) {

    try {

        const tenant =
            await findById(id);

        return Boolean(
            tenant
        );

    } catch (error) {

        console.error(

            "[TENANT REPOSITORY] exists:",

            error.message
        );

        return false;
    }
}

/*
=========================================
EXPORTS
=========================================
*/

module.exports =
    Object.freeze({

        findAll,

        findById,

        create,

        update,

        remove,

        exists
    });