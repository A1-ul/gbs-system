"use strict";

/*
==================================================
COMMONJS ONLY PROTECTION
==================================================
*/

if (typeof module === "undefined") {

    throw new Error(
        "[VERIFICATION SERVICE] CommonJS environment required"
    );
}

/*
==================================================
DEPENDENCIES
==================================================
*/

const repository =
    require(
        "./verification.repository"
    );

/*
==================================================
REPOSITORY VALIDATION
==================================================
*/

const REQUIRED_METHODS = [

    "findAll",
    "findById",
    "create",
    "update",
    "remove"
];

for (const method of REQUIRED_METHODS) {

    if (
        !repository ||
        typeof repository[method] !== "function"
    ) {

        throw new Error(
            `[VERIFICATION SERVICE] Missing repository method: ${method}`
        );
    }
}

/*
==================================================
HELPERS
==================================================
*/

function success(
    data = null,
    message = "Success"
) {

    return Object.freeze({

        success: true,

        message,

        data
    });
}

function failure(
    message = "Operation failed",
    code = "VERIFICATION_ERROR"
) {

    return Object.freeze({

        success: false,

        code,

        message,

        data: null
    });
}

function validateId(id) {

    if (
        id === undefined ||
        id === null
    ) {

        return false;
    }

    return String(id)
        .trim()
        .length > 0;
}

function sanitizePayload(
    payload = {}
) {

    if (
        !payload ||
        typeof payload !== "object"
    ) {

        return {};
    }

    const clean = {

        ...payload
    };

    delete clean.id;
    delete clean.createdAt;
    delete clean.updatedAt;

    return clean;
}

/*
==================================================
GET ALL
==================================================
*/

async function getAll() {

    try {

        const records =
            await repository.findAll();

        return success(

            Array.isArray(records)
                ? records
                : []
        );

    } catch (error) {

        console.error(

            "[VERIFICATION SERVICE][GET ALL]",

            error.message
        );

        return failure(
            "Failed to retrieve verifications"
        );
    }
}

/*
==================================================
GET BY ID
==================================================
*/

async function getById(id) {

    try {

        if (
            !validateId(id)
        ) {

            return failure(
                "Invalid verification ID",
                "INVALID_ID"
            );
        }

        const record =
            await repository.findById(id);

        if (!record) {

            return failure(
                "Verification not found",
                "NOT_FOUND"
            );
        }

        return success(
            record
        );

    } catch (error) {

        console.error(

            "[VERIFICATION SERVICE][GET BY ID]",

            error.message
        );

        return failure(
            "Failed to retrieve verification"
        );
    }
}

/*
==================================================
CREATE
==================================================
*/

async function create(
    payload = {}
) {

    try {

        if (
            !payload ||
            typeof payload !== "object"
        ) {

            return failure(
                "Invalid payload",
                "INVALID_PAYLOAD"
            );
        }

        if (
            !payload.type
        ) {

            return failure(
                "Verification type required",
                "TYPE_REQUIRED"
            );
        }

        const record =
            await repository.create(
                sanitizePayload(payload)
            );

        return success(

            record,

            "Verification created successfully"
        );

    } catch (error) {

        console.error(

            "[VERIFICATION SERVICE][CREATE]",

            error.message
        );

        return failure(
            "Failed to create verification"
        );
    }
}

/*
==================================================
UPDATE
==================================================
*/

async function update(
    id,
    payload = {}
) {

    try {

        if (
            !validateId(id)
        ) {

            return failure(
                "Invalid verification ID",
                "INVALID_ID"
            );
        }

        const existing =
            await repository.findById(id);

        if (!existing) {

            return failure(
                "Verification not found",
                "NOT_FOUND"
            );
        }

        const updated =
            await repository.update(

                id,

                sanitizePayload(payload)
            );

        return success(

            updated,

            "Verification updated successfully"
        );

    } catch (error) {

        console.error(

            "[VERIFICATION SERVICE][UPDATE]",

            error.message
        );

        return failure(
            "Failed to update verification"
        );
    }
}

/*
==================================================
DELETE
==================================================
*/

async function remove(id) {

    try {

        if (
            !validateId(id)
        ) {

            return failure(
                "Invalid verification ID",
                "INVALID_ID"
            );
        }

        const existing =
            await repository.findById(id);

        if (!existing) {

            return failure(
                "Verification not found",
                "NOT_FOUND"
            );
        }

        await repository.remove(id);

        return success(

            {
                deleted: true,
                id
            },

            "Verification deleted successfully"
        );

    } catch (error) {

        console.error(

            "[VERIFICATION SERVICE][DELETE]",

            error.message
        );

        return failure(
            "Failed to delete verification"
        );
    }
}

/*
==================================================
EXPORTS
==================================================
*/

module.exports =
    Object.freeze({

        getAll,
        getById,

        create,
        update,
        remove
    });