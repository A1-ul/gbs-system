"use strict";

/*

*/

const service =
require(
"./reports.service"
);

/*
SERVICE VALIDATION

*/

const REQUIRED_METHODS = [

"getStatus",

"getReports",
"getReportById",

"createReport",
"updateReport",
"deleteReport"

];

for (const method of REQUIRED_METHODS) {

if (
    typeof service[method] !==
    "function"
) {

    throw new Error(
        `Reports service missing method: ${method}`
    );
}

}

/*
STATUS

*/

async function status(
req,
res,
next
) {

try {

    const result =
        await service.getStatus();

    return res
        .status(200)
        .json(result);

} catch (error) {

    return next(error);
}

}

/*
GET REPORTS

*/

async function getReports(
req,
res,
next
) {

try {

    const result =
        await service.getReports();

    return res
        .status(200)
        .json(result);

} catch (error) {

    return next(error);
}

}

/*
GET REPORT BY ID

*/

async function getReportById(
req,
res,
next
) {

try {

    const result =
        await service.getReportById(
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

    return next(error);
}

}

/*
CREATE REPORT

*/

async function createReport(
req,
res,
next
) {

try {

    const result =
        await service.createReport(
            req.body
        );

    return res
        .status(
            result.success
                ? 201
                : 400
        )
        .json(result);

} catch (error) {

    return next(error);
}

}

/*
UPDATE REPORT

*/

async function updateReport(
req,
res,
next
) {

try {

    const result =
        await service.updateReport(
            req.params.id,
            req.body
        );

    return res
        .status(
            result.success
                ? 200
                : 404
        )
        .json(result);

} catch (error) {

    return next(error);
}

}

/*
DELETE REPORT

*/

async function deleteReport(
req,
res,
next
) {

try {

    const result =
        await service.deleteReport(
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

    return next(error);
}

}

module.exports =
Object.freeze({

    status,

    getReports,
    getReportById,

    createReport,
    updateReport,
    deleteReport
});