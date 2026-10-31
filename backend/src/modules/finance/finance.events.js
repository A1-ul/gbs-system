"use strict";

function financeCreated(
    payload
) {

    console.log(
        "[FINANCE_CREATED]",
        payload
    );
}

function financeUpdated(
    payload
) {

    console.log(
        "[FINANCE_UPDATED]",
        payload
    );
}

function financeDeleted(
    payload
) {

    console.log(
        "[FINANCE_DELETED]",
        payload
    );
}

module.exports =
    Object.freeze({
        financeCreated,
        financeUpdated,
        financeDeleted
    });