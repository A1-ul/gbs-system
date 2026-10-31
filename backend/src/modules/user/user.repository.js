"use strict";

/*
=================================================
COMMONJS ONLY
=================================================
*/

if (typeof module === "undefined") {

    throw new Error(
        "[USER REPOSITORY] CommonJS environment required"
    );
}

/*
=================================================
DEPENDENCIES
=================================================
*/

const {
    prisma
} = require(
    "../../config/db"
);

/*
=================================================
PRISMA VALIDATION
=================================================
*/

function getModel() {

    if (!prisma) {

        throw new Error(
            "Prisma client unavailable"
        );
    }

    if (!prisma.user) {

        throw new Error(
            "Prisma user model unavailable"
        );
    }

    return prisma.user;
}

/*
=================================================
HELPERS
=================================================
*/

function validateId(id) {

    const parsedId =
        Number(id);

    if (
        !Number.isInteger(parsedId) ||
        parsedId <= 0
    ) {

        throw new Error(
            "Invalid user id"
        );
    }

    return parsedId;
}

function normalizeEmail(email) {

    return String(
        email || ""
    )
        .trim()
        .toLowerCase();
}

function validatePayload(payload) {

    if (
        !payload ||
        typeof payload !== "object" ||
        Array.isArray(payload)
    ) {

        throw new Error(
            "Invalid payload"
        );
    }

    return payload;
}

/*
=================================================
FIND ALL USERS
=================================================
*/

async function findAll() {

    try {

        return await getModel()
            .findMany({

                orderBy: {
                    id: "desc"
                }
            });

    } catch (error) {

        console.error(
            "[USER REPOSITORY] findAll:",
            error.message
        );

        throw error;
    }
}

/*
=================================================
FIND USER BY ID
=================================================
*/

async function findById(id) {

    try {

        return await getModel()
            .findUnique({

                where: {
                    id:
                        validateId(id)
                }
            });

    } catch (error) {

        console.error(
            "[USER REPOSITORY] findById:",
            error.message
        );

        throw error;
    }
}

/*
=================================================
FIND USER BY EMAIL
=================================================
*/

async function findByEmail(email) {

    try {

        const normalizedEmail =
            normalizeEmail(email);

        if (!normalizedEmail) {

            throw new Error(
                "Email required"
            );
        }

        return await getModel()
            .findUnique({

                where: {
                    email:
                        normalizedEmail
                }
            });

    } catch (error) {

        console.error(
            "[USER REPOSITORY] findByEmail:",
            error.message
        );

        throw error;
    }
}

/*
=================================================
CREATE USER
=================================================
*/

async function create(payload = {}) {

    try {

        validatePayload(payload);

        return await getModel()
            .create({

                data: payload
            });

    } catch (error) {

        console.error(
            "[USER REPOSITORY] create:",
            error.message
        );

        throw error;
    }
}

/*
=================================================
UPDATE USER
=================================================
*/

async function update(
    id,
    payload = {}
) {

    try {

        validatePayload(payload);

        return await getModel()
            .update({

                where: {
                    id:
                        validateId(id)
                },

                data:
                    payload
            });

    } catch (error) {

        console.error(
            "[USER REPOSITORY] update:",
            error.message
        );

        throw error;
    }
}

/*
=================================================
DELETE USER
=================================================
*/

async function remove(id) {

    try {

        return await getModel()
            .delete({

                where: {
                    id:
                        validateId(id)
                }
            });

    } catch (error) {

        console.error(
            "[USER REPOSITORY] remove:",
            error.message
        );

        throw error;
    }
}

/*
=================================================
UPDATE ROLE
=================================================
*/

async function updateRole(
    id,
    role
) {

    try {

        if (!role) {

            throw new Error(
                "Role required"
            );
        }

        return await update(
            id,
            { role }
        );

    } catch (error) {

        console.error(
            "[USER REPOSITORY] updateRole:",
            error.message
        );

        throw error;
    }
}

/*
=================================================
UPDATE PERMISSIONS
=================================================
*/

async function updatePermissions(
    id,
    permissions
) {

    try {

        if (
            !Array.isArray(
                permissions
            )
        ) {

            throw new Error(
                "Permissions must be array"
            );
        }

        return await update(
            id,
            {
                permissions
            }
        );

    } catch (error) {

        console.error(
            "[USER REPOSITORY] updatePermissions:",
            error.message
        );

        throw error;
    }
}

/*
=================================================
EXISTS
=================================================
*/

async function exists(id) {

    try {

        const user =
            await findById(id);

        return Boolean(user);

    } catch {

        return false;
    }
}

/*
=================================================
EXPORTS
=================================================
*/

module.exports =
    Object.freeze({

        findAll,

        findById,

        findByEmail,

        create,

        update,

        remove,

        updateRole,

        updatePermissions,

        exists
    });