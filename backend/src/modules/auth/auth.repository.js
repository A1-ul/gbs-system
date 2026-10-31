"use strict";

/*
==================================================
GBS ENTERPRISE AUTH REPOSITORY
PRODUCTION READY
COMMONJS ONLY
CRASH RESISTANT
==================================================
*/

const { prisma } =
    require("../../config/db");

/*
==================================================
DEPENDENCY VALIDATION
==================================================
*/

if (!prisma) {

    throw new Error(
        "AUTH_REPOSITORY: Prisma client unavailable"
    );
}

/*
==================================================
HELPERS
==================================================
*/

function validateUserId(id) {

    const userId =
        Number(id);

    if (
        !Number.isInteger(userId) ||
        userId <= 0
    ) {

        throw new Error(
            "Invalid user id"
        );
    }

    return userId;
}

function normalizeEmail(email) {

    return String(email || "")
        .trim()
        .toLowerCase();
}

/*
==================================================
SAFE USER
NEVER RETURNS PASSWORD
==================================================
*/

function sanitizeUser(user) {

    if (!user) {

        return null;
    }

    return Object.freeze({

        id:
            user.id,

        email:
            user.email,

        role:
            user.role,

        tenantId:
            user.tenantId,

        permissions:
            Array.isArray(
                user.permissions
            )
                ? user.permissions
                : [],

        createdAt:
            user.createdAt,

        updatedAt:
            user.updatedAt
    });
}

/*
==================================================
AUTH USER
PASSWORD INCLUDED
INTERNAL AUTH USE ONLY
==================================================
*/

function sanitizeAuthUser(user) {

    if (!user) {

        return null;
    }

    return Object.freeze({

        id:
            user.id,

        email:
            user.email,

        password:
            user.password,

        role:
            user.role,

        tenantId:
            user.tenantId,

        permissions:
            Array.isArray(
                user.permissions
            )
                ? user.permissions
                : [],

        refreshToken:
            user.refreshToken,

        createdAt:
            user.createdAt,

        updatedAt:
            user.updatedAt
    });
}

/*
==================================================
CREATE USER
==================================================
*/

async function createUser(
    payload = {}
) {

    const email =
        normalizeEmail(
            payload.email
        );

    if (!email) {

        throw new Error(
            "Email required"
        );
    }

    try {

        const user =
            await prisma.user.create({

                data: {

                    ...payload,

                    email
                }
            });

        return sanitizeUser(
            user
        );

    } catch (error) {

        if (
            error.code === "P2002"
        ) {

            throw new Error(
                "User already exists"
            );
        }

        throw new Error(
            error.message ||
            "Failed to create user"
        );
    }
}

/*
==================================================
FIND USER BY EMAIL
AUTH VERSION
PASSWORD INCLUDED
==================================================
*/

async function findUserByEmail(
    email
) {

    try {

        const normalizedEmail =
            normalizeEmail(
                email
            );

        if (!normalizedEmail) {

            return null;
        }

        const user =
            await prisma.user.findUnique({

                where: {

                    email:
                        normalizedEmail
                }
            });

        return sanitizeAuthUser(
            user
        );

    } catch {

        return null;
    }
}

/*
==================================================
FIND USER BY ID
SAFE VERSION
==================================================
*/

async function findUserById(
    id
) {

    try {

        const user =
            await prisma.user.findUnique({

                where: {

                    id:
                        validateUserId(
                            id
                        )
                }
            });

        return sanitizeUser(
            user
        );

    } catch {

        return null;
    }
}

/*
==================================================
FIND USER BY ID AUTH
PASSWORD INCLUDED
==================================================
*/

async function findUserByIdAuth(
    id
) {

    try {

        const user =
            await prisma.user.findUnique({

                where: {

                    id:
                        validateUserId(
                            id
                        )
                }
            });

        return sanitizeAuthUser(
            user
        );

    } catch {

        return null;
    }
}

/*
==================================================
FIND USER BY REFRESH TOKEN
==================================================
*/

async function findUserByRefreshToken(
    refreshToken
) {

    try {

        if (
            typeof refreshToken !==
            "string"
        ) {

            return null;
        }

        const token =
            refreshToken.trim();

        if (!token) {

            return null;
        }

        const user =
            await prisma.user.findFirst({

                where: {

                    refreshToken:
                        token
                }
            });

        return sanitizeAuthUser(
            user
        );

    } catch {

        return null;
    }
}

/*
==================================================
UPDATE REFRESH TOKEN
==================================================
*/

async function updateRefreshToken(
    userId,
    refreshToken
) {

    try {

        const user =
            await prisma.user.update({

                where: {

                    id:
                        validateUserId(
                            userId
                        )
                },

                data: {

                    refreshToken:
                        refreshToken || null
                }
            });

        return sanitizeAuthUser(
            user
        );

    } catch (error) {

        throw new Error(
            error.message ||
            "Failed to update refresh token"
        );
    }
}

/*
==================================================
CLEAR REFRESH TOKEN
==================================================
*/

async function clearRefreshToken(
    userId
) {

    try {

        const user =
            await prisma.user.update({

                where: {

                    id:
                        validateUserId(
                            userId
                        )
                },

                data: {

                    refreshToken:
                        null
                }
            });

        return sanitizeUser(
            user
        );

    } catch (error) {

        throw new Error(
            error.message ||
            "Failed to clear refresh token"
        );
    }
}

/*
==================================================
EMAIL EXISTS
==================================================
*/

async function existsByEmail(
    email
) {

    try {

        const normalizedEmail =
            normalizeEmail(
                email
            );

        if (!normalizedEmail) {

            return false;
        }

        const count =
            await prisma.user.count({

                where: {

                    email:
                        normalizedEmail
                }
            });

        return count > 0;

    } catch {

        return false;
    }
}

/*
==================================================
EXPORTS
==================================================
*/

module.exports =
    Object.freeze({

        createUser,

        findUserByEmail,

        findUserById,

        findUserByIdAuth,

        findUserByRefreshToken,

        updateRefreshToken,

        clearRefreshToken,

        existsByEmail
    });