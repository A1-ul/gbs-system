"use strict";

/*
==================================================
DOCUMENT CONTROLLER
ENTERPRISE HARDENED
COMMONJS ONLY
==================================================
*/

let documentService = null;

try {

    documentService =
        require(
            "./document.service"
        );

} catch (error) {

    console.error(
        "[DOCUMENT] SERVICE LOAD FAILURE:",
        error.message
    );
}

function serviceAvailable() {

    return Boolean(

        documentService &&

        typeof documentService.getStatus === "function" &&

        typeof documentService.getDocuments === "function" &&

        typeof documentService.getDocumentById === "function"
    );
}

async function status(
    req,
    res
) {

    try {

        if (!serviceAvailable()) {

            return res.status(500).json({

                success: false,

                message:
                    "Document service unavailable"
            });
        }

        const result =
            await documentService.getStatus();

        return res.status(200).json(
            result
        );

    } catch (error) {

        console.error(
            "[DOCUMENT STATUS ERROR]",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Document status failed"
        });
    }
}

async function getAll(
    req,
    res
) {

    try {

        const result =
            await documentService.getDocuments();

        return res.status(200).json(
            result
        );

    } catch (error) {

        console.error(
            "[DOCUMENT GETALL ERROR]",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Failed to retrieve documents"
        });
    }
}

async function getById(
    req,
    res
) {

    try {

        const result =
            await documentService.getDocumentById(
                req.params.id
            );

        return res
            .status(
                result.success
                    ? 200
                    : 404
            )
            .json(result);

    } catch (error) {

        console.error(
            "[DOCUMENT GETBYID ERROR]",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Failed to retrieve document"
        });
    }
}

module.exports =
    Object.freeze({

        status,
        getAll,
        getById
    });