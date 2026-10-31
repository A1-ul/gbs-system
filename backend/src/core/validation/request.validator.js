"use strict";

/*
====================================
REQUEST VALIDATOR
====================================
*/

function validateRequest(
    req,
    requiredFields = []
) {

    const errors =
        [];

    for (
        const field
        of requiredFields
    ) {

        if (

            req.body[
                field
            ] === undefined ||

            req.body[
                field
            ] === null ||

            req.body[
                field
            ] === ""

        ) {

            errors.push(
                `${field} is required`
            );
        }
    }

    return {

        valid:
            errors.length === 0,

        errors
    };
}

module.exports =
    Object.freeze({

        validateRequest
    });