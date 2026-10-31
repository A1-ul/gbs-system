"use strict";

/*
==================================================
DOCUMENT SERVICE
ENTERPRISE HARDENED
COMMONJS ONLY
==================================================
*/

const repository =
    require(
        "./document.repository"
    );

function success(
    data = null
) {

    return Object.freeze({

        success: true,

        data
    });
}

function failure(
    message
) {

    return Object.freeze({

        success: false,

        message
    });
}

async function getStatus() {

    return Object.freeze({

        success: true,

        module:
            "document",

        status:
            "active",

        timestamp:
            new Date()
                .toISOString()
    });
}

async function getDocuments() {

    try {

        const documents =
            await repository.findAll();

        return success(
            documents
        );

    } catch (error) {

        return failure(
            error.message ||
            "Failed to retrieve documents"
        );
    }
}

async function getDocumentById(
    id
) {

    try {

        const document =
            await repository.findById(
                id
            );

        if (!document) {

            return failure(
                "Document not found"
            );
        }

        return success(
            document
        );

    } catch (error) {

        return failure(
            error.message ||
            "Failed to retrieve document"
        );
    }
}

module.exports =
    Object.freeze({

        getStatus,
        getDocuments,
        getDocumentById
    });