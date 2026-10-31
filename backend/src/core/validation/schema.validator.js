"use strict";

/*
====================================
SCHEMA VALIDATOR
====================================
*/

function validateSchema(
    data,
    schema = {}
) {

    const errors =
        [];

    Object.keys(
        schema
    ).forEach(

        function (
            key
        ) {

            const rule =
                schema[key];

            if (

                rule.required &&

                (
                    data[key] ===
                    undefined ||

                    data[key] ===
                    null ||

                    data[key] === ""
                )

            ) {

                errors.push(
                    `${key} is required`
                );
            }
        }
    );

    return {

        valid:
            errors.length === 0,

        errors
    };
}

module.exports =
    Object.freeze({

        validateSchema
    });