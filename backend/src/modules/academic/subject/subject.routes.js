"use strict";

const express =
    require(
        "express"
    );

const router =
    express.Router();

const controller =
    require(
        "./subject.controller"
    );

const validate =
    require(
        "../../middlewares/validate.middleware"
    );

const validators =
    require(
        "./subject.validator"
    );

if (
    !controller
) {

    throw new Error(
        "Subject controller unavailable"
    );
}

/*
====================================
STATUS
====================================
*/

router.get(
    "/status",
    controller.getStatus
);

/*
====================================
CRUD
====================================
*/

router.get(
    "/",
    controller.getSubjects
);

router.get(
    "/:id",
    validators.idValidator,
    validate,
    controller.getSubjectById
);

router.post(
    "/",
    validators.createSubjectValidator,
    validate,
    controller.createSubject
);

router.put(
    "/:id",
    validators.updateSubjectValidator,
    validate,
    controller.updateSubject
);

router.delete(
    "/:id",
    validators.idValidator,
    validate,
    controller.deleteSubject
);

module.exports =
    router;