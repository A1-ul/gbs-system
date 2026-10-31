"use strict";

/*
=========================================
GBS ENTERPRISE UPLOAD MIDDLEWARE
COMMONJS ONLY
CRASH SAFE
=========================================
*/

const multer =
    require("multer");

const path =
    require("path");

const fs =
    require("fs");

const logger =
    require("../utils/logger");

const UPLOAD_DIR =
    path.join(
        process.cwd(),
        "uploads"
    );

if (
    !fs.existsSync(
        UPLOAD_DIR
    )
) {

    fs.mkdirSync(
        UPLOAD_DIR,
        {
            recursive: true
        }
    );
}

const ALLOWED_EXTENSIONS =
    new Set([
        ".jpg",
        ".jpeg",
        ".png",
        ".pdf",
        ".doc",
        ".docx"
    ]);

const storage =
    multer.diskStorage({

        destination(
            req,
            file,
            cb
        ) {

            cb(
                null,
                UPLOAD_DIR
            );
        },

        filename(
            req,
            file,
            cb
        ) {

            try {

                const safeName =
                    path.basename(
                        file.originalname
                    )
                    .replace(
                        /[^a-zA-Z0-9._-]/g,
                        "_"
                    );

                cb(
                    null,
                    `${Date.now()}-${safeName}`
                );

            } catch (error) {

                cb(error);
            }
        }
    });

function fileFilter(
    req,
    file,
    cb
) {

    try {

        const extension =
            path.extname(
                file.originalname
            )
            .toLowerCase();

        if (
            !ALLOWED_EXTENSIONS.has(
                extension
            )
        ) {

            return cb(
                new Error(
                    "Unsupported file type"
                )
            );
        }

        return cb(
            null,
            true
        );

    } catch (error) {

        return cb(error);
    }
}

const upload =
    multer({

        storage,

        fileFilter,

        limits: {

            fileSize:
                10 *
                1024 *
                1024,

            files:
                5
        }
    });

module.exports =
    upload;